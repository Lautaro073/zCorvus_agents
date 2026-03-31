import { useMemo } from 'react';
import type { McpEvent } from '@/types/mcp';
import { getMinuteBucketIso, getTimestampMs } from '@/lib/timestamp';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';

const ACTIVE_STATUSES = new Set(['TASK_ASSIGNED', 'TASK_ACCEPTED', 'TASK_IN_PROGRESS']);

export interface DashboardMetric {
  id: string;
  title: string;
  value: string;
  deltaLabel: string;
  trend: { minute: string; value: number }[];
  tone: 'neutral' | 'good' | 'warn' | 'danger';
}

export interface DashboardMetrics {
  totalEvents: number;
  activeTasks: number;
  blockedTasks: number;
  completionRate: number;
  liveEventsLastMinute: number;
  metrics: DashboardMetric[];
}

export function useDashboardMetrics(events: McpEvent[]): DashboardMetrics {
  return useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const left = getTimestampMs(a.timestamp) ?? Number.NEGATIVE_INFINITY;
      const right = getTimestampMs(b.timestamp) ?? Number.NEGATIVE_INFINITY;
      return left - right;
    });

    const taskLatestStatus = new Map<string, string>();
    const taskAssignedAt = new Map<string, number>();
    const taskCompletedAt = new Map<string, number>();

    const minuteCounts = new Map<string, number>();

    for (const event of sorted) {
      const status = getNormalizedEventStatus(event);
      taskLatestStatus.set(event.taskId, status);

      const eventTime = getTimestampMs(event.timestamp);
      if (status === 'TASK_ASSIGNED' && eventTime !== null && !taskAssignedAt.has(event.taskId)) {
        taskAssignedAt.set(event.taskId, eventTime);
      }
      if (status === 'TASK_COMPLETED' && eventTime !== null) {
        taskCompletedAt.set(event.taskId, eventTime);
      }

      const bucket = getMinuteBucketIso(event.timestamp);
      if (bucket) {
        minuteCounts.set(bucket, (minuteCounts.get(bucket) || 0) + 1);
      }
    }

    const latestStatuses = Array.from(taskLatestStatus.values());
    const activeTasks = latestStatuses.filter((status) => ACTIVE_STATUSES.has(status)).length;
    const blockedTasks = latestStatuses.filter((status) => status === 'TASK_BLOCKED').length;
    const completedTasks = latestStatuses.filter((status) => status === 'TASK_COMPLETED').length;

    const completionRate =
      latestStatuses.length > 0 ? Math.round((completedTasks / latestStatuses.length) * 100) : 0;

    const now = sorted.reduce((latest, event) => {
      const time = getTimestampMs(event.timestamp);
      if (time === null) {
        return latest;
      }
      return time > latest ? time : latest;
    }, 0);
    const oneMinuteAgo = now - 60_000;
    const liveEventsLastMinute =
      now === 0
        ? 0
        : events.filter((event) => {
            const eventTime = getTimestampMs(event.timestamp);
            return eventTime !== null && eventTime >= oneMinuteAgo;
          }).length;

    const recentBuckets: { minute: string; value: number }[] = [];
    if (now === 0) {
      for (let i = 0; i < 12; i += 1) {
        recentBuckets.push({
          minute: 'sin fecha',
          value: 0,
        });
      }
    } else {
      for (let i = 11; i >= 0; i -= 1) {
        const bucketDate = new Date(now - i * 60_000);
        bucketDate.setSeconds(0, 0);
        const key = bucketDate.toISOString();
        recentBuckets.push({
          minute: bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: minuteCounts.get(key) || 0,
        });
      }
    }

    const cycleTimes: number[] = [];
    for (const [taskId, completedAt] of taskCompletedAt.entries()) {
      const assignedAt = taskAssignedAt.get(taskId);
      if (assignedAt) {
        cycleTimes.push(Math.max(1, Math.round((completedAt - assignedAt) / 60_000)));
      }
    }

    const avgCycleTime =
      cycleTimes.length > 0
        ? (cycleTimes.reduce((acc, value) => acc + value, 0) / cycleTimes.length).toFixed(1)
        : '0.0';

    return {
      totalEvents: events.length,
      activeTasks,
      blockedTasks,
      completionRate,
      liveEventsLastMinute,
      metrics: [
        {
          id: 'active-tasks',
          title: 'Tareas activas',
          value: activeTasks.toString(),
          deltaLabel: `${liveEventsLastMinute} eventos/min`,
          trend: recentBuckets,
          tone: activeTasks > 0 ? 'good' : 'neutral',
        },
        {
          id: 'blocked-tasks',
          title: 'Tareas bloqueadas',
          value: blockedTasks.toString(),
          deltaLabel: blockedTasks > 0 ? 'Requiere atencion' : 'Estable',
          trend: recentBuckets.map((point) => ({
            minute: point.minute,
            value: Math.min(blockedTasks, point.value),
          })),
          tone: blockedTasks > 0 ? 'danger' : 'good',
        },
        {
          id: 'completion-rate',
          title: 'Tasa de cierre',
          value: `${completionRate}%`,
          deltaLabel: `${completedTasks} completadas`,
          trend: recentBuckets.map((point) => ({
            minute: point.minute,
            value: Math.min(100, point.value * 10),
          })),
          tone: completionRate >= 70 ? 'good' : 'warn',
        },
        {
          id: 'avg-cycle-time',
          title: 'Tiempo promedio',
          value: `${avgCycleTime}m`,
          deltaLabel: 'Asignada -> completada',
          trend: recentBuckets.map((point) => ({
            minute: point.minute,
            value: Number(avgCycleTime) || point.value,
          })),
          tone: 'neutral',
        },
      ],
    };
  }, [events]);
}
