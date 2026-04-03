#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

async function waitFor(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry while process boots
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function summarizeDurations(durations) {
  if (!Array.isArray(durations) || durations.length === 0) {
    return {
      avgMs: 0,
      p95Ms: 0,
    };
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];

  return {
    avgMs: Number(avg.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
  };
}

function reductionPercent(before, after) {
  if (!Number.isFinite(before) || before <= 0) {
    return 0;
  }

  return Number((((before - after) / before) * 100).toFixed(2));
}

async function runBenchmark({ port, cacheEnabled, selectors }) {
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_COMPACT_CACHE_ENABLED: cacheEnabled ? "true" : "false",
      MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES: "512",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);

    let activeSelectors = selectors;
    if (!activeSelectors) {
      const eventsPayload = await (
        await waitFor(`http://127.0.0.1:${port}/api/events?limit=800`)
      ).json();
      const sample = (eventsPayload.events || []).find(
        (event) => (event.taskId || event.payload?.taskId) && (event.correlationId || event.payload?.correlationId)
      );

      if (!sample) {
        throw new Error("No task/correlation sample found for cache benchmark.");
      }

      activeSelectors = {
        assignedTo: "AI_Workspace_Optimizer",
        taskId: sample.taskId || sample.payload.taskId,
        correlationId: sample.correlationId || sample.payload.correlationId,
      };
    }

    const iterations = 30;
    const durations = {
      agentInbox: [],
      taskSnapshot: [],
      correlationSnapshot: [],
    };
    let cacheHitCount = 0;

    for (let index = 0; index < iterations; index += 1) {
      const startInbox = performance.now();
      const inboxPayload = await (
        await fetch(
          `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=${encodeURIComponent(activeSelectors.assignedTo)}&limit=10`
        )
      ).json();
      durations.agentInbox.push(performance.now() - startInbox);
      if (inboxPayload?.readAudit?.cacheHit === true) {
        cacheHitCount += 1;
      }

      const startTask = performance.now();
      const taskPayload = await (
        await fetch(
          `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(activeSelectors.taskId)}`
        )
      ).json();
      durations.taskSnapshot.push(performance.now() - startTask);
      if (taskPayload?.readAudit?.cacheHit === true) {
        cacheHitCount += 1;
      }

      const startCorrelation = performance.now();
      const correlationPayload = await (
        await fetch(
          `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(activeSelectors.correlationId)}&limit=20`
        )
      ).json();
      durations.correlationSnapshot.push(performance.now() - startCorrelation);
      if (correlationPayload?.readAudit?.cacheHit === true) {
        cacheHitCount += 1;
      }
    }

    return {
      selectors: activeSelectors,
      iterations,
      cacheEnabled,
      cacheHitCount,
      metrics: {
        agentInbox: summarizeDurations(durations.agentInbox),
        taskSnapshot: summarizeDurations(durations.taskSnapshot),
        correlationSnapshot: summarizeDurations(durations.correlationSnapshot),
      },
    };
  } finally {
    child.kill();
  }
}

async function main() {
  const noCache = await runBenchmark({
    port: 4433,
    cacheEnabled: false,
    selectors: null,
  });

  const withCache = await runBenchmark({
    port: 4434,
    cacheEnabled: true,
    selectors: noCache.selectors,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    selectors: noCache.selectors,
    iterations: noCache.iterations,
    baselineNoCache: noCache.metrics,
    withCache: withCache.metrics,
    cacheHitsObserved: withCache.cacheHitCount,
    improvement: {
      agentInboxAvgMsReductionPercent: reductionPercent(
        noCache.metrics.agentInbox.avgMs,
        withCache.metrics.agentInbox.avgMs
      ),
      taskSnapshotAvgMsReductionPercent: reductionPercent(
        noCache.metrics.taskSnapshot.avgMs,
        withCache.metrics.taskSnapshot.avgMs
      ),
      correlationSnapshotAvgMsReductionPercent: reductionPercent(
        noCache.metrics.correlationSnapshot.avgMs,
        withCache.metrics.correlationSnapshot.avgMs
      ),
      combinedAvgMsReductionPercent: reductionPercent(
        noCache.metrics.agentInbox.avgMs + noCache.metrics.taskSnapshot.avgMs + noCache.metrics.correlationSnapshot.avgMs,
        withCache.metrics.agentInbox.avgMs + withCache.metrics.taskSnapshot.avgMs + withCache.metrics.correlationSnapshot.avgMs
      ),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
