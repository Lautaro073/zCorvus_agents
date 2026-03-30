import { CharacterState } from '../../office/types.js';

export type McpEventType =
  | 'TASK_ASSIGNED'
  | 'TASK_ACCEPTED'
  | 'TASK_IN_PROGRESS'
  | 'TASK_BLOCKED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'SUBTASK_REQUESTED'
  | 'PLAN_PROPOSED'
  | 'SKILL_CREATED'
  | 'LEARNING_RECORDED'
  | 'ENDPOINT_CREATED'
  | 'UI_COMPONENT_BUILT'
  | 'SCHEMA_UPDATED'
  | 'ARTIFACT_PUBLISHED'
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'INCIDENT_OPENED'
  | 'INCIDENT_RESOLVED'
  | 'DOC_UPDATED'
  | 'GITHUB_ISSUE_CREATED'
  | 'GITHUB_BRANCH_CREATED'
  | 'GITHUB_PR_OPENED';

export type TaskStatus =
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentStateMapping {
  state: typeof CharacterState.IDLE | typeof CharacterState.WALK | typeof CharacterState.TYPE;
  tool: string | null;
  bubbleType: 'waiting' | 'permission' | null;
  alertType: 'blocked' | 'incident' | null;
  isActive: boolean;
  message?: string;
}

const MCP_TO_STATE: Record<McpEventType, AgentStateMapping> = {
  TASK_ASSIGNED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  TASK_ACCEPTED: {
    state: CharacterState.WALK,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: true,
  },
  TASK_IN_PROGRESS: {
    state: CharacterState.TYPE,
    tool: null,
    bubbleType: 'waiting',
    alertType: null,
    isActive: true,
  },
  TASK_BLOCKED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: 'blocked',
    isActive: true,
    message: 'blocked',
  },
  TASK_COMPLETED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  TASK_FAILED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: 'blocked',
    isActive: false,
    message: 'failed',
  },
  TASK_CANCELLED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  SUBTASK_REQUESTED: {
    state: CharacterState.WALK,
    tool: null,
    bubbleType: 'permission',
    alertType: null,
    isActive: true,
  },
  PLAN_PROPOSED: {
    state: CharacterState.TYPE,
    tool: 'Task',
    bubbleType: null,
    alertType: null,
    isActive: true,
  },
  SKILL_CREATED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  LEARNING_RECORDED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  ENDPOINT_CREATED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  UI_COMPONENT_BUILT: {
    state: CharacterState.TYPE,
    tool: 'Edit',
    bubbleType: null,
    alertType: null,
    isActive: true,
  },
  SCHEMA_UPDATED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  ARTIFACT_PUBLISHED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  TEST_PASSED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  TEST_FAILED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: 'waiting',
    alertType: null,
    isActive: false,
    message: 'test failed',
  },
  INCIDENT_OPENED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: 'incident',
    isActive: true,
    message: 'incident',
  },
  INCIDENT_RESOLVED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  DOC_UPDATED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
  GITHUB_ISSUE_CREATED: {
    state: CharacterState.TYPE,
    tool: 'Task',
    bubbleType: null,
    alertType: null,
    isActive: true,
  },
  GITHUB_BRANCH_CREATED: {
    state: CharacterState.TYPE,
    tool: 'Bash',
    bubbleType: null,
    alertType: null,
    isActive: true,
  },
  GITHUB_PR_OPENED: {
    state: CharacterState.IDLE,
    tool: null,
    bubbleType: null,
    alertType: null,
    isActive: false,
  },
};

export interface MappedAgentEvent {
  agentId: string;
  taskId: string;
  correlationId: string;
  state: typeof CharacterState.IDLE | typeof CharacterState.WALK | typeof CharacterState.TYPE;
  tool: string | null;
  bubbleType: 'waiting' | 'permission' | null;
  alertType: 'blocked' | 'incident' | null;
  isActive: boolean;
  message?: string;
  eventType: McpEventType;
  timestamp: string;
}

export class AgentStateMapper {
  private agentTaskMap: Map<string, string> = new Map();
  private agentCorrelationMap: Map<string, string> = new Map();
  private eventTimestamps: number[] = [];
  private budgetLimit = 60;
  private windowMs = 5000;

  mapEvent(event: {
    type: string;
    agent?: string;
    taskId?: string;
    assignedTo?: string;
    status?: string;
    correlationId?: string;
    timestamp?: string;
    message?: string;
  }): MappedAgentEvent | null {
    if (!this.checkBudget()) {
      return null;
    }

    const eventType = event.type as McpEventType;
    const mapping = MCP_TO_STATE[eventType];

    if (!mapping) {
      return null;
    }

    const agentId = event.assignedTo || event.agent || 'unknown';
    const taskId = event.taskId || '';
    const correlationId = event.correlationId || '';

    this.agentTaskMap.set(agentId, taskId);
    this.agentCorrelationMap.set(agentId, correlationId);

    return {
      agentId,
      taskId,
      correlationId,
      state: mapping.state,
      tool: mapping.tool,
      bubbleType: mapping.bubbleType,
      alertType: mapping.alertType,
      isActive: mapping.isActive,
      message: mapping.message || event.message,
      eventType,
      timestamp: event.timestamp || new Date().toISOString(),
    };
  }

  getTaskId(agentId: string): string | undefined {
    return this.agentTaskMap.get(agentId);
  }

  getCorrelationId(agentId: string): string | undefined {
    return this.agentCorrelationMap.get(agentId);
  }

  getAgentState(agentId: string): AgentStateMapping | undefined {
    const taskId = this.agentTaskMap.get(agentId);
    if (!taskId) return undefined;
    return undefined;
  }

  getMappingForEventType(eventType: McpEventType): AgentStateMapping {
    return MCP_TO_STATE[eventType] || MCP_TO_STATE.TASK_ASSIGNED;
  }

  getActiveAgents(): string[] {
    return Array.from(this.agentTaskMap.keys());
  }

  private checkBudget(): boolean {
    const now = Date.now();
    this.eventTimestamps = this.eventTimestamps.filter(ts => now - ts < this.windowMs);
    
    if (this.eventTimestamps.length >= this.budgetLimit) {
      return false;
    }
    
    this.eventTimestamps.push(now);
    return true;
  }

  getBudgetStats(): { used: number; limit: number; windowMs: number } {
    const now = Date.now();
    this.eventTimestamps = this.eventTimestamps.filter(ts => now - ts < this.windowMs);
    return {
      used: this.eventTimestamps.length,
      limit: this.budgetLimit,
      windowMs: this.windowMs,
    };
  }

  setBudgetLimit(limit: number): void {
    this.budgetLimit = limit;
  }

  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
  }

  reset(): void {
    this.agentTaskMap.clear();
    this.agentCorrelationMap.clear();
    this.eventTimestamps = [];
  }
}

export function getDefaultMapping(): AgentStateMapping {
  return MCP_TO_STATE.TASK_ASSIGNED;
}

export function isTerminalState(eventType: McpEventType): boolean {
  return eventType === 'TASK_COMPLETED' ||
         eventType === 'TASK_FAILED' ||
         eventType === 'TASK_CANCELLED';
}

export function isBlockingState(eventType: McpEventType): boolean {
  return eventType === 'TASK_BLOCKED' ||
         eventType === 'INCIDENT_OPENED' ||
         eventType === 'TEST_FAILED';
}