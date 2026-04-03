import { createHash } from "crypto";

export const TASK_STATUSES = new Set(["assigned", "accepted", "in_progress", "blocked", "completed", "failed", "cancelled"]);
export const TASK_EVENT_TYPES = new Set(["TASK_ASSIGNED", "TASK_ACCEPTED", "TASK_IN_PROGRESS", "TASK_BLOCKED", "TASK_COMPLETED", "TASK_FAILED", "TASK_CANCELLED"]);
export const TASK_TERMINAL_EVENT_TYPES = new Set(["TASK_COMPLETED", "TASK_CANCELLED", "TASK_BLOCKED", "TASK_FAILED", "TEST_PASSED", "TEST_FAILED"]);
export const DEDUPE_DEFAULTS = Object.freeze({
  enabled: true,
  windowMs: 15 * 60 * 1000,
});
export const CANONICAL_PAYLOAD_FIELDS = Object.freeze([
  "taskId",
  "assignedTo",
  "status",
  "priority",
  "correlationId",
  "parentTaskId",
  "dependsOn",
  "artifactPaths",
  "payloadVersion",
]);
export const MESSAGE_BUDGET_DEFAULTS = Object.freeze({
  targetChars: 160,
  softLimitChars: 280,
  hardLimitEnabled: false,
});
const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|api[_-]?key|token|authorization|cookie|session|private[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token)/i;
const SENSITIVE_TEXT_PATTERNS = [
  {
    regex: /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: (_match, prefix) => `${prefix}${REDACTED_VALUE}`,
  },
  { regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replacement: REDACTED_VALUE },
  {
    regex:
      /((?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*)(["']?)[^\s"',;]+\2/gi,
    replacement: (_match, prefix) => `${prefix}${REDACTED_VALUE}`,
  },
  { regex: /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,})\b/g, replacement: REDACTED_VALUE },
];
const MEMORY_SAFETY_PATTERN =
  /(ignore\s+(?:all\s+)?previous\s+instructions|system\s+prompt|developer\s+message|jailbreak|override\s+instructions|act\s+as\s+a?n?\s+)/i;
const MEMORY_SAFETY_CRITICAL_FIELD_PATTERN =
  /(message|summary|description|title|nextAction|rootCause|details|blocker|acceptanceCriteria|reason|note|instruction)/i;
export const TASK_EVENT_STATUS_BY_TYPE = Object.freeze({
  TASK_ASSIGNED: "assigned",
  TASK_ACCEPTED: "accepted",
  TASK_IN_PROGRESS: "in_progress",
  TASK_BLOCKED: "blocked",
  TASK_COMPLETED: "completed",
  TASK_FAILED: "failed",
  TASK_CANCELLED: "cancelled",
});
const TASK_SEQUENCE_ORDER = Object.freeze({
  TASK_ASSIGNED: 0,
  TASK_ACCEPTED: 1,
  TASK_IN_PROGRESS: 2,
});
export const KNOWN_EVENT_TYPES = new Set([
  "TASK_ASSIGNED",
  "TASK_ACCEPTED",
  "TASK_IN_PROGRESS",
  "TASK_BLOCKED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "TASK_CANCELLED",
  "SUBTASK_REQUESTED",
  "PLAN_PROPOSED",
  "SKILL_CREATED",
  "LEARNING_RECORDED",
  "ENDPOINT_CREATED",
  "UI_COMPONENT_BUILT",
  "SCHEMA_UPDATED",
  "ARTIFACT_PUBLISHED",
  "TEST_PASSED",
  "TEST_FAILED",
  "INCIDENT_OPENED",
  "INCIDENT_RESOLVED",
  "DOC_UPDATED",
  "GITHUB_ISSUE_CREATED",
  "GITHUB_BRANCH_CREATED",
  "GITHUB_PR_OPENED",
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonLikeEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function summarizeToLimit(value, limit) {
  if (value.length <= limit) {
    return value;
  }

  const safeLimit = Math.max(1, limit - 1);
  return `${value.slice(0, safeLimit).trimEnd()}…`;
}

function sanitizeSensitiveText(value) {
  let output = value;
  let redactionCount = 0;

  for (const pattern of SENSITIVE_TEXT_PATTERNS) {
    output = output.replace(pattern.regex, (...args) => {
      redactionCount += 1;
      return typeof pattern.replacement === "function"
        ? pattern.replacement(...args)
        : pattern.replacement;
    });
  }

  return {
    text: output,
    redactionCount,
  };
}

function sanitizeMemorySafetyText(value) {
  if (!MEMORY_SAFETY_PATTERN.test(value)) {
    return {
      text: value,
      flagged: false,
    };
  }

  const cleaned = value.replace(MEMORY_SAFETY_PATTERN, "[instruction-redacted]");
  return {
    text: cleaned,
    flagged: true,
  };
}

function isMemorySafetyCriticalField(fieldName) {
  return typeof fieldName === "string" && MEMORY_SAFETY_CRITICAL_FIELD_PATTERN.test(fieldName);
}

function sanitizeMemorySafetyPayloadValue(value, counters, fieldName) {
  if (typeof value === "string") {
    if (!isMemorySafetyCriticalField(fieldName)) {
      return value;
    }

    const memorySafety = sanitizeMemorySafetyText(value);
    if (memorySafety.flagged) {
      counters.memorySafetyFields += 1;
    }
    return memorySafety.text;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMemorySafetyPayloadValue(entry, counters, fieldName));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = sanitizeMemorySafetyPayloadValue(entry, counters, key);
  }

  return output;
}

function redactSensitivePayloadValue(value, counters) {
  if (typeof value === "string") {
    const result = sanitizeSensitiveText(value);
    counters.redactedStrings += result.redactionCount;
    return result.text;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitivePayloadValue(entry, counters));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = REDACTED_VALUE;
      counters.redactedFields += 1;
      continue;
    }

    output[key] = redactSensitivePayloadValue(entry, counters);
  }

  return output;
}

