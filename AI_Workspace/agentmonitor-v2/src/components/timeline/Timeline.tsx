import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimelineEvent } from './TimelineEvent';
import { TimelineFilters } from './TimelineFilters';
import type { McpEvent } from '@/types/mcp';

interface TimelineProps {
  events: McpEvent[];
}

const CLUSTER_THRESHOLD_MS = 5000;

interface EventCluster {
  id: string;
  events: McpEvent[];
  timestamp: Date;
}

export function Timeline({ events }: TimelineProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (activeFilters.length > 0) {
      filtered = filtered.filter((event) => 
        activeFilters.includes(event.status || event.type)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => 
        event.taskId.toLowerCase().includes(query) ||
        event.payload?.message?.toLowerCase().includes(query) ||
        event.agent.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [events, activeFilters, searchQuery]);

  const clusters = useMemo(() => {
    const result: EventCluster[] = [];
    let currentCluster: EventCluster | null = null;

    filteredEvents.forEach((event, index) => {
      const eventTime = new Date(event.timestamp).getTime();

      if (!currentCluster) {
        currentCluster = {
          id: `cluster-${index}`,
          events: [event],
          timestamp: new Date(event.timestamp),
        };
      } else {
        const clusterTime = currentCluster.timestamp.getTime();
        if (eventTime - clusterTime < CLUSTER_THRESHOLD_MS) {
          currentCluster.events.push(event);
        } else {
          result.push(currentCluster);
          currentCluster = {
            id: `cluster-${index}`,
            events: [event],
            timestamp: new Date(event.timestamp),
          };
        }
      }
    });

    if (currentCluster) {
      result.push(currentCluster);
    }

    return result;
  }, [filteredEvents]);

  const handleFilterChange = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const totalNewEvents = filteredEvents.filter((_, i) => i < 3).length;

  return (
    <Card data-testid="timeline-panel">
      <CardHeader data-testid="timeline-header">
        <div className="flex items-center justify-between">
          <CardTitle>Linea de tiempo</CardTitle>
          <span className="text-sm text-muted-foreground">
            {filteredEvents.length} eventos
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TimelineFilters
          activeFilters={activeFilters}
          searchQuery={searchQuery}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearchQuery}
          onClearFilters={() => setActiveFilters([])}
        />

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {clusters.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.id);
            const isClustered = cluster.events.length > 1;

            return (
              <div key={cluster.id}>
                {isClustered ? (
                  <div>
                    <button
                      onClick={() => toggleCluster(cluster.id)}
                      className="flex items-center gap-2 w-full p-2 text-left text-sm text-muted-foreground hover:bg-accent rounded-lg"
                    >
                      <span className="text-xs">
                        {cluster.events.length} eventos a las{' '}
                        {new Date(cluster.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="pl-4">
                        {cluster.events.map((event, idx) => (
                          <TimelineEvent
                            key={`${event.eventId}-${idx}`}
                            event={event}
                            isNew={idx < totalNewEvents}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <TimelineEvent
                    event={cluster.events[0]}
                    isNew={true}
                  />
                )}
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Ningun evento coincide con los filtros
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
