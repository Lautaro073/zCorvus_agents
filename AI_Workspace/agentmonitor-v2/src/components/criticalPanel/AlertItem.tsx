import { AlertCircle, Ban, FlaskConical, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/timestamp';
import type { AlertGroupModel, AlertSeverity } from './types';

const severityMeta: Record<AlertSeverity, { label: string; icon: LucideIcon; dotClass: string }> = {
  incident: { label: 'Incidente', icon: AlertCircle, dotClass: 'bg-red-500' },
  blocked: { label: 'Bloqueada', icon: Ban, dotClass: 'bg-amber-500' },
  'test-failed': { label: 'Test fallido', icon: FlaskConical, dotClass: 'bg-rose-500' },
};

interface AlertItemProps {
  alert: AlertGroupModel;
  onOpen: (alert: AlertGroupModel) => void;
}

export function AlertItem({ alert, onOpen }: AlertItemProps) {
  const meta = severityMeta[alert.severity];
  const Icon = meta.icon;
  const age = formatRelativeTime(alert.latest.timestamp);

  return (
    <button
      data-testid="critical-alert-item"
      onClick={() => onOpen(alert)}
      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
    >
      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold leading-none">{meta.label}</p>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {alert.count}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {alert.latest.payload?.message || alert.latest.status || alert.latest.type}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{alert.latest.agent}</span>
          <span>{age}</span>
        </div>
      </div>
    </button>
  );
}