export function applySnapshotSafetyPolicy(payload, options = {}) {
  const normalizedPayload = assertPlainObject(payload, "payload");
  const redactionEnabled = options.redactionEnabled !== false;
  const memorySafetyEnabled = options.memorySafetyEnabled !== false;

  let output = { ...normalizedPayload };
  const counters = {
    redactedFields: 0,
    redactedStrings: 0,
    memorySafetyFields: 0,
  };

  if (redactionEnabled) {
    output = redactSensitivePayloadValue(output, counters);
  }

  let memorySafetyFlag = false;
  if (memorySafetyEnabled) {
    output = sanitizeMemorySafetyPayloadValue(output, counters, null);
    memorySafetyFlag = counters.memorySafetyFields > 0;
  }

  const guardrails = {
    redactionEnabled,
    memorySafetyEnabled,
    redactedFields: counters.redactedFields,
    redactedStrings: counters.redactedStrings,
    memorySafetyFields: counters.memorySafetyFields,
    memorySafetyFlag,
  };

  if (
    guardrails.redactedFields > 0 ||
    guardrails.redactedStrings > 0 ||
    guardrails.memorySafetyFlag
  ) {
    output.memorySafety = {
      ...(output.memorySafety && typeof output.memorySafety === "object" ? output.memorySafety : {}),
      ...guardrails,
    };
  }

  return {
    payload: output,
    guardrails,
  };
}

export function sanitizeSnapshotSummary(value, options = {}) {
  const redactionEnabled = options.redactionEnabled !== false;
  const memorySafetyEnabled = options.memorySafetyEnabled !== false;

  if (typeof value !== "string") {
    return {
      summary: null,
      redacted: false,
      memorySafetyFlag: false,
    };
  }

  let output = value;
  let redacted = false;
  let memorySafetyFlag = false;

  if (redactionEnabled) {
    const redaction = sanitizeSensitiveText(output);
    output = redaction.text;
    redacted = redaction.redactionCount > 0;
  }

  if (memorySafetyEnabled) {
    const memorySafety = sanitizeMemorySafetyText(output);
    output = memorySafety.text;
    memorySafetyFlag = memorySafety.flagged;
  }

  return {
    summary: output,
    redacted,
    memorySafetyFlag,
  };
}

function getEventField(event, fieldName) {
  if (!event || typeof event !== "object") {
    return undefined;
  }

  const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
  return event[fieldName] ?? payload[fieldName];
}

