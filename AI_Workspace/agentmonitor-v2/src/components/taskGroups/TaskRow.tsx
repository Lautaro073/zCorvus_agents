import { Badge } from '@/components/ui/badge';
import { DependencyBadge } from './DependencyBadge';
import type { McpEvent, McpStatus } from '@/types/mcp';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskRowProps {
  event: McpEvent;
  onClick?: (event: McpEvent) => void;
}

const STATUS_COLORS: Record<string, string> = {
  TASK_COMPLETED: 'bg-green-500',
  TASK_IN_PROGRESS: 'bg-blue-500',
  TASK_BLOCKED: 'bg-red-500',
  TASK_ASSIGNED: 'bg-gray-500',
  TASK_ACCEPTED: 'bg-yellow-500',
  TEST_PASSED: 'bg-green-600',
  TEST_FAILED: 'bg-red-600',
  INCIDENT_OPENED: 'bg-red-700',
};

export function TaskRow({ event, onClick }: TaskRowProps) {
  const status = (event.status || event.type) as McpStatus;
  const statusColor = STATUS_COLORS[status] || 'bg-gray-500';

  const dependsOn = event.payload?.dependsOn as string[] | undefined;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
        <div className="min-w-0">
          <div className="font-mono text-sm truncate">{event.taskId}</div>
          <div className="text-xs text-muted-foreground truncate">
            {event.payload?.message || event.type}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {dependsOn && <DependencyBadge dependsOn={dependsOn} />}
        <Badge variant="outline" className="text-xs">
          {event.assignedTo || event.agent}
        </Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  );
}
