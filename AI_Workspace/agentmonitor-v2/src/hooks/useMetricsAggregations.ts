import { useMemo } from 'react';
import { useMonitorStore } from '@/store/monitorStore';
import type { AgentName, McpStatus } from '@/types/mcp';
import { getTimestampMs } from '@/lib/timestamp';
import { getNormalizedEventStatus } from '@/lib/mcpStatus';

export interface AgentThroughput {
  agent: AgentName;
  completed: number;
  total: number;
  rate: number;
}

export interface CycleTimeData {
  taskId: string;
  agent: AgentName;
  duration: number;
  completedAt: string;
}

export interface StatusDistribution {
  status: McpStatus;
  count: number;
}

export interface BottleneckData {
  agent: AgentName;
  blockedCount: number;
  avgBlockedDuration: number;
}

type TimeRange = '1h' | '6h' | '24h';

function getTimeRangeMs(range: TimeRange): number {
  const map: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  };
  return map[range];
}

export function useMetricsAggregations(timeRange: TimeRange = '1h') {
  const events = useMonitorStore((state) => state.events);

  const filteredEvents = useMemo(() => {
    const referenceTimestamp = events.reduce((latest, event) => {
      const eventTime = getTimestampMs(event.timestamp) ?? Number.NEGATIVE_INFINITY;
      return eventTime > latest ? eventTime : latest;
    }, 0);

    if (!referenceTimestamp) {
      return events;
    }

    const cutoff = referenceTimestamp - getTimeRangeMs(timeRange);
    return events.filter((event) => {
      const eventTime = getTimestampMs(event.timestamp);
      return eventTime !== null && eventTime > cutoff;
    });
  }, [events, timeRange]);

  const throughputByAgent = useMemo((): AgentThroughput[] => {
    const agentMap = new Map<AgentName, { completed: number; total: number }>();

    filteredEvents.forEach((event) => {
      const agent = (event.assignedTo || event.agent) as AgentName;
      if (!agentMap.has(agent)) {
        agentMap.set(agent, { completed: 0, total: 0 });
      }
      const stats = agentMap.get(agent)!;
      stats.total++;
      if (getNormalizedEventStatus(event) === 'TASK_COMPLETED') {
        stats.completed++;
      }
    });

    return Array.from(agentMap.entries()).map(([agent, stats]) => ({
      agent,
      completed: stats.completed,
      total: stats.total,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }));
  }, [filteredEvents]);

  const cycleTimeData = useMemo((): CycleTimeData[] => {
    const taskMap = new Map<string, { start: string; agent: AgentName; end: string }>();

    filteredEvents.forEach((event) => {
      const taskId = event.taskId;
      if (!taskMap.has(taskId)) {
        taskMap.set(taskId, { start: event.timestamp, agent: event.agent as AgentName, end: '' });
      }
      const task = taskMap.get(taskId)!;
      if (getNormalizedEventStatus(event) === 'TASK_IN_PROGRESS' && !task.start) {
        task.start = event.timestamp;
        task.agent = (event.assignedTo || event.agent) as AgentName;
      }
      if (getNormalizedEventStatus(event) === 'TASK_COMPLETED') {
        task.end = event.timestamp;
      }
    });

    return Array.from(taskMap.entries())
      .filter(([, task]) => task.start && task.end)
      .map(([taskId, task]) => {
        const startTime = getTimestampMs(task.start);
        const endTime = getTimestampMs(task.end);
        if (startTime === null || endTime === null) {
          return null;
        }

        return {
          taskId,
          agent: task.agent,
          duration: endTime - startTime,
          completedAt: task.end,
        };
      })
      .filter((task): task is CycleTimeData => task !== null);
  }, [filteredEvents]);

  const statusDistribution = useMemo((): StatusDistribution[] => {
    const statusMap = new Map<McpStatus, number>();

    filteredEvents.forEach((event) => {
      const status = getNormalizedEventStatus(event) as McpStatus;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const bottlenecks = useMemo((): BottleneckData[] => {
    const agentMap = new Map<AgentName, { blockedCount: number; blockedTasks: string[] }>();

    filteredEvents.forEach((event) => {
      if (getNormalizedEventStatus(event) === 'TASK_BLOCKED') {
        const agent = (event.assignedTo || event.agent) as AgentName;
        if (!agentMap.has(agent)) {
          agentMap.set(agent, { blockedCount: 0, blockedTasks: [] });
        }
        const stats = agentMap.get(agent)!;
        stats.blockedCount++;
        if (!stats.blockedTasks.includes(event.taskId)) {
          stats.blockedTasks.push(event.taskId);
        }
      }
    });

    return Array.from(agentMap.entries()).map(([agent, stats]) => ({
      agent,
      blockedCount: stats.blockedCount,
      avgBlockedDuration: 0,
    }));
  }, [filteredEvents]);

  const summaryMetrics = useMemo(() => {
    const total = filteredEvents.length;
    const completed = filteredEvents.filter((event) => getNormalizedEventStatus(event) === 'TASK_COMPLETED').length;
    const blocked = filteredEvents.filter((event) => getNormalizedEventStatus(event) === 'TASK_BLOCKED').length;
    const inProgress = filteredEvents.filter(
      (event) => getNormalizedEventStatus(event) === 'TASK_IN_PROGRESS'
    ).length;

    return {
      total,
      completed,
      blocked,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [filteredEvents]);

  return {
    throughputByAgent,
    cycleTimeData,
    statusDistribution,
    bottlenecks,
    summaryMetrics,
  };
}
