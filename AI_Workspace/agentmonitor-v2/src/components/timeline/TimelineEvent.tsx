import { cn } from '@/lib/utils';
import type { McpEvent } from '@/types/mcp';
import { Badge } from '@/components/ui/badge';

interface TimelineEventProps {
  event: McpEvent;
  isNew?: boolean;
  onClick?: (event: McpEvent) => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  TASK_ASSIGNED: { bg: 'bg-amber-500', text: 'text-amber-500' },
  TASK_ACCEPTED: { bg: 'bg-blue-500', text: 'text-blue-500' },
  TASK_IN_PROGRESS: { bg: 'bg-blue-600', text: 'text-blue-600' },
  TASK_COMPLETED: { bg: 'bg-emerald-500', text: 'text-emerald-500' },
  TASK_BLOCKED: { bg: 'bg-red-500', text: 'text-red-500' },
  TEST_PASSED: { bg: 'bg-emerald-500', text: 'text-emerald-500' },
  TEST_FAILED: { bg: 'bg-red-500', text: 'text-red-500' },
  INCIDENT_OPENED: { bg: 'bg-red-600', text: 'text-red-600' },
  INCIDENT_RESOLVED: { bg: 'bg-emerald-600', text: 'text-emerald-600' },
  DOC_UPDATED: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
  ARTIFACT_PUBLISHED: { bg: 'bg-purple-500', text: 'text-purple-500' },
  PLAN_PROPOSED: { bg: 'bg-pink-500', text: 'text-pink-500' },
};

const statusLabels: Record<string, string> = {
  TASK_ASSIGNED: 'Asignada',
  TASK_ACCEPTED: 'Aceptada',
  TASK_IN_PROGRESS: 'En progreso',
  TASK_COMPLETED: 'Completada',
  TASK_BLOCKED: 'Bloqueada',
  TEST_PASSED: 'Test ok',
  TEST_FAILED: 'Test fail',
  INCIDENT_OPENED: 'Incidente abierto',
  INCIDENT_RESOLVED: 'Incidente resuelto',
  DOC_UPDATED: 'Doc actualizada',
  ARTIFACT_PUBLISHED: 'Artefacto publicado',
  PLAN_PROPOSED: 'Plan propuesto',
};

export function TimelineEvent({ event, isNew = false, onClick }: TimelineEventProps) {
  const eventStatus = event.status || event.type;
  const colorScheme = statusColors[eventStatus] || { bg: 'bg-gray-500', text: 'text-gray-500' };
  
  const time = new Date(event.timestamp);
  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={cn(
        "flex gap-4 p-3 rounded-lg transition-colors hover:bg-accent cursor-pointer",
        isNew && "bg-accent/50"
      )}
      onClick={() => onClick?.(event)}
    >
      <div className="flex flex-col items-center">
        <div 
          className={cn("h-3 w-3 rounded-full", colorScheme.bg)} 
        />
        <div className="w-px h-full bg-border my-1" />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={cn("text-xs", colorScheme.text)}
          >
            {statusLabels[eventStatus] || eventStatus}
          </Badge>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>
        
        <p className="text-sm font-medium">{event.agent}</p>
        
        {event.payload?.message && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.payload.message}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{event.taskId}</span>
          {isNew && (
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
