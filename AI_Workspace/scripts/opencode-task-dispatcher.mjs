#!/usr/bin/env node
/**
 * opencode-task-dispatcher.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Watches shared_context.jsonl for TASK_ASSIGNED events and dispatches
 * the assigned agent via OpenCode non-interactive mode.
 *
 * Usage:
 *   node opencode-task-dispatcher.mjs [options]
 *
 * Options:
 *   --config  <path>   Path to config JSON   (default: ./opencode-dispatch.config.json)
 *   --state   <path>   Path to state file    (default: .runtime/opencode-task-dispatcher.state.json)
 *   --log     <path>   Path to log file      (default: .runtime/opencode-task-dispatcher.log)
 *   --poll-ms <ms>     Polling interval ms   (default: 1500)
 *   --live             Actually invoke OpenCode (default: dry-run)
 *   --help             Show this message
 *
 * OpenCode CLI used:
 *   With session:    opencode run -s <sessionId> "<intake-prompt>"
 *   Without session: opencode run "<intake-prompt>"
 *
 * System prompt note:
 *   OpenCode does not support injecting a system prompt via CLI flags.
 *   Agent identity in fresh-run mode comes from the project's AGENTS.md
 *   or the agent's OpenCode session configuration.
 *   For full identity control, configure a persistent session per agent
 *   and fill the "sessions" map in the config.
 *
 * zCorvus AI Workspace — OpenCode edition
 *
 * Contract notes:
 * - TASK_ASSIGNED detection uses event.type (MCP event contract).
 * - Lifecycle reconciliation uses event.type signals.
 * - Deduplication key is eventId, with taskId as fallback when eventId is absent.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

if (args.includes('--help')) {
  console.log(`
opencode-task-dispatcher.mjs — zCorvus AI Workspace

  --config  <path>   Config file path     (default: ./opencode-dispatch.config.json)
  --state   <path>   State file path      (default: .runtime/opencode-task-dispatcher.state.json)
  --log     <path>   Log file path        (default: .runtime/opencode-task-dispatcher.log)
  --poll-ms <n>      Poll interval in ms  (default: 1500)
  --live             Enable live OpenCode dispatch (default: dry-run)
  --help             This message

Dry-run logs what would be dispatched without invoking OpenCode.
Live mode (with session):    opencode run -s <id> "<intake-prompt>"
Live mode (without session): opencode run "<intake-prompt>"
`);
  process.exit(0);
}

const IS_LIVE = args.includes('--live');
const POLL_MS = parseInt(argValue('--poll-ms') ?? '1500', 10);
const CFG_PATH = argValue('--config') ?? path.join(__dirname, 'opencode-dispatch.config.json');
const STATE_PATH = argValue('--state') ?? path.join(__dirname, '..', '.runtime', 'opencode-task-dispatcher.state.json');
const LOG_PATH = argValue('--log') ?? path.join(__dirname, '..', '.runtime', 'opencode-task-dispatcher.log');

// ─── Logging ─────────────────────────────────────────────────────────────────

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(LOG_PATH);
ensureDir(STATE_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });

function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const tag = `[${ts}] [${level.toUpperCase().padEnd(5)}]`;
  const line = data ? `${tag} ${msg} ${JSON.stringify(data)}` : `${tag} ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  sharedContextPath: path.join(__dirname, '..', 'MCP_Server', 'shared_context.jsonl'),
  agentMap: {
    Orchestrator: 'orchestrator',
    Planner: 'planner',
    Observer: 'observer',
    Frontend: 'frontend',
    Backend: 'backend',
    Tester: 'tester',
    Documenter: 'documenter',
    AI_Workspace_Optimizer: 'ai_workspace_optimizer',
  },
  sessions: {},
  startFromEnd: true,
  dedupeMemorySize: 500,
  dispatchFailureReconcileMs: 30_000,
  dispatchFailureReconcileInitialPollMs: 400,
  dispatchFailureReconcileMaxPollMs: 4_000,
  dispatchRetryBaseDelayMs: 2_000,
  dispatchRetryMaxDelayMs: 30_000,
  opencodeBin: 'opencode',
  opencodeTimeout: 120_000,
};

function loadConfig() {
  if (!fs.existsSync(CFG_PATH)) {
    log('warn', `Config not found at ${CFG_PATH}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
    const cfg = { ...DEFAULT_CONFIG, ...raw };
    const base = path.dirname(CFG_PATH);
    if (!path.isAbsolute(cfg.sharedContextPath))
      cfg.sharedContextPath = path.resolve(base, cfg.sharedContextPath);
    return cfg;
  } catch (err) {
    log('error', 'Failed to parse config, using defaults', { err: err.message });
    return { ...DEFAULT_CONFIG };
  }
}

// ─── State persistence ────────────────────────────────────────────────────────

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      state: { offset: 0, processedEventIds: [], failedDispatches: {} },
      isNew: true,
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return {
      state: {
        offset: Number.isFinite(parsed?.offset) ? parsed.offset : 0,
        processedEventIds: Array.isArray(parsed?.processedEventIds)
          ? parsed.processedEventIds
          : [],
        failedDispatches:
          parsed?.failedDispatches && typeof parsed.failedDispatches === 'object'
            ? parsed.failedDispatches
            : {},
      },
      isNew: false,
    };
  } catch {
    return {
      state: { offset: 0, processedEventIds: [], failedDispatches: {} },
      isNew: true,
    };
  }
}

function saveState(state, cfg) {
  if (!state.failedDispatches || typeof state.failedDispatches !== 'object') {
    state.failedDispatches = {};
  }
  // Clean up failedDispatches for already-processed events
  for (const id of state.processedEventIds) {
    delete state.failedDispatches[id];
  }
  // Keep dedupe memory bounded
  if (state.processedEventIds.length > cfg.dedupeMemorySize) {
    state.processedEventIds = state.processedEventIds.slice(-cfg.dedupeMemorySize);
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function shouldBootstrapFromEnd(isNew, state) {
  if (isNew) return true;

  const hasOffset = Number.isFinite(state?.offset) && state.offset > 0;
  const hasProcessed = Array.isArray(state?.processedEventIds) && state.processedEventIds.length > 0;
  const hasFailed = state?.failedDispatches && Object.keys(state.failedDispatches).length > 0;

  // Estado "vacío" (por reset/manual edit): evitar replay histórico.
  return !hasOffset && !hasProcessed && !hasFailed;
}

// ─── JSONL incremental reader ─────────────────────────────────────────────────

function readNewLines(filePath, fromOffset) {
  if (!fs.existsSync(filePath)) return { lines: [], newOffset: fromOffset };

  const stat = fs.statSync(filePath);

  // FIX-6: file was rotated/truncated — reset offset to 0 so we don't miss events
  if (stat.size < fromOffset) {
    log('warn', 'shared_context.jsonl shrank (rotation or truncation), resetting offset to 0');
    return { lines: [], newOffset: 0 };
  }

  if (stat.size === fromOffset) return { lines: [], newOffset: fromOffset };

  const fd = fs.openSync(filePath, 'r');
  const length = stat.size - fromOffset;
  const buf = Buffer.allocUnsafe(length);
  fs.readSync(fd, buf, 0, length, fromOffset);
  fs.closeSync(fd);

  const text = buf.toString('utf8');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return { lines, newOffset: stat.size };
}

// ─── Event parsing & normalization ───────────────────────────────────────────

function parseEvent(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * FIX-7: Single normalization helper — all field access goes through here.
 * zCorvus MCP events are flat. .payload fallback is kept for backward compat
 * with older events that may have been written with a nested structure.
 */
function normalizeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const p = event.payload ?? {};
  return {
    eventId: event.eventId ?? p.eventId ?? null,
    type: event.type ?? p.type ?? null,
    status: event.status ?? p.status ?? null,
    taskId: event.taskId ?? p.taskId ?? null,
    assignedTo: event.assignedTo ?? p.assignedTo ?? null,
    correlationId: event.correlationId ?? p.correlationId ?? null,
    parentTaskId: event.parentTaskId ?? p.parentTaskId ?? null,
    timestamp: event.timestamp ?? p.timestamp ?? null,
    message: event.message ?? event.description ?? p.message ?? p.description ?? null,
    objective: event.objective ?? p.objective ?? null,
    dependsOn: Array.isArray(event.dependsOn) ? event.dependsOn :
      Array.isArray(p.dependsOn) ? p.dependsOn : [],
    acceptanceCriteria: Array.isArray(event.acceptanceCriteria) ? event.acceptanceCriteria :
      Array.isArray(p.acceptanceCriteria) ? p.acceptanceCriteria : [],
    deliverables: Array.isArray(event.deliverables) ? event.deliverables :
      Array.isArray(p.deliverables) ? p.deliverables : [],
    scope: Array.isArray(event.scope) ? event.scope :
      Array.isArray(p.scope) ? p.scope : [],
    constraints: Array.isArray(event.constraints) ? event.constraints :
      Array.isArray(p.constraints) ? p.constraints : [],
    _raw: event,
  };
}

