import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const dispatcherEntry = path.join(workspaceRoot, "scripts", "opencode-task-dispatcher.mjs");
const startOrchestratorBat = path.resolve(workspaceRoot, "..", "start_orchestrator.bat");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, { timeoutMs = 8000, intervalMs = 100, reason = "condition" } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${reason}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function appendJsonl(filePath, event) {
  fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

test("dispatcher detects TASK_ASSIGNED by type, supports session/fresh-run, and bootstraps from end", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-dispatcher-qa-"));
  const sharedContextPath = path.join(tempRoot, "shared_context.jsonl");
  const configPath = path.join(tempRoot, "dispatch.config.json");
  const statePath = path.join(tempRoot, "dispatch.state.json");
  const logPath = path.join(tempRoot, "dispatch.log");

  appendJsonl(sharedContextPath, {
    eventId: "old-task-event",
    type: "TASK_ASSIGNED",
    taskId: "qa-old-task-should-not-replay",
    assignedTo: "Planner",
    timestamp: new Date().toISOString(),
  });

  const initialSize = fs.statSync(sharedContextPath).size;

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        sharedContextPath,
        agentMap: {
          Planner: "planner",
          Tester: "tester",
        },
        sessions: {
          Planner: "ses_planner_qa",
          Tester: "",
        },
        startFromEnd: true,
        dedupeMemorySize: 64,
        opencodeBin: "opencode",
        opencodeTimeout: 120000,
      },
      null,
      2
    ),
    "utf8"
  );

  const child = spawn(
    process.execPath,
    [dispatcherEntry, "--config", configPath, "--state", statePath, "--log", logPath, "--poll-ms", "100"],
    {
      cwd: workspaceRoot,
      stdio: ["ignore", "ignore", "pipe"],
    }
  );

  try {
    await waitFor(
      () => {
        if (!fs.existsSync(statePath)) return false;
        const state = readJson(statePath);
        return state.offset === initialSize;
      },
      { reason: "bootstrap state offset" }
    );

    appendJsonl(sharedContextPath, {
      eventId: "status-only-event",
      type: "TASK_ACCEPTED",
      status: "TASK_ASSIGNED",
      taskId: "qa-status-only-should-not-dispatch",
      assignedTo: "Planner",
      timestamp: new Date().toISOString(),
    });

    appendJsonl(sharedContextPath, {
      eventId: "session-dispatch-event",
      type: "TASK_ASSIGNED",
      status: "QUEUED",
      taskId: "qa-session-dispatch-task",
      assignedTo: "Planner",
      timestamp: new Date().toISOString(),
      payload: {
        description: "Dispatch through existing session.",
      },
    });

    appendJsonl(sharedContextPath, {
      eventId: "fresh-run-dispatch-event",
      type: "TASK_ASSIGNED",
      status: "PENDING_REVIEW",
      taskId: "qa-fresh-run-dispatch-task",
      assignedTo: "Tester",
      timestamp: new Date().toISOString(),
      payload: {
        description: "Dispatch as fresh run fallback.",
      },
    });

    await waitFor(
      () => {
        if (!fs.existsSync(statePath)) return false;
        const state = readJson(statePath);
        return (
          state.processedEventIds.includes("session-dispatch-event") &&
          state.processedEventIds.includes("fresh-run-dispatch-event")
        );
      },
      { reason: "new TASK_ASSIGNED events processed" }
    );

    const stateAfterDispatch = readJson(statePath);
    assert.equal(stateAfterDispatch.processedEventIds.includes("status-only-event"), false);

    const log = fs.readFileSync(logPath, "utf8");

    assert.equal(log.includes("qa-old-task-should-not-replay"), false);
    assert.equal(log.includes("qa-status-only-should-not-dispatch"), false);

    assert.ok(log.includes("Dispatching to Planner"));
    assert.ok(log.includes('"taskId":"qa-session-dispatch-task"'));
    assert.ok(log.includes('"sessionId":"ses_planner_qa"'));
    assert.ok(log.includes('Would run: opencode "run" "-s" "ses_planner_qa"'));

    assert.ok(log.includes("Dispatching to Tester"));
    assert.ok(log.includes('"taskId":"qa-fresh-run-dispatch-task"'));
    assert.ok(log.includes('"sessionId":""'));
    assert.ok(log.includes('Would run: opencode "run" "Revisá shared_context.jsonl: te fue asignada una tarea nueva.'));
    assert.equal(log.includes('Would run: opencode "run" "-s" ""'), false);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(1500)]);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("start_orchestrator uses canonical dispatcher paths and session launches", () => {
  const bat = fs.readFileSync(startOrchestratorBat, "utf8");

  assert.ok(bat.includes('set "DISPATCH_CONFIG=AI_Workspace\\scripts\\opencode-dispatch.config.json"'));
  assert.ok(
    bat.includes('copy /Y AI_Workspace\\scripts\\opencode-dispatch.config.example.json "%DISPATCH_CONFIG%" > nul')
  );
  assert.ok(
    bat.includes('start "zCorvus Task Dispatcher" /MIN cmd /c "node AI_Workspace\\scripts\\opencode-task-dispatcher.mjs --live --config %DISPATCH_CONFIG%"') ||
      bat.includes('start "zCorvus Task Dispatcher" /MIN cmd /c "node AI_Workspace\\scripts\\opencode-task-dispatcher.mjs --live --config AI_Workspace\\scripts\\opencode-dispatch.config.json"')
  );
  assert.ok(bat.includes("start http://127.0.0.1:4311/monitor"));

  for (const label of [
    ":: ORCHESTRATOR PRINCIPAL:",
    ":: TESTER:",
    ":: PLANNER:",
    ":: OBSERVER:",
    ":: OPTIMIZER:",
    ":: DOCUMENTER:",
    ":: FRONTEND:",
    ":: BACKEND:",
  ]) {
    assert.ok(bat.includes(label), `Missing session label: ${label}`);
  }

  const launchCount = (bat.match(/opencode -s /g) ?? []).length;
  assert.ok(launchCount >= 8, "Expected at least 8 OpenCode session launches in start_orchestrator.bat");
});

