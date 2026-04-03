import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentInboxSnapshot,
  buildCorrelationSnapshot,
  buildTaskSnapshot,
} from "../MCP_Server/lib/context-read-modes.js";

function makeSidecar(view, overrides = {}) {
  const now = new Date().toISOString();
  return {
    view,
    schemaVersion: "ctx-sidecar.v1",
    buildVersion: "context-sidecar@1.0.0",
    generatedAt: now,
    rebuiltAt: now,
    maxAgeMs: 5000,
    sourceEventId: "event-1",
    sourceWatermark: "jsonl:100",
    stale: false,
    degradedMode: false,
    truncated: false,
    ...overrides,
  };
}

const sampleTasks = [
  {
    taskId: "task-blocked",
    correlationId: "corr-1",
    assignedTo: "AI_Workspace_Optimizer",
    status: "blocked",
    priority: "high",
    latestEventType: "TASK_BLOCKED",
    latestSummary: "Blocked by dependency",
    updatedAt: "2026-04-02T06:00:00.000Z",
    nextAction: "Unblock",
    artifactPaths: [],
  },
  {
    taskId: "task-newest",
    correlationId: "corr-1",
    assignedTo: "AI_Workspace_Optimizer",
    status: "in_progress",
    priority: "high",
    latestEventType: "TASK_IN_PROGRESS",
    latestSummary: "Working",
    updatedAt: "2026-04-02T07:00:00.000Z",
    nextAction: "Continue",
    artifactPaths: [],
  },
  {
    taskId: "task-second",
    correlationId: "corr-1",
    assignedTo: "AI_Workspace_Optimizer",
    status: "in_progress",
    priority: "medium",
    latestEventType: "TASK_IN_PROGRESS",
    latestSummary: "Working too",
    updatedAt: "2026-04-02T06:50:00.000Z",
    nextAction: "Continue",
    artifactPaths: [],
  },
];

function makeSidecars(overrides = {}) {
  const latestByTask = makeSidecar("latest_by_task", {
    tasks: sampleTasks,
    ...overrides.latestByTask,
  });

  return {
    latestByTask,
    latestByCorrelation: makeSidecar("latest_by_correlation", {
      correlations: [
        {
          correlationId: "corr-1",
          overallStatus: "in_progress",
          lastUpdatedAt: "2026-04-02T07:00:00.000Z",
          tasks: sampleTasks,
        },
      ],
      ...overrides.latestByCorrelation,
    }),
    openByAgent: makeSidecar("open_by_agent", {
      agents: [
        {
          agent: "AI_Workspace_Optimizer",
          tasks: sampleTasks,
        },
      ],
      ...overrides.openByAgent,
    }),
  };
}