const TASK_LIFECYCLE_ADVANCE_TYPES = new Set([
  'TASK_ACCEPTED',
  'TASK_IN_PROGRESS',
  'TASK_COMPLETED',
  'TEST_PASSED',
]);

function eventTimestampMs(norm) {
  const parsed = Date.parse(norm?.timestamp || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function isTaskAssigned(raw) {
  const n = normalizeEvent(raw);
  return (
    n !== null &&
    n.type === 'TASK_ASSIGNED' &&
    typeof n.assignedTo === 'string' && n.assignedTo.length > 0 &&
    typeof n.taskId === 'string' && n.taskId.length > 0
  );
}

function isLifecycleAdvanceForTask(candidateRaw, assignmentNorm) {
  const n = normalizeEvent(candidateRaw);
  if (!n) return false;
  if (!TASK_LIFECYCLE_ADVANCE_TYPES.has(n.type)) return false;
  if (n.taskId !== assignmentNorm.taskId) return false;

  if (assignmentNorm.assignedTo && n.assignedTo && assignmentNorm.assignedTo !== n.assignedTo) {
    return false;
  }

  const assignmentTs = eventTimestampMs(assignmentNorm);
  const candidateTs = eventTimestampMs(n);
  if (assignmentTs !== null && candidateTs !== null && candidateTs < assignmentTs) {
    return false;
  }

  return true;
}

function readAllEvents(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map(line => parseEvent(line.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function findLifecycleAdvanceEvent(filePath, assignmentNorm) {
  const events = readAllEvents(filePath);
  for (let i = events.length - 1; i >= 0; i--) {
    if (isLifecycleAdvanceForTask(events[i], assignmentNorm)) {
      return normalizeEvent(events[i]);
    }
  }
  return null;
}

// ─── Backoff & reconciliation ─────────────────────────────────────────────────

function getBackoffDelayMs(cfg, attempts) {
  const base = Math.max(100, cfg.dispatchRetryBaseDelayMs ?? DEFAULT_CONFIG.dispatchRetryBaseDelayMs);
  const max = Math.max(base, cfg.dispatchRetryMaxDelayMs ?? DEFAULT_CONFIG.dispatchRetryMaxDelayMs);
  const safe = Number.isFinite(attempts) ? Math.max(1, attempts) : 1;
  return Math.min(max, base * (2 ** (safe - 1)));
}

async function reconcileFailedDispatch(cfg, assignmentNorm, options = {}) {
  const reconcileMs = Number.isFinite(options.reconcileMs)
    ? Math.max(0, options.reconcileMs)
    : Math.max(0, cfg.dispatchFailureReconcileMs ?? 0);

  const initialPollMs = Math.max(50,
    cfg.dispatchFailureReconcileInitialPollMs ?? DEFAULT_CONFIG.dispatchFailureReconcileInitialPollMs);
  const maxPollMs = Math.max(initialPollMs,
    cfg.dispatchFailureReconcileMaxPollMs ?? DEFAULT_CONFIG.dispatchFailureReconcileMaxPollMs);

  const check = () => {
    const matched = findLifecycleAdvanceEvent(cfg.sharedContextPath, assignmentNorm);
    return matched
      ? { recovered: true, matchedType: matched.type, matchedTaskId: matched.taskId }
      : { recovered: false, matchedType: null, matchedTaskId: null };
  };

  // Always do an immediate check first
  const immediate = check();
  if (immediate.recovered || reconcileMs === 0) return immediate;

  // Polling window
  const deadline = Date.now() + reconcileMs;
  let pollMs = initialPollMs;

  while (Date.now() < deadline) {
    const wait = Math.min(pollMs, deadline - Date.now());
    await new Promise(r => setTimeout(r, wait));
    const result = check();
    if (result.recovered) return result;
    pollMs = Math.min(maxPollMs, Math.ceil(pollMs * 1.5));
  }

  return { recovered: false, matchedType: null, matchedTaskId: null };
}

// ─── Intake prompt builder ────────────────────────────────────────────────────

/**
 * Reads from normalized event fields.
 */
function buildIntakePrompt(norm) {
  const lines = [
    `Revisá shared_context.jsonl: te fue asignada una tarea nueva.`,
    ``,
    `taskId:        ${norm.taskId}`,
    `correlationId: ${norm.correlationId ?? '(no especificado)'}`,
    `assignedTo:    ${norm.assignedTo}`,
    `status:        TASK_ASSIGNED`,
    `timestamp:     ${norm.timestamp ?? new Date().toISOString()}`,
  ];

  if (norm.parentTaskId) lines.push(`parentTaskId:  ${norm.parentTaskId}`);
  if (norm.objective) lines.push(`objetivo:      ${norm.objective}`);
  if (norm.message) lines.push(``, `Descripción:`, norm.message);

  if (norm.dependsOn.length > 0) {
    lines.push(``, `dependsOn: ${norm.dependsOn.join(', ')}`);
  }
  if (norm.scope.length > 0) {
    lines.push(``, `Scope permitido (paths):`);
    norm.scope.forEach(s => lines.push(`  - ${s}`));
  }
  if (norm.deliverables.length > 0) {
    lines.push(``, `Entregables esperados:`);
    norm.deliverables.forEach(d => lines.push(`  - ${d}`));
  }
  if (norm.acceptanceCriteria.length > 0) {
    lines.push(``, `Criterios de aceptación:`);
    norm.acceptanceCriteria.forEach(c => lines.push(`  - ${c}`));
  }
  if (norm.constraints.length > 0) {
    lines.push(``, `Restricciones:`);
    norm.constraints.forEach(c => lines.push(`  - ${c}`));
  }

  lines.push(
    ``,
    `Acción requerida:`,
    `1. Leé profile.md, learnings.md y skills de tu directorio.`,
    `2. Publicá TASK_ACCEPTED en shared_context.jsonl.`,
    `3. Resumí en máximo 5 pasos qué harás.`,
    `4. Publicá TASK_IN_PROGRESS y comenzá.`,
    `5. Si falta contexto crítico, publicá TASK_BLOCKED con preguntas concretas (no avances a ciegas).`,
  );

  return lines.join('\n');
}

// ─── OpenCode dispatch ────────────────────────────────────────────────────────

/**
 * OpenCode CLI invocation.
 *
 * OpenCode non-interactive usage:
 *   opencode run "<message>"                — fresh run, responds and exits
 *   opencode run -s <sessionId> "<message>" — send into an existing session
 *
 * System prompt cannot be injected via CLI in fresh-run mode.
 * Agent identity comes from the project's AGENTS.md or session configuration.
 */
async function dispatchToAgent(cfg, norm) {
  const agentName = norm.assignedTo;
  const sessionId = cfg.sessions?.[agentName];
  const opencodeBin = cfg.opencodeBin ?? 'opencode';
  const intakePrompt = buildIntakePrompt(norm);

  const cmdArgs = ['run'];
  if (sessionId) {
    cmdArgs.push('-s', sessionId);
  }
  cmdArgs.push(intakePrompt);

  log('info', `Dispatching to ${agentName}`, {
    taskId: norm.taskId,
    sessionId: sessionId ?? '(fresh run)',
    live: IS_LIVE,
  });

  if (!IS_LIVE) {
    log('info', `[DRY-RUN] Would run: ${opencodeBin} ${cmdArgs.map(a => JSON.stringify(a)).join(' ')}`);
    return { success: true, dryRun: true };
  }

  try {
    const { stdout, stderr } = await execFileAsync(opencodeBin, cmdArgs, {
      timeout: cfg.opencodeTimeout ?? 120_000,
      env: process.env,
    });

    if (stdout) log('info', `[${agentName}] stdout`, { preview: stdout.slice(0, 300) });
    if (stderr) log('warn', `[${agentName}] stderr`, { preview: stderr.slice(0, 300) });

    return { success: true };
  } catch (err) {
    log('warn', `Dispatch command failed; entering reconciliation`, {
      taskId: norm.taskId,
      code: err.code,
      msg: err.message?.slice(0, 300),
    });
    return { success: false, error: err.message, code: err.code };
  }
}

// ─── Assignment event processor ───────────────────────────────────────────────

async function processAssignmentEvent(cfg, state, rawEvent, options = {}) {
  const fromRetryQueue = options.fromRetryQueue === true;

  const norm = normalizeEvent(rawEvent);
  if (!norm) return;

  const eventId = norm.eventId || norm.taskId;

  if (state.processedEventIds.includes(eventId)) {
    delete state.failedDispatches[eventId];
    return;
  }

  if (!cfg.agentMap[norm.assignedTo]) {
    log('warn', `No agentMap entry for '${norm.assignedTo}', skipping`, { taskId: norm.taskId });
    state.processedEventIds.push(eventId);
    delete state.failedDispatches[eventId];
    return;
  }

  const existingFailure = state.failedDispatches[eventId] ?? null;

  // Pre-retry reconciliation: maybe the agent already picked it up
  if (existingFailure) {
    const preCheck = await reconcileFailedDispatch(cfg, norm, { reconcileMs: 0 });
    if (preCheck.recovered) {
      state.processedEventIds.push(eventId);
      delete state.failedDispatches[eventId];
      log('info', `Recovered via lifecycle evidence${fromRetryQueue ? ' (retry queue)' : ''}`, {
        agentName: norm.assignedTo,
        taskId: norm.taskId,
        matchedType: preCheck.matchedType,
      });
      return;
    }

    // Still in backoff window?
    if (Number.isFinite(existingFailure.nextRetryAtMs) && Date.now() < existingFailure.nextRetryAtMs) {
      log('debug', 'Skipping dispatch during retry backoff', {
        taskId: norm.taskId,
        retryInMs: existingFailure.nextRetryAtMs - Date.now(),
        attempts: existingFailure.attempts ?? 0,
      });
      return;
    }
  }

  const result = await dispatchToAgent(cfg, norm);

  if (result.success) {
    state.processedEventIds.push(eventId);
    delete state.failedDispatches[eventId];
    log('info', `Dispatch OK`, {
      agentName: norm.assignedTo,
      taskId: norm.taskId,
      dryRun: result.dryRun ?? false,
      retryAttempt: existingFailure?.attempts ?? 0,
    });
    return;
  }

  // Dispatch failed — try to reconcile via lifecycle events in the JSONL
  log('warn', 'Dispatch pending reconciliation', {
    agentName: norm.assignedTo,
    taskId: norm.taskId,
    reconcileMs: cfg.dispatchFailureReconcileMs,
  });

  const reconciliation = await reconcileFailedDispatch(cfg, norm);
  if (reconciliation.recovered) {
    state.processedEventIds.push(eventId);
    delete state.failedDispatches[eventId];
    log('info', `Dispatch recovered via lifecycle evidence`, {
      agentName: norm.assignedTo,
      taskId: norm.taskId,
      matchedType: reconciliation.matchedType,
      originalError: result.error?.slice(0, 200),
    });
    return;
  }

  // Schedule retry with exponential backoff
  const attempts = Number.isFinite(existingFailure?.attempts) ? existingFailure.attempts + 1 : 1;
  const retryDelayMs = getBackoffDelayMs(cfg, attempts);

  state.failedDispatches[eventId] = {
    attempts,
    nextRetryAtMs: Date.now() + retryDelayMs,
    lastFailedAt: new Date().toISOString(),
    lastError: result.error ?? null,
    lastCode: result.code ?? null,
    assignmentEvent: {
      eventId: norm.eventId,
      type: norm.type,
      status: norm.status,
      taskId: norm.taskId,
      assignedTo: norm.assignedTo,
      correlationId: norm.correlationId,
      parentTaskId: norm.parentTaskId,
      timestamp: norm.timestamp,
      message: norm.message,
      dependsOn: norm.dependsOn,
      acceptanceCriteria: norm.acceptanceCriteria,
    },
  };

  log('error', `Dispatch unreconciled; retry scheduled`, {
    agentName: norm.assignedTo,
    taskId: norm.taskId,
    attempts,
    retryDelayMs,
  });
}

// ─── Main poll loop ───────────────────────────────────────────────────────────

async function pollOnce(cfg, state) {
  state.failedDispatches = (state.failedDispatches && typeof state.failedDispatches === 'object')
    ? state.failedDispatches
    : {};

  // Process retry queue first (Object.entries snapshots keys, safe to mutate during loop)
  for (const [eventId, failureRecord] of Object.entries(state.failedDispatches)) {
    if (state.processedEventIds.includes(eventId)) {
      delete state.failedDispatches[eventId];
      continue;
    }

    const raw = failureRecord?.assignmentEvent;
    if (!isTaskAssigned(raw)) {
      log('warn', `Stale/invalid failure record, removing`, { eventId });
      delete state.failedDispatches[eventId];
      continue;
    }

    await processAssignmentEvent(cfg, state, raw, { fromRetryQueue: true });
  }

  // Read new lines from JSONL
  const { lines, newOffset } = readNewLines(cfg.sharedContextPath, state.offset);
  state.offset = newOffset;

  for (const line of lines) {
    const raw = parseEvent(line);
    if (!isTaskAssigned(raw)) continue;

    const norm = normalizeEvent(raw);
    const eventId = norm.eventId || norm.taskId;

    if (state.processedEventIds.includes(eventId)) {
      log('debug', `Skipping already-processed event`, { taskId: eventId });
      continue;
    }

    await processAssignmentEvent(cfg, state, raw, { fromRetryQueue: false });
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const cfg = loadConfig();
  const { state, isNew } = loadState();

  log('info', `Dispatcher starting`, {
    mode: IS_LIVE ? 'LIVE' : 'DRY-RUN',
    pollMs: POLL_MS,
    watching: cfg.sharedContextPath,
    config: CFG_PATH,
    state: STATE_PATH,
  });

  if (!fs.existsSync(cfg.sharedContextPath)) {
    log('warn', `shared_context.jsonl not found at ${cfg.sharedContextPath} — will wait`);
  } else if (cfg.startFromEnd !== false && shouldBootstrapFromEnd(isNew, state)) {
    // First run (o estado vacío): saltar histórico y consumir solo eventos nuevos
    const stat = fs.statSync(cfg.sharedContextPath);
    state.offset = stat.size;
    saveState(state, cfg);
    log('info', `State bootstrap: startFromEnd=true, skipping ${stat.size} bytes of existing content`, {
      reason: isNew ? 'new-state' : 'empty-state',
    });
  }

  let running = true;
  process.on('SIGINT', () => { log('info', 'SIGINT received, shutting down'); running = false; });
  process.on('SIGTERM', () => { log('info', 'SIGTERM received, shutting down'); running = false; });

  while (running) {
    try {
      await pollOnce(cfg, state);
      saveState(state, cfg);
    } catch (err) {
      log('error', 'Unexpected error in poll loop', { err: err.message });
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  log('info', 'Dispatcher stopped');
  logStream.end();
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
