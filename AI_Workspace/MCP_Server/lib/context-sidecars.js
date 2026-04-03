import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export const SIDECAR_SCHEMA_VERSION = "ctx-sidecar.v1";
export const SIDECAR_BUILD_VERSION = "context-sidecar@1.0.0";
export const SIDECAR_MAX_AGE_MS = 5000;

export const SIDECAR_FILE_NAMES = {
  latestByTask: "latest_by_task.json",
  latestByCorrelation: "latest_by_correlation.json",
  openByAgent: "open_by_agent.json",
};

const SIDECAR_VIEW_BY_KEY = {
  latestByTask: "latest_by_task",
  latestByCorrelation: "latest_by_correlation",
  openByAgent: "open_by_agent",
};

const SIDECAR_REQUIRED_FIELDS = [
  "view",
  "schemaVersion",
  "buildVersion",
  "generatedAt",
  "rebuiltAt",
  "sourceWatermark",
  "integrityHash",
  "contentFingerprint",
];

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const TASK_HANDOFF_SUMMARY_MAX_CHARS = 220;
const CORRELATION_HANDOFF_SUMMARY_MAX_CHARS = 260;

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

function buildTaskHandoffSummary(task) {
  if (!task) {
    return null;
  }

  const status = normalizeString(task.status || task.latestStatus) || "unknown";
  const latestSummary = compactText(task.latestSummary, 120);
  const nextAction = compactText(task.nextAction, 100);
  const firstBlocker = normalizeStringList(task.blockers)[0] || null;

  let sentence = `Task ${task.taskId} is ${status.replaceAll("_", " ")}.`;
  if (status === "blocked" && firstBlocker) {
    sentence += ` Blocker: ${firstBlocker}.`;
  } else if (latestSummary) {
    sentence += ` ${latestSummary}.`;
  }
  if (nextAction) {
    sentence += ` Next: ${nextAction}.`;
  }

  return compactText(sentence, TASK_HANDOFF_SUMMARY_MAX_CHARS);
}

function buildCorrelationHandoffSummary(correlationId, overallStatus, tasks, criticalUpdates) {
  const taskCount = Array.isArray(tasks) ? tasks.length : 0;
  const activeTaskCount = Array.isArray(tasks)
    ? tasks.filter((task) => isOpenStatus(task.status || task.latestStatus)).length
    : 0;
  const blockedTaskCount = Array.isArray(tasks)
    ? tasks.filter((task) => (task.status || task.latestStatus) === "blocked").length
    : 0;
  const topCritical = Array.isArray(criticalUpdates) ? criticalUpdates[0] : null;

  let sentence = `Correlation ${correlationId} is ${(overallStatus || "unknown").replaceAll("_", " ")} with ${activeTaskCount}/${taskCount} active tasks`;
  if (blockedTaskCount > 0) {
    sentence += ` and ${blockedTaskCount} blocked`;
  }
  sentence += ".";

  if (topCritical && topCritical.summary) {
    sentence += ` Critical: ${topCritical.taskId} - ${compactText(topCritical.summary, 90)}.`;
  }

  return compactText(sentence, CORRELATION_HANDOFF_SUMMARY_MAX_CHARS);
}

function getEventField(event, fieldName) {
  const payload =
    event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};

  return event[fieldName] ?? payload[fieldName];
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareByUpdatedAtDesc(left, right) {
  return parseTimestamp(right.updatedAt) - parseTimestamp(left.updatedAt);
}

function isOpenStatus(status) {
  const normalizedStatus = normalizeString(status) || "unknown";
  return !TERMINAL_STATUSES.has(normalizedStatus);
}

