import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Hero } from '@/components/dashboard/Hero';
import { SummaryGrid } from '@/components/dashboard/SummaryGrid';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { DEFAULT_FILTERS, type FilterState } from '@/components/filters/filterState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMcpEvents } from '@/hooks/useMcpEvents';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';
import { formatRelativeTime, formatShortTime } from '@/lib/timestamp';
import type { AgentName, McpEvent } from '@/types/mcp';

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

const SETTINGS_FILTERS_STORAGE_KEY = 'monitor-settings-filters-v2';

function loadSettingsFilters(): FilterState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_FILTERS };
  }

  const saved = window.localStorage.getItem(SETTINGS_FILTERS_STORAGE_KEY);
  if (!saved) {
    return { ...DEFAULT_FILTERS };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<FilterState>;
    return {
      agent: parsed.agent ?? null,
      status: parsed.status ?? null,
      searchQuery: parsed.searchQuery ?? '',
      quickFilters: Array.isArray(parsed.quickFilters) ? parsed.quickFilters : [],
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

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
  const status = getNormalizedEventStatus(event);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<McpEvent | null>(null);
  const [settingsFilters, setSettingsFilters] = useState<FilterState>(() => loadSettingsFilters());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncFromHash = () => {
      const fromHash = window.location.hash.replace('#', '').trim();
      if (fromHash) {
        setActiveSection(fromHash);
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SETTINGS_FILTERS_STORAGE_KEY, JSON.stringify(settingsFilters));
  }, [settingsFilters]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) {
      return liveEvents;
    }

    return liveEvents.filter((event) => {
      const message = (event.payload?.message as string | undefined)?.toLowerCase() ?? '';
      const status = (event.status || event.type || '').toLowerCase();
      return (
        event.taskId.toLowerCase().includes(normalizedQuery) ||
        event.correlationId.toLowerCase().includes(normalizedQuery) ||
        event.agent.toLowerCase().includes(normalizedQuery) ||
        message.includes(normalizedQuery) ||
        status.includes(normalizedQuery)
      );
    });
  }, [liveEvents, normalizedQuery]);

  const metrics = useDashboardMetrics(filteredEvents);
  const sortedEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [filteredEvents]
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

  const navigateToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);

    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (window.location.hash !== `#${sectionId}`) {
      window.history.replaceState(null, '', `#${sectionId}`);
    }
  }, []);

  const openEventDetails = useCallback((event: McpEvent) => {
    setSelectedEvent(event);
  }, []);

  return (
    <AppShell
      activeSection={activeSection}
      onNavigateSection={navigateToSection}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      searchResultCount={filteredEvents.length}
      notificationEvents={liveEvents}
    >
      <div className="space-y-5 pb-6">
        <section id="dashboard" className="scroll-mt-20 space-y-5" data-testid="section-dashboard">
          <Hero
            totalEvents={metrics.totalEvents}
            liveEventsLastMinute={metrics.liveEventsLastMinute}
            activeTasks={metrics.activeTasks}
            blockedTasks={metrics.blockedTasks}
            isConnected={isConnected}
          />

          <SummaryGrid metrics={metrics.metrics} isLoading={isLoading} />
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <section id="agents" className="xl:col-span-2 scroll-mt-20" data-testid="section-agents">
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
                  if (focused?.latest) {
                    openEventDetails(focused.latest);
                  }
                }}
              />
            </Suspense>
          </section>

          <section id="critical" className="scroll-mt-20" data-testid="section-critical">
            <Suspense fallback={<PanelFallback label="Cargando panel critico" />}>
              <CriticalPanel events={filteredEvents} />
            </Suspense>
          </section>
        </div>

        <section id="timeline" className="scroll-mt-20" data-testid="section-timeline">
          <Suspense fallback={<PanelFallback label="Cargando linea de tiempo" />}>
            <Timeline events={filteredEvents} onEventClick={openEventDetails} globalFilters={settingsFilters} />
          </Suspense>
        </section>

        <section id="settings" className="scroll-mt-20 space-y-2" data-testid="section-settings">
          <div className="rounded-xl border border-border/70 bg-card/40 p-3 text-sm text-muted-foreground">
            {normalizedQuery
              ? `Vista filtrada por: "${searchQuery}"`
              : 'Ajustes de vista y agrupacion de tareas'}
          </div>
          <FilterPanel value={settingsFilters} onFilterChange={setSettingsFilters} />
          <Suspense fallback={<PanelFallback label="Cargando grupos de tareas" />}>
            <TaskGroups
              filters={settingsFilters}
              events={filteredEvents}
              onEventClick={openEventDetails}
            />
          </Suspense>
        </section>
      </div>
      <EventDetailDialog
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      />
    </AppShell>
  );
}

function EventDetailDialog({
  event,
  onOpenChange,
}: {
  event: McpEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [copyState, setCopyState] = useState<{
    state: 'idle' | 'success' | 'error';
    taskId: string | null;
  }>({ state: 'idle', taskId: null });

  useEffect(() => {
    if (copyState.state === 'idle') {
      return;
    }

    const timer = window.setTimeout(
      () => setCopyState({ state: 'idle', taskId: copyState.taskId }),
      1400
    );
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    if (!event?.taskId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(event.taskId);
      setCopyState({ state: 'success', taskId: event.taskId });
    } catch {
      setCopyState({ state: 'error', taskId: event.taskId });
    }
  };

  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent data-testid="event-detail-dialog" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalle del evento</DialogTitle>
          <DialogDescription>
            {event ? `${event.agent} · ${event.type}` : 'Sin evento seleccionado'}
          </DialogDescription>
        </DialogHeader>

        {event ? (
          <div className="space-y-3 text-sm">
            <p className="font-mono text-xs text-muted-foreground">{event.taskId}</p>
            <p>{event.payload?.message || event.status || event.type}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Hora: {formatShortTime(event.timestamp)}</span>
              <span>Hace: {formatRelativeTime(event.timestamp)}</span>
              <span>Correlacion: {event.correlationId}</span>
              <span>Asignado: {event.assignedTo || event.agent}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                Copiar taskId
              </Button>
              {copyState.state === 'success' && copyState.taskId === event.taskId ? (
                <span className="text-xs text-emerald-600">Copiado</span>
              ) : null}
              {copyState.state === 'error' && copyState.taskId === event.taskId ? (
                <span className="text-xs text-destructive">No se pudo copiar</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
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
