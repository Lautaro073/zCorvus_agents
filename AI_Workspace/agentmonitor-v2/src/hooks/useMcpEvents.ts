import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMonitorStore } from '@/store/monitorStore';
import { wsClient } from '@/lib/wsClient';
import { QUERY_KEYS } from '@/lib/queryClient';
import { getMcpApiBase } from '@/lib/mcpEndpoints';
import type {
  AgentInboxSnapshot,
  AgentInboxTaskSummary,
  AgentName,
  ContextViewHealth,
  CorrelationSnapshot,
  ContextObservabilityReport,
  DebugExpansionAudit,
  McpEvent,
  TaskSnapshot,
  WaveCanaryReport,
} from '@/types/mcp';

const API_BASE = getMcpApiBase();
const USE_LOCAL_FIXTURES = import.meta.env.VITE_E2E_USE_FIXTURES === 'true';

const KNOWN_AGENTS: AgentName[] = [
  'Orchestrator',
  'Planner',
  'Observer',
  'Frontend',
  'Backend',
  'Tester',
  'Documenter',
  'AI_Workspace_Optimizer',
];

const KNOWN_AGENT_SET = new Set<AgentName>(KNOWN_AGENTS);

interface CompactContextPayload {
  events: McpEvent[];
  contextViews: ContextViewHealth[];
  inboxSnapshots: AgentInboxSnapshot[];
  observability: ContextObservabilityReport | null;
  waveCanary: WaveCanaryReport | null;
}

