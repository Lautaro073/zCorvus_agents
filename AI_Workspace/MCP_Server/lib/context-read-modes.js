import { createHash } from "crypto";

const READ_MODE_SCHEMA_VERSION = "ctx-contract.v1";
const READ_MODE_BUILD_VERSION = "context-read-modes@1.0.0";
const DEFAULT_MAX_AGE_MS = 5000;
const DEFAULT_LIMIT = 10;
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const CRITICAL_TASK_STATUSES = new Set(["blocked", "failed"]);
const CRITICAL_STALE_MULTIPLIER = 3;
export const VIEW_BUDGET_POLICY_VERSION = "ctx-budget.v1";

export const VIEW_BUDGET_DEFAULTS = Object.freeze({
  agent_inbox: Object.freeze({
    targetTokens: 1200,
    hardTokens: 1800,
  }),
  task_snapshot: Object.freeze({
    targetTokens: 1600,
    hardTokens: 2400,
  }),
  correlation_snapshot: Object.freeze({
    targetTokens: 2200,
    hardTokens: 3200,
  }),
});

export const HANDOFF_BUDGET_DEFAULTS = Object.freeze({
  task: Object.freeze({
    targetChars: 160,
    hardChars: 220,
  }),
  correlation: Object.freeze({
    targetChars: 200,
    hardChars: 260,
  }),
});

export const VIEW_BUDGET_TABLE_DEFAULTS = Object.freeze({
  policyVersion: VIEW_BUDGET_POLICY_VERSION,
  enabled: true,
  views: VIEW_BUDGET_DEFAULTS,
  handoff: HANDOFF_BUDGET_DEFAULTS,
});

function normalizeString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter((entry) => entry !== undefined);
}

function compactText(value, maxChars) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveBudgetTable(viewBudgets = {}) {
  if (viewBudgets && typeof viewBudgets === "object" && viewBudgets.views) {
    return {
      policyVersion: normalizeString(viewBudgets.policyVersion) || VIEW_BUDGET_POLICY_VERSION,
      enabled: viewBudgets.enabled !== false,
      views: viewBudgets.views,
      handoff:
        viewBudgets.handoff && typeof viewBudgets.handoff === "object"
          ? viewBudgets.handoff
          : HANDOFF_BUDGET_DEFAULTS,
    };
  }

  return {
    policyVersion: VIEW_BUDGET_POLICY_VERSION,
    enabled: true,
    views: viewBudgets,
    handoff: HANDOFF_BUDGET_DEFAULTS,
  };
}

function estimateTokens(value) {
  return Math.ceil(Buffer.byteLength(JSON.stringify(value), "utf-8") / 4);
}

function resolveViewBudget(viewName, viewBudgets = {}) {
  const budgetTable = resolveBudgetTable(viewBudgets);
  const defaultBudget = VIEW_BUDGET_DEFAULTS[viewName] || {
    targetTokens: 1200,
    hardTokens: 1800,
  };

  const candidate =
    budgetTable.views && typeof budgetTable.views === "object" && budgetTable.views[viewName]
      ? budgetTable.views[viewName]
      : {};
  const targetTokens = Number.isInteger(candidate.targetTokens) && candidate.targetTokens > 0
    ? candidate.targetTokens
    : defaultBudget.targetTokens;
  const hardTokens = Number.isInteger(candidate.hardTokens) && candidate.hardTokens >= targetTokens
    ? candidate.hardTokens
    : defaultBudget.hardTokens;

  return {
    enabled: budgetTable.enabled !== false,
    policyVersion: budgetTable.policyVersion,
    viewName,
    targetTokens,
    hardTokens,
  };
}

function resolveHandoffBudget(kind, viewBudgets = {}) {
  const budgetTable = resolveBudgetTable(viewBudgets);
  const defaultBudget = HANDOFF_BUDGET_DEFAULTS[kind] || {
    targetChars: 160,
    hardChars: 220,
  };
  const candidate =
    budgetTable.handoff && typeof budgetTable.handoff === "object" && budgetTable.handoff[kind]
      ? budgetTable.handoff[kind]
      : {};

  const targetChars = Number.isInteger(candidate.targetChars) && candidate.targetChars > 0
    ? candidate.targetChars
    : defaultBudget.targetChars;
  const hardChars = Number.isInteger(candidate.hardChars) && candidate.hardChars >= targetChars
    ? candidate.hardChars
    : defaultBudget.hardChars;

  return {
    targetChars,
    hardChars,
  };
}

function parseTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareByUpdatedAtDesc(left, right) {
  return parseTimestamp(right.updatedAt) - parseTimestamp(left.updatedAt);
}

function isOpenStatus(status) {
  const normalized = normalizeString(status) || "unknown";
  return !TERMINAL_STATUSES.has(normalized);
}

function isCriticalTaskStatus(status) {
  const normalized = normalizeString(status) || "unknown";
  return CRITICAL_TASK_STATUSES.has(normalized);
}

