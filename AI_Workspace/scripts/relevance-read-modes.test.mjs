import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

async function waitFor(url, attempts = 30) {
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

async function withMonitorServer(port, envOverrides, callback) {
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      ...envOverrides,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    return await callback();
  } finally {
    child.kill();
  }
}

test("relevance-first endpoints return v1 compact snapshots", async () => {
  const port = 4425;
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
    const healthResponse = await waitFor(`http://127.0.0.1:${port}/api/health`);
    const healthPayload = await healthResponse.json();
    assert.ok(healthPayload.contextCompactViewBudgets);
    assert.equal(healthPayload.contextCompactViewBudgets.policyVersion, "ctx-budget.v1");
    assert.ok(healthPayload.contextCompactViewBudgets.views?.agent_inbox);
    assert.ok(healthPayload.contextCompactViewBudgets.handoff?.task);
    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=200`);
    const eventsPayload = await eventsResponse.json();

    const taskEvent = eventsPayload.events.find((event) => {
      const taskId = event.taskId || event.payload?.taskId;
      const correlationId = event.correlationId || event.payload?.correlationId;
      return Boolean(taskId) && Boolean(correlationId);
    });

    assert.ok(taskEvent, "Expected at least one task event in shared context.");

    const taskId = taskEvent.taskId || taskEvent.payload.taskId;
    const correlationId = taskEvent.correlationId || taskEvent.payload.correlationId;

    const inboxResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=AI_Workspace_Optimizer&limit=5`
    );
    const inboxPayload = await inboxResponse.json();
    assert.equal(inboxPayload.view, "agent_inbox");
    assert.equal(inboxPayload.schemaVersion, "ctx-contract.v1");
    assert.equal(inboxPayload.readAudit.readMode, "snapshot_first");
    assert.ok(inboxPayload.tokenBudget);

    const taskSnapshotResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`
    );
    const taskSnapshotPayload = await taskSnapshotResponse.json();
    assert.equal(taskSnapshotPayload.view, "task_snapshot");
    assert.equal(taskSnapshotPayload.task.taskId, taskId);
    assert.equal(taskSnapshotPayload.readAudit.readMode, "snapshot_first");
    assert.ok(taskSnapshotPayload.handoff);
    assert.equal(typeof taskSnapshotPayload.handoff.summary, "string");
    assert.equal(taskSnapshotPayload.handoff.summary.length <= 220, true);
    assert.ok(taskSnapshotPayload.tokenBudget);
    assert.ok("nextCursor" in taskSnapshotPayload);
    assert.ok(taskSnapshotPayload.readAudit);
    assert.equal(taskSnapshotPayload.readAudit.cacheEnabled, true);

    const correlationSnapshotResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(correlationId)}&limit=10`
    );
    const correlationSnapshotPayload = await correlationSnapshotResponse.json();
    assert.equal(correlationSnapshotPayload.view, "correlation_snapshot");
    assert.equal(correlationSnapshotPayload.correlationId, correlationId);
    assert.equal(correlationSnapshotPayload.readAudit.readMode, "snapshot_first");
    assert.ok(correlationSnapshotPayload.handoff);
    assert.equal(typeof correlationSnapshotPayload.handoff.summary, "string");
    assert.equal(correlationSnapshotPayload.handoff.summary.length <= 260, true);
    assert.ok(correlationSnapshotPayload.tokenBudget);
    assert.ok("nextCursor" in correlationSnapshotPayload);

    const taskSnapshotResponseSecond = await waitFor(
      `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`
    );
    const taskSnapshotPayloadSecond = await taskSnapshotResponseSecond.json();
    assert.equal(taskSnapshotPayloadSecond.readAudit.cacheEnabled, true);
    assert.equal(taskSnapshotPayloadSecond.readAudit.cacheHit, true);
    assert.equal(
      taskSnapshotPayloadSecond.snapshotFingerprint,
      taskSnapshotPayload.snapshotFingerprint
    );
  } finally {
    child.kill();
  }
});

test("relevance-first endpoints audit broad fallback when sidecars are disabled", async () => {
  const port = 4426;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "false",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=200`);
    const eventsPayload = await eventsResponse.json();
    const taskEvent = eventsPayload.events.find((event) => event.taskId || event.payload?.taskId);
    assert.ok(taskEvent, "Expected at least one task event for fallback test.");

    const taskId = taskEvent.taskId || taskEvent.payload.taskId;
    const taskSnapshotResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}&allowBroadFallback=true`
    );
    const taskSnapshotPayload = await taskSnapshotResponse.json();
    assert.equal(taskSnapshotPayload.readAudit.readMode, "broad_scan_fallback");
    assert.equal(taskSnapshotPayload.readAudit.broadFallbackUsed, true);
    assert.equal(taskSnapshotPayload.degradedMode, true);
    assert.ok(taskSnapshotPayload.safetyPolicy);
    assert.equal(taskSnapshotPayload.safetyPolicy.allowWriteback, false);
    assert.equal(taskSnapshotPayload.safetyPolicy.forceJsonlExpansion, true);
    assert.ok(taskSnapshotPayload.tokenBudget);
  } finally {
    child.kill();
  }
});

