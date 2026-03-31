// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { McpEvent } from '@/types/mcp';
import { useDashboardMetrics } from './useDashboardMetrics';

describe('useDashboardMetrics', () => {
  it('ignores malformed timestamps without crashing', () => {
    const events: McpEvent[] = [
      {
        timestamp: '2026-03-31T00:00:00.000Z',
        agent: 'Frontend',
        type: 'TASK_ASSIGNED',
        taskId: 'task-1',
        correlationId: 'corr-1',
        status: 'TASK_ASSIGNED',
      },
      {
        timestamp: 'INVALID_TIMESTAMP',
        agent: 'Frontend',
        type: 'TASK_IN_PROGRESS',
        taskId: 'task-2',
        correlationId: 'corr-1',
        status: 'TASK_IN_PROGRESS',
      },
      {
        timestamp: '2026-03-31T00:02:00.000Z',
        agent: 'Frontend',
        type: 'TASK_COMPLETED',
        taskId: 'task-1',
        correlationId: 'corr-1',
        status: 'TASK_COMPLETED',
      },
    ];

    const { result } = renderHook(() => useDashboardMetrics(events));

    expect(result.current.totalEvents).toBe(3);
    expect(result.current.activeTasks).toBe(1);
    expect(result.current.metrics).toHaveLength(4);
    expect(result.current.metrics[0].trend).toHaveLength(12);
  });

  it('normalizes lowercase statuses so KPI values stay in sync', () => {
    const events: McpEvent[] = [
      {
        timestamp: '2026-03-31T00:00:00.000Z',
        agent: 'Frontend',
        type: 'TASK_ASSIGNED',
        taskId: 'task-1',
        correlationId: 'corr-2',
        status: 'assigned',
      },
      {
        timestamp: '2026-03-31T00:01:00.000Z',
        agent: 'Frontend',
        type: 'TASK_IN_PROGRESS',
        taskId: 'task-1',
        correlationId: 'corr-2',
        status: 'in_progress',
      },
      {
        timestamp: '2026-03-31T00:02:00.000Z',
        agent: 'Frontend',
        type: 'TASK_COMPLETED',
        taskId: 'task-1',
        correlationId: 'corr-2',
        status: 'completed',
      },
      {
        timestamp: '2026-03-31T00:03:00.000Z',
        agent: 'Backend',
        type: 'TASK_IN_PROGRESS',
        taskId: 'task-2',
        correlationId: 'corr-2',
        status: 'in_progress',
      },
      {
        timestamp: '2026-03-31T00:04:00.000Z',
        agent: 'Tester',
        type: 'TASK_BLOCKED',
        taskId: 'task-3',
        correlationId: 'corr-2',
        status: 'blocked',
      },
    ];

    const { result } = renderHook(() => useDashboardMetrics(events));

    expect(result.current.activeTasks).toBe(1);
    expect(result.current.blockedTasks).toBe(1);
    expect(result.current.completionRate).toBe(33);
    expect(result.current.metrics.find((metric) => metric.id === 'completion-rate')?.value).toBe('33%');
  });
});
