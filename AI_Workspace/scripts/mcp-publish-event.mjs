#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import {
  DEDUPE_DEFAULTS,
  applySnapshotSafetyPolicy,
  applyMessageBudgetPolicy,
  evaluateDeterministicDedupe,
  MESSAGE_BUDGET_DEFAULTS,
  TASK_EVENT_TYPES,
  TASK_EVENT_STATUS_BY_TYPE,
  TASK_TERMINAL_EVENT_TYPES,
  normalizeEventPayloadForStorage,
  validateEventPayload,
  validateTaskEventSequence,
} from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEXT_FILE = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");
const MCP_CONTEXT_LEGACY_PAYLOAD_MODE =
  (process.env.MCP_CONTEXT_LEGACY_PAYLOAD_MODE || "false").toLowerCase() === "true";
const MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED =
  (process.env.MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_TOKEN_BUDGETS_ENABLED =
  (process.env.MCP_CONTEXT_TOKEN_BUDGETS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_REDACTION_ENABLED =
  (process.env.MCP_CONTEXT_REDACTION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED =
  (process.env.MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED =
  (process.env.MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED =
  (process.env.MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED || "false").toLowerCase() === "true";
const MCP_CONTEXT_DEDUP_ENABLED =
  (process.env.MCP_CONTEXT_DEDUP_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_DEDUP_WINDOW_MS = Number.parseInt(
  process.env.MCP_CONTEXT_DEDUP_WINDOW_MS || String(DEDUPE_DEFAULTS.windowMs),
  10
);
const MCP_CONTEXT_MESSAGE_TARGET_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_TARGET_CHARS || String(MESSAGE_BUDGET_DEFAULTS.targetChars),
  10
);
const MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS || String(MESSAGE_BUDGET_DEFAULTS.softLimitChars),
  10
);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertNonEmptyString(value, fieldName) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new Error(`'${fieldName}' must be a non-empty string`);
  }
  return normalized;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(entry => normalizeString(entry)).filter(entry => entry !== undefined);
}

function parseArgs(argv) {
  const result = { tags: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument '${token}'`);
    }
    const key = token.slice(2);
    const nextValue = argv[i + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      if (key === "dry-run") {
        result.dryRun = true;
        continue;
      }
      if (key === "allow-sequence-override") {
        result.allowSequenceOverride = true;
        continue;
      }
      throw new Error(`Argument '--${key}' requires a value`);
    }
    i++;
    if (key === "tag") {
      result.tags.push(nextValue);
      continue;
    }
    result[key] = nextValue;
  }
  return result;
}

async function readEventsFromContext() {
  try {
    const data = await fs.promises.readFile(CONTEXT_FILE, "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function normalizeAndValidateEventInput(agent, type, payload, options = {}) {
  const normalizedAgent = assertNonEmptyString(agent, "agent");
  const normalizedType = assertNonEmptyString(type, "type");
  const taskId = normalizeString(payload.taskId);
  const assignedTo = normalizeString(payload.assignedTo);
  const status = normalizeString(payload.status);
  const priority = normalizeString(payload.priority);
  const correlationId = normalizeString(payload.correlationId) || taskId;
  const parentTaskId = normalizeString(payload.parentTaskId);

  const normalizedPayload = {
    ...payload,
    ...(taskId ? { taskId } : {}),
    ...(assignedTo ? { assignedTo } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(parentTaskId ? { parentTaskId } : {}),
  };

  const { payload: safetyPayload } = applySnapshotSafetyPolicy(normalizedPayload, {
    redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
    memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
  });

  const messageBudgetEnabled = MCP_CONTEXT_TOKEN_BUDGETS_ENABLED && MCP_CONTEXT_MESSAGE_BUDGET_ENABLED;
  const artifactOffloadEnabled = MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED && MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED;

  let { payload: budgetedPayload, warning: messageBudgetWarning } = messageBudgetEnabled
    ? applyMessageBudgetPolicy(safetyPayload, {
        targetChars: MCP_CONTEXT_MESSAGE_TARGET_CHARS,
        softLimitChars: MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS,
        hardLimitEnabled: MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED,
      })
    : { payload: { ...safetyPayload }, warning: null };

  if (!artifactOffloadEnabled) {
    delete budgetedPayload.offloadHint;
    if (budgetedPayload.messageBudget && typeof budgetedPayload.messageBudget === "object") {
      budgetedPayload.messageBudget.offloadRequired = false;
      if (budgetedPayload.messageBudget.state === "trimmed_offload_suggested") {
        budgetedPayload.messageBudget.state = "trimmed_to_target";
      }
    }
    if (messageBudgetWarning && messageBudgetWarning.toLowerCase().includes("artifactpaths")) {
      messageBudgetWarning = "Message trimmed to target budget (artifact offload disabled by flag).";
    }
  }

  if (TASK_EVENT_TYPES.has(normalizedType)) {
    assertNonEmptyString(taskId, "payload.taskId");
    assertNonEmptyString(assignedTo, "payload.assignedTo");
    assertNonEmptyString(status, "payload.status");
    assertNonEmptyString(correlationId, "payload.correlationId");

    const expectedStatus = TASK_EVENT_STATUS_BY_TYPE[normalizedType];
    if (expectedStatus && status !== expectedStatus) {
      throw new Error(`'payload.status' must be '${expectedStatus}' for ${normalizedType}.`);
    }

    if (normalizedType !== "TASK_ASSIGNED") {
      validateEventPayload(normalizedType, budgetedPayload);
    }
  }

  let lifecycleHistory = [];
  if (TASK_EVENT_TYPES.has(normalizedType) || TASK_TERMINAL_EVENT_TYPES.has(normalizedType)) {
    assertNonEmptyString(taskId, "payload.taskId");
    lifecycleHistory = await readEventsFromContext();
    validateTaskEventSequence(normalizedType, normalizedPayload, lifecycleHistory, {
      allowSequenceOverride: Boolean(options.allowSequenceOverride),
    });
  }

  const dedupeDecision = evaluateDeterministicDedupe(
    normalizedType,
    budgetedPayload,
    lifecycleHistory,
    {
      enabled: MCP_CONTEXT_DEDUP_ENABLED,
      windowMs: Number.isFinite(MCP_CONTEXT_DEDUP_WINDOW_MS)
        ? MCP_CONTEXT_DEDUP_WINDOW_MS
        : DEDUPE_DEFAULTS.windowMs,
      agent: normalizedAgent,
    }
  );

  return {
    normalizedAgent,
    normalizedType,
    taskId,
    assignedTo,
    status,
    priority,
    correlationId,
    parentTaskId,
    normalizedPayload: budgetedPayload,
    messageBudgetWarning,
    dedupeDecision,
  };
}

async function appendEvent(agent, type, payload, options = {}) {
  const normalizedInput = await normalizeAndValidateEventInput(agent, type, payload, options);
  const {
    normalizedAgent,
    normalizedType,
    taskId,
    assignedTo,
    status,
    priority,
    correlationId,
    parentTaskId,
    normalizedPayload,
    messageBudgetWarning,
    dedupeDecision,
  } = normalizedInput;

  if (messageBudgetWarning) {
    console.error(`[mcp-publish-event] ${messageBudgetWarning}`);
  }

  if (dedupeDecision?.suppressed) {
    return {
      suppressed: true,
      dedupe: dedupeDecision,
      agent: normalizedAgent,
      type: normalizedType,
      taskId,
      status,
      correlationId,
      payload: normalizedPayload,
    };
  }

  const dependsOn = normalizeStringList(normalizedPayload.dependsOn);
  const artifactPaths = normalizeStringList(normalizedPayload.artifactPaths);
  const payloadVersion = normalizeString(normalizedPayload.payloadVersion) || "1.0";

  const compactPayload = normalizeEventPayloadForStorage(
    normalizedPayload,
    {
      taskId,
      assignedTo,
      status,
      priority,
      correlationId,
      parentTaskId,
      dependsOn,
      artifactPaths,
      payloadVersion,
    },
    {
      legacyPayloadMode:
        MCP_CONTEXT_LEGACY_PAYLOAD_MODE ||
        !MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED ||
        !MCP_CONTEXT_TOKEN_BUDGETS_ENABLED,
    }
  );

  const event = {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agent: normalizedAgent,
    type: normalizedType,
    taskId,
    assignedTo,
    status,
    priority,
    correlationId,
    parentTaskId,
    dependsOn,
    artifactPaths,
    payloadVersion,
    payload: compactPayload,
  };

  const line = JSON.stringify(event) + "\n";
  await fs.promises.appendFile(CONTEXT_FILE, line, "utf-8");
  return event;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.agent || !args.type) {
    throw new Error("--agent and --type are required");
  }

  const payload = {};
  if (args.task) payload.taskId = args.task;
  if (args.assignedTo) payload.assignedTo = args.assignedTo;
  if (args.status) payload.status = args.status;
  if (args.priority) payload.priority = args.priority;
  if (args.dependsOn) payload.dependsOn = args.dependsOn.split(",");
  if (args.correlation) payload.correlationId = args.correlation;
  if (args.parentTask) payload.parentTaskId = args.parentTask;
  if (args.message) payload.message = args.message;
  if (args.description) payload.description = args.description;
  if (args.artifact) payload.artifactPaths = args.artifact.split(",");
  if (args.overrideReason) payload.overrideReason = args.overrideReason;
  if (args.allowSequenceOverride) payload.allowSequenceOverride = true;

  if (args.dryRun) {
    const normalized = await normalizeAndValidateEventInput(args.agent, args.type, payload, {
      allowSequenceOverride: Boolean(args.allowSequenceOverride),
    });
    if (normalized.messageBudgetWarning) {
      console.error(`[mcp-publish-event] ${normalized.messageBudgetWarning}`);
    }
    const eventPreviewDependsOn = normalizeStringList(normalized.normalizedPayload.dependsOn);
    const eventPreviewArtifactPaths = normalizeStringList(normalized.normalizedPayload.artifactPaths);
    const eventPreviewPayloadVersion =
      normalizeString(normalized.normalizedPayload.payloadVersion) || "1.0";
    const eventPreviewCompactPayload = normalizeEventPayloadForStorage(
      normalized.normalizedPayload,
      {
        taskId: normalized.taskId,
        assignedTo: normalized.assignedTo,
        status: normalized.status,
        priority: normalized.priority,
        correlationId: normalized.correlationId,
        parentTaskId: normalized.parentTaskId,
        dependsOn: eventPreviewDependsOn,
        artifactPaths: eventPreviewArtifactPaths,
        payloadVersion: eventPreviewPayloadVersion,
      },
      {
        legacyPayloadMode:
          MCP_CONTEXT_LEGACY_PAYLOAD_MODE ||
          !MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED ||
          !MCP_CONTEXT_TOKEN_BUDGETS_ENABLED,
      }
    );

    console.log(
      JSON.stringify(
        {
          agent: args.agent,
          type: args.type,
          payload,
          normalizedPayload: normalized.normalizedPayload,
          dedupeDecision: normalized.dedupeDecision,
          eventPreview: {
            taskId: normalized.taskId,
            assignedTo: normalized.assignedTo,
            status: normalized.status,
            priority: normalized.priority,
            correlationId: normalized.correlationId,
            parentTaskId: normalized.parentTaskId,
            dependsOn: eventPreviewDependsOn,
            artifactPaths: eventPreviewArtifactPaths,
            payloadVersion: eventPreviewPayloadVersion,
            payload: eventPreviewCompactPayload,
          },
          dryRunValidated: true,
        },
        null,
        2
      )
    );
    return;
  }

  const result = await appendEvent(args.agent, args.type, payload, {
    allowSequenceOverride: Boolean(args.allowSequenceOverride),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
