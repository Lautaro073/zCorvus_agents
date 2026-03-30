import { useMemo } from 'react';
import type { McpEvent } from '@/types/mcp';

const ACTIVE_STATUSES = new Set(['TASK_ASSIGNED', 'TASK_ACCEPTED', 'TASK_IN_PROGRESS']);

function getEventStatus(event: McpEvent): string {
  return event.status || event.type || 'UNKNOWN';
}

function toMinuteBucket(timestamp: string): string {
  const date = new Date(timestamp);
  date.setSeconds(0, 0);
  return date.toISOString();
}

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
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const taskLatestStatus = new Map<string, string>();
    const taskAssignedAt = new Map<string, number>();
    const taskCompletedAt = new Map<string, number>();

    const minuteCounts = new Map<string, number>();

    for (const event of sorted) {
      const status = getEventStatus(event);
      taskLatestStatus.set(event.taskId, status);

      const eventTime = new Date(event.timestamp).getTime();
      if (status === 'TASK_ASSIGNED' && !taskAssignedAt.has(event.taskId)) {
        taskAssignedAt.set(event.taskId, eventTime);
      }
      if (status === 'TASK_COMPLETED') {
        taskCompletedAt.set(event.taskId, eventTime);
      }

      const bucket = toMinuteBucket(event.timestamp);
      minuteCounts.set(bucket, (minuteCounts.get(bucket) || 0) + 1);
    }

    const latestStatuses = Array.from(taskLatestStatus.values());
    const activeTasks = latestStatuses.filter((status) => ACTIVE_STATUSES.has(status)).length;
    const blockedTasks = latestStatuses.filter((status) => status === 'TASK_BLOCKED').length;
    const completedTasks = latestStatuses.filter((status) => status === 'TASK_COMPLETED').length;

    const completionRate =
      latestStatuses.length > 0 ? Math.round((completedTasks / latestStatuses.length) * 100) : 0;

    const now = sorted.length > 0 ? new Date(sorted[sorted.length - 1].timestamp).getTime() : 0;
    const oneMinuteAgo = now - 60_000;
    const liveEventsLastMinute = events.filter(
      (event) => new Date(event.timestamp).getTime() >= oneMinuteAgo
    ).length;

    const recentBuckets: { minute: string; value: number }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const bucketDate = new Date(now - i * 60_000);
      bucketDate.setSeconds(0, 0);
      const key = bucketDate.toISOString();
      recentBuckets.push({
        minute: bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: minuteCounts.get(key) || 0,
      });
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
