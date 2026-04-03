#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const monitorEntry = path.join(workspaceRoot, "MCP_Server", "monitor-server.js");

function parseArgs(argv) {
  const options = {
    port: 4454,
    host: "127.0.0.1",
    stableWindowHours: 60,
    broadFallbackTarget: 0.1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port") {
      options.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === "--host") {
      options.host = String(argv[index + 1] || options.host);
      index += 1;
      continue;
    }
    if (arg === "--stable-window-hours") {
      options.stableWindowHours = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === "--broad-fallback-target") {
      options.broadFallbackTarget = Number.parseFloat(argv[index + 1]);
      index += 1;
    }
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    options.port = 4454;
  }
  if (!Number.isFinite(options.stableWindowHours) || options.stableWindowHours <= 0) {
    options.stableWindowHours = 60;
  }
  if (!Number.isFinite(options.broadFallbackTarget) || options.broadFallbackTarget < 0) {
    options.broadFallbackTarget = 0.1;
  }

  return options;
}

async function waitFor(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry while monitor starts
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function buildChecks({ health, observability, canary, stableWindowHours, broadFallbackTarget }) {
  const wave3 = Array.isArray(canary?.waves)
    ? canary.waves.find((wave) => wave.waveId === "wave-3")
    : null;
  const criticalAlerts = Array.isArray(observability?.alerts)
    ? observability.alerts.filter((alert) => alert.severity === "critical")
    : [];
  const legacyModeHitRate = observability?.sli?.legacyModeHitRate;
  const broadFallbackRate = observability?.sli?.broadFallbackRate;
  const lookbackHours = canary?.observedSignals?.lookbackHours;

  return [
    {
      key: "legacy_mode_disabled",
      passed: health?.contextLegacyPayloadMode === false,
      expected: false,
      actual: health?.contextLegacyPayloadMode,
    },
    {
      key: "legacy_hit_rate_zero",
      passed: legacyModeHitRate === 0,
      expected: 0,
      actual: legacyModeHitRate,
    },
    {
      key: "broad_fallback_within_target",
      passed: Number.isFinite(broadFallbackRate) && broadFallbackRate <= broadFallbackTarget,
      expected: `<= ${broadFallbackTarget}`,
      actual: broadFallbackRate,
    },
    {
      key: "no_critical_observability_alerts",
      passed: criticalAlerts.length === 0,
      expected: 0,
      actual: criticalAlerts.length,
    },
    {
      key: "canary_freeze_inactive",
      passed: canary?.freeze?.active === false,
      expected: false,
      actual: canary?.freeze?.active,
    },
    {
      key: "wave3_not_in_rollback",
      passed: wave3 ? wave3.rolloutAction !== "rollback" : false,
      expected: "continue|hold",
      actual: wave3?.rolloutAction,
    },
    {
      key: "stable_window_covered",
      passed: Number.isFinite(lookbackHours) && lookbackHours >= stableWindowHours,
      expected: `>= ${stableWindowHours}h`,
      actual: lookbackHours,
    },
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const child = spawn(process.execPath, [monitorEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(options.port),
      MCP_MONITOR_HOST: options.host,
      MCP_CONTEXT_LEGACY_PAYLOAD_MODE: "false",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitFor(`http://${options.host}:${options.port}/api/health`);

    const [health, observability, canary] = await Promise.all([
      fetch(`http://${options.host}:${options.port}/api/health`).then((response) => response.json()),
      fetch(`http://${options.host}:${options.port}/api/context/observability`).then((response) =>
        response.json()
      ),
      fetch(`http://${options.host}:${options.port}/api/context/wave_canary`).then((response) =>
        response.json()
      ),
    ]);

    const checks = buildChecks({
      health,
      observability,
      canary,
      stableWindowHours: options.stableWindowHours,
      broadFallbackTarget: options.broadFallbackTarget,
    });
    const ready = checks.every((check) => check.passed === true);

    const output = {
      generatedAt: new Date().toISOString(),
      policyVersion: "ctx-legacy-retirement.v1",
      ready,
      inputs: {
        stableWindowHours: options.stableWindowHours,
        broadFallbackTarget: options.broadFallbackTarget,
      },
      checks,
      observability: {
        sli: observability?.sli || null,
        alertCount: Array.isArray(observability?.alerts) ? observability.alerts.length : 0,
      },
      canary: {
        activeWaveId: canary?.activeWaveId || null,
        freezeActive: canary?.freeze?.active === true,
      },
      recommendation: ready
        ? "ready_to_retire_legacy_mode"
        : "hold_and_continue_stable_window_or_remediation",
    };

    console.log(JSON.stringify(output, null, 2));
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
