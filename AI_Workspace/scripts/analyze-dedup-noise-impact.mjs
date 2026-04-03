#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEDUPE_DEFAULTS,
  TASK_EVENT_TYPES,
  evaluateDeterministicDedupe,
} from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contextPath = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseEventLines(contents) {
  return contents
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
}

function withTopLevelFallback(event) {
  const payload =
    event && typeof event.payload === "object" && event.payload !== null
      ? { ...event.payload }
      : {};

  if (!payload.taskId && event.taskId) payload.taskId = event.taskId;
  if (!payload.assignedTo && event.assignedTo) payload.assignedTo = event.assignedTo;
  if (!payload.status && event.status) payload.status = event.status;
  if (!payload.correlationId && event.correlationId) payload.correlationId = event.correlationId;
  if (!payload.priority && event.priority) payload.priority = event.priority;
  if (!payload.parentTaskId && event.parentTaskId) payload.parentTaskId = event.parentTaskId;
  if (!payload.dependsOn && Array.isArray(event.dependsOn)) payload.dependsOn = event.dependsOn;
  if (!payload.artifactPaths && Array.isArray(event.artifactPaths)) payload.artifactPaths = event.artifactPaths;

  return payload;
}

function percentage(before, after) {
  if (!Number.isFinite(before) || before <= 0) {
    return 0;
  }

  return Number((((before - after) / before) * 100).toFixed(2));
}

function runDedupeAnalysis(events, dedupeWindowMs) {
  const keptEvents = [];
  let lifecycleTotal = 0;
  let lifecycleSuppressed = 0;
  const suppressedByType = {};

  for (const event of events) {
    const normalizedType = normalizeString(event.type);
    if (!TASK_EVENT_TYPES.has(normalizedType)) {
      keptEvents.push(event);
      continue;
    }

    lifecycleTotal += 1;
    const decision = evaluateDeterministicDedupe(
      normalizedType,
      withTopLevelFallback(event),
      keptEvents,
      {
        enabled: true,
        windowMs: Number.isFinite(dedupeWindowMs) ? dedupeWindowMs : DEDUPE_DEFAULTS.windowMs,
        agent: event.agent,
        nowTimestamp: Date.parse(event.timestamp || "") || Date.now(),
      }
    );

    if (decision.suppressed) {
      lifecycleSuppressed += 1;
      suppressedByType[normalizedType] = (suppressedByType[normalizedType] || 0) + 1;
      continue;
    }

    keptEvents.push(event);
  }

  const lifecycleAfter = lifecycleTotal - lifecycleSuppressed;

  return {
    before: lifecycleTotal,
    after: lifecycleAfter,
    suppressed: lifecycleSuppressed,
    suppressionRatePercent: percentage(lifecycleTotal, lifecycleAfter),
    signalToNoiseRatio: lifecycleTotal > 0
      ? Number((lifecycleAfter / lifecycleTotal).toFixed(4))
      : 1,
    suppressedByType,
  };
}

function buildSyntheticReplayDataset(events, replayCount = 50) {
  const latestByTask = new Map();
  for (const event of events) {
    const type = normalizeString(event.type);
    const taskId = normalizeString(event.taskId || event.payload?.taskId);
    if (!TASK_EVENT_TYPES.has(type) || !taskId) {
      continue;
    }

    latestByTask.set(taskId, event);
  }

  const sampled = Array.from(latestByTask.values())
    .sort((left, right) => {
      const leftTs = Date.parse(left.timestamp || "") || 0;
      const rightTs = Date.parse(right.timestamp || "") || 0;
      return rightTs - leftTs;
    })
    .slice(0, replayCount);
  const synthetic = sampled.map((event, index) => {
    const baseTime = Date.parse(event.timestamp || "") || Date.now();
    const replayTimestamp = new Date(baseTime + (index + 1) * 1000).toISOString();
    return {
      ...event,
      eventId: `synthetic-replay-${index + 1}`,
      timestamp: replayTimestamp,
    };
  });

  return {
    replayCount: synthetic.length,
    events: [...events, ...synthetic],
  };
}

async function main() {
  const data = await fs.readFile(contextPath, "utf-8");
  const events = parseEventLines(data);
  const dedupeWindowMs = Number.parseInt(
    process.env.MCP_CONTEXT_DEDUP_WINDOW_MS || String(DEDUPE_DEFAULTS.windowMs),
    10
  );

  const realDataset = runDedupeAnalysis(events, dedupeWindowMs);
  const syntheticDataset = buildSyntheticReplayDataset(events, 50);
  const syntheticAnalysis = runDedupeAnalysis(
    syntheticDataset.events,
    dedupeWindowMs
  );

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      path: contextPath,
      totalEvents: events.length,
    },
    dedupePolicy: {
      enabled: true,
      windowMs: Number.isFinite(dedupeWindowMs) ? dedupeWindowMs : DEDUPE_DEFAULTS.windowMs,
      key: "taskId+type+status+agent+semantic_payload_hash",
      scope: "lifecycle_events_only",
    },
    lifecycle: {
      observedDataset: realDataset,
      syntheticReplayDataset: {
        replayCountInjected: syntheticDataset.replayCount,
        ...syntheticAnalysis,
      },
      effectivenessOnInjectedReplayPercent: syntheticDataset.replayCount > 0
        ? Number(((syntheticAnalysis.suppressed / syntheticDataset.replayCount) * 100).toFixed(2))
        : 0,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
