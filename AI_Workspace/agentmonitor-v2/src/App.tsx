import { Suspense, lazy, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Hero } from '@/components/dashboard/Hero';
import { SummaryGrid } from '@/components/dashboard/SummaryGrid';
import { useMcpEvents } from '@/hooks/useMcpEvents';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { AgentName, McpEvent } from '@/types/mcp';
import type { FilterState } from '@/components/filters/FilterPanel';

const AgentStage = lazy(async () => {
  const mod = await import('@/components/agentStage/AgentStage');
  return { default: mod.AgentStage };
});

const Timeline = lazy(async () => {
  const mod = await import('@/components/timeline/Timeline');
  return { default: mod.Timeline };
});

const CriticalPanel = lazy(async () => {
  const mod = await import('@/components/criticalPanel/CriticalPanel');
  return { default: mod.CriticalPanel };
});

const TaskGroups = lazy(async () => {
  const mod = await import('@/components/taskGroups/TaskGroups');
  return { default: mod.TaskGroups };
});

const DEFAULT_GROUP_FILTERS: FilterState = {
  agent: null,
  status: null,
  searchQuery: '',
  quickFilters: [],
};

const fallbackEvents: McpEvent[] = [
  {
    eventId: 'sample-1',
    timestamp: new Date(Date.now() - 10_000).toISOString(),
    agent: 'Observer',
    type: 'TASK_IN_PROGRESS',
    status: 'TASK_IN_PROGRESS',
    taskId: 'aiw-observer-v2-ui-06-20260330-01',
    correlationId: 'aiw-agentmonitor-v2-20260330',
    payload: { message: 'Rediseno del panel critico en progreso' },
  },
  {
    eventId: 'sample-2',
    timestamp: new Date(Date.now() - 45_000).toISOString(),
    agent: 'Frontend',
    type: 'TASK_COMPLETED',
    status: 'TASK_COMPLETED',
    taskId: 'aiw-frontend-v2-ui-05-20260330-01',
    correlationId: 'aiw-agentmonitor-v2-20260330',
    payload: { message: 'Panel de metricas entregado' },
  },
  {
    eventId: 'sample-3',
    timestamp: new Date(Date.now() - 90_000).toISOString(),
    agent: 'Tester',
    type: 'TASK_BLOCKED',
    status: 'TASK_BLOCKED',
    taskId: 'aiw-tester-v2-test-01-20260330-01',
    correlationId: 'aiw-agentmonitor-v2-20260330',
    payload: { message: 'Esperando filtros y ajuste del panel critico' },
  },
  {
    eventId: 'sample-4',
    timestamp: new Date(Date.now() - 130_000).toISOString(),
    agent: 'Orchestrator',
    type: 'INCIDENT_OPENED',
    status: 'INCIDENT_OPENED',
    taskId: 'aiw-observer-v2-ui-06-20260330-01',
    correlationId: 'aiw-agentmonitor-v2-20260330',
    payload: { message: 'Pico de tareas bloqueadas', rootCause: 'Faltan datos de dependencias' },
  },
  {
    eventId: 'sample-5',
    timestamp: new Date(Date.now() - 180_000).toISOString(),
    agent: 'Documenter',
    type: 'ARTIFACT_PUBLISHED',
    status: 'ARTIFACT_PUBLISHED',
    taskId: 'aiw-documenter-v2-doc-01-20260330-01',
    correlationId: 'aiw-agentmonitor-v2-20260330',
    payload: { message: 'Documentacion de arquitectura actualizada' },
  },
];

function toAgentStatus(event: McpEvent):
  | 'idle'
  | 'active'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'pending' {
  const status = event.status || event.type;
  if (status === 'TASK_IN_PROGRESS') return 'in-progress';
  if (status === 'TASK_BLOCKED' || status === 'INCIDENT_OPENED' || status === 'TEST_FAILED') {
    return 'blocked';
  }
  if (status === 'TASK_COMPLETED' || status === 'TEST_PASSED') return 'completed';
  if (status === 'TASK_ASSIGNED') return 'pending';
  if (status === 'TASK_ACCEPTED') return 'active';
  return 'idle';
}

function App() {
  const { events, isLoading, isConnected } = useMcpEvents();
  const liveEvents = events.length > 0 ? events : fallbackEvents;
  const metrics = useDashboardMetrics(liveEvents);
  const sortedEvents = useMemo(
    () => [...liveEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [liveEvents]
  );

  const agentCards = useMemo(() => {
    const latestByAgent = new Map<AgentName, McpEvent>();
    const taskCountByAgent = new Map<AgentName, number>();

    for (const event of sortedEvents) {
      taskCountByAgent.set(event.agent, (taskCountByAgent.get(event.agent) ?? 0) + 1);
      if (!latestByAgent.has(event.agent)) {
        latestByAgent.set(event.agent, event);
      }
    }

    return Array.from(latestByAgent.entries()).map(([agent, latest]) => ({
      name: agent,
      status: toAgentStatus(latest),
      taskCount: taskCountByAgent.get(agent) ?? 0,
      latest,
    }));
  }, [sortedEvents]);

  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const effectiveSelectedAgent = selectedAgent ?? agentCards[0]?.name ?? null;

  const focused = useMemo(
    () => agentCards.find((agent) => agent.name === effectiveSelectedAgent) || agentCards[0],
    [agentCards, effectiveSelectedAgent]
  );

  const recentActivity = useMemo(
    () =>
      sortedEvents.slice(0, 5).map((event) => ({
        type: event.status || event.type,
        message: event.payload?.message || 'Sin mensaje',
        timestamp: event.timestamp,
      })),
    [sortedEvents]
  );

  return (
    <AppShell>
      <div className="space-y-5 pb-6">
        <Hero
          totalEvents={metrics.totalEvents}
          liveEventsLastMinute={metrics.liveEventsLastMinute}
          activeTasks={metrics.activeTasks}
          blockedTasks={metrics.blockedTasks}
          isConnected={isConnected}
        />

        <SummaryGrid metrics={metrics.metrics} isLoading={isLoading} />

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Suspense fallback={<PanelFallback label="Cargando panel de agente" />}>
              <AgentStage
                focusedAgent={focused?.name || null}
                agentStatus={focused?.status || 'idle'}
                taskId={focused?.latest.taskId}
                recentActivity={recentActivity}
                teamMembers={agentCards.map((agent) => ({
                  name: agent.name,
                  status: agent.status,
                  taskCount: agent.taskCount,
                }))}
                onAgentClick={setSelectedAgent}
                onViewDetails={() => {
                  if (focused?.latest.taskId) {
                    navigator.clipboard.writeText(focused.latest.taskId);
                  }
                }}
              />
            </Suspense>
          </div>

            <Suspense fallback={<PanelFallback label="Cargando panel critico" />}>
            <CriticalPanel events={liveEvents} />
          </Suspense>
        </div>

        <Suspense fallback={<PanelFallback label="Cargando linea de tiempo" />}>
          <Timeline events={liveEvents} />
        </Suspense>

        <Suspense fallback={<PanelFallback label="Cargando grupos de tareas" />}>
          <TaskGroups filters={DEFAULT_GROUP_FILTERS} events={liveEvents} />
        </Suspense>
      </div>
    </AppShell>
  );
}

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
      {label}...
    </div>
  );
}

export default App;
