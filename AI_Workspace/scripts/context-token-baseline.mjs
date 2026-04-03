#!/usr/bin/env node
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const contextPath = path.resolve(workspaceRoot, "MCP_Server", "shared_context.jsonl");
const agentsDir = path.resolve(workspaceRoot, "Agents");

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

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * p));
  return sortedValues[index];
}

function sortedNumeric(values) {
  return [...values].sort((a, b) => a - b);
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

function toCountAndRateMap(items, getter) {
  const counts = countBy(items, getter);
  const total = items.length || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return sorted.map(([key, count]) => ({
    key,
    count,
    percent: Number(((count / total) * 100).toFixed(2)),
  }));
}

function buildTaskGroups(events, includeNestedEvents = true) {
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
        eventCount: 0,
        ...(includeNestedEvents ? { events: [] } : {}),
      });
    }

    const group = groups.get(taskId);
    group.eventCount += 1;
    if (includeNestedEvents) {
      group.events.push(event);
    }

    group.assignedTo = event.assignedTo ?? event?.payload?.assignedTo ?? group.assignedTo;
    group.latestStatus = event.status ?? event?.payload?.status ?? group.latestStatus;
    group.priority = event.priority ?? event?.payload?.priority ?? group.priority;
    group.parentTaskId = event.parentTaskId ?? event?.payload?.parentTaskId ?? group.parentTaskId;
    group.updatedAt = event.timestamp ?? group.updatedAt;
  }

  return Array.from(groups.values());
}

