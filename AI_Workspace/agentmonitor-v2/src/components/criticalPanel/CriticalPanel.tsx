import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { McpEvent } from '@/types/mcp';
import { getTimestampMs } from '@/lib/timestamp';
import { AlertGroup } from './AlertGroup';
import { QuickResolve } from './QuickResolve';
import type { AlertGroupModel, AlertSeverity } from './types';

interface CriticalPanelProps {
  events: McpEvent[];
}

const severityOrder: Record<AlertSeverity, number> = {
  incident: 0,
  blocked: 1,
  'test-failed': 2,
};

const severityLabels: Record<AlertSeverity, string> = {
  incident: 'Incidente abierto',
  blocked: 'Tarea bloqueada',
  'test-failed': 'Test fallido',
};

function toSeverity(event: McpEvent): AlertSeverity | null {
  const status = event.status || event.type;
  if (status === 'INCIDENT_OPENED') {
    return 'incident';
  }
  if (status === 'TASK_BLOCKED') {
    return 'blocked';
  }
  if (status === 'TEST_FAILED') {
    return 'test-failed';
  }
  return null;
}

export function CriticalPanel({ events }: CriticalPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<AlertGroupModel | null>(null);

  const groupedAlerts = useMemo(() => {
    const relevant = events.filter((event) => toSeverity(event) !== null);
    const grouped = new Map<string, AlertGroupModel>();

    for (const event of relevant) {
      const severity = toSeverity(event);
      if (!severity) {
        continue;
      }

      const status = event.status || event.type;
      const key =
        status === 'TASK_BLOCKED'
          ? `${status}:${event.agent}`
          : `${status}:${event.taskId}`;

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key,
          severity,
          label: severityLabels[severity],
          count: 1,
          latest: event,
          events: [event],
        });
        continue;
      }

      const currentLatestTime = getTimestampMs(existing.latest.timestamp) ?? Number.NEGATIVE_INFINITY;
      const incomingTime = getTimestampMs(event.timestamp) ?? Number.NEGATIVE_INFINITY;
      existing.count += 1;
      existing.events.push(event);
      if (incomingTime > currentLatestTime) {
        existing.latest = event;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const bySeverity = severityOrder[a.severity] - severityOrder[b.severity];
      if (bySeverity !== 0) {
        return bySeverity;
      }
      const left = getTimestampMs(a.latest.timestamp) ?? Number.NEGATIVE_INFINITY;
      const right = getTimestampMs(b.latest.timestamp) ?? Number.NEGATIVE_INFINITY;
      return right - left;
    });
  }, [events]);

  const incidentCount = groupedAlerts.filter((alert) => alert.severity === 'incident').length;
  const blockedCount = groupedAlerts.filter((alert) => alert.severity === 'blocked').length;

  return (
    <Card className="relative overflow-hidden" data-testid="critical-panel">
      <CardHeader data-testid="critical-panel-header">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Panel critico</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {incidentCount > 0 ? (
              <motion.span
                initial={{ opacity: 0.3, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror' }}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-500"
              >
                {incidentCount} incidente
              </motion.span>
            ) : null}
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-500">
              {blockedCount} bloqueadas
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {groupedAlerts.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No hay alertas criticas por ahora.
            </p>
          ) : (
            groupedAlerts.map((alert) => (
              <AlertGroup key={alert.key} alert={alert} onOpen={setSelectedAlert} />
            ))
          )}
        </div>
      </CardContent>

      <QuickResolve alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </Card>
  );
}
