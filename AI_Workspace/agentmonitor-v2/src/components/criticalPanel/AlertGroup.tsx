import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AlertItem } from './AlertItem';
import type { AlertGroupModel } from './types';

interface AlertGroupProps {
  alert: AlertGroupModel;
  onOpen: (alert: AlertGroupModel) => void;
}

export function AlertGroup({ alert, onOpen }: AlertGroupProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{alert.label}</p>
        {alert.events.length > 1 ? (
          <button
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {expanded ? 'Ocultar' : 'Expandir'}
          </button>
        ) : null}
      </div>

      <AlertItem alert={alert} onOpen={onOpen} />

      {expanded ? (
        <div className="space-y-1 rounded-lg border border-dashed p-2">
          {alert.events.slice(0, 4).map((event, index) => (
            <div key={`${event.eventId || event.timestamp}-${index}`} className="text-xs text-muted-foreground">
              {event.taskId} - {event.payload?.message || event.status || event.type}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