function buildApiEventsPayload(events, limit = 50, includeTaskEvents = true) {
  const selected = events.slice(-Math.max(1, limit));
  return {
    events: selected,
    summary: {
      total: selected.length,
      byAgent: countBy(selected, (event) => event.agent ?? "unknown"),
      byType: countBy(selected, (event) => event.type ?? "unknown"),
      byStatus: countBy(selected, (event) => event.status ?? event?.payload?.status ?? "unknown"),
      taskCount: new Set(
        selected.map((event) => event.taskId ?? event?.payload?.taskId).filter(Boolean)
      ).size,
    },
    tasks: buildTaskGroups(selected, includeTaskEvents),
    filters: {
      limit,
    },
  };
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

function messageLengthDistribution(events) {
  const messages = events
    .map((event) => (typeof event?.payload?.message === "string" ? event.payload.message : null))
    .filter(Boolean);

  const lengths = sortedNumeric(messages.map((message) => message.length));
  const totalChars = lengths.reduce((sum, value) => sum + value, 0);
  const avg = lengths.length > 0 ? totalChars / lengths.length : 0;

  return {
    messagesCount: lengths.length,
    totalChars,
    averageChars: Number(avg.toFixed(2)),
    p50Chars: percentile(lengths, 0.5),
    p90Chars: percentile(lengths, 0.9),
    p95Chars: percentile(lengths, 0.95),
    p99Chars: percentile(lengths, 0.99),
    maxChars: lengths[lengths.length - 1] ?? 0,
    over160: lengths.filter((value) => value > 160).length,
    over280: lengths.filter((value) => value > 280).length,
    over500: lengths.filter((value) => value > 500).length,
  };
}

function parseProfileQueries(content) {
  const queries = [];

  const getEventsRegex = /get_events\(\{([\s\S]*?)\}\)/g;
  let match;
  while ((match = getEventsRegex.exec(content)) !== null) {
    const snippet = match[1];
    const limitMatch = snippet.match(/limit\s*:\s*(\d+)/);
    const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : null;
    const hasScope = /(taskId|correlationId|assignedTo|parentTaskId)\s*:/.test(snippet);

    queries.push({
      source: "get_events",
      limit,
      hasScope,
      snippet: snippet.replace(/\s+/g, " ").trim(),
    });
  }

  const apiRegex = /\/api\/events\?([^"'\s]+)/g;
  while ((match = apiRegex.exec(content)) !== null) {
    const query = match[1];
    const params = new URLSearchParams(query);
    const limitRaw = params.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;
    const hasScope = ["taskId", "correlationId", "assignedTo", "parentTaskId"].some((field) =>
      params.has(field)
    );

    queries.push({
      source: "/api/events",
      limit,
      hasScope,
      snippet: `/api/events?${query}`,
    });
  }

  return queries;
}

function estimateGetEventsPayloadTokens(events, limit) {
  if (!Number.isInteger(limit) || limit <= 0) {
    return null;
  }
  const payload = events.slice(-limit);
  return estimateTokens(bytes(JSON.stringify(payload)));
}

function estimateApiEventsPayloadTokens(events, limit) {
  if (!Number.isInteger(limit) || limit <= 0) {
    return null;
  }

  const payload = buildApiEventsPayload(events, limit, true);
  return estimateTokens(bytes(JSON.stringify(payload)));
}

async function buildIntakeCostByAgent(events) {
  const agentNames = await fs.readdir(agentsDir, { withFileTypes: true });
  const rows = [];

  for (const agentDir of agentNames) {
    if (!agentDir.isDirectory()) continue;

    const profilePath = path.join(agentsDir, agentDir.name, "profile.md");
    let content;
    try {
      content = await fs.readFile(profilePath, "utf8");
    } catch {
      continue;
    }

    const queries = parseProfileQueries(content);
    const defaultQuery = queries[0] ?? null;
    const defaultLimit = defaultQuery?.limit ?? null;
    const broadWindow = Number.isInteger(defaultLimit) ? defaultLimit >= 20 : false;

    rows.push({
      agent: agentDir.name,
      profilePath,
      intakeQueryCount: queries.length,
      defaultQuerySource: defaultQuery?.source ?? null,
      defaultLimit,
      broadWindow,
      scopedQuery: defaultQuery ? defaultQuery.hasScope : null,
      estimatedGetEventsTokens: estimateGetEventsPayloadTokens(events, defaultLimit),
      estimatedApiEventsTokens: estimateApiEventsPayloadTokens(events, defaultLimit),
      querySnippet: defaultQuery?.snippet ?? null,
    });
  }

  rows.sort((a, b) => {
    const at = a.estimatedGetEventsTokens ?? -1;
    const bt = b.estimatedGetEventsTokens ?? -1;
    return bt - at;
  });

  const withDefault = rows.filter((row) => Number.isInteger(row.defaultLimit));
  const broad = withDefault.filter((row) => row.broadWindow);
  const unscoped = withDefault.filter((row) => row.scopedQuery === false);

  return {
    rows,
    summary: {
      profilesScanned: rows.length,
      profilesWithIntakeQuery: rows.filter((row) => row.intakeQueryCount > 0).length,
      profilesWithDefaultLimit: withDefault.length,
      broadWindowProfiles: broad.length,
      broadWindowRatePercent:
        withDefault.length > 0 ? Number(((broad.length / withDefault.length) * 100).toFixed(2)) : 0,
      unscopedProfiles: unscoped.length,
      unscopedRatePercent:
        withDefault.length > 0
          ? Number(((unscoped.length / withDefault.length) * 100).toFixed(2))
          : 0,
    },
  };
}

function benchmarkSync(label, fn, options = {}) {
  const samples = options.samples ?? 120;
  const warmup = options.warmup ?? 20;

  for (let i = 0; i < warmup; i += 1) {
    fn();
  }

  const durations = [];
  const startedAt = performance.now();
  for (let i = 0; i < samples; i += 1) {
    const t0 = performance.now();
    fn();
    durations.push(performance.now() - t0);
  }
  const totalMs = performance.now() - startedAt;

  const sorted = sortedNumeric(durations);
  const avgMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  return {
    label,
    samples,
    warmup,
    avgMs: Number(avgMs.toFixed(3)),
    p50Ms: Number(percentile(sorted, 0.5).toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    minMs: Number(sorted[0].toFixed(3)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(3)),
    broadReadsPerSecondByAvg: Number((1000 / avgMs).toFixed(2)),
    broadReadsPerSecondByP50: Number((1000 / percentile(sorted, 0.5)).toFixed(2)),
    throughputReadsPerSecond: Number(((samples / totalMs) * 1000).toFixed(2)),
  };
}

function buildMethodologyMetadata(rawBytes, eventsCount) {
  const cpu = os.cpus()?.[0]?.model ?? "unknown";
  return {
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuModel: cpu,
      logicalCpuCount: os.cpus()?.length ?? null,
      memoryGB: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
    },
    contextInput: {
      contextPath,
      fileBytes: rawBytes,
      fileMB: toMB(rawBytes),
      parsedEvents: eventsCount,
    },
    definitions: {
      broadRead: "Consulta por ventana amplia (default limit >= 20), típicamente sin foco fuerte por taskId/correlationId.",
      intakeCostByAgent:
        "Costo estimado por consulta inicial de cada agente según su query por defecto en profile.md y payload actual.",
      tokenEstimation: "Aproximación heurística: tokens ~= bytes/4.",
    },
  };
}

async function main() {
  const raw = await fs.readFile(contextPath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const events = lines.map(safeParse).filter(Boolean);
  const rawBytes = bytes(raw);

  const byTypeFull = toCountAndRateMap(events, (event) => event.type ?? "unknown");
  const byAgentFull = toCountAndRateMap(events, (event) => event.agent ?? "unknown");
  const byStatusFull = toCountAndRateMap(
    events,
    (event) => event.status ?? event?.payload?.status ?? "unknown"
  );

  const latestTaskEvents = latestByTask(events);
  const openStatuses = new Set(["assigned", "accepted", "in_progress", "blocked"]);
  const openTasks = latestTaskEvents.filter((event) =>
    openStatuses.has(event.status ?? event?.payload?.status ?? "unknown")
  );

  const eventsOnly50 = events.slice(-50);
  const eventsOnly50Bytes = bytes(JSON.stringify(eventsOnly50));
  const apiPayload50 = buildApiEventsPayload(events, 50, true);
  const apiPayload50Bytes = bytes(JSON.stringify(apiPayload50));
  const apiPayload50NoNested = buildApiEventsPayload(events, 50, false);
  const apiPayload50NoNestedBytes = bytes(JSON.stringify(apiPayload50NoNested));

  const normalizedEvents = events.map(dropRedundantPayloadFields);
  const normalizedBytes = bytes(JSON.stringify(normalizedEvents));
  const allEventsBytes = bytes(JSON.stringify(events));
  const latestPerTaskBytes = bytes(JSON.stringify(latestTaskEvents));

  const intakeCostByAgent = await buildIntakeCostByAgent(events);

  const readAndParseFromDisk = benchmarkSync("jsonl_read_parse_disk", () => {
    const data = fsSync.readFileSync(contextPath, "utf8");
    data
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        JSON.parse(line);
      });
  });

  const broadApiBuild = benchmarkSync("broad_api_payload_build_limit50", () => {
    const payload = buildApiEventsPayload(events, 50, true);
    JSON.stringify(payload);
  });

  const broadEndToEndSim = benchmarkSync("broad_end_to_end_sim_limit50", () => {
    const data = fsSync.readFileSync(contextPath, "utf8");
    const parsed = data
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const payload = buildApiEventsPayload(parsed, 50, true);
    JSON.stringify(payload);
  });

  const compactEndToEndSim = benchmarkSync("compact_end_to_end_sim_limit10_no_nested", () => {
    const data = fsSync.readFileSync(contextPath, "utf8");
    const parsed = data
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const payload = buildApiEventsPayload(parsed, 10, false);
    JSON.stringify(payload);
  });

  const limits = intakeCostByAgent.rows
    .map((row) => row.defaultLimit)
    .filter((value) => Number.isInteger(value));
  const sortedLimits = sortedNumeric(limits);
  const avgLimit = limits.length > 0 ? limits.reduce((sum, value) => sum + value, 0) / limits.length : 0;

  const completedEvents = events.filter((event) => event.type === "TASK_COMPLETED");
  const completedWithMessage = completedEvents.filter(
    (event) => typeof event?.payload?.message === "string" && event.payload.message.trim().length > 0
  );
  const completedWithShortMessage = completedWithMessage.filter(
    (event) => event.payload.message.trim().length <= 160
  );

  const snapshotEventCount = events.filter((event) => event.type.includes("SNAPSHOT")).length;

  const methodology = buildMethodologyMetadata(rawBytes, events.length);
  methodology.benchmark = {
    sampleSize: broadEndToEndSim.samples,
    warmupRuns: broadEndToEndSim.warmup,
    benchmarkTarget: "/api/events broad read simulation (limit=50, include nested task events)",
  };

  const output = {
    methodology,
    baseline: {
      fileBytes: rawBytes,
      fileMB: toMB(rawBytes),
      fileEstimatedTokens: estimateTokens(rawBytes),
      totalLines: lines.length,
      parsedEvents: events.length,
      dateRange: {
        first: events[0]?.timestamp ?? null,
        last: events[events.length - 1]?.timestamp ?? null,
      },
      topByType: topEntries(countBy(events, (event) => event.type ?? "unknown")),
      topByAgent: topEntries(countBy(events, (event) => event.agent ?? "unknown")),
      topByStatus: topEntries(
        countBy(events, (event) => event.status ?? event?.payload?.status ?? "unknown")
      ),
      openTaskCount: openTasks.length,
    },
    messageLengthDistribution: messageLengthDistribution(events),
    intakeCostByAgent,
    eventVolumeByType: byTypeFull,
    eventVolumeByAgent: byAgentFull,
    eventVolumeByStatus: byStatusFull,
    payloadCost: {
      getEventsLimit50: {
        bytes: eventsOnly50Bytes,
        estimatedTokens: estimateTokens(eventsOnly50Bytes),
      },
      apiEventsLimit50: {
        bytes: apiPayload50Bytes,
        estimatedTokens: estimateTokens(apiPayload50Bytes),
      },
      apiEventsLimit50WithoutNestedTaskEvents: {
        bytes: apiPayload50NoNestedBytes,
        estimatedTokens: estimateTokens(apiPayload50NoNestedBytes),
      },
      duplicationFactor: Number((apiPayload50Bytes / eventsOnly50Bytes).toFixed(2)),
      nestedTaskEventsOverheadPercent: Number(
        (((apiPayload50Bytes - apiPayload50NoNestedBytes) / apiPayload50Bytes) * 100).toFixed(2)
      ),
    },
    broadReadLatencyAndRate: {
      jsonlReadParseDisk: readAndParseFromDisk,
      broadApiPayloadBuildLimit50: broadApiBuild,
      broadEndToEndSimulationLimit50: broadEndToEndSim,
      compactEndToEndSimulationLimit10NoNested: compactEndToEndSim,
    },
    contextQualityKpisBaseline: {
      intakeBroadWindowRatePercent: intakeCostByAgent.summary.broadWindowRatePercent,
      intakeDefaultLimitAverage: Number(avgLimit.toFixed(2)),
      intakeDefaultLimitMedian: percentile(sortedLimits, 0.5),
      estimatedEventsReadToStartTask: Number(avgLimit.toFixed(2)),
      taskSnapshotAvailabilityPercent: snapshotEventCount > 0 ? 100 : 0,
      correlationSnapshotAvailabilityPercent: snapshotEventCount > 0 ? 100 : 0,
      snapshotsSufficientWithoutExpansionPercent: snapshotEventCount > 0 ? 100 : 0,
      handoffShortByCompletedTaskPercent:
        completedWithMessage.length > 0
          ? Number(((completedWithShortMessage.length / completedWithMessage.length) * 100).toFixed(2))
          : 0,
      tasksRequiringFallbackBroadScanPercent: intakeCostByAgent.summary.broadWindowRatePercent,
      profileConformanceRatePercent:
        limits.length > 0
          ? Number(((limits.filter((value) => value <= 10).length / limits.length) * 100).toFixed(2))
          : 0,
      compactReadLatencyP50Ms: compactEndToEndSim.p50Ms,
      compactReadLatencyP95Ms: compactEndToEndSim.p95Ms,
      compactReadLatencyAvgMs: compactEndToEndSim.avgMs,
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
