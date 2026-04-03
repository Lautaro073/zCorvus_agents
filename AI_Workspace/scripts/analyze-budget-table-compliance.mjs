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
      // retry while server starts
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function percentage(value, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

async function main() {
  const port = 4432;
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
    const healthPayload = await (await waitFor(`http://127.0.0.1:${port}/api/health`)).json();
    const budgetTable = healthPayload.contextCompactViewBudgets || {};
    const taskHandoffHard = budgetTable?.handoff?.task?.hardChars || 220;
    const correlationHandoffHard = budgetTable?.handoff?.correlation?.hardChars || 260;

    const eventsPayload = await (await waitFor(`http://127.0.0.1:${port}/api/events?limit=800`)).json();
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
    ).slice(0, 20);

    let taskCompliancePass = 0;
    let taskTotal = 0;
    for (const taskId of taskIds) {
      const payload = await (
        await waitFor(`http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`)
      ).json();
      taskTotal += 1;

      const budgetOk = payload?.tokenBudget?.withinHardLimit === true;
      const handoffLength = typeof payload?.handoff?.summary === "string" ? payload.handoff.summary.length : 0;
      const handoffOk = handoffLength <= taskHandoffHard;

      if (budgetOk && handoffOk) {
        taskCompliancePass += 1;
      }
    }

    let correlationCompliancePass = 0;
    let correlationTotal = 0;
    for (const correlationId of correlationIds) {
      const payload = await (
        await waitFor(
          `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(correlationId)}&limit=20`
        )
      ).json();

      if (!Number.isInteger(payload?.activeTaskCount) || payload.activeTaskCount <= 0) {
        continue;
      }

      correlationTotal += 1;
      const budgetOk = payload?.tokenBudget?.withinHardLimit === true;
      const handoffLength = typeof payload?.handoff?.summary === "string" ? payload.handoff.summary.length : 0;
      const handoffOk = handoffLength <= correlationHandoffHard;

      if (budgetOk && handoffOk) {
        correlationCompliancePass += 1;
      }
    }

    const combinedPass = taskCompliancePass + correlationCompliancePass;
    const combinedTotal = taskTotal + correlationTotal;

    const report = {
      generatedAt: new Date().toISOString(),
      policyVersion: budgetTable.policyVersion || null,
      handoffHardChars: {
        task: taskHandoffHard,
        correlation: correlationHandoffHard,
      },
      compliance: {
        taskSnapshot: {
          passed: taskCompliancePass,
          total: taskTotal,
          passPercent: percentage(taskCompliancePass, taskTotal),
        },
        correlationSnapshot: {
          passed: correlationCompliancePass,
          total: correlationTotal,
          passPercent: percentage(correlationCompliancePass, correlationTotal),
        },
        combined: {
          passed: combinedPass,
          total: combinedTotal,
          passPercent: percentage(combinedPass, combinedTotal),
          hardLimitCompliant: combinedPass === combinedTotal,
        },
      },
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