export interface DebugExpansionResult {
  taskSnapshot: TaskSnapshot | null;
  correlationSnapshot: CorrelationSnapshot | null;
  expandedEvents: McpEvent[];
  audit: DebugExpansionAudit;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAgent(value: unknown): AgentName {
  const candidate = asString(value) as AgentName | null;
  if (candidate && KNOWN_AGENT_SET.has(candidate)) {
    return candidate;
  }
  return 'Observer';
}

function parseTimestamp(value: unknown): string {
  const parsed = asString(value);
  return parsed || new Date().toISOString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed request (${response.status}): ${url}`);
  }
  return (await response.json()) as T;
}

async function fetchAgentInboxSnapshot(agent: AgentName): Promise<AgentInboxSnapshot> {
  const url = `${API_BASE}/context/get_agent_inbox?assignedTo=${encodeURIComponent(agent)}&limit=12&allowBroadFallback=false`;
  return fetchJson<AgentInboxSnapshot>(url);
}

function toContextViewHealth(snapshot: AgentInboxSnapshot): ContextViewHealth {
  return {
    key: `agent:${snapshot.agent}`,
    label: snapshot.agent,
    view: snapshot.view,
    decisionSafety: snapshot.decisionSafety,
    stale: snapshot.stale,
    degradedMode: snapshot.degradedMode,
    truncated: snapshot.truncated,
    broadFallbackUsed: snapshot.readAudit?.broadFallbackUsed === true,
    readMode: snapshot.readAudit?.readMode || 'unknown',
  };
}

function taskSummaryToEvent(agent: AgentName, task: AgentInboxTaskSummary, index: number): McpEvent {
  const timestamp = parseTimestamp(task.updatedAt);

  return {
    eventId: `inbox:${agent}:${task.taskId}:${timestamp}:${index}`,
    timestamp,
    agent,
    type: task.latestEventType || 'TASK_ASSIGNED',
    taskId: task.taskId,
    assignedTo: agent,
    status: task.status,
    correlationId: task.correlationId || task.taskId,
    payload: {
      message: task.latestSummary || undefined,
      nextAction: task.nextAction || null,
      artifactPaths: task.artifactPaths || [],
      priority: task.priority || undefined,
      source: 'agent_inbox_snapshot',
    },
  };
}

async function fetchCompactContextPayload(): Promise<CompactContextPayload> {
  const observabilityPromise = fetchJson<ContextObservabilityReport>(
    `${API_BASE}/context/observability`
  ).catch(() => null);
  const waveCanaryPromise = fetchJson<WaveCanaryReport>(
    `${API_BASE}/context/wave_canary`
  ).catch(() => null);

  const inboxResults = await Promise.allSettled(KNOWN_AGENTS.map((agent) => fetchAgentInboxSnapshot(agent)));

  const inboxSnapshots: AgentInboxSnapshot[] = inboxResults
    .filter((result): result is PromiseFulfilledResult<AgentInboxSnapshot> => result.status === 'fulfilled')
    .map((result) => result.value);

  const contextViews = inboxSnapshots.map(toContextViewHealth);

  const events = inboxSnapshots
    .flatMap((snapshot) =>
      snapshot.tasks.map((task, index) => taskSummaryToEvent(snapshot.agent, task, index))
    )
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

  const observability = await observabilityPromise;
  const waveCanary = await waveCanaryPromise;

  return {
    events,
    contextViews,
    inboxSnapshots,
    observability,
    waveCanary,
  };
}

function previewEventToMcpEvent(preview: Record<string, unknown>): McpEvent {
  const taskId = asString(preview.taskId) || 'unknown-task';
  const status = asString(preview.status);
  const type = asString(preview.type) || status || 'TASK_IN_PROGRESS';
  const agent = normalizeAgent(preview.agent);

  return {
    eventId: asString(preview.eventId) || `ws:${taskId}:${Date.now()}`,
    timestamp: parseTimestamp(preview.timestamp),
    agent,
    type,
    taskId,
    assignedTo: normalizeAgent(preview.assignedTo ?? preview.agent),
    status,
    correlationId: asString(preview.correlationId) || taskId,
    payload: {
      message: asString(preview.summary) || undefined,
      priority: asString(preview.priority) || undefined,
      source: 'ws_preview',
    },
  };
}

function parseEventsPayload(payload: unknown): McpEvent[] {
  if (Array.isArray(payload)) {
    return payload as McpEvent[];
  }

  if (payload && typeof payload === 'object' && 'events' in payload) {
    const withEvents = payload as { events?: unknown };
    if (Array.isArray(withEvents.events)) {
      return withEvents.events as McpEvent[];
    }
  }

  return [];
}

export function useMcpEvents() {
  const queryClient = useQueryClient();
  const { setEvents, addEvent, setConnected } = useMonitorStore();
  const [debugAudits, setDebugAudits] = useState<DebugExpansionAudit[]>([]);
  const [debugExpansions, setDebugExpansions] = useState<Record<string, DebugExpansionResult>>({});
  const [expandingTaskId, setExpandingTaskId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: fetchCompactContextPayload,
    enabled: !USE_LOCAL_FIXTURES,
    refetchInterval: USE_LOCAL_FIXTURES ? false : 15_000,
  });

  const handleSocketMessage = useCallback(
    (message: unknown) => {
      if (!message || typeof message !== 'object') {
        return;
      }

      const payload = message as Record<string, unknown>;
      const latestEventRaw =
        payload.latestEvent && typeof payload.latestEvent === 'object'
          ? (payload.latestEvent as Record<string, unknown>)
          : null;

      if (latestEventRaw) {
        addEvent(previewEventToMcpEvent(latestEventRaw));
      }

      const messageType = asString(payload.type);
      if (messageType === 'connected' || messageType === 'events_updated') {
        setConnected(true);
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
      }
    },
    [addEvent, queryClient, setConnected]
  );

  const handleOpen = useCallback(() => {
    setConnected(true);
  }, [setConnected]);

  const handleClose = useCallback(() => {
    setConnected(false);
  }, [setConnected]);

  useEffect(() => {
    if (USE_LOCAL_FIXTURES) {
      return;
    }

    if (query.data) {
      setEvents(query.data.events);
    }
  }, [query.data, setEvents]);

  useEffect(() => {
    if (USE_LOCAL_FIXTURES) {
      setConnected(false);
      return;
    }

    wsClient.connect();

    const unsubMessage = wsClient.onMessage(handleSocketMessage);
    const unsubOpen = wsClient.onOpen(handleOpen);
    const unsubClose = wsClient.onClose(handleClose);

    return () => {
      unsubMessage();
      unsubOpen();
      unsubClose();
      wsClient.disconnect();
    };
  }, [handleClose, handleOpen, handleSocketMessage, setConnected]);

  const expandTaskDebug = useCallback(
    async (event: McpEvent): Promise<DebugExpansionResult | null> => {
      const taskId = asString(event.taskId);
      if (!taskId) {
        return null;
      }

      const correlationId = asString(event.correlationId) || taskId;
      setExpandingTaskId(taskId);

      try {
        const taskSnapshot = await fetchJson<TaskSnapshot>(
          `${API_BASE}/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}&allowBroadFallback=true&sensitiveAction=true`
        );

        const correlationSnapshot = correlationId
          ? await fetchJson<CorrelationSnapshot>(
              `${API_BASE}/context/get_correlation_snapshot?correlationId=${encodeURIComponent(
                correlationId
              )}&allowBroadFallback=true&limit=20&sensitiveAction=true`
            )
          : null;

        const expandedEventsPayload = await fetchJson<unknown>(
          `${API_BASE}/events?taskId=${encodeURIComponent(taskId)}&includeTaskEvents=true&limit=40`
        );
        const expandedEvents = parseEventsPayload(expandedEventsPayload);

        const audit: DebugExpansionAudit = {
          id: `debug:${taskId}:${Date.now()}`,
          createdAt: new Date().toISOString(),
          taskId,
          correlationId,
          readMode: taskSnapshot.readAudit?.readMode || 'unknown',
          broadFallbackUsed: taskSnapshot.readAudit?.broadFallbackUsed === true,
          decisionSafety: taskSnapshot.decisionSafety,
          stale: taskSnapshot.stale,
          degradedMode: taskSnapshot.degradedMode,
          truncated: taskSnapshot.truncated,
          expandedEventsCount: expandedEvents.length,
        };

        const result: DebugExpansionResult = {
          taskSnapshot,
          correlationSnapshot,
          expandedEvents,
          audit,
        };

        setDebugExpansions((current) => ({
          ...current,
          [taskId]: result,
        }));
        setDebugAudits((current) => [audit, ...current].slice(0, 30));
        return result;
      } catch {
        const failedAudit: DebugExpansionAudit = {
          id: `debug:${taskId}:${Date.now()}`,
          createdAt: new Date().toISOString(),
          taskId,
          correlationId,
          readMode: 'debug_fetch_failed',
          broadFallbackUsed: true,
          decisionSafety: 'requires_expansion',
          stale: true,
          degradedMode: true,
          truncated: false,
          expandedEventsCount: 0,
        };
        setDebugAudits((current) => [failedAudit, ...current].slice(0, 30));
        return null;
      } finally {
        setExpandingTaskId(null);
      }
    },
    []
  );

  return {
    events: USE_LOCAL_FIXTURES ? [] : query.data?.events ?? [],
    contextViews: query.data?.contextViews ?? [],
    inboxSnapshots: query.data?.inboxSnapshots ?? [],
    observability: query.data?.observability ?? null,
    waveCanary: query.data?.waveCanary ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isConnected: wsClient.isConnected,
    refetch: query.refetch,
    expandTaskDebug,
    debugAudits,
    debugExpansions,
    expandingTaskId,
  };
}