test("decision matrix marks normal snapshots as safe_for_triage", () => {
  const snapshot = buildTaskSnapshot({
    taskId: "task-newest",
    sidecars: makeSidecars(),
    events: [],
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.equal(snapshot.decisionSafety, "safe_for_triage");
  assert.equal(snapshot.safetyPolicy.operationalState, "normal");
  assert.equal(snapshot.safetyPolicy.allowWriteback, true);
});

test("stale sensitive snapshot forces expansion policy", () => {
  const snapshot = buildTaskSnapshot({
    taskId: "task-newest",
    sidecars: makeSidecars({
      latestByTask: { stale: true },
    }),
    events: [],
    sensitiveAction: true,
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.equal(snapshot.decisionSafety, "read_only");
  assert.equal(snapshot.safetyPolicy.operationalState, "stale");
  assert.equal(snapshot.safetyPolicy.forceJsonlExpansion, true);
  assert.equal(snapshot.safetyPolicy.forceRebuild, true);
});

test("stale+degraded snapshot requires expansion", () => {
  const snapshot = buildTaskSnapshot({
    taskId: "task-newest",
    sidecars: makeSidecars({
      latestByTask: { stale: true },
    }),
    events: [],
    initialDegradedMode: true,
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.equal(snapshot.decisionSafety, "requires_expansion");
  assert.equal(snapshot.safetyPolicy.operationalState, "stale+degraded");
  assert.equal(snapshot.safetyPolicy.allowTriage, false);
  assert.equal(snapshot.safetyPolicy.forceJsonlExpansion, true);
});

test("agent inbox keeps critical tasks when truncated", () => {
  const snapshot = buildAgentInboxSnapshot({
    assignedTo: "AI_Workspace_Optimizer",
    limit: 2,
    sidecars: makeSidecars(),
    events: [],
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  const taskIds = snapshot.tasks.map((task) => task.taskId);
  assert.equal(snapshot.truncated, true);
  assert.ok(taskIds.includes("task-blocked"));
});

test("task snapshot exposes compact handoff summary", () => {
  const snapshot = buildTaskSnapshot({
    taskId: "task-newest",
    sidecars: makeSidecars(),
    events: [],
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.ok(snapshot.handoff);
  assert.equal(typeof snapshot.handoff.summary, "string");
  assert.equal(snapshot.handoff.summary.length <= 220, true);
  assert.equal(snapshot.task.handoffSummary, snapshot.handoff.summary);
});

test("task handoff summary remains available for completed tasks", () => {
  const completedTasks = sampleTasks.map((task) =>
    task.taskId === "task-second"
      ? {
          ...task,
          status: "completed",
          latestSummary: "Finished rollout",
        }
      : task
  );

  const sidecars = makeSidecars({
    latestByTask: { tasks: completedTasks },
    latestByCorrelation: {
      correlations: [
        {
          correlationId: "corr-1",
          overallStatus: "in_progress",
          lastUpdatedAt: "2026-04-02T07:00:00.000Z",
          tasks: completedTasks,
        },
      ],
    },
    openByAgent: {
      agents: [
        {
          agent: "AI_Workspace_Optimizer",
          tasks: completedTasks,
        },
      ],
    },
  });

  const snapshot = buildTaskSnapshot({
    taskId: "task-second",
    sidecars,
    events: [],
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.equal(snapshot.task.status, "completed");
  assert.equal(typeof snapshot.handoff.summary, "string");
  assert.equal(snapshot.handoff.summary.length <= 220, true);
});

test("agent inbox enforces hard budget and returns nextCursor", () => {
  const snapshot = buildAgentInboxSnapshot({
    assignedTo: "AI_Workspace_Optimizer",
    limit: 10,
    sidecars: makeSidecars(),
    events: [],
    viewBudgets: {
      agent_inbox: {
        targetTokens: 40,
        hardTokens: 60,
      },
    },
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  assert.equal(snapshot.truncated, true);
  assert.ok(snapshot.nextCursor);
  assert.equal(snapshot.nextCursor.scope, "tasks");
  assert.ok(snapshot.tokenBudget);
  assert.equal(snapshot.tokenBudget.policyVersion, "ctx-budget.v1");
  assert.equal(snapshot.tokenBudget.truncatedByBudget, true);
});

test("correlation snapshot keeps critical task under hard budget", () => {
  const snapshot = buildCorrelationSnapshot({
    correlationId: "corr-1",
    limit: 10,
    sidecars: makeSidecars(),
    events: [],
    viewBudgets: {
      policyVersion: "ctx-budget.v1",
      views: {
        correlation_snapshot: {
          targetTokens: 300,
          hardTokens: 700,
        },
      },
    },
    sanitizeSummary: (summary) => ({ summary, redacted: false, memorySafetyFlag: false }),
  });

  const taskIds = (snapshot.tasks || []).map((task) => task.taskId);
  assert.ok(taskIds.includes("task-blocked"));
  assert.ok(snapshot.tokenBudget);
  assert.equal(snapshot.tokenBudget.policyVersion, "ctx-budget.v1");
  assert.equal(snapshot.tokenBudget.withinHardLimit, true);
  if (snapshot.tokenBudget.truncatedByBudget) {
    assert.ok(snapshot.nextCursor);
  }
});
