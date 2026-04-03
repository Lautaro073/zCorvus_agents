#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

function toBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf-8");
}

function percentageReduction(before, after) {
  if (!Number.isFinite(before) || before <= 0) {
    return 0;
  }
  return Number((((before - after) / before) * 100).toFixed(2));
}

async function waitFor(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry while monitor boots
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchMetrics(url) {
  const startedAt = performance.now();
  const response = await fetch(url);
  const payload = await response.json();
  const elapsedMs = performance.now() - startedAt;
  return {
    payload,
    bytes: toBytes(payload),
    durationMs: Number(elapsedMs.toFixed(2)),
  };
}

function summarizeComparison(label, broad, relevance) {
  return {
    label,
    broad: {
      bytes: broad.bytes,
      durationMs: broad.durationMs,
    },
    relevance: {
      bytes: relevance.bytes,
      durationMs: relevance.durationMs,
    },
    reduction: {
      bytesPercent: percentageReduction(broad.bytes, relevance.bytes),
      durationPercent: percentageReduction(broad.durationMs, relevance.durationMs),
    },
  };
}

async function main() {
  const port = 4427;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);

    const eventBaseline = await fetchMetrics(
      `http://127.0.0.1:${port}/api/events?limit=300&includeTaskEvents=true`
    );
    const sampleEvent = eventBaseline.payload.events.find(
      (event) => (event.taskId || event.payload?.taskId) && (event.correlationId || event.payload?.correlationId)
    );

    if (!sampleEvent) {
      throw new Error("No task/correlation event found in shared context for impact analysis.");
    }

    const taskId = sampleEvent.taskId || sampleEvent.payload.taskId;
    const correlationId = sampleEvent.correlationId || sampleEvent.payload.correlationId;

    const broadInbox = await fetchMetrics(
      `http://127.0.0.1:${port}/api/events?assignedTo=AI_Workspace_Optimizer&limit=120&includeTaskEvents=true`
    );
    const relevanceInbox = await fetchMetrics(
      `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=AI_Workspace_Optimizer&limit=10`
    );

    const broadTask = await fetchMetrics(
      `http://127.0.0.1:${port}/api/events?taskId=${encodeURIComponent(taskId)}&limit=120&includeTaskEvents=true`
    );
    const relevanceTask = await fetchMetrics(
      `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`
    );

    const broadCorrelation = await fetchMetrics(
      `http://127.0.0.1:${port}/api/events?correlationId=${encodeURIComponent(correlationId)}&limit=200&includeTaskEvents=true`
    );
    const relevanceCorrelation = await fetchMetrics(
      `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(correlationId)}&limit=20`
    );

    const comparisons = [
      summarizeComparison("agent_inbox", broadInbox, relevanceInbox),
      summarizeComparison("task_snapshot", broadTask, relevanceTask),
      summarizeComparison("correlation_snapshot", broadCorrelation, relevanceCorrelation),
    ];

    const broadIntakeReads = 3;
    const relevanceIntakeReads = 0;

    const result = {
      generatedAt: new Date().toISOString(),
      sampleSelectors: {
        assignedTo: "AI_Workspace_Optimizer",
        taskId,
        correlationId,
      },
      comparisons,
      intakeBroadReads: {
        before: broadIntakeReads,
        after: relevanceIntakeReads,
        reductionPercent: percentageReduction(broadIntakeReads, relevanceIntakeReads),
      },
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