test("dispatcher reconciles failed session dispatch when task lifecycle already advanced", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-dispatcher-reconcile-"));
  const sharedContextPath = path.join(tempRoot, "shared_context.jsonl");
  const configPath = path.join(tempRoot, "dispatch.config.json");
  const statePath = path.join(tempRoot, "dispatch.state.json");
  const logPath = path.join(tempRoot, "dispatch.log");

  const failingBin = path.join(tempRoot, process.platform === "win32" ? "opencode.cmd" : "opencode");
  const failingContent =
    process.platform === "win32"
      ? "@echo off\r\necho simulated failure>&2\r\nexit /b 1\r\n"
      : "#!/usr/bin/env sh\necho simulated failure >&2\nexit 1\n";
  fs.writeFileSync(failingBin, failingContent, "utf8");
  if (process.platform !== "win32") {
    fs.chmodSync(failingBin, 0o755);
  }

  const assignmentEvent = {
    eventId: "reconcile-assigned-event",
    type: "TASK_ASSIGNED",
    taskId: "qa-reconcile-task",
    assignedTo: "Documenter",
    timestamp: new Date().toISOString(),
    payload: { description: "Reconciliation scenario" },
  };
  appendJsonl(sharedContextPath, assignmentEvent);

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        sharedContextPath,
        agentMap: {
          Documenter: "documenter",
        },
        sessions: {
          Documenter: "ses_reconcile_qa",
        },
        startFromEnd: false,
        dedupeMemorySize: 32,
        dispatchFailureReconcileMs: 3000,
        dispatchFailureReconcileInitialPollMs: 100,
        dispatchFailureReconcileMaxPollMs: 400,
        opencodeBin: failingBin,
        opencodeTimeout: 1000,
      },
      null,
      2
    ),
    "utf8"
  );

  const child = spawn(
    process.execPath,
    [dispatcherEntry, "--live", "--config", configPath, "--state", statePath, "--log", logPath, "--poll-ms", "100"],
    {
      cwd: workspaceRoot,
      stdio: ["ignore", "ignore", "pipe"],
    }
  );

  try {
    await waitFor(() => fs.existsSync(logPath), { reason: "dispatcher log file" });

    setTimeout(() => {
      appendJsonl(sharedContextPath, {
        eventId: "reconcile-accepted-event",
        type: "TASK_ACCEPTED",
        taskId: assignmentEvent.taskId,
        assignedTo: "Documenter",
        timestamp: new Date().toISOString(),
      });
    }, 300);

    await waitFor(
      () => {
        const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
        return log.includes("Dispatch recovered via lifecycle evidence");
      },
      { timeoutMs: 10000, reason: "dispatch reconciliation evidence" }
    );

    const state = readJson(statePath);
    assert.equal(state.processedEventIds.includes("reconcile-assigned-event"), true);

    const log = fs.readFileSync(logPath, "utf8");
    assert.ok(log.includes('Dispatch command failed; entering reconciliation'));
    assert.ok(log.includes('Dispatch pending reconciliation'));
    assert.ok(log.includes('Dispatch recovered via lifecycle evidence'));
    assert.equal(log.includes('Dispatch failed; retry scheduled'), false);
    assert.equal(log.includes('Dispatch unreconciled; retry scheduled'), false);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(1500)]);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("dispatcher uses retry backoff and recovers before next retry when lifecycle arrives later", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-dispatcher-backoff-"));
  const sharedContextPath = path.join(tempRoot, "shared_context.jsonl");
  const configPath = path.join(tempRoot, "dispatch.config.json");
  const statePath = path.join(tempRoot, "dispatch.state.json");
  const logPath = path.join(tempRoot, "dispatch.log");

  const failingBin = path.join(tempRoot, process.platform === "win32" ? "opencode.cmd" : "opencode");
  const failingContent =
    process.platform === "win32"
      ? "@echo off\r\necho simulated failure>&2\r\nexit /b 1\r\n"
      : "#!/usr/bin/env sh\necho simulated failure >&2\nexit 1\n";
  fs.writeFileSync(failingBin, failingContent, "utf8");
  if (process.platform !== "win32") {
    fs.chmodSync(failingBin, 0o755);
  }

  const assignmentEvent = {
    eventId: "backoff-assigned-event",
    type: "TASK_ASSIGNED",
    taskId: "qa-backoff-task",
    assignedTo: "Documenter",
    timestamp: new Date().toISOString(),
    payload: { description: "Backoff reconciliation scenario" },
  };
  appendJsonl(sharedContextPath, assignmentEvent);

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        sharedContextPath,
        agentMap: {
          Documenter: "documenter",
        },
        sessions: {
          Documenter: "ses_backoff_qa",
        },
        startFromEnd: false,
        dedupeMemorySize: 32,
        dispatchFailureReconcileMs: 0,
        dispatchRetryBaseDelayMs: 800,
        dispatchRetryMaxDelayMs: 2000,
        opencodeBin: failingBin,
        opencodeTimeout: 1000,
      },
      null,
      2
    ),
    "utf8"
  );

  const child = spawn(
    process.execPath,
    [dispatcherEntry, "--live", "--config", configPath, "--state", statePath, "--log", logPath, "--poll-ms", "100"],
    {
      cwd: workspaceRoot,
      stdio: ["ignore", "ignore", "pipe"],
    }
  );

  try {
    await waitFor(() => fs.existsSync(logPath), { reason: "dispatcher log file" });

    await waitFor(
      () => {
        const log = fs.readFileSync(logPath, "utf8");
        return log.includes('Dispatch unreconciled; retry scheduled');
      },
      { timeoutMs: 8000, reason: "initial failure scheduling" }
    );

    setTimeout(() => {
      appendJsonl(sharedContextPath, {
        eventId: "backoff-accepted-event",
        type: "TASK_ACCEPTED",
        taskId: assignmentEvent.taskId,
        assignedTo: "Documenter",
        timestamp: new Date().toISOString(),
      });
    }, 1200);

    await waitFor(
      () => {
        const log = fs.readFileSync(logPath, "utf8");
        return log.includes('Recovered via lifecycle evidence (retry queue)');
      },
      { timeoutMs: 10000, reason: "pre-retry reconciliation" }
    );

    const log = fs.readFileSync(logPath, "utf8");
    assert.equal(log.includes('Dispatch failed; retry scheduled'), false);

    const state = readJson(statePath);
    assert.equal(state.processedEventIds.includes("backoff-assigned-event"), true);
    assert.equal(Boolean(state.failedDispatches?.["backoff-assigned-event"]), false);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(1500)]);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
