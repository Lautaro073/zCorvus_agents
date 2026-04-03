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
      // retry while process starts
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

test("context observability endpoint exposes SLO metrics", async () => {
  const port = 4437;
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
    await waitFor(
      `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=Observer&limit=5`
    );

    const observabilityResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/observability`
    );
    const payload = await observabilityResponse.json();

    assert.equal(payload.policyVersion, "ctx-observability.v1");
    assert.ok(payload.sli);
    assert.equal(typeof payload.sli.staleRate, "number");
    assert.equal(typeof payload.sli.rebuildSuccessRate, "number");
    assert.equal(typeof payload.sli.watermarkLagEventsP95, "number");
    assert.equal(typeof payload.sli.legacyModeHitRate, "number");
    assert.ok(payload.thresholds);
    assert.ok(Array.isArray(payload.alerts));
    assert.ok(payload.runbooks?.primary);
  } finally {
    child.kill();
  }
});

test("legacy payload mode triggers observability alert", async () => {
  const port = 4438;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_LEGACY_PAYLOAD_MODE: "true",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    await waitFor(`http://127.0.0.1:${port}/api/events?limit=10`);

    const observabilityResponse = await waitFor(
      `http://127.0.0.1:${port}/api/context/observability`
    );
    const payload = await observabilityResponse.json();
    const legacyAlert = payload.alerts.find((alert) => alert.id === "legacy_mode_hit_rate");

    assert.ok(legacyAlert, "expected legacy_mode_hit_rate alert");
    assert.equal(legacyAlert.status, "active");
  } finally {
    child.kill();
  }
});

test("wave canary endpoint exposes policy and freeze state", async () => {
  const port = 4439;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_CANARY_ACTIVE_WAVE: "wave-2",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    await waitFor(
      `http://127.0.0.1:${port}/api/context/get_agent_inbox?assignedTo=Observer&limit=5`
    );

    const response = await waitFor(`http://127.0.0.1:${port}/api/context/wave_canary`);
    const payload = await response.json();

    assert.equal(payload.policyVersion, "ctx-canary.v1");
    assert.equal(payload.activeWaveId, "wave-2");
    assert.equal(typeof payload.freeze?.active, "boolean");
    assert.ok(Array.isArray(payload.waves));
    assert.ok(payload.waves.length >= 3);
  } finally {
    child.kill();
  }
});

test("critical observability alerts activate canary freeze", async () => {
  const port = 4440;
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_LEGACY_PAYLOAD_MODE: "true",
      MCP_CONTEXT_CANARY_ACTIVE_WAVE: "wave-3",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    await waitFor(`http://127.0.0.1:${port}/api/events?limit=10`);

    const response = await waitFor(`http://127.0.0.1:${port}/api/context/wave_canary`);
    const payload = await response.json();

    assert.equal(payload.activeWaveId, "wave-3");
    assert.equal(payload.freeze.active, true);
    assert.ok(payload.freeze.reasons.includes("critical_observability_alert_active"));
  } finally {
    child.kill();
  }
});