test("relevance-first endpoints enforce hard token limits with truncation metadata", async () => {
  const port = 4428;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS: "900",
      MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS: "900",
      MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS: "1400",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=300`);
    const eventsPayload = await eventsResponse.json();
    const sample = eventsPayload.events.find(
      (event) => (event.taskId || event.payload?.taskId) && (event.correlationId || event.payload?.correlationId)
    );
    assert.ok(sample, "Expected a task/correlation sample event.");

    const taskId = sample.taskId || sample.payload.taskId;
    const correlationId = sample.correlationId || sample.payload.correlationId;

    const inboxPayload = await (
      await waitFor(
        `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=AI_Workspace_Optimizer&limit=10`
      )
    ).json();
    assert.ok(inboxPayload.tokenBudget);
    assert.equal(inboxPayload.tokenBudget.withinHardLimit, true);
    if (inboxPayload.truncated === true) {
      assert.ok(inboxPayload.nextCursor);
    }

    const taskPayload = await (
      await waitFor(
        `http://127.0.0.1:${port}/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}`
      )
    ).json();
    assert.ok(taskPayload.tokenBudget);
    assert.equal(taskPayload.tokenBudget.withinHardLimit, true);
    if (taskPayload.truncated === true) {
      assert.ok(taskPayload.nextCursor);
    }

    const correlationPayload = await (
      await waitFor(
        `http://127.0.0.1:${port}/api/context/get_correlation_snapshot?correlationId=${encodeURIComponent(correlationId)}&limit=20`
      )
    ).json();
    assert.ok(correlationPayload.tokenBudget);
    assert.equal(correlationPayload.tokenBudget.withinHardLimit, true);
    if (correlationPayload.truncated === true) {
      assert.ok(correlationPayload.nextCursor);
    }
  } finally {
    child.kill();
  }
});

test("runtime read mode changes when relevance reads are toggled", async () => {
  const withSnapshots = await withMonitorServer(
    4429,
    {
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
    },
    async () => {
      const eventsPayload = await (await waitFor(`http://127.0.0.1:4429/api/events?limit=100`)).json();
      const taskEvent = eventsPayload.events.find((event) => event.taskId || event.payload?.taskId);
      assert.ok(taskEvent, "Expected task event with relevance reads enabled.");

      const taskId = taskEvent.taskId || taskEvent.payload.taskId;
      return (
        await (
          await waitFor(
            `http://127.0.0.1:4429/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}&allowBroadFallback=true`
          )
        ).json()
      );
    }
  );

  const withoutRelevanceReads = await withMonitorServer(
    4439,
    {
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "false",
    },
    async () => {
      const eventsPayload = await (await waitFor(`http://127.0.0.1:4439/api/events?limit=100`)).json();
      const taskEvent = eventsPayload.events.find((event) => event.taskId || event.payload?.taskId);
      assert.ok(taskEvent, "Expected task event with relevance reads disabled.");

      const taskId = taskEvent.taskId || taskEvent.payload.taskId;
      return (
        await (
          await waitFor(
            `http://127.0.0.1:4439/api/context/get_task_snapshot?taskId=${encodeURIComponent(taskId)}&allowBroadFallback=true`
          )
        ).json()
      );
    }
  );

  assert.equal(withSnapshots.readAudit.readMode, "snapshot_first");
  assert.equal(withSnapshots.degradedMode, false);
  assert.equal(withoutRelevanceReads.readAudit.readMode, "broad_scan_fallback");
  assert.equal(withoutRelevanceReads.degradedMode, true);
  assert.equal(withoutRelevanceReads.readAudit.broadFallbackUsed, true);
});

test("token budget flag disables budget metadata and truncation enforcement", async () => {
  const payloadWithBudgets = await withMonitorServer(
    4440,
    {
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_TOKEN_BUDGETS_ENABLED: "true",
      MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS: "900",
    },
    async () =>
      (
        await (
          await waitFor(
            `http://127.0.0.1:4440/api/context/get_agent_inbox?assignedTo=Tester&limit=10`
          )
        ).json()
      )
  );

  const payloadWithoutBudgets = await withMonitorServer(
    4444,
    {
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_TOKEN_BUDGETS_ENABLED: "false",
      MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS: "900",
    },
    async () =>
      (
        await (
          await waitFor(
            `http://127.0.0.1:4444/api/context/get_agent_inbox?assignedTo=Tester&limit=10`
          )
        ).json()
      )
  );

  assert.ok(payloadWithBudgets.tokenBudget);
  assert.equal(payloadWithBudgets.truncated, true);
  assert.equal(payloadWithoutBudgets.tokenBudget, undefined);
  assert.equal(payloadWithoutBudgets.truncated, false);
});
