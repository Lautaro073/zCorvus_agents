import { test } from "node:test";
import assert from "node:assert/strict";
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
      // retry while monitor boots
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
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_SLIM_API_EVENTS_ENABLED: "true",
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

test("/api/events keeps tasks consistent with active task/type filters", async () => {
  await withMonitorServer(4455, {}, async () => {
    const baseline = await (await waitFor(`http://127.0.0.1:4455/api/events?limit=200`)).json();
    const sample = baseline.events.find((event) => (event.taskId || event.payload?.taskId) && event.type);
    assert.ok(sample, "Expected sample task event in shared context.");

    const taskId = sample.taskId || sample.payload.taskId;
    const type = sample.type;

    const filtered = await (
      await waitFor(
        `http://127.0.0.1:4455/api/events?taskId=${encodeURIComponent(taskId)}&typeFilter=${encodeURIComponent(type)}&includeTaskEvents=false&limit=200`
      )
    ).json();

    assert.equal(filtered.contract.relevanceReadMode, "event_scan");
    assert.equal(filtered.events.length > 0, true);
    assert.equal(filtered.tasks.length <= 1, true);

    for (const event of filtered.events) {
      assert.equal(event.type, type);
      assert.equal(event.taskId || event.payload?.taskId, taskId);
    }

    if (filtered.tasks.length === 1) {
      const [task] = filtered.tasks;
      assert.equal(task.taskId, taskId);
      assert.equal(task.latestEventType, type);
      assert.equal(task.eventCount, filtered.events.length);
    }
  });
});

test("legacy payload mode forces expanded /api/events default", async () => {
  const payload = await withMonitorServer(
    4456,
    {
      MCP_CONTEXT_LEGACY_PAYLOAD_MODE: "true",
      MCP_CONTEXT_SLIM_API_EVENTS_ENABLED: "true",
    },
    async () => (await waitFor(`http://127.0.0.1:4456/api/events?limit=20`)).json()
  );

  assert.equal(payload.filters.includeTaskEvents, true);
  assert.equal(payload.contract.payloadMode, "expanded");
  assert.equal(payload.contract.legacyPayloadMode, true);

  if (payload.tasks.length > 0) {
    assert.ok(Array.isArray(payload.tasks[0].events));
  }
});
