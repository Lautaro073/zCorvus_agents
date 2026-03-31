import { useState, useMemo } from 'react';
import { useMonitorStore } from '@/store/monitorStore';
import { TaskGroup } from './TaskGroup';
import { TaskRow } from './TaskRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';
import { getTimestampMs } from '@/lib/timestamp';
import type { McpEvent, AgentName } from '@/types/mcp';
import type { FilterState } from '@/components/filters/filterState';

interface TaskGroupsProps {
  filters: FilterState;
  events?: McpEvent[];
  onEventClick?: (event: McpEvent) => void;
}

type ViewMode = 'correlation' | 'agent';

export function TaskGroups({ filters, events: inputEvents, onEventClick }: TaskGroupsProps) {
  const storeEvents = useMonitorStore((state) => state.events);
  const events = inputEvents ?? storeEvents;
  const [viewMode, setViewMode] = useState<ViewMode>('correlation');

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const normalizedStatus = getNormalizedEventStatus(event);

      if (filters.agent && event.assignedTo !== filters.agent && event.agent !== filters.agent) {
        return false;
      }
      if (filters.status && normalizedStatus !== filters.status) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !event.taskId.toLowerCase().includes(query) &&
          !event.correlationId.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filters.quickFilters.length > 0) {
        if (filters.quickFilters.includes('blocked') && normalizedStatus !== 'TASK_BLOCKED') return false;
        if (filters.quickFilters.includes('in_progress') && normalizedStatus !== 'TASK_IN_PROGRESS') return false;
        if (filters.quickFilters.includes('completed') && normalizedStatus !== 'TASK_COMPLETED') return false;
        if (filters.quickFilters.includes('incident') && !normalizedStatus.includes('INCIDENT')) return false;
      }
      return true;
    });
  }, [events, filters]);

  const groupedByCorrelation = useMemo(() => {
    const groups = new Map<string, McpEvent[]>();
    filteredEvents.forEach((event) => {
      const key = event.correlationId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    });
    return Array.from(groups.entries())
      .map(([correlationId, events]) => ({ correlationId, events }))
      .sort((a, b) => {
        const aTime = Math.max(
          ...a.events.map((event) => getTimestampMs(event.timestamp) ?? Number.NEGATIVE_INFINITY)
        );
        const bTime = Math.max(
          ...b.events.map((event) => getTimestampMs(event.timestamp) ?? Number.NEGATIVE_INFINITY)
        );
        return bTime - aTime;
      });
  }, [filteredEvents]);

  const groupedByAgent = useMemo(() => {
    const groups = new Map<AgentName, McpEvent[]>();
    filteredEvents.forEach((event) => {
      const agent = (event.assignedTo || event.agent) as AgentName;
      if (!groups.has(agent)) {
        groups.set(agent, []);
      }
      groups.get(agent)!.push(event);
    });
    return Array.from(groups.entries())
      .map(([agent, events]) => ({ agent, events }))
      .sort((a, b) => b.events.length - a.events.length);
  }, [filteredEvents]);

  return (
    <Card data-testid="task-groups-panel">
      <CardHeader data-testid="task-groups-header">
        <div className="flex items-center justify-between">
          <CardTitle>Grupos de tareas</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="correlation" data-testid="task-groups-tab-correlation">
                Por correlacion
              </TabsTrigger>
              <TabsTrigger value="agent" data-testid="task-groups-tab-agent">
                Por agente
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'correlation' ? (
          <div className="space-y-1">
            {groupedByCorrelation.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Ninguna tarea coincide con los filtros
              </div>
            ) : (
              groupedByCorrelation.map(({ correlationId, events }) => (
                <TaskGroup
                  key={correlationId}
                  correlationId={correlationId}
                  events={events}
                  onEventClick={onEventClick}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByAgent.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Ninguna tarea coincide con los filtros
              </div>
            ) : (
              groupedByAgent.map(({ agent, events }) => (
                <div key={agent}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{agent}</span>
                    <span className="text-xs text-muted-foreground">({events.length} tareas)</span>
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 10).map((event) => (
                      <TaskRow key={event.eventId || event.taskId} event={event} onClick={onEventClick} />
                    ))}
                    {events.length > 10 && (
                      <div className="text-xs text-muted-foreground pl-3">
                        +{events.length - 10} mas
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
