export const TASK_STATUSES = new Set(["assigned", "accepted", "in_progress", "blocked", "completed", "failed", "cancelled"]);
export const TASK_EVENT_TYPES = new Set(["TASK_ASSIGNED", "TASK_ACCEPTED", "TASK_IN_PROGRESS", "TASK_BLOCKED", "TASK_COMPLETED", "TASK_FAILED", "TASK_CANCELLED"]);
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
