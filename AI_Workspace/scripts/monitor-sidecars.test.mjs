import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");
const sidecarDir = path.join(workspaceRoot, "MCP_Server", "sidecars");

async function waitFor(url, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // retry while process starts
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function readJson(filePath) {
  const body = await fs.readFile(filePath, "utf-8");
  return JSON.parse(body);
}

test("monitor server rebuilds sidecars and exposes provenance", async () => {
  const port = 4423;
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
    assert.equal(healthPayload.ok, true);
    assert.equal(healthPayload.contextFlags.sidecarsEnabled, true);
    assert.equal(healthPayload.contextFlags.relevanceReadsEnabled, true);

    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=10`);
    const eventsPayload = await eventsResponse.json();
    assert.ok(Array.isArray(eventsPayload.tasks));
    assert.equal(eventsPayload.contract.payloadMode, "compact");
    assert.equal(eventsPayload.contract.relevanceReadMode, "sidecar_snapshot_first");
    assert.equal(eventsPayload.sidecar.enabled, true);
    assert.equal(eventsPayload.sidecar.used, true);
    assert.ok(eventsPayload.sidecar.provenance);
    assert.match(eventsPayload.sidecar.provenance.sourceWatermark, /^jsonl:/);

    await fs.access(path.join(sidecarDir, "latest_by_task.json"));
    await fs.access(path.join(sidecarDir, "latest_by_correlation.json"));
    await fs.access(path.join(sidecarDir, "open_by_agent.json"));
  } finally {
    child.kill();
  }
});

test("monitor server detects corrupted sidecar and rebuilds safely", async () => {
  const port = 4424;
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

  const latestByTaskPath = path.join(sidecarDir, "latest_by_task.json");

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);

    const firstPayloadResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=10`);
    const firstPayload = await firstPayloadResponse.json();
    assert.equal(firstPayload.sidecar.used, true);

    const originalSidecar = await readJson(latestByTaskPath);
    await fs.writeFile(
      latestByTaskPath,
      `${JSON.stringify({ ...originalSidecar, integrityHash: "sha256:corrupted" }, null, 2)}\n`,
      "utf-8"
    );

    const repairedPayloadResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=10`);
    const repairedPayload = await repairedPayloadResponse.json();

    assert.equal(repairedPayload.contract.relevanceReadMode, "sidecar_snapshot_first");
    assert.equal(repairedPayload.sidecar.used, true);

    const repairedSidecar = await readJson(latestByTaskPath);
    assert.notEqual(repairedSidecar.integrityHash, "sha256:corrupted");
  } finally {
    child.kill();
  }
});