function hashObject(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeDedupePayload(payload = {}) {
  const normalizedPayload = payload && typeof payload === "object" ? payload : {};
  const normalizeList = (value) =>
    Array.isArray(value)
      ? value.map((entry) => normalizeString(entry)).filter((entry) => entry)
      : [];

  const normalizeInteger = (value) =>
    Number.isInteger(value) ? value : null;

  return {
    message: normalizeString(normalizedPayload.message) || null,
    description: normalizeString(normalizedPayload.description) || null,
    nextAction: normalizeString(normalizedPayload.nextAction) || null,
    rootCause: normalizeString(normalizedPayload.rootCause) || null,
    triggeredByType: normalizeString(normalizedPayload.triggeredByType) || null,
    retryCount: normalizeInteger(normalizedPayload.retryCount),
    autoRecovery: normalizedPayload.autoRecovery === true,
    rolledBack: normalizedPayload.rolledBack === true,
    rollbackBlocked: normalizedPayload.rollbackBlocked === true,
    rollbackPath: normalizeString(normalizedPayload.rollbackPath) || null,
    dependsOn: normalizeList(normalizedPayload.dependsOn),
    artifactPaths: normalizeList(normalizedPayload.artifactPaths),
    rollbackConflicts: normalizeList(normalizedPayload.rollbackConflicts),
    acceptanceCriteria: normalizeList(normalizedPayload.acceptanceCriteria),
    blockers: normalizeList(normalizedPayload.blockers),
    specRefs: normalizeList(normalizedPayload.specRefs),
    featureSlug: normalizeString(normalizedPayload.featureSlug) || null,
    docType: normalizeString(normalizedPayload.docType) || null,
  };
}

function buildDedupeSignature(eventLike, fallbackAgent) {
  const payload = eventLike && typeof eventLike.payload === "object" ? eventLike.payload : {};
  const taskId = normalizeString(getEventField(eventLike, "taskId"));
  const status = normalizeString(getEventField(eventLike, "status"));
  const type = normalizeString(eventLike?.type);
  const agent = normalizeString(eventLike?.agent) || normalizeString(fallbackAgent);
  const semanticPayload = normalizeDedupePayload(payload);

  return {
    taskId,
    status,
    type,
    agent,
    semanticHash: hashObject(semanticPayload),
  };
}

export function evaluateDeterministicDedupe(type, payload, history = [], options = {}) {
  const dedupeEnabled = options.enabled !== false;
  if (!dedupeEnabled) {
    return { suppressed: false, reason: "dedupe_disabled" };
  }

  const normalizedType = normalizeString(type);
  if (!TASK_EVENT_TYPES.has(normalizedType)) {
    return { suppressed: false, reason: "unsupported_event_type" };
  }

  const taskId = normalizeString(payload?.taskId);
  const status = normalizeString(payload?.status);
  const agent = normalizeString(options.agent);
  if (!taskId || !status || !agent) {
    return { suppressed: false, reason: "missing_dedupe_key_fields" };
  }

  const latestTaskLifecycleEvent = Array.isArray(history)
    ? [...history]
        .reverse()
        .find((event) => {
          const eventTaskId = normalizeString(getEventField(event, "taskId"));
          return eventTaskId === taskId && TASK_EVENT_TYPES.has(normalizeString(event?.type));
        })
    : null;

  if (!latestTaskLifecycleEvent) {
    return { suppressed: false, reason: "no_previous_lifecycle_event" };
  }

  const candidateSignature = buildDedupeSignature(
    {
      type: normalizedType,
      payload,
      taskId,
      status,
      agent,
    },
    agent
  );
  const lastSignature = buildDedupeSignature(latestTaskLifecycleEvent, agent);

  if (
    candidateSignature.type !== lastSignature.type ||
    candidateSignature.status !== lastSignature.status ||
    candidateSignature.agent !== lastSignature.agent
  ) {
    return { suppressed: false, reason: "latest_transition_differs" };
  }

  if (candidateSignature.semanticHash !== lastSignature.semanticHash) {
    return { suppressed: false, reason: "semantic_payload_differs" };
  }

  const windowMs =
    Number.isInteger(options.windowMs) && options.windowMs >= 0
      ? options.windowMs
      : DEDUPE_DEFAULTS.windowMs;
  const nowTimestamp =
    Number.isFinite(options.nowTimestamp)
      ? options.nowTimestamp
      : Date.now();
  const lastTimestamp = Date.parse(latestTaskLifecycleEvent.timestamp || "");

  if (!Number.isFinite(lastTimestamp)) {
    return { suppressed: false, reason: "invalid_previous_timestamp" };
  }

  const ageMs = Math.max(0, nowTimestamp - lastTimestamp);
  if (ageMs > windowMs) {
    return { suppressed: false, reason: "outside_dedupe_window", ageMs, windowMs };
  }

  return {
    suppressed: true,
    reason: "duplicate_lifecycle_replay",
    dedupeKey: `${taskId}|${candidateSignature.type}|${candidateSignature.status}|${agent}`,
    matchedEventId: normalizeString(latestTaskLifecycleEvent.eventId) || null,
    ageMs,
    windowMs,
  };
}

function assertNonEmptyString(value, fieldName) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new Error(`'${fieldName}' must be a non-empty string.`);
  }

  return normalized;
}

function assertPlainObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`'${fieldName}' must be a plain JSON object.`);
  }

  return value;
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`'${fieldName}' must be an array.`);
  }

  return value;
}

export function normalizeEventPayloadForStorage(payload, topLevelFields = {}, options = {}) {
  const normalizedPayload = assertPlainObject(payload, "payload");
  const legacyPayloadMode = Boolean(options.legacyPayloadMode);

  if (legacyPayloadMode) {
    return { ...normalizedPayload };
  }

  const compactPayload = { ...normalizedPayload };

  for (const fieldName of CANONICAL_PAYLOAD_FIELDS) {
    if (!(fieldName in compactPayload)) {
      continue;
    }

    if (!(fieldName in topLevelFields)) {
      continue;
    }

    const topLevelValue = topLevelFields[fieldName];
    if (topLevelValue === undefined) {
      continue;
    }

    if (jsonLikeEqual(compactPayload[fieldName], topLevelValue)) {
      delete compactPayload[fieldName];
    }
  }

  return compactPayload;
}

export function applyMessageBudgetPolicy(payload, options = {}) {
  const normalizedPayload = assertPlainObject(payload, "payload");
  const policyVersion = "1.0";
  const targetChars = Number.isInteger(options.targetChars) && options.targetChars > 0
    ? options.targetChars
    : MESSAGE_BUDGET_DEFAULTS.targetChars;
  const softLimitChars = Number.isInteger(options.softLimitChars) && options.softLimitChars >= targetChars
    ? options.softLimitChars
    : Math.max(targetChars, MESSAGE_BUDGET_DEFAULTS.softLimitChars);
  const hardLimitEnabled = Boolean(options.hardLimitEnabled);

  const message = normalizeString(normalizedPayload.message);
  if (!message) {
    return {
      payload: { ...normalizedPayload },
      budget: null,
      warning: null,
    };
  }

  const artifactPaths = Array.isArray(normalizedPayload.artifactPaths)
    ? normalizedPayload.artifactPaths
        .map((entry) => normalizeString(entry))
        .filter((entry) => entry)
    : [];
  const hasArtifacts = artifactPaths.length > 0;
  const originalLength = message.length;

  const payloadWithBudget = { ...normalizedPayload };
  let warning = null;
  let normalizedMessage = message;
  let state = "within_target";
  let offloadRequired = false;

  if (originalLength > targetChars) {
    normalizedMessage = summarizeToLimit(message, targetChars);

    if (originalLength > softLimitChars) {
      offloadRequired = true;
      if (hardLimitEnabled && !hasArtifacts) {
        throw new Error(
          `payload.message exceeds soft limit (${originalLength} > ${softLimitChars}) without artifactPaths. Add artifact offload or disable MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED.`
        );
      }

      state = hasArtifacts ? "trimmed_with_artifact_offload" : "trimmed_offload_suggested";
      warning = hasArtifacts
        ? `Message trimmed to ${targetChars} chars with artifact offload.`
        : `Message exceeds soft limit; trimmed to ${targetChars} chars. Add artifactPaths for full detail offload.`;
    } else {
      state = "trimmed_to_target";
      warning = `Message trimmed to ${targetChars} chars (target budget).`;
    }
  }

  payloadWithBudget.message = normalizedMessage;
  payloadWithBudget.messageBudget = {
    policyVersion,
    targetChars,
    softLimitChars,
    hardLimitEnabled,
    originalLength,
    normalizedLength: normalizedMessage.length,
    state,
    offloadRequired,
    artifactPathsPresent: hasArtifacts,
  };

  if (offloadRequired && !hasArtifacts) {
    payloadWithBudget.offloadHint = {
      reason: "message_over_soft_limit",
      recommendedAction: "Write full detail to report and include artifactPaths",
      recommendedPathTemplate: "docs/internal/reports/<taskId>-details.md",
    };
  }

  return {
    payload: payloadWithBudget,
    budget: payloadWithBudget.messageBudget,
    warning,
  };
}

