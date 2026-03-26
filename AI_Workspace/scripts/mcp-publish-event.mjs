#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import {
  TASK_EVENT_TYPES,
  TASK_EVENT_STATUS_BY_TYPE,
  TASK_TERMINAL_EVENT_TYPES,
  validateEventPayload,
  validateTaskEventSequence,
} from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEXT_FILE = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

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
      validateEventPayload(normalizedType, normalizedPayload);
    }
  }

  if (TASK_EVENT_TYPES.has(normalizedType) || TASK_TERMINAL_EVENT_TYPES.has(normalizedType)) {
    assertNonEmptyString(taskId, "payload.taskId");
    const history = await readEventsFromContext();
    validateTaskEventSequence(normalizedType, normalizedPayload, history, {
      allowSequenceOverride: Boolean(options.allowSequenceOverride),
    });
  }

  return {
    normalizedAgent,
    normalizedType,
    taskId,
    assignedTo,
    status,
    priority,
    correlationId,
    parentTaskId,
    normalizedPayload,
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
  } = normalizedInput;

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
    payloadVersion: "1.0",
    payload: normalizedPayload,
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
    await normalizeAndValidateEventInput(args.agent, args.type, payload, {
      allowSequenceOverride: Boolean(args.allowSequenceOverride),
    });
    console.log(JSON.stringify({ agent: args.agent, type: args.type, payload, dryRunValidated: true }, null, 2));
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