function deriveOverallStatus(tasks) {
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

function hashPayload(payload) {
  return `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeForContentFingerprint(payload) {
  const clone = deepClone(payload);
  delete clone.generatedAt;
  delete clone.rebuiltAt;
  delete clone.integrityHash;
  delete clone.contentFingerprint;
  return clone;
}

function computeContentFingerprint(payload) {
  return hashPayload(normalizeForContentFingerprint(payload));
}

function withIntegrityHash(payload) {
  const contentFingerprint = computeContentFingerprint(payload);
  const integrityHash = hashPayload({
    ...payload,
    contentFingerprint,
  });

  return {
    ...payload,
    contentFingerprint,
    integrityHash,
  };
}

function createBaseEnvelope(events, timestamp) {
  const latestEvent = events[events.length - 1] || null;

  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    buildVersion: SIDECAR_BUILD_VERSION,
    generatedAt: timestamp,
    rebuiltAt: timestamp,
    maxAgeMs: SIDECAR_MAX_AGE_MS,
    sourceEventId: latestEvent?.eventId || null,
    sourceWatermark: `jsonl:${events.length}`,
    stale: false,
    degradedMode: false,
    decisionSafety: "safe_for_triage",
    truncated: false,
  };
}

function createTaskProjection(taskSnapshot) {
  return {
    taskId: taskSnapshot.taskId,
    correlationId: taskSnapshot.correlationId,
    assignedTo: taskSnapshot.assignedTo,
    status: taskSnapshot.status,
    latestStatus: taskSnapshot.status,
    priority: taskSnapshot.priority,
    parentTaskId: taskSnapshot.parentTaskId,
    dependsOn: taskSnapshot.dependsOn,
    latestEventType: taskSnapshot.latestEventType,
    latestSummary: taskSnapshot.latestSummary,
    latestSummarySafety: taskSnapshot.latestSummarySafety,
    updatedAt: taskSnapshot.updatedAt,
    nextAction: taskSnapshot.nextAction,
    handoffSummary: taskSnapshot.handoffSummary || null,
    artifactPaths: taskSnapshot.artifactPaths,
    eventCount: taskSnapshot.eventCount,
  };
}

function toTaskGroup(taskSnapshot) {
  return {
    taskId: taskSnapshot.taskId,
    assignedTo: taskSnapshot.assignedTo,
    latestStatus: taskSnapshot.status,
    priority: taskSnapshot.priority,
    parentTaskId: taskSnapshot.parentTaskId,
    dependsOn: taskSnapshot.dependsOn,
    updatedAt: taskSnapshot.updatedAt,
    latestEventType: taskSnapshot.latestEventType,
    latestSummary: taskSnapshot.latestSummary,
    latestSummarySafety: taskSnapshot.latestSummarySafety,
    nextAction: taskSnapshot.nextAction,
    handoffSummary: taskSnapshot.handoffSummary || null,
    artifactPaths: taskSnapshot.artifactPaths,
    eventCount: taskSnapshot.eventCount,
  };
}

export function buildSidecarPayloads(events, options = {}) {
  const sanitizeSummary =
    typeof options.sanitizeSummary === "function"
      ? options.sanitizeSummary
      : (value) => ({ summary: normalizeString(value) || null, redacted: false, memorySafetyFlag: false });

  const timestamp = new Date().toISOString();
  const envelope = createBaseEnvelope(events, timestamp);
  const taskMap = new Map();
  const correlationMap = new Map();
  const agentMap = new Map();

  for (const event of events) {
    const taskId = normalizeString(getEventField(event, "taskId"));
    if (!taskId) {
      continue;
    }

    const correlationId = normalizeString(getEventField(event, "correlationId")) || taskId;
    const assignedTo = normalizeString(getEventField(event, "assignedTo")) || null;
    const status = normalizeString(getEventField(event, "status")) || "unknown";
    const priority = normalizeString(getEventField(event, "priority")) || null;
    const parentTaskId = normalizeString(getEventField(event, "parentTaskId")) || null;
    const dependsOn = normalizeStringList(getEventField(event, "dependsOn"));
    const artifactPaths = normalizeStringList(getEventField(event, "artifactPaths"));
    const updatedAt = normalizeString(event.timestamp) || null;
    const latestEventType = normalizeString(event.type) || "unknown";
    const payload =
      event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};

    const summaryResult = sanitizeSummary(
      payload.message || payload.title || payload.description || null
    );
    const nextAction =
      normalizeString(payload.nextAction) ||
      (status === "blocked"
        ? "Resolve blocker"
        : status === "completed"
          ? "Task closed"
          : "Continue execution");

    const acceptanceCriteria = normalizeStringList(payload.acceptanceCriteria);
    const blockers = normalizeStringList(payload.blockers);
    const description = normalizeString(payload.description) || null;

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
    currentTask.handoffSummary = buildTaskHandoffSummary(currentTask);
    currentTask.eventCount += 1;

    taskMap.set(taskId, currentTask);

    if (!correlationMap.has(correlationId)) {
      correlationMap.set(correlationId, {
        correlationId,
        lastUpdatedAt: updatedAt,
        tasks: new Map(),
      });
    }

    const correlation = correlationMap.get(correlationId);
    correlation.lastUpdatedAt = updatedAt || correlation.lastUpdatedAt;
    correlation.tasks.set(taskId, createTaskProjection(currentTask));

    if (assignedTo && isOpenStatus(status)) {
      if (!agentMap.has(assignedTo)) {
        agentMap.set(assignedTo, {
          agent: assignedTo,
          tasks: new Map(),
        });
      }

      const agentGroup = agentMap.get(assignedTo);
      agentGroup.tasks.set(taskId, createTaskProjection(currentTask));
    }
  }

  const latestByTaskEntries = Array.from(taskMap.values())
    .sort(compareByUpdatedAtDesc)
    .map((entry) => ({
      ...entry,
      latestStatus: entry.status,
    }));

  const latestByCorrelationEntries = Array.from(correlationMap.values())
    .map((entry) => {
      const tasks = Array.from(entry.tasks.values()).sort(compareByUpdatedAtDesc);
      const blockedTaskCount = tasks.filter((task) => task.status === "blocked").length;
      const activeTaskCount = tasks.filter((task) => isOpenStatus(task.status)).length;
      const criticalUpdates = tasks
        .filter((task) => ["blocked", "failed", "in_progress"].includes(task.status))
        .slice(0, 5)
        .map((task) => ({
          taskId: task.taskId,
          status: task.status,
          summary: task.latestSummary,
        }));

      return {
        correlationId: entry.correlationId,
        overallStatus: deriveOverallStatus(tasks),
        activeTaskCount,
        blockedTaskCount,
        lastUpdatedAt: entry.lastUpdatedAt,
        criticalUpdates,
        handoffSummary: buildCorrelationHandoffSummary(
          entry.correlationId,
          deriveOverallStatus(tasks),
          tasks,
          criticalUpdates
        ),
        tasks,
      };
    })
    .sort((left, right) => parseTimestamp(right.lastUpdatedAt) - parseTimestamp(left.lastUpdatedAt));

  const openByAgentEntries = Array.from(agentMap.values())
    .map((entry) => {
      const tasks = Array.from(entry.tasks.values()).sort(compareByUpdatedAtDesc);
      const blockedTaskCount = tasks.filter((task) => task.status === "blocked").length;
      const needsAttentionCount = tasks.filter((task) => ["blocked", "failed"].includes(task.status)).length;

      return {
        agent: entry.agent,
        openTaskCount: tasks.length,
        blockedTaskCount,
        needsAttentionCount,
        tasks,
      };
    })
    .sort((left, right) => left.agent.localeCompare(right.agent));

  const latestByTask = withIntegrityHash({
    view: "latest_by_task",
    ...envelope,
    taskCount: latestByTaskEntries.length,
    tasks: latestByTaskEntries,
  });

  const latestByCorrelation = withIntegrityHash({
    view: "latest_by_correlation",
    ...envelope,
    correlationCount: latestByCorrelationEntries.length,
    correlations: latestByCorrelationEntries,
  });

  const openByAgent = withIntegrityHash({
    view: "open_by_agent",
    ...envelope,
    agentCount: openByAgentEntries.length,
    agents: openByAgentEntries,
  });

  return {
    latestByTask,
    latestByCorrelation,
    openByAgent,
  };
}

async function writeJsonAtomic(filePath, jsonPayload) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(jsonPayload, null, 2)}\n`;
  await fs.writeFile(temporaryPath, body, "utf-8");
  await fs.rename(temporaryPath, filePath);
}

export async function writeSidecarsAtomically(sidecarDir, payloads) {
  await fs.mkdir(sidecarDir, { recursive: true });

  await writeJsonAtomic(path.join(sidecarDir, SIDECAR_FILE_NAMES.latestByTask), payloads.latestByTask);
  await writeJsonAtomic(
    path.join(sidecarDir, SIDECAR_FILE_NAMES.latestByCorrelation),
    payloads.latestByCorrelation
  );
  await writeJsonAtomic(path.join(sidecarDir, SIDECAR_FILE_NAMES.openByAgent), payloads.openByAgent);
}

function validateSidecarShape(payload, expectedView) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "payload_not_object" };
  }

  if (expectedView && payload.view !== expectedView) {
    return { ok: false, reason: `view_mismatch:${payload.view || "unknown"}` };
  }

  for (const requiredField of SIDECAR_REQUIRED_FIELDS) {
    if (!(requiredField in payload)) {
      return { ok: false, reason: `missing_field:${requiredField}` };
    }
  }

  if (!/^jsonl:\d+$/.test(String(payload.sourceWatermark || ""))) {
    return { ok: false, reason: "invalid_source_watermark" };
  }

  return { ok: true, reason: null };
}