function assertStatus(value, fieldName = "payload.status") {
  const normalized = assertNonEmptyString(value, fieldName);
  if (!TASK_STATUSES.has(normalized)) {
    throw new Error(`'${fieldName}' must be one of: ${Array.from(TASK_STATUSES).join(", ")}.`);
  }

  return normalized;
}

function validatePlannedTask(task, index) {
  const label = `payload.proposedTasks[${index}]`;
  assertPlainObject(task, label);
  assertNonEmptyString(task.taskId, `${label}.taskId`);
  assertNonEmptyString(task.assignedTo, `${label}.assignedTo`);
  assertArray(task.dependsOn ?? [], `${label}.dependsOn`);
  assertNonEmptyString(task.description, `${label}.description`);
  assertArray(task.acceptanceCriteria ?? [], `${label}.acceptanceCriteria`);
}

export function validateEventPayload(type, payload) {
  if (TASK_EVENT_TYPES.has(type)) {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.assignedTo, "payload.assignedTo");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.correlationId, "payload.correlationId");

    const expectedStatus = TASK_EVENT_STATUS_BY_TYPE[type];
    if (expectedStatus && payload.status !== expectedStatus) {
      throw new Error(`'payload.status' must be '${expectedStatus}' for ${type}.`);
    }
  }

  if (type === "TASK_ASSIGNED") {
    const acceptanceCriteria = assertArray(payload.acceptanceCriteria ?? [], "payload.acceptanceCriteria");
    if (acceptanceCriteria.length === 0) {
      throw new Error("TASK_ASSIGNED requires at least one acceptance criterion.");
    }
    if (!normalizeString(payload.description) && !normalizeString(payload.message)) {
      throw new Error("'payload.description' or 'payload.message' is required for TASK_ASSIGNED.");
    }
  }

  if (type === "PLAN_PROPOSED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.assignedTo, "payload.assignedTo");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.correlationId, "payload.correlationId");
    const proposedTasks = assertArray(payload.proposedTasks, "payload.proposedTasks");
    if (proposedTasks.length === 0) {
      throw new Error("PLAN_PROPOSED requires at least one proposed task.");
    }
    if (!normalizeString(payload.message) && !normalizeString(payload.description)) {
      throw new Error("PLAN_PROPOSED requires 'payload.message' or 'payload.description'.");
    }
    proposedTasks.forEach((task, index) => validatePlannedTask(task, index));
  }

  if (type === "SUBTASK_REQUESTED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.message, "payload.message");
    assertArray(payload.suggestedSubtasks ?? [], "payload.suggestedSubtasks");
  }

  if (type === "DOC_UPDATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.docType, "payload.docType");
    assertNonEmptyString(payload.featureSlug, "payload.featureSlug");
    const hasPath = normalizeString(payload.path);
    const hasArtifacts = Array.isArray(payload.artifactPaths) && payload.artifactPaths.length > 0;
    if (!hasPath && !hasArtifacts) {
      throw new Error("DOC_UPDATED requires 'payload.path' or 'payload.artifactPaths'.");
    }
  }

  if (type === "ENDPOINT_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.path, "payload.path");
    assertNonEmptyString(payload.method, "payload.method");
  }

  if (type === "UI_COMPONENT_BUILT") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.path, "payload.path");
  }

  if (type === "SKILL_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    if (!normalizeString(payload.path) && !normalizeString(payload.skillName)) {
      throw new Error("SKILL_CREATED requires 'payload.path' or 'payload.skillName'.");
    }
  }

  if (type === "GITHUB_ISSUE_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.issueUrl, "payload.issueUrl");
  }

  if (type === "GITHUB_BRANCH_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.branchName, "payload.branchName");
    assertNonEmptyString(payload.baseBranch, "payload.baseBranch");
  }

  if (type === "GITHUB_PR_OPENED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.branchName, "payload.branchName");
    assertNonEmptyString(payload.baseBranch, "payload.baseBranch");
    assertNonEmptyString(payload.prUrl, "payload.prUrl");
  }

  if (type === "LEARNING_RECORDED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.message, "payload.message");
  }

  if (type === "TEST_PASSED" || type === "TEST_FAILED" || type === "INCIDENT_OPENED" || type === "INCIDENT_RESOLVED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    if ((type === "TEST_FAILED" || type === "INCIDENT_OPENED") && !normalizeString(payload.message) && !normalizeString(payload.rootCause)) {
      throw new Error(`${type} requires 'payload.message' or 'payload.rootCause'.`);
    }
  }
}

