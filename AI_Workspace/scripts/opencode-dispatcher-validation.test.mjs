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
  const promptsDir = path.join(tempRoot, "agent-prompts");
  const sharedContextPath = path.join(tempRoot, "shared_context.jsonl");
  const configPath = path.join(tempRoot, "dispatch.config.json");
  const statePath = path.join(tempRoot, "dispatch.state.json");
  const logPath = path.join(tempRoot, "dispatch.log");

  fs.mkdirSync(promptsDir, { recursive: true });
  fs.writeFileSync(
    path.join(promptsDir, "planner.jsonl"),
    `${JSON.stringify({ role: "system", content: "Planner prompt for QA." })}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(promptsDir, "tester.jsonl"),
    `${JSON.stringify({ role: "system", content: "Tester prompt for QA." })}\n`,
    "utf8"
  );

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
        systemPromptsDir: promptsDir,
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
    assert.ok(log.includes('Would run: opencode "run" "--session" "ses_planner_qa"'));

    assert.ok(log.includes("Dispatching to Tester"));
    assert.ok(log.includes('"taskId":"qa-fresh-run-dispatch-task"'));
    assert.ok(log.includes('"sessionId":""'));
    assert.ok(log.includes('Would run: opencode "run" "--prompt" "Tester prompt for QA."'));
    assert.equal(log.includes('Would run: opencode "run" "--session" ""'), false);
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
    bat.includes('start "zCorvus Task Dispatcher" /MIN cmd /c "node AI_Workspace\\scripts\\opencode-task-dispatcher.mjs --live --config %DISPATCH_CONFIG%"')
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