export function validateSidecarPayload(payload, expectedView) {
  const shapeValidation = validateSidecarShape(payload, expectedView);
  if (!shapeValidation.ok) {
    return shapeValidation;
  }

  if (expectedView === "latest_by_task" && !Array.isArray(payload.tasks)) {
    return { ok: false, reason: "missing_tasks_array" };
  }
  if (expectedView === "latest_by_correlation" && !Array.isArray(payload.correlations)) {
    return { ok: false, reason: "missing_correlations_array" };
  }
  if (expectedView === "open_by_agent" && !Array.isArray(payload.agents)) {
    return { ok: false, reason: "missing_agents_array" };
  }

  const contentFingerprint = computeContentFingerprint(payload);
  if (payload.contentFingerprint !== contentFingerprint) {
    return { ok: false, reason: "content_fingerprint_mismatch" };
  }

  const hashSource = deepClone(payload);
  delete hashSource.integrityHash;
  const expectedIntegrityHash = hashPayload(hashSource);
  if (payload.integrityHash !== expectedIntegrityHash) {
    return { ok: false, reason: "integrity_hash_mismatch" };
  }

  return { ok: true, reason: null };
}

async function readValidatedSidecarFile(filePath, expectedView) {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsedPayload = JSON.parse(raw);
  const validation = validateSidecarPayload(parsedPayload, expectedView);

  if (!validation.ok) {
    throw new Error(`Invalid sidecar '${expectedView}' (${validation.reason})`);
  }

  return parsedPayload;
}