export function validateTaskEventSequence(type, payload, taskHistory = [], options = {}) {
  const taskId = normalizeString(payload?.taskId);
  if (!taskId) {
    return;
  }

  const relevantType = TASK_EVENT_TYPES.has(type) || TASK_TERMINAL_EVENT_TYPES.has(type);
  if (!relevantType) {
    return;
  }

  const allowSequenceOverride = Boolean(options.allowSequenceOverride);
  const taskEvents = Array.isArray(taskHistory)
    ? taskHistory.filter((event) => normalizeString(getEventField(event, "taskId")) === taskId)
    : [];

  const terminalEvents = taskEvents.filter((event) => TASK_TERMINAL_EVENT_TYPES.has(event.type));
  const lastTerminal = terminalEvents[terminalEvents.length - 1] || null;
  if (lastTerminal) {
    throw new Error(`Task '${taskId}' is already terminal with '${lastTerminal.type}'. New events are rejected to prevent inconsistent terminal states.`);
  }

  const hasAssigned = taskEvents.some((event) => event.type === "TASK_ASSIGNED");
  const hasAccepted = taskEvents.some((event) => event.type === "TASK_ACCEPTED");
  const hasInProgress = taskEvents.some((event) => event.type === "TASK_IN_PROGRESS");
  const lastSequenceIndex = taskEvents.reduce((accumulator, event) => {
    const index = TASK_SEQUENCE_ORDER[event.type];
    return Number.isInteger(index) && index > accumulator ? index : accumulator;
  }, -1);

  if (TASK_TERMINAL_EVENT_TYPES.has(type)) {
    if (!hasInProgress && !allowSequenceOverride) {
      throw new Error(`'${type}' requires a previous TASK_IN_PROGRESS for task '${taskId}'. Use sequence override only for controlled recovery scenarios.`);
    }
    return;
  }

  const currentSequenceIndex = TASK_SEQUENCE_ORDER[type];
  if (!Number.isInteger(currentSequenceIndex)) {
    return;
  }

  if (currentSequenceIndex === 0) {
    if (taskEvents.length > 0 && !allowSequenceOverride) {
      throw new Error(`TASK_ASSIGNED must be the first lifecycle event for task '${taskId}'.`);
    }
    return;
  }

  if (currentSequenceIndex === 1 && !hasAssigned && !allowSequenceOverride) {
    throw new Error(`TASK_ACCEPTED requires previous TASK_ASSIGNED for task '${taskId}'.`);
  }

  if (currentSequenceIndex === 2 && !hasAccepted && !allowSequenceOverride) {
    throw new Error(`TASK_IN_PROGRESS requires previous TASK_ACCEPTED for task '${taskId}'.`);
  }

  if (currentSequenceIndex < lastSequenceIndex && !allowSequenceOverride) {
    throw new Error(`Lifecycle event '${type}' is out of order for task '${taskId}'.`);
  }
}
