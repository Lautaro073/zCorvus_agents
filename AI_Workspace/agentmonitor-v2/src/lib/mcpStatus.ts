import type { McpEvent } from '@/types/mcp';

const STATUS_ALIASES: Record<string, string> = {
  assigned: 'TASK_ASSIGNED',
  task_assigned: 'TASK_ASSIGNED',
  accepted: 'TASK_ACCEPTED',
  task_accepted: 'TASK_ACCEPTED',
  in_progress: 'TASK_IN_PROGRESS',
  inprogress: 'TASK_IN_PROGRESS',
  task_in_progress: 'TASK_IN_PROGRESS',
  completed: 'TASK_COMPLETED',
  task_completed: 'TASK_COMPLETED',
  blocked: 'TASK_BLOCKED',
  task_blocked: 'TASK_BLOCKED',
  cancelled: 'TASK_CANCELLED',
  canceled: 'TASK_CANCELLED',
  task_cancelled: 'TASK_CANCELLED',
  test_passed: 'TEST_PASSED',
  passed: 'TEST_PASSED',
  test_failed: 'TEST_FAILED',
  failed: 'TEST_FAILED',
  incident_opened: 'INCIDENT_OPENED',
  incident_resolved: 'INCIDENT_RESOLVED',
  doc_updated: 'DOC_UPDATED',
  artifact_published: 'ARTIFACT_PUBLISHED',
  plan_proposed: 'PLAN_PROPOSED',
  subtask_requested: 'SUBTASK_REQUESTED',
};

function normalizeStatusKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeMcpStatus(status: string | null | undefined): string {
  if (!status) {
    return 'UNKNOWN';
  }

  const key = normalizeStatusKey(status);
  if (!key) {
    return 'UNKNOWN';
  }

  return STATUS_ALIASES[key] ?? key.toUpperCase();
}

export function getNormalizedEventStatus(event: Pick<McpEvent, 'status' | 'type'>): string {
  return normalizeMcpStatus(event.status || event.type);
}
