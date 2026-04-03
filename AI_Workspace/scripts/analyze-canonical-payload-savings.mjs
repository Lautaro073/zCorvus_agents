#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEventPayloadForStorage } from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contextPath = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function estimateTokens(value) {
  return Math.round(value / 4);
}

function normalizeEvent(event, legacyPayloadMode = false) {
  if (!event || typeof event !== "object") {
    return event;
  }

  const payload = event.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return event;
  }

  const payloadVersion =
    typeof event.payloadVersion === "string" && event.payloadVersion.trim().length > 0
      ? event.payloadVersion.trim()
      : "1.0";

  const compactPayload = normalizeEventPayloadForStorage(
    payload,
    {
      taskId: event.taskId,
      assignedTo: event.assignedTo,
      status: event.status,
      priority: event.priority,
      correlationId: event.correlationId,
      parentTaskId: event.parentTaskId,
      dependsOn: event.dependsOn,
      artifactPaths: event.artifactPaths,
      payloadVersion,
    },
    { legacyPayloadMode },
  );

  return {
    ...event,
    payloadVersion,
    payload: compactPayload,
  };
}

async function main() {
  const raw = await fs.readFile(contextPath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const events = lines.map(parseLine).filter(Boolean);

  const normalizedEvents = events.map((event) => normalizeEvent(event, false));

  const originalJson = JSON.stringify(events);
  const normalizedJson = JSON.stringify(normalizedEvents);

  const originalBytes = bytes(originalJson);
  const normalizedBytes = bytes(normalizedJson);
  const savedBytes = Math.max(0, originalBytes - normalizedBytes);
  const savedPercent = originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0;

  const output = {
    generatedAt: new Date().toISOString(),
    contextPath,
    events: events.length,
    originalBytes,
    normalizedBytes,
    savedBytes,
    savedPercent: Number(savedPercent.toFixed(2)),
    originalEstimatedTokens: estimateTokens(originalBytes),
    normalizedEstimatedTokens: estimateTokens(normalizedBytes),
    savedEstimatedTokens: estimateTokens(savedBytes),
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
