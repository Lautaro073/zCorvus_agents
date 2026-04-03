#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

function percentage(value, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

async function waitFor(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry while server boots
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isSnapshotUsable(payload, summaryPath) {
  const readMode = payload?.readAudit?.readMode;
  const decisionSafety = payload?.decisionSafety;
  const summary = summaryPath(payload);

  return (
    readMode === "snapshot_first" &&
    typeof summary === "string" &&
    summary.length > 0 &&
    decisionSafety !== "requires_expansion"
  );
}

function toBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf-8");
}

async function main() {
  const port = 4429;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED: "true",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=600`);
    const eventsPayload = await eventsResponse.json();

    const taskIds = Array.from(
      new Set(
        (eventsPayload.events || [])
          .map((event) => normalizeString(event.taskId || event.payload?.taskId))
          .filter(Boolean)
      )
    ).slice(0, 40);

    const correlationIds = Array.from(
      new Set(
        (eventsPayload.events || [])
          .map((event) => normalizeString(event.correlationId || event.payload?.correlationId))
          .filter(Boolean)
      )
    ).slice(0, 40);

    let taskUsableCount = 0;
    let taskEvaluatedCount = 0;
    for (const taskId of taskIds) {
      const response = await waitFor(
        `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`
      );
      const payload = await response.json();
      taskEvaluatedCount += 1;
      if (isSnapshotUsable(payload, (entry) => entry?.handoff?.summary)) {
        taskUsableCount += 1;
      }
    }

    let correlationUsableCount = 0;
    let correlationEvaluatedCount = 0;
    for (const correlationId of correlationIds) {
      const response = await waitFor(
        `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(correlationId)}&limit=20`
      );
      const payload = await response.json();
      if (!Number.isInteger(payload?.activeTaskCount) || payload.activeTaskCount <= 0) {
        continue;
      }

      correlationEvaluatedCount += 1;
      if (isSnapshotUsable(payload, (entry) => entry?.handoff?.summary)) {
        correlationUsableCount += 1;
      }
    }

    const sampleTaskId = taskIds[0] || null;
    const sampleCorrelationId = correlationIds[0] || null;
    let beforeAfter = null;
    if (sampleTaskId && sampleCorrelationId) {
      const broadTaskResponse = await waitFor(
        `http://127.0.0.1:${port}/api/events?taskId=${encodeURIComponent(sampleTaskId)}&includeTaskEvents=true&limit=120`
      );
      const broadTaskPayload = await broadTaskResponse.json();
      const compactTaskResponse = await waitFor(
        `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(sampleTaskId)}`
      );
      const compactTaskPayload = await compactTaskResponse.json();

      const broadCorrelationResponse = await waitFor(
        `http://127.0.0.1:${port}/api/events?correlationId=${encodeURIComponent(sampleCorrelationId)}&includeTaskEvents=true&limit=200`
      );
      const broadCorrelationPayload = await broadCorrelationResponse.json();
      const compactCorrelationResponse = await waitFor(
        `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(sampleCorrelationId)}&limit=20`
      );
      const compactCorrelationPayload = await compactCorrelationResponse.json();

      beforeAfter = {
        sampleTaskId,
        sampleCorrelationId,
        task: {
          broadBytes: toBytes(broadTaskPayload),
          compactBytes: toBytes(compactTaskPayload),
          handoffSummary: compactTaskPayload?.handoff?.summary || null,
          handoffLength: typeof compactTaskPayload?.handoff?.summary === "string"
            ? compactTaskPayload.handoff.summary.length
            : 0,
        },
        correlation: {
          broadBytes: toBytes(broadCorrelationPayload),
          compactBytes: toBytes(compactCorrelationPayload),
          handoffSummary: compactCorrelationPayload?.handoff?.summary || null,
          handoffLength: typeof compactCorrelationPayload?.handoff?.summary === "string"
            ? compactCorrelationPayload.handoff.summary.length
            : 0,
        },
      };
    }

    const totalEvaluated = taskEvaluatedCount + correlationEvaluatedCount;
    const totalUsable = taskUsableCount + correlationUsableCount;
    const totalUsablePercent = percentage(totalUsable, totalEvaluated);

    const report = {
      generatedAt: new Date().toISOString(),
      sampleSize: {
        taskSnapshots: taskEvaluatedCount,
        activeCorrelationSnapshots: correlationEvaluatedCount,
      },
      taskHandoff: {
        usable: taskUsableCount,
        total: taskEvaluatedCount,
        usablePercent: percentage(taskUsableCount, taskEvaluatedCount),
      },
      correlationHandoff: {
        usable: correlationUsableCount,
        total: correlationEvaluatedCount,
        usablePercent: percentage(correlationUsableCount, correlationEvaluatedCount),
      },
      combinedHandoffContinuity: {
        usable: totalUsable,
        total: totalEvaluated,
        usablePercent: totalUsablePercent,
        objectiveMet: totalUsablePercent >= 85,
      },
      beforeAfter,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
