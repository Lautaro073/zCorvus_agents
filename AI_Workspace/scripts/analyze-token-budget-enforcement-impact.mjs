#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

function toBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf-8");
}

function percentage(before, after) {
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
      // retry while server boots
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function collectRun({ port, envOverrides, selectors }) {
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      ...envOverrides,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);

    let activeSelectors = selectors;
    if (!activeSelectors) {
      const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=600`);
      const eventsPayload = await eventsResponse.json();
      const sampleTaskEvent = (eventsPayload.events || []).find(
        (event) => (event.taskId || event.payload?.taskId) && (event.correlationId || event.payload?.correlationId)
      );

      if (!sampleTaskEvent) {
        throw new Error("No task/correlation event found for budget impact analysis.");
      }

      activeSelectors = {
        assignedTo: "AI_Workspace_Optimizer",
        taskId: sampleTaskEvent.taskId || sampleTaskEvent.payload.taskId,
        correlationId: sampleTaskEvent.correlationId || sampleTaskEvent.payload.correlationId,
      };
    }

    const inboxPayload = await (await waitFor(
      `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=${encodeURIComponent(activeSelectors.assignedTo)}&limit=10`
    )).json();
    const taskPayload = await (await waitFor(
      `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(activeSelectors.taskId)}`
    )).json();
    const correlationPayload = await (await waitFor(
      `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(activeSelectors.correlationId)}&limit=20`
    )).json();

    return {
      selectors: activeSelectors,
      snapshots: {
        agentInbox: {
          bytes: toBytes(inboxPayload),
          tokenBudget: inboxPayload.tokenBudget || null,
          truncated: inboxPayload.truncated === true,
          nextCursor: inboxPayload.nextCursor || null,
        },
        taskSnapshot: {
          bytes: toBytes(taskPayload),
          tokenBudget: taskPayload.tokenBudget || null,
          truncated: taskPayload.truncated === true,
          nextCursor: taskPayload.nextCursor || null,
        },
        correlationSnapshot: {
          bytes: toBytes(correlationPayload),
          tokenBudget: correlationPayload.tokenBudget || null,
          truncated: correlationPayload.truncated === true,
          nextCursor: correlationPayload.nextCursor || null,
        },
      },
    };
  } finally {
    child.kill();
  }
}

function compareView(label, baseline, enforced) {
  return {
    label,
    baselineBytes: baseline.bytes,
    enforcedBytes: enforced.bytes,
    bytesReductionPercent: percentage(baseline.bytes, enforced.bytes),
    baselineTokens: baseline.tokenBudget?.estimatedTokensAfter || null,
    enforcedTokens: enforced.tokenBudget?.estimatedTokensAfter || null,
    truncatedBaseline: baseline.truncated,
    truncatedEnforced: enforced.truncated,
    nextCursorEnforced: enforced.nextCursor || null,
  };
}

async function main() {
  const relaxedRun = await collectRun({
    port: 4430,
    envOverrides: {
      MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS: "120000",
      MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS: "120000",
      MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS: "120000",
    },
  });

  const enforcedRun = await collectRun({
    port: 4431,
    envOverrides: {},
    selectors: relaxedRun.selectors,
  });

  const comparisons = [
    compareView("agent_inbox", relaxedRun.snapshots.agentInbox, enforcedRun.snapshots.agentInbox),
    compareView("task_snapshot", relaxedRun.snapshots.taskSnapshot, enforcedRun.snapshots.taskSnapshot),
    compareView("correlation_snapshot", relaxedRun.snapshots.correlationSnapshot, enforcedRun.snapshots.correlationSnapshot),
  ];

  const result = {
    generatedAt: new Date().toISOString(),
    selectors: relaxedRun.selectors,
    comparisons,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