export async function readValidatedSidecars(sidecarDir) {
  try {
    const latestByTask = await readValidatedSidecarFile(
      path.join(sidecarDir, SIDECAR_FILE_NAMES.latestByTask),
      SIDECAR_VIEW_BY_KEY.latestByTask
    );
    const latestByCorrelation = await readValidatedSidecarFile(
      path.join(sidecarDir, SIDECAR_FILE_NAMES.latestByCorrelation),
      SIDECAR_VIEW_BY_KEY.latestByCorrelation
    );
    const openByAgent = await readValidatedSidecarFile(
      path.join(sidecarDir, SIDECAR_FILE_NAMES.openByAgent),
      SIDECAR_VIEW_BY_KEY.openByAgent
    );

    const watermarks = new Set([
      latestByTask.sourceWatermark,
      latestByCorrelation.sourceWatermark,
      openByAgent.sourceWatermark,
    ]);

    if (watermarks.size !== 1) {
      return {
        ok: false,
        error: "sidecar_watermark_mismatch",
        payloads: null,
      };
    }

    return {
      ok: true,
      error: null,
      payloads: {
        latestByTask,
        latestByCorrelation,
        openByAgent,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "sidecar_read_failed",
      payloads: null,
    };
  }
}

function toTaskGroupFromProjection(taskProjection) {
  return {
    taskId: taskProjection.taskId,
    assignedTo: taskProjection.assignedTo,
    latestStatus: taskProjection.status || taskProjection.latestStatus || "unknown",
    priority: taskProjection.priority || null,
    parentTaskId: taskProjection.parentTaskId || null,
    dependsOn: normalizeStringList(taskProjection.dependsOn),
    updatedAt: taskProjection.updatedAt || null,
    latestEventType: taskProjection.latestEventType || "unknown",
    latestSummary: taskProjection.latestSummary || null,
    latestSummarySafety:
      taskProjection.latestSummarySafety && typeof taskProjection.latestSummarySafety === "object"
        ? {
            redacted: taskProjection.latestSummarySafety.redacted === true,
            memorySafetyFlag: taskProjection.latestSummarySafety.memorySafetyFlag === true,
          }
        : {
            redacted: false,
            memorySafetyFlag: false,
          },
    nextAction: taskProjection.nextAction || null,
    handoffSummary: taskProjection.handoffSummary || null,
    artifactPaths: normalizeStringList(taskProjection.artifactPaths),
    eventCount: Number.isFinite(taskProjection.eventCount) ? taskProjection.eventCount : 1,
  };
}

function sidecarProvenance(sidecarPayload) {
  if (!sidecarPayload || typeof sidecarPayload !== "object") {
    return null;
  }

  return {
    view: sidecarPayload.view || null,
    sourceEventId: sidecarPayload.sourceEventId || null,
    sourceWatermark: sidecarPayload.sourceWatermark || null,
    rebuiltAt: sidecarPayload.rebuiltAt || null,
    integrityHash: sidecarPayload.integrityHash || null,
    stale: sidecarPayload.stale === true,
    degradedMode: sidecarPayload.degradedMode === true,
  };
}

export function selectTaskGroupsFromSidecars(payloads, filters) {
  if (!payloads || filters.includeTaskEvents) {
    return null;
  }

  const latestByTask = payloads.latestByTask;
  const latestByCorrelation = payloads.latestByCorrelation;
  const openByAgent = payloads.openByAgent;

  if (!latestByTask || !Array.isArray(latestByTask.tasks)) {
    return null;
  }

  const taskGroupsById = new Map(
    latestByTask.tasks.map((taskSnapshot) => [
      taskSnapshot.taskId,
      toTaskGroup(taskSnapshot),
    ])
  );

  let selectedGroups = [];
  let selectedProvenance = sidecarProvenance(latestByTask);

  if (filters.taskId) {
    const taskGroup = taskGroupsById.get(filters.taskId);
    selectedGroups = taskGroup ? [taskGroup] : [];
  } else if (filters.correlationId && latestByCorrelation && Array.isArray(latestByCorrelation.correlations)) {
    const correlation = latestByCorrelation.correlations.find(
      (entry) => entry.correlationId === filters.correlationId
    );
    selectedProvenance = sidecarProvenance(latestByCorrelation);
    selectedGroups = correlation
      ? correlation.tasks
          .map((taskProjection) => taskGroupsById.get(taskProjection.taskId) || toTaskGroupFromProjection(taskProjection))
          .filter(Boolean)
      : [];
  } else if (filters.assignedTo && openByAgent && Array.isArray(openByAgent.agents)) {
    const agentEntry = openByAgent.agents.find((entry) => entry.agent === filters.assignedTo);
    selectedProvenance = sidecarProvenance(openByAgent);
    selectedGroups = agentEntry
      ? agentEntry.tasks
          .map((taskProjection) => taskGroupsById.get(taskProjection.taskId) || toTaskGroupFromProjection(taskProjection))
          .filter(Boolean)
      : [];
  } else {
    selectedGroups = Array.from(taskGroupsById.values());
  }

  if (filters.status) {
    selectedGroups = selectedGroups.filter((group) => group.latestStatus === filters.status);
  }

  if (filters.limit && selectedGroups.length > filters.limit) {
    selectedGroups = selectedGroups.slice(0, filters.limit);
  }

  return {
    mode: "sidecar_snapshot_first",
    tasks: selectedGroups,
    provenance: selectedProvenance,
  };
}
