import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';
import type { McpEvent } from '@/types/mcp';

interface TaskGroupProps {
  correlationId: string;
  events: McpEvent[];
  onEventClick?: (event: McpEvent) => void;
}

export function TaskGroup({ correlationId, events, onEventClick }: TaskGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const completedCount = events.filter((event) => getNormalizedEventStatus(event) === 'TASK_COMPLETED').length;
  const blockedCount = events.filter((event) => getNormalizedEventStatus(event) === 'TASK_BLOCKED').length;
  const inProgressCount = events.filter((event) => getNormalizedEventStatus(event) === 'TASK_IN_PROGRESS').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium font-mono text-sm">{correlationId}</span>
            <div className="flex gap-1 ml-2">
              {completedCount > 0 && (
                <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">
                  {completedCount}
                </span>
              )}
              {inProgressCount > 0 && (
                <span className="text-xs bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded">
                  {inProgressCount}
                </span>
              )}
              {blockedCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">
                  {blockedCount}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{events.length} eventos</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 space-y-1">
          {events
            .slice(0, isExpanded ? events.length : 5)
            .map((event) => (
              <TaskRow key={event.eventId || event.taskId} event={event} onClick={onEventClick} />
            ))}
          {events.length > 5 && !isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setIsExpanded(true)}
            >
              Ver {events.length - 5} mas
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
