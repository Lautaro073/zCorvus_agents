#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contextPath = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function toMB(value) {
  return Number((value / 1024 / 1024).toFixed(2));
}

function estimateTokens(value) {
  return Math.round(value / 4);
}

function buildTaskGroups(events) {
  const groups = new Map();

  for (const event of events) {
    const taskId = event.taskId ?? event?.payload?.taskId;
    if (!taskId) continue;

    if (!groups.has(taskId)) {
      groups.set(taskId, {
        taskId,
        assignedTo: event.assignedTo ?? event?.payload?.assignedTo ?? null,
        latestStatus: event.status ?? event?.payload?.status ?? "unknown",
        priority: event.priority ?? event?.payload?.priority ?? null,
        parentTaskId: event.parentTaskId ?? event?.payload?.parentTaskId ?? null,
        dependsOn: event.dependsOn ?? event?.payload?.dependsOn ?? [],
        updatedAt: event.timestamp ?? null,
        events: [],
      });
    }

    const group = groups.get(taskId);
    group.events.push(event);
    group.assignedTo = event.assignedTo ?? event?.payload?.assignedTo ?? group.assignedTo;
    group.latestStatus = event.status ?? event?.payload?.status ?? group.latestStatus;
    group.priority = event.priority ?? event?.payload?.priority ?? group.priority;
    group.parentTaskId = event.parentTaskId ?? event?.payload?.parentTaskId ?? group.parentTaskId;
    group.updatedAt = event.timestamp ?? group.updatedAt;
  }

  return Array.from(groups.values());
}

function countBy(items, getter) {
  const output = {};
  for (const item of items) {
    const key = getter(item);
    output[key] = (output[key] ?? 0) + 1;
  }
  return output;
}

function topEntries(objectMap, limit = 10) {
  return Object.fromEntries(
    Object.entries(objectMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  );
}

function dropRedundantPayloadFields(event) {
  const copy = JSON.parse(JSON.stringify(event));
  const canonicalFields = [
    "taskId",
    "assignedTo",
    "status",
    "priority",
    "correlationId",
    "parentTaskId",
    "artifactPaths",
    "dependsOn",
    "payloadVersion",
  ];

  if (!copy.payload || typeof copy.payload !== "object") {
    return copy;
  }

  for (const field of canonicalFields) {
    if (!(field in copy.payload)) continue;
    if (JSON.stringify(copy.payload[field]) === JSON.stringify(copy[field])) {
      delete copy.payload[field];
    }
  }

  if (Object.keys(copy.payload).length === 0) {
    delete copy.payload;
  }

  return copy;
}

function latestByTask(events) {
  const latest = new Map();
  for (const event of events) {
    const taskId = event.taskId ?? event?.payload?.taskId;
    if (!taskId) continue;
    latest.set(taskId, event);
  }
  return Array.from(latest.values());
}

async function main() {
  const raw = await fs.readFile(contextPath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const events = lines.map(safeParse).filter(Boolean);

  const byType = topEntries(countBy(events, (event) => event.type ?? "unknown"));
  const byAgent = topEntries(countBy(events, (event) => event.agent ?? "unknown"));

  const byStatus = topEntries(
    countBy(events, (event) => event.status ?? event?.payload?.status ?? "unknown")
  );

  const byDay = topEntries(countBy(events, (event) => (event.timestamp ?? "unknown").slice(0, 10)));

  const latestTaskEvents = latestByTask(events);
  const openStatuses = new Set(["assigned", "accepted", "in_progress", "blocked"]);
  const openTasks = latestTaskEvents.filter((event) =>
    openStatuses.has(event.status ?? event?.payload?.status ?? "unknown")
  );

  const eventsOnly50 = events.slice(-50);
  const eventsOnly50Bytes = bytes(JSON.stringify(eventsOnly50));

  const monitorPayload50 = {
    events: eventsOnly50,
    summary: {
      total: eventsOnly50.length,
      byAgent: countBy(eventsOnly50, (event) => event.agent ?? "unknown"),
      byType: countBy(eventsOnly50, (event) => event.type ?? "unknown"),
      byStatus: countBy(eventsOnly50, (event) => event.status ?? event?.payload?.status ?? "unknown"),
      taskCount: new Set(
        eventsOnly50
          .map((event) => event.taskId ?? event?.payload?.taskId)
          .filter(Boolean)
      ).size,
    },
    tasks: buildTaskGroups(eventsOnly50),
  };
  const monitorPayload50Bytes = bytes(JSON.stringify(monitorPayload50));

  const normalizedEvents = events.map(dropRedundantPayloadFields);
  const normalizedBytes = bytes(JSON.stringify(normalizedEvents));
  const allEventsBytes = bytes(JSON.stringify(events));

  const latestPerTaskBytes = bytes(JSON.stringify(latestTaskEvents));

  const output = {
    generatedAt: new Date().toISOString(),
    contextPath,
    baseline: {
      fileBytes: bytes(raw),
      fileMB: toMB(bytes(raw)),
      fileEstimatedTokens: estimateTokens(bytes(raw)),
      totalLines: lines.length,
      parsedEvents: events.length,
      dateRange: {
        first: events[0]?.timestamp ?? null,
        last: events[events.length - 1]?.timestamp ?? null,
      },
      topByType: byType,
      topByAgent: byAgent,
      topByStatus: byStatus,
      topByDay: byDay,
      openTaskCount: openTasks.length,
    },
    payloadCost: {
      getEventsLimit50: {
        bytes: eventsOnly50Bytes,
        estimatedTokens: estimateTokens(eventsOnly50Bytes),
      },
      apiEventsLimit50: {
        bytes: monitorPayload50Bytes,
        estimatedTokens: estimateTokens(monitorPayload50Bytes),
      },
      duplicationFactor: Number((monitorPayload50Bytes / eventsOnly50Bytes).toFixed(2)),
    },
    optimizationPotential: {
      latestPerTask: {
        bytes: latestPerTaskBytes,
        estimatedTokens: estimateTokens(latestPerTaskBytes),
        savedPercentVsAllEvents: Number(
          (((allEventsBytes - latestPerTaskBytes) / allEventsBytes) * 100).toFixed(2)
        ),
      },
      redundantCanonicalFieldsRemoval: {
        bytesAfter: normalizedBytes,
        estimatedTokensAfter: estimateTokens(normalizedBytes),
        savedPercentVsAllEvents: Number(
          (((allEventsBytes - normalizedBytes) / allEventsBytes) * 100).toFixed(2)
        ),
      },
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
