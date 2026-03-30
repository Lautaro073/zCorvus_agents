import { useMemo } from 'react';
import { useMonitorStore } from '@/store/monitorStore';
import type { AgentName, McpStatus } from '@/types/mcp';

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
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime > latest ? eventTime : latest;
    }, 0);

    if (!referenceTimestamp) {
      return events;
    }

    const cutoff = referenceTimestamp - getTimeRangeMs(timeRange);
    return events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
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
      if (event.status === 'TASK_COMPLETED') {
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
      if (event.type === 'TASK_IN_PROGRESS' && !task.start) {
        task.start = event.timestamp;
        task.agent = (event.assignedTo || event.agent) as AgentName;
      }
      if (event.status === 'TASK_COMPLETED') {
        task.end = event.timestamp;
      }
    });

    return Array.from(taskMap.entries())
      .filter(([, task]) => task.start && task.end)
      .map(([taskId, task]) => ({
        taskId,
        agent: task.agent,
        duration: new Date(task.end!).getTime() - new Date(task.start).getTime(),
        completedAt: task.end!,
      }));
  }, [filteredEvents]);

  const statusDistribution = useMemo((): StatusDistribution[] => {
    const statusMap = new Map<McpStatus, number>();

    filteredEvents.forEach((event) => {
      const status = (event.status || event.type.replace('TASK_', 'TASK_')) as McpStatus;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const bottlenecks = useMemo((): BottleneckData[] => {
    const agentMap = new Map<AgentName, { blockedCount: number; blockedTasks: string[] }>();

    filteredEvents.forEach((event) => {
      if (event.status === 'TASK_BLOCKED') {
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
    const completed = filteredEvents.filter((e) => e.status === 'TASK_COMPLETED').length;
    const blocked = filteredEvents.filter((e) => e.status === 'TASK_BLOCKED').length;
    const inProgress = filteredEvents.filter((e) => e.status === 'TASK_IN_PROGRESS').length;

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
