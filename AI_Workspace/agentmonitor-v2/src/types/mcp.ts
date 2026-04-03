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

export type ContextDecisionSafety = 'safe_for_triage' | 'read_only' | 'requires_expansion';

export interface ContextReadAudit {
  readMode?: 'snapshot_first' | 'broad_scan_fallback' | string;
  broadFallbackUsed?: boolean;
  fallbackReason?: string | null;
  source?: string | null;
}

export interface ContextSafetyPolicy {
  operationalState?: 'normal' | 'stale' | 'degraded' | 'stale+degraded' | string;
  allowReadOnly?: boolean;
  allowTriage?: boolean;
  allowWriteback?: boolean;
  forceRebuild?: boolean;
  forceJsonlExpansion?: boolean;
  criticalStale?: boolean;
  sensitiveAction?: boolean;
}

export interface ContextExpansionHint {
  scope?: 'task' | 'correlation' | 'agent' | string;
  query?: string;
  reason?: 'truncated' | 'stale' | 'degraded' | 'consumer_request' | string;
  recommendedLimit?: number;
}

export interface ContextSnapshotEnvelope {
  view: 'agent_inbox' | 'task_snapshot' | 'correlation_snapshot' | string;
  schemaVersion: string;
  generatedAt: string;
  buildVersion: string;
  maxAgeMs: number;
  sourceEventId: string | null;
  sourceWatermark: string | null;
  integrityHash: string;
  rebuiltAt: string;
  stale: boolean;
  degradedMode: boolean;
  decisionSafety: ContextDecisionSafety;
  truncated: boolean;
  nextExpansionHint: ContextExpansionHint | null;
  safetyPolicy?: ContextSafetyPolicy;
  readAudit?: ContextReadAudit;
}

export interface AgentInboxTaskSummary {
  taskId: string;
  correlationId: string;
  status: string;
  priority?: string | null;
  latestEventType: string;
  latestSummary?: string | null;
  updatedAt: string;
  nextAction?: string | null;
  artifactPaths?: string[];
}

export interface AgentInboxSnapshot extends ContextSnapshotEnvelope {
  view: 'agent_inbox';
  agent: AgentName;
  openTaskCount: number;
  blockedTaskCount: number;
  needsAttentionCount: number;
  tasks: AgentInboxTaskSummary[];
}

export interface TaskSnapshot extends ContextSnapshotEnvelope {
  view: 'task_snapshot';
  task: {
    taskId: string;
    correlationId: string;
    assignedTo: AgentName | null;
    status: string;
    priority?: string | null;
    parentTaskId?: string | null;
    dependsOn?: string[];
    description?: string | null;
    acceptanceCriteria?: string[];
    latestEventType: string;
    latestSummary?: string | null;
    updatedAt: string;
    blockers?: string[];
    nextAction?: string | null;
    artifactPaths?: string[];
  } | null;
}

export interface CorrelationSnapshot extends ContextSnapshotEnvelope {
  view: 'correlation_snapshot';
  correlationId: string | null;
  overallStatus: string;
  activeTaskCount: number;
  blockedTaskCount: number;
  lastUpdatedAt: string | null;
  criticalUpdates: Array<{
    taskId: string;
    status: string;
    summary: string | null;
  }>;
  tasks: Array<{
    taskId: string;
    assignedTo: AgentName | null;
    status: string;
    latestSummary: string | null;
    updatedAt: string | null;
  }>;
}

export interface ContextViewHealth {
  key: string;
  label: string;
  view: string;
  decisionSafety: ContextDecisionSafety;
  stale: boolean;
  degradedMode: boolean;
  truncated: boolean;
  broadFallbackUsed: boolean;
  readMode: string;
}

export interface DebugExpansionAudit {
  id: string;
  createdAt: string;
  taskId: string;
  correlationId: string;
  readMode: string;
  broadFallbackUsed: boolean;
  decisionSafety: ContextDecisionSafety;
  stale: boolean;
  degradedMode: boolean;
  truncated: boolean;
  expandedEventsCount: number;
}

export interface ContextObservabilityAlert {
  id: string;
  severity: 'warning' | 'critical' | string;
  status: 'active' | string;
  message: string;
  value: number;
  threshold: number;
  runbookPath: string;
}

export interface ContextObservabilityReport {
  generatedAt: string;
  policyVersion: string;
  sampleLimit: number;
  sampleSizes: {
    snapshotReads: number;
    sidecarCycles: number;
    apiEventsReads: number;
  };
  sli: {
    staleRate: number;
    degradedRate: number;
    truncatedRate: number;
    broadFallbackRate: number;
    rebuildSuccessRate: number;
    watermarkLagEventsP95: number;
    watermarkLagEventsCurrent: number;
    watermarkLagMsCurrent: number | null;
    legacyModeHitRate: number;
  };
  thresholds: Record<string, { warning: number; critical: number }>;
  alerts: ContextObservabilityAlert[];
  runbooks: {
    primary: string;
    spec: string;
  };
}

export interface WaveCanaryReport {
  policyVersion: string;
  evaluatedAt: string;
  activeWaveId: string;
  finalRunbookPath: string;
  freeze: {
    active: boolean;
    reasons: string[];
    criteria: {
      autoFreezeOnCriticalIncident: boolean;
      autoFreezeOnCriticalObservabilityAlert: boolean;
      staleSpikeRule: {
        enabled: boolean;
        signal: string;
        thresholdReference: string;
        durationMinutes: number;
      };
    };
  };
  observedSignals: {
    lookbackHours: number;
    incidents: {
      warning: number;
      medium: number;
      high: number;
      critical: number;
    };
    activeCriticalObservabilityAlerts: number;
    staleSpikeActive: boolean;
  };
  waves: Array<{
    waveId: string;
    stage: string;
    blastRadius: string;
    initialScope: string[];
    minObservation: {
      hours: number;
      description: string;
    };
    incidentThreshold: {
      medium: number;
      high: number;
      critical: number;
    };
    rollbackThreshold: Record<string, unknown>;
    approvalOwner: string;
    incidentWindowHours: number;
    observedIncidents: {
      medium: number;
      high: number;
      critical: number;
    };
    thresholdBreaches: {
      mediumExceeded: boolean;
      highExceeded: boolean;
      criticalExceeded: boolean;
    };
    rollbackReasons: string[];
    rolloutAction: 'continue' | 'hold' | 'rollback' | string;
    isActiveWave: boolean;
  }>;
}
