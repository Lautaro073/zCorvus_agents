export type McpStatus =
  | 'TASK_ASSIGNED'
  | 'TASK_ACCEPTED'
  | 'TASK_IN_PROGRESS'
  | 'TASK_COMPLETED'
  | 'TASK_BLOCKED'
  | 'TASK_CANCELLED'
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'INCIDENT_OPENED'
  | 'INCIDENT_RESOLVED'
  | 'DOC_UPDATED'
  | 'ARTIFACT_PUBLISHED'
  | 'PLAN_PROPOSED'
  | 'SUBTASK_REQUESTED'
  | 'GITHUB_PR_OPENED'
  | 'GITHUB_ISSUE_CREATED'
  | 'GITHUB_BRANCH_CREATED'
  | 'LEARNING_RECORDED';

export type AgentName =
  | 'Orchestrator'
  | 'Planner'
  | 'Observer'
  | 'Frontend'
  | 'Backend'
  | 'Tester'
  | 'Documenter'
  | 'AI_Workspace_Optimizer';

export interface McpEvent {
  eventId?: string;
  timestamp: string;
  agent: AgentName;
  type: string;
  taskId: string;
  assignedTo?: AgentName | null;
  status?: string | null;
  correlationId: string;
  parentTaskId?: string;
  payloadVersion?: string;
  payload?: {
    message?: string;
    description?: string;
    artifactPaths?: string[];
    priority?: string;
    dependsOn?: string[];
    status?: string;
    [key: string]: unknown;
  };
}

export interface TaskSummary {
  taskId: string;
  correlationId: string;
  assignedTo: AgentName | null;
  status: McpStatus | null;
  parentTaskId: string | null;
  lastUpdate: string;
}

export interface AgentMetrics {
  agent: AgentName;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  inProgressTasks: number;
}