function statusLabel(status) {
  const normalized = normalizeString(status) || "unknown";
  return normalized.replaceAll("_", " ");
}

function buildTaskHandoff(task, budget = HANDOFF_BUDGET_DEFAULTS.task) {
  if (!task) {
    return null;
  }

  const hardChars = Number.isInteger(budget?.hardChars) ? budget.hardChars : HANDOFF_BUDGET_DEFAULTS.task.hardChars;
  const targetChars = Number.isInteger(budget?.targetChars) ? budget.targetChars : HANDOFF_BUDGET_DEFAULTS.task.targetChars;
  const providedSummary = compactText(task.handoffSummary, hardChars);
  if (providedSummary) {
    return {
      summary: providedSummary,
      status: normalizeString(task.status || task.latestStatus) || "unknown",
      updatedAt: task.updatedAt || null,
      nextAction: compactText(task.nextAction, Math.min(100, targetChars)) || null,
      blockers: normalizeStringList(task.blockers).slice(0, 3),
      artifactPaths: normalizeStringList(task.artifactPaths).slice(0, 5),
    };
  }

  const taskId = task.taskId || "unknown";
  const status = normalizeString(task.status || task.latestStatus) || "unknown";
  const latestSummary = compactText(task.latestSummary, Math.min(120, targetChars));
  const nextAction = compactText(task.nextAction, Math.min(100, targetChars));
  const blockers = normalizeStringList(task.blockers);

  let sentence = `Task ${taskId} is ${statusLabel(status)}.`;
  if (status === "blocked" && blockers.length > 0) {
    sentence += ` Blocker: ${blockers[0]}.`;
  } else if (latestSummary) {
    sentence += ` ${latestSummary}.`;
  }

  if (nextAction) {
    sentence += ` Next: ${nextAction}.`;
  }

  const summary = compactText(sentence, hardChars);

  return {
    summary,
    status,
    updatedAt: task.updatedAt || null,
    nextAction: nextAction || null,
    blockers: blockers.slice(0, 3),
    artifactPaths: normalizeStringList(task.artifactPaths).slice(0, 5),
  };
}

function buildCorrelationHandoff({ correlationId, overallStatus, tasks, criticalUpdates }, budget = HANDOFF_BUDGET_DEFAULTS.correlation) {
  const normalizedCorrelationId = correlationId || "unknown";
  const hardChars = Number.isInteger(budget?.hardChars) ? budget.hardChars : HANDOFF_BUDGET_DEFAULTS.correlation.hardChars;
  const targetChars = Number.isInteger(budget?.targetChars) ? budget.targetChars : HANDOFF_BUDGET_DEFAULTS.correlation.targetChars;
  const taskCount = Array.isArray(tasks) ? tasks.length : 0;
  const activeTaskCount = Array.isArray(tasks)
    ? tasks.filter((task) => isOpenStatus(task.status || task.latestStatus)).length
    : 0;
  const blockedTaskCount = Array.isArray(tasks)
    ? tasks.filter((task) => (task.status || task.latestStatus) === "blocked").length
    : 0;
  const topCritical = Array.isArray(criticalUpdates) ? criticalUpdates[0] : null;

  let sentence = `Correlation ${normalizedCorrelationId} is ${statusLabel(overallStatus)} with ${activeTaskCount}/${taskCount} active tasks`;
  if (blockedTaskCount > 0) {
    sentence += ` and ${blockedTaskCount} blocked`;
  }
  sentence += ".";

  if (topCritical && topCritical.summary) {
    sentence += ` Critical: ${topCritical.taskId} - ${compactText(topCritical.summary, Math.min(90, targetChars))}.`;
  }

  return {
    summary: compactText(sentence, hardChars),
    overallStatus,
    activeTaskCount,
    blockedTaskCount,
    criticalTaskIds: Array.isArray(criticalUpdates)
      ? criticalUpdates.slice(0, 3).map((entry) => entry.taskId)
      : [],
  };
}

function prioritizeCriticalTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const leftCritical = isCriticalTaskStatus(left.status || left.latestStatus);
    const rightCritical = isCriticalTaskStatus(right.status || right.latestStatus);

    if (leftCritical !== rightCritical) {
      return leftCritical ? -1 : 1;
    }

    return compareByUpdatedAtDesc(left, right);
  });
}

function getEventField(event, fieldName) {
  const payload =
    event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};

  return event[fieldName] ?? payload[fieldName];
}

function hashPayload(payload) {
  return `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

function buildTaskIndexesFromEvents(events, sanitizeSummary, handoffBudget = HANDOFF_BUDGET_DEFAULTS.task) {
  const taskMap = new Map();

  for (const event of events) {
    const taskId = normalizeString(getEventField(event, "taskId"));
    if (!taskId) {
      continue;
    }

    const payload =
      event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};
    const summaryResult = sanitizeSummary(
      payload.message || payload.title || payload.description || null
    );

    const correlationId = normalizeString(getEventField(event, "correlationId")) || taskId;
    const assignedTo = normalizeString(getEventField(event, "assignedTo")) || null;
    const status = normalizeString(getEventField(event, "status")) || "unknown";
    const priority = normalizeString(getEventField(event, "priority")) || null;
    const parentTaskId = normalizeString(getEventField(event, "parentTaskId")) || null;
    const dependsOn = normalizeStringList(getEventField(event, "dependsOn"));
    const artifactPaths = normalizeStringList(getEventField(event, "artifactPaths"));
    const updatedAt = normalizeString(event.timestamp) || null;
    const latestEventType = normalizeString(event.type) || "unknown";
    const description = normalizeString(payload.description) || null;
    const acceptanceCriteria = normalizeStringList(payload.acceptanceCriteria);
    const blockers = normalizeStringList(payload.blockers);
    const nextAction =
      normalizeString(payload.nextAction) ||
      (status === "blocked"
        ? "Resolve blocker"
        : status === "completed"
          ? "Task closed"
          : "Continue execution");

    const currentTask = taskMap.get(taskId) || {
      taskId,
      correlationId,
      assignedTo,
      status,
      priority,
      parentTaskId,
      dependsOn,
      latestEventType,
      latestSummary: summaryResult.summary,
      latestSummarySafety: {
        redacted: summaryResult.redacted === true,
        memorySafetyFlag: summaryResult.memorySafetyFlag === true,
      },
      updatedAt,
      description,
      acceptanceCriteria,
      blockers,
      nextAction,
      handoffSummary: null,
      artifactPaths,
      eventCount: 0,
    };

    currentTask.correlationId = correlationId || currentTask.correlationId;
    currentTask.assignedTo = assignedTo || currentTask.assignedTo;
    currentTask.status = status || currentTask.status;
    currentTask.priority = priority || currentTask.priority;
    currentTask.parentTaskId = parentTaskId || currentTask.parentTaskId;
    currentTask.dependsOn = dependsOn.length > 0 ? dependsOn : currentTask.dependsOn;
    currentTask.latestEventType = latestEventType || currentTask.latestEventType;
    currentTask.latestSummary = summaryResult.summary || currentTask.latestSummary;
    currentTask.latestSummarySafety = {
      redacted: summaryResult.redacted === true,
      memorySafetyFlag: summaryResult.memorySafetyFlag === true,
    };
    currentTask.updatedAt = updatedAt || currentTask.updatedAt;
    currentTask.description = description || currentTask.description;
    currentTask.acceptanceCriteria =
      acceptanceCriteria.length > 0 ? acceptanceCriteria : currentTask.acceptanceCriteria;
    currentTask.blockers = blockers.length > 0 ? blockers : currentTask.blockers;
    currentTask.nextAction = nextAction || currentTask.nextAction;
    currentTask.artifactPaths = artifactPaths.length > 0 ? artifactPaths : currentTask.artifactPaths;
    currentTask.handoffSummary =
      buildTaskHandoff(currentTask, handoffBudget)?.summary || currentTask.handoffSummary;
    currentTask.eventCount += 1;

    taskMap.set(taskId, currentTask);
  }

  const tasks = Array.from(taskMap.values()).sort(compareByUpdatedAtDesc);
  const byTaskId = new Map(tasks.map((task) => [task.taskId, task]));
  const byCorrelationId = new Map();
  const byAssignedTo = new Map();

  for (const task of tasks) {
    if (!byCorrelationId.has(task.correlationId)) {
      byCorrelationId.set(task.correlationId, []);
    }
    byCorrelationId.get(task.correlationId).push(task);

    if (task.assignedTo && isOpenStatus(task.status)) {
      if (!byAssignedTo.has(task.assignedTo)) {
        byAssignedTo.set(task.assignedTo, []);
      }
      byAssignedTo.get(task.assignedTo).push(task);
    }
  }

  return {
    tasks,
    byTaskId,
    byCorrelationId,
    byAssignedTo,
  };
}

function createNextExpansionHint({ reason, scope, query, recommendedLimit = 10 }) {
  if (!reason || !scope || !query) {
    return null;
  }

  return {
    scope,
    query,
    reason,
    recommendedLimit,
  };
}

function deriveDecisionSafety({ stale, degradedMode, notFound }) {
  if (notFound) {
    return "requires_expansion";
  }
  if (stale && degradedMode) {
    return "requires_expansion";
  }
  if (stale || degradedMode) {
    return "read_only";
  }
  return "safe_for_triage";
}

function resolveOperationalState({ stale, degradedMode }) {
  if (stale && degradedMode) {
    return "stale+degraded";
  }
  if (stale) {
    return "stale";
  }
  if (degradedMode) {
    return "degraded";
  }
  return "normal";
}

function resolveDecisionMatrix({ stale, degradedMode, sensitiveAction, maxAgeMs, rebuiltAt }) {
  const operationalState = resolveOperationalState({ stale, degradedMode });
  const rebuiltAtMs = parseTimestamp(rebuiltAt);
  const ageMs = Math.max(0, Date.now() - rebuiltAtMs);
  const criticalMaxAgeMs = Math.max(maxAgeMs, maxAgeMs * CRITICAL_STALE_MULTIPLIER);
  const criticalStale = stale && ageMs > criticalMaxAgeMs;

  if (operationalState === "normal") {
    return {
      operationalState,
      decisionSafety: "safe_for_triage",
      allowReadOnly: true,
      allowTriage: true,
      allowWriteback: true,
      forceRebuild: false,
      forceJsonlExpansion: false,
      criticalStale,
      sensitiveAction,
    };
  }

  if (operationalState === "stale") {
    const forceRebuild = sensitiveAction || criticalStale;
    return {
      operationalState,
      decisionSafety: "read_only",
      allowReadOnly: true,
      allowTriage: true,
      allowWriteback: false,
      forceRebuild,
      forceJsonlExpansion: sensitiveAction,
      criticalStale,
      sensitiveAction,
    };
  }

  if (operationalState === "degraded") {
    return {
      operationalState,
      decisionSafety: "read_only",
      allowReadOnly: true,
      allowTriage: false,
      allowWriteback: false,
      forceRebuild: true,
      forceJsonlExpansion: true,
      criticalStale,
      sensitiveAction,
    };
  }

  return {
    operationalState,
    decisionSafety: "requires_expansion",
    allowReadOnly: true,
    allowTriage: false,
    allowWriteback: false,
    forceRebuild: true,
    forceJsonlExpansion: true,
    criticalStale,
    sensitiveAction,
  };
}

function finalizeSnapshot(snapshot) {
  const output = {
    ...snapshot,
    generatedAt: new Date().toISOString(),
  };

  const withNoHash = { ...output };
  delete withNoHash.integrityHash;

  output.integrityHash = hashPayload(withNoHash);
  return output;
}

function resolveEnvelopeSource(sidecars, preferred) {
  if (!sidecars) {
    return null;
  }

  if (preferred === "open_by_agent" && sidecars.openByAgent) {
    return sidecars.openByAgent;
  }
  if (preferred === "latest_by_correlation" && sidecars.latestByCorrelation) {
    return sidecars.latestByCorrelation;
  }
  if (sidecars.latestByTask) {
    return sidecars.latestByTask;
  }

  return null;
}

function buildEnvelope({
  view,
  sidecars,
  preferredSidecar,
  degradedMode,
  fallbackReason,
  notFound,
  truncated,
  nextExpansionHint,
  sensitiveAction,
}) {
  const source = resolveEnvelopeSource(sidecars, preferredSidecar);
  const rebuiltAt = source?.rebuiltAt || source?.generatedAt || new Date().toISOString();
  const maxAgeMs = Number.isFinite(source?.maxAgeMs) ? source.maxAgeMs : DEFAULT_MAX_AGE_MS;
  const stale =
    source?.stale === true ||
    Date.now() - parseTimestamp(rebuiltAt) > maxAgeMs;
  const matrix = resolveDecisionMatrix({
    stale,
    degradedMode,
    sensitiveAction,
    maxAgeMs,
    rebuiltAt,
  });
  const decisionSafety = notFound
    ? "requires_expansion"
    : deriveDecisionSafety({ stale, degradedMode, notFound }) === "requires_expansion"
      ? "requires_expansion"
      : matrix.decisionSafety;

  return {
    view,
    schemaVersion: READ_MODE_SCHEMA_VERSION,
    buildVersion: READ_MODE_BUILD_VERSION,
    maxAgeMs,
    sourceEventId: source?.sourceEventId || null,
    sourceWatermark: source?.sourceWatermark || null,
    rebuiltAt,
    stale,
    degradedMode,
    decisionSafety,
    truncated,
    nextExpansionHint,
    safetyPolicy: {
      ...matrix,
      forceJsonlExpansion: notFound ? true : matrix.forceJsonlExpansion,
      forceRebuild: notFound ? true : matrix.forceRebuild,
    },
    readAudit: {
      fallbackReason: fallbackReason || null,
      source: source?.view || null,
    },
  };
}

function toInboxTask(task, handoffBudget = HANDOFF_BUDGET_DEFAULTS.task) {
  const handoff = buildTaskHandoff(task, handoffBudget);
  return {
    taskId: task.taskId,
    correlationId: task.correlationId,
    status: task.status || task.latestStatus || "unknown",
    priority: task.priority || null,
    latestEventType: task.latestEventType || "unknown",
    latestSummary: task.latestSummary || null,
    updatedAt: task.updatedAt || null,
    nextAction: task.nextAction || null,
    artifactPaths: normalizeStringList(task.artifactPaths),
    handoffSummary: handoff?.summary || null,
  };
}

function appendBudgetMetadata(snapshot, budget, estimatedBefore, estimatedAfter, truncatedByBudget) {
  snapshot.tokenBudget = {
    policyVersion: budget.policyVersion || VIEW_BUDGET_POLICY_VERSION,
    view: budget.viewName || snapshot.view || null,
    targetTokens: budget.targetTokens,
    hardTokens: budget.hardTokens,
    estimatedTokensBefore: estimatedBefore,
    estimatedTokensAfter: estimatedAfter,
    truncatedByBudget,
    withinHardLimit: estimatedAfter <= budget.hardTokens,
  };
}

function enforceAgentInboxBudget(snapshot, budget) {
  if (!budget || budget.enabled === false) {
    return snapshot;
  }

  const working = deepClone(snapshot);
  const estimatedBefore = estimateTokens(working);
  const originalTaskCount = Array.isArray(working.tasks) ? working.tasks.length : 0;
  let truncatedByBudget = false;

  while (estimateTokens(working) > budget.hardTokens && Array.isArray(working.tasks) && working.tasks.length > 1) {
    working.tasks.pop();
    truncatedByBudget = true;
  }

  if (Array.isArray(working.tasks) && working.tasks.length > 0 && estimateTokens(working) > budget.hardTokens) {
    const firstTask = working.tasks[0];
    firstTask.latestSummary = compactText(firstTask.latestSummary, 90);
    firstTask.handoffSummary = compactText(firstTask.handoffSummary, 120);
    firstTask.nextAction = compactText(firstTask.nextAction, 70);
    if (Array.isArray(firstTask.artifactPaths) && firstTask.artifactPaths.length > 2) {
      firstTask.artifactPaths = firstTask.artifactPaths.slice(0, 2);
    }
    truncatedByBudget = true;
  }

  if (truncatedByBudget) {
    working.truncated = true;
    working.nextCursor = {
      scope: "tasks",
      offset: Array.isArray(working.tasks) ? working.tasks.length : 0,
      total: originalTaskCount,
    };
    working.nextExpansionHint = {
      scope: "agent",
      query: working.agent,
      reason: "truncated",
      recommendedLimit: Math.max(DEFAULT_LIMIT, originalTaskCount),
    };
  } else if (!working.truncated) {
    working.nextCursor = null;
  }

  const estimatedAfter = estimateTokens(working);
  appendBudgetMetadata(working, budget, estimatedBefore, estimatedAfter, truncatedByBudget);
  return working;
}

function enforceTaskSnapshotBudget(snapshot, budget) {
  if (!budget || budget.enabled === false) {
    return snapshot;
  }

  const working = deepClone(snapshot);
  const estimatedBefore = estimateTokens(working);
  let truncatedByBudget = false;
  const reducedSections = [];

  if (working.task && estimateTokens(working) > budget.hardTokens) {
    if (Array.isArray(working.task.acceptanceCriteria) && working.task.acceptanceCriteria.length > 3) {
      working.task.acceptanceCriteria = working.task.acceptanceCriteria.slice(0, 3);
      reducedSections.push("acceptanceCriteria");
      truncatedByBudget = true;
    }
    if (Array.isArray(working.task.blockers) && working.task.blockers.length > 3) {
      working.task.blockers = working.task.blockers.slice(0, 3);
      reducedSections.push("blockers");
      truncatedByBudget = true;
    }
    if (Array.isArray(working.task.artifactPaths) && working.task.artifactPaths.length > 3) {
      working.task.artifactPaths = working.task.artifactPaths.slice(0, 3);
      reducedSections.push("artifactPaths");
      truncatedByBudget = true;
    }
  }

  if (working.task && estimateTokens(working) > budget.hardTokens) {
    const compactDescription = compactText(working.task.description, 220);
    if (compactDescription !== working.task.description) {
      working.task.description = compactDescription;
      reducedSections.push("description");
      truncatedByBudget = true;
    }

    const compactLatestSummary = compactText(working.task.latestSummary, 120);
    if (compactLatestSummary !== working.task.latestSummary) {
      working.task.latestSummary = compactLatestSummary;
      reducedSections.push("latestSummary");
      truncatedByBudget = true;
    }

    if (working.handoff?.summary) {
      const compactHandoff = compactText(working.handoff.summary, 160);
      if (compactHandoff !== working.handoff.summary) {
        working.handoff.summary = compactHandoff;
        working.task.handoffSummary = compactHandoff;
        reducedSections.push("handoffSummary");
        truncatedByBudget = true;
      }
    }
  }

  if (truncatedByBudget) {
    working.truncated = true;
    working.nextCursor = {
      scope: "task_details",
      sections: Array.from(new Set(reducedSections)),
    };
    working.nextExpansionHint = {
      scope: "task",
      query: working.task?.taskId || "unknown",
      reason: "truncated",
      recommendedLimit: 20,
    };
  } else if (!working.truncated) {
    working.nextCursor = null;
  }

  const estimatedAfter = estimateTokens(working);
  appendBudgetMetadata(working, budget, estimatedBefore, estimatedAfter, truncatedByBudget);
  return working;
}

function enforceCorrelationBudget(snapshot, budget) {
  if (!budget || budget.enabled === false) {
    return snapshot;
  }

  const working = deepClone(snapshot);
  const estimatedBefore = estimateTokens(working);
  const originalTaskCount = Array.isArray(working.tasks) ? working.tasks.length : 0;
  let truncatedByBudget = false;

  if (Array.isArray(working.tasks)) {
    working.tasks = prioritizeCriticalTasks(working.tasks);
  }

  let budgetGuard = 0;
  while (estimateTokens(working) > budget.hardTokens && budgetGuard < 8) {
    budgetGuard += 1;

    if (Array.isArray(working.tasks) && working.tasks.length > 1) {
      working.tasks.pop();
      truncatedByBudget = true;
      continue;
    }

    if (Array.isArray(working.criticalUpdates) && working.criticalUpdates.length > 3) {
      working.criticalUpdates = working.criticalUpdates.slice(0, 3);
      truncatedByBudget = true;
      continue;
    }

    if (Array.isArray(working.criticalUpdates) && working.criticalUpdates.length > 1) {
      working.criticalUpdates = working.criticalUpdates.slice(0, 1);
      truncatedByBudget = true;
      continue;
    }

    if (working.handoff?.summary) {
      const compactHandoff = compactText(working.handoff.summary, 140);
      if (compactHandoff !== working.handoff.summary) {
        working.handoff.summary = compactHandoff;
        truncatedByBudget = true;
        continue;
      }
    }

    if (Array.isArray(working.tasks) && working.tasks.length === 1) {
      const task = working.tasks[0];
      const compactLatestSummary = compactText(task.latestSummary, 70);
      const compactHandoff = compactText(task.handoffSummary, 90);
      const changed =
        compactLatestSummary !== task.latestSummary ||
        compactHandoff !== task.handoffSummary;

      task.latestSummary = compactLatestSummary;
      task.handoffSummary = compactHandoff;
      if (changed) {
        truncatedByBudget = true;
        continue;
      }
    }

    break;
  }

  if (truncatedByBudget) {
    working.truncated = true;
    working.nextCursor = {
      scope: "correlation_tasks",
      offset: Array.isArray(working.tasks) ? working.tasks.length : 0,
      total: originalTaskCount,
    };
    working.nextExpansionHint = {
      scope: "correlation",
      query: working.correlationId || "unknown",
      reason: "truncated",
      recommendedLimit: Math.max(20, originalTaskCount),
    };
  } else if (!working.truncated) {
    working.nextCursor = null;
  }

  const estimatedAfter = estimateTokens(working);
  appendBudgetMetadata(working, budget, estimatedBefore, estimatedAfter, truncatedByBudget);
  return working;
}

function normalizeLimit(limit, fallback = DEFAULT_LIMIT) {
  return Number.isInteger(limit) && limit > 0 ? limit : fallback;
}

export function buildAgentInboxSnapshot({
  assignedTo,
  limit,
  sidecars,
  events,
  allowBroadFallback = true,
  sanitizeSummary,
  initialDegradedMode = false,
  initialFallbackReason = null,
  sensitiveAction = false,
  viewBudgets = {},
}) {
  const normalizedAssignedTo = normalizeString(assignedTo) || "unknown";
  const normalizedLimit = normalizeLimit(limit, DEFAULT_LIMIT);
  const resolvedViewBudget = resolveViewBudget("agent_inbox", viewBudgets);
  const budgetEnforced = resolvedViewBudget.enabled !== false;
  const taskHandoffBudget = resolveHandoffBudget("task", viewBudgets);
  const latestByTask = sidecars?.latestByTask;
  const openByAgent = sidecars?.openByAgent;
  let fallbackReason = initialFallbackReason;
  let degradedMode = initialDegradedMode;
  let tasks = [];

  if (openByAgent && Array.isArray(openByAgent.agents)) {
    const agentEntry = openByAgent.agents.find((entry) => entry.agent === normalizedAssignedTo);
    if (agentEntry && Array.isArray(agentEntry.tasks)) {
      const taskLookup = new Map(
        Array.isArray(latestByTask?.tasks)
          ? latestByTask.tasks.map((task) => [task.taskId, task])
          : []
      );

      tasks = agentEntry.tasks
        .map((taskRef) => taskLookup.get(taskRef.taskId) || taskRef)
        .filter(Boolean)
        .sort(compareByUpdatedAtDesc);
    }
  }

  if (tasks.length === 0 && allowBroadFallback) {
    const eventIndex = buildTaskIndexesFromEvents(events, sanitizeSummary, taskHandoffBudget);
    tasks = (eventIndex.byAssignedTo.get(normalizedAssignedTo) || []).sort(compareByUpdatedAtDesc);
    fallbackReason = fallbackReason || "broad_fallback_no_sidecar_hit";
    degradedMode = true;
  }

  const openTaskCount = tasks.length;
  const blockedTaskCount = tasks.filter((task) => task.status === "blocked").length;
  const needsAttentionCount = tasks.filter((task) => ["blocked", "failed"].includes(task.status)).length;
  const prioritizedTasks = prioritizeCriticalTasks(tasks);
  const truncated = budgetEnforced ? prioritizedTasks.length > normalizedLimit : false;
  const outputTasks = (budgetEnforced ? prioritizedTasks.slice(0, normalizedLimit) : prioritizedTasks)
    .map((task) => toInboxTask(task, taskHandoffBudget));

  const nextExpansionHint = truncated
    ? createNextExpansionHint({
        scope: "agent",
        query: normalizedAssignedTo,
        reason: "truncated",
        recommendedLimit: normalizedLimit * 2,
      })
    : degradedMode
      ? createNextExpansionHint({
          scope: "agent",
          query: normalizedAssignedTo,
          reason: "degraded",
          recommendedLimit: normalizedLimit * 2,
        })
      : null;

  const envelope = buildEnvelope({
    view: "agent_inbox",
    sidecars,
    preferredSidecar: "open_by_agent",
    degradedMode,
    fallbackReason,
    notFound: false,
    truncated,
    nextExpansionHint,
    sensitiveAction,
  });

  const snapshot = finalizeSnapshot({
    ...envelope,
    agent: normalizedAssignedTo,
    openTaskCount,
    blockedTaskCount,
    needsAttentionCount,
    tasks: outputTasks,
    nextCursor: truncated
      ? {
          scope: "tasks",
          offset: outputTasks.length,
          total: prioritizedTasks.length,
        }
      : null,
  });

  return enforceAgentInboxBudget(snapshot, resolvedViewBudget);
}

export function buildTaskSnapshot({
  taskId,
  sidecars,
  events,
  allowBroadFallback = true,
  sanitizeSummary,
  initialDegradedMode = false,
  initialFallbackReason = null,
  sensitiveAction = false,
  viewBudgets = {},
}) {
  const normalizedTaskId = normalizeString(taskId);
  const taskHandoffBudget = resolveHandoffBudget("task", viewBudgets);
  let fallbackReason = initialFallbackReason;
  let degradedMode = initialDegradedMode;

  let task = Array.isArray(sidecars?.latestByTask?.tasks)
    ? sidecars.latestByTask.tasks.find((entry) => entry.taskId === normalizedTaskId) || null
    : null;

  if (!task && allowBroadFallback) {
    const eventIndex = buildTaskIndexesFromEvents(events, sanitizeSummary, taskHandoffBudget);
    task = eventIndex.byTaskId.get(normalizedTaskId) || null;
    fallbackReason = fallbackReason || "broad_fallback_no_sidecar_hit";
    degradedMode = true;
  }

  const notFound = !task;
  const nextExpansionHint = notFound
    ? createNextExpansionHint({
        scope: "task",
        query: normalizedTaskId || "unknown",
        reason: "consumer_request",
        recommendedLimit: 20,
      })
    : degradedMode
      ? createNextExpansionHint({
          scope: "task",
          query: normalizedTaskId,
          reason: "degraded",
          recommendedLimit: 20,
        })
      : null;

  const envelope = buildEnvelope({
    view: "task_snapshot",
    sidecars,
    preferredSidecar: "latest_by_task",
    degradedMode,
    fallbackReason,
    notFound,
    truncated: false,
    nextExpansionHint,
    sensitiveAction,
  });

  const taskHandoff = task ? buildTaskHandoff(task, taskHandoffBudget) : null;

  const snapshot = finalizeSnapshot({
    ...envelope,
    task: task
      ? {
          taskId: task.taskId,
          correlationId: task.correlationId || task.taskId,
          assignedTo: task.assignedTo || null,
          status: task.status || task.latestStatus || "unknown",
          priority: task.priority || null,
          parentTaskId: task.parentTaskId || null,
          dependsOn: normalizeStringList(task.dependsOn),
          description: task.description || null,
          acceptanceCriteria: normalizeStringList(task.acceptanceCriteria),
          latestEventType: task.latestEventType || "unknown",
          latestSummary: task.latestSummary || null,
          updatedAt: task.updatedAt || null,
          blockers: normalizeStringList(task.blockers),
          nextAction: task.nextAction || null,
          artifactPaths: normalizeStringList(task.artifactPaths),
          handoffSummary: taskHandoff?.summary || null,
        }
      : null,
    handoff: taskHandoff,
  });

  return enforceTaskSnapshotBudget(snapshot, resolveViewBudget("task_snapshot", viewBudgets));
}

function deriveCorrelationOverallStatus(tasks) {
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked";
  }
  if (tasks.some((task) => task.status === "in_progress")) {
    return "in_progress";
  }
  if (tasks.some((task) => task.status === "accepted")) {
    return "accepted";
  }
  if (tasks.some((task) => task.status === "pending")) {
    return "pending";
  }
  if (tasks.some((task) => task.status === "failed")) {
    return "failed";
  }
  if (tasks.length > 0 && tasks.every((task) => task.status === "completed")) {
    return "completed";
  }

  return "unknown";
}

export function buildCorrelationSnapshot({
  correlationId,
  limit,
  sidecars,
  events,
  allowBroadFallback = true,
  sanitizeSummary,
  initialDegradedMode = false,
  initialFallbackReason = null,
  sensitiveAction = false,
  viewBudgets = {},
}) {
  const normalizedCorrelationId = normalizeString(correlationId);
  const normalizedLimit = normalizeLimit(limit, 20);
  const resolvedViewBudget = resolveViewBudget("correlation_snapshot", viewBudgets);
  const budgetEnforced = resolvedViewBudget.enabled !== false;
  const taskHandoffBudget = resolveHandoffBudget("task", viewBudgets);
  const correlationHandoffBudget = resolveHandoffBudget("correlation", viewBudgets);
  let fallbackReason = initialFallbackReason;
  let degradedMode = initialDegradedMode;
  let tasks = [];
  let lastUpdatedAt = null;
  let overallStatus = "unknown";

  if (Array.isArray(sidecars?.latestByCorrelation?.correlations)) {
    const correlationEntry = sidecars.latestByCorrelation.correlations.find(
      (entry) => entry.correlationId === normalizedCorrelationId
    );

    if (correlationEntry) {
      tasks = Array.isArray(correlationEntry.tasks) ? correlationEntry.tasks : [];
      lastUpdatedAt = correlationEntry.lastUpdatedAt || null;
      overallStatus = correlationEntry.overallStatus || deriveCorrelationOverallStatus(tasks);
    }
  }

  if (tasks.length === 0 && allowBroadFallback) {
    const eventIndex = buildTaskIndexesFromEvents(events, sanitizeSummary, taskHandoffBudget);
    tasks = (eventIndex.byCorrelationId.get(normalizedCorrelationId) || []).sort(compareByUpdatedAtDesc);
    lastUpdatedAt = tasks[0]?.updatedAt || null;
    overallStatus = deriveCorrelationOverallStatus(tasks);
    fallbackReason = fallbackReason || "broad_fallback_no_sidecar_hit";
    degradedMode = true;
  }

  const notFound = tasks.length === 0;
  const activeTaskCount = tasks.filter((task) => isOpenStatus(task.status || task.latestStatus)).length;
  const blockedTaskCount = tasks.filter((task) => (task.status || task.latestStatus) === "blocked").length;
  const criticalUpdates = tasks
    .filter((task) => ["blocked", "failed", "in_progress"].includes(task.status || task.latestStatus))
    .slice(0, 5)
    .map((task) => ({
      taskId: task.taskId,
      status: task.status || task.latestStatus || "unknown",
      summary: task.latestSummary || null,
    }));
  const truncated = budgetEnforced ? tasks.length > normalizedLimit : false;
  const outputTasks = (budgetEnforced ? tasks.slice(0, normalizedLimit) : tasks).map((task) => ({
    taskId: task.taskId,
    assignedTo: task.assignedTo || null,
    status: task.status || task.latestStatus || "unknown",
    latestSummary: task.latestSummary || null,
    updatedAt: task.updatedAt || null,
    handoffSummary: buildTaskHandoff(task, taskHandoffBudget)?.summary || null,
  }));

  const nextExpansionHint = notFound
    ? createNextExpansionHint({
        scope: "correlation",
        query: normalizedCorrelationId || "unknown",
        reason: "consumer_request",
        recommendedLimit: normalizedLimit,
      })
    : truncated
      ? createNextExpansionHint({
          scope: "correlation",
          query: normalizedCorrelationId,
          reason: "truncated",
          recommendedLimit: normalizedLimit * 2,
        })
      : degradedMode
        ? createNextExpansionHint({
            scope: "correlation",
            query: normalizedCorrelationId,
            reason: "degraded",
            recommendedLimit: normalizedLimit,
          })
        : null;

  const envelope = buildEnvelope({
    view: "correlation_snapshot",
    sidecars,
    preferredSidecar: "latest_by_correlation",
    degradedMode,
    fallbackReason,
    notFound,
    truncated,
    nextExpansionHint,
    sensitiveAction,
  });

  const handoff = buildCorrelationHandoff({
    correlationId: normalizedCorrelationId || null,
    overallStatus,
    tasks,
    criticalUpdates,
  }, correlationHandoffBudget);

  const snapshot = finalizeSnapshot({
    ...envelope,
    correlationId: normalizedCorrelationId || null,
    overallStatus,
    activeTaskCount,
    blockedTaskCount,
    lastUpdatedAt,
    criticalUpdates,
    tasks: outputTasks,
    handoff,
    nextCursor: truncated
      ? {
          scope: "correlation_tasks",
          offset: outputTasks.length,
          total: tasks.length,
        }
      : null,
  });

  return enforceCorrelationBudget(snapshot, resolvedViewBudget);
}
