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
 *   --config  <path>   Path to config JSON  (default: ./opencode-dispatch.config.json)
 *   --state   <path>   Path to state file   (default: .runtime/opencode-task-dispatcher.state.json)
 *   --log     <path>   Path to log file     (default: .runtime/opencode-task-dispatcher.log)
 *   --poll-ms <ms>     Polling interval ms  (default: 1500)
 *   --live             Actually invoke OpenCode (default: dry-run)
 *   --help             Show this message
 *
 * zCorvus AI Workspace — OpenCode edition
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

  --config  <path>   Config file path    (default: ./opencode-dispatch.config.json)
  --state   <path>   State file path     (default: .runtime/opencode-task-dispatcher.state.json)
  --log     <path>   Log file path       (default: .runtime/opencode-task-dispatcher.log)
  --poll-ms <n>      Poll interval in ms (default: 1500)
  --live             Enable live OpenCode dispatch (default: dry-run)
  --help             This message

Dry-run logs what would be dispatched without invoking OpenCode.
Live mode calls: opencode run --session <id> "<intake-prompt>" (or --prompt fallback)
`);
  process.exit(0);
}

const IS_LIVE   = args.includes('--live');
const POLL_MS   = parseInt(argValue('--poll-ms') ?? '1500', 10);
const CFG_PATH  = argValue('--config') ?? path.join(__dirname, 'opencode-dispatch.config.json');
const STATE_PATH = argValue('--state') ?? path.join(__dirname, '..', '.runtime', 'opencode-task-dispatcher.state.json');
const LOG_PATH  = argValue('--log')   ?? path.join(__dirname, '..', '.runtime', 'opencode-task-dispatcher.log');

// ─── Logging ─────────────────────────────────────────────────────────────────

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(LOG_PATH);
ensureDir(STATE_PATH);

const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });

function log(level, msg, data = null) {
  const ts  = new Date().toISOString();
  const tag = `[${ts}] [${level.toUpperCase().padEnd(5)}]`;
  const line = data ? `${tag} ${msg} ${JSON.stringify(data)}` : `${tag} ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Config shape:
 * {
 *   "sharedContextPath": "..\\MCP_Server\\shared_context.jsonl",
 *   "systemPromptsDir": "..\\scripts\\agent-prompts",
 *   "agentMap": {
 *     "Orchestrator":          "orchestrator",
 *     "Planner":               "planner",
 *     "Observer":              "observer",
 *     "Frontend":              "frontend",
 *     "Backend":               "backend",
 *     "Tester":                "tester",
 *     "Documenter":            "documenter",
 *     "AI_Workspace_Optimizer":"ai_workspace_optimizer"
 *   },
 *   "sessions": {
 *     "Orchestrator": "session-id-here-or-empty"
 *   },
 *   "dedupeMemorySize": 500,
 *   "opencodeBin": "opencode",
 *   "opencodeTimeout": 120000
 * }
 */

const DEFAULT_CONFIG = {
  sharedContextPath: path.join(__dirname, '..', 'MCP_Server', 'shared_context.jsonl'),
  systemPromptsDir:  path.join(__dirname, 'agent-prompts'),
  agentMap: {
    Orchestrator:           'orchestrator',
    Planner:                'planner',
    Observer:               'observer',
    Frontend:               'frontend',
    Backend:                'backend',
    Tester:                 'tester',
    Documenter:             'documenter',
    AI_Workspace_Optimizer: 'ai_workspace_optimizer',
  },
  sessions:          {},
  startFromEnd:      true,
  dedupeMemorySize:  500,
  opencodeBin:       'opencode',
  opencodeTimeout:   120_000,
};

function loadConfig() {
  if (!fs.existsSync(CFG_PATH)) {
    log('warn', `Config not found at ${CFG_PATH}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
    const cfg = { ...DEFAULT_CONFIG, ...raw };
    // Resolve relative paths from the config file's directory
    const base = path.dirname(CFG_PATH);
    if (!path.isAbsolute(cfg.sharedContextPath))
      cfg.sharedContextPath = path.resolve(base, cfg.sharedContextPath);
    if (!path.isAbsolute(cfg.systemPromptsDir))
      cfg.systemPromptsDir = path.resolve(base, cfg.systemPromptsDir);
    return cfg;
  } catch (err) {
    log('error', 'Failed to parse config, using defaults', { err: err.message });
    return { ...DEFAULT_CONFIG };
  }
}

// ─── State persistence ────────────────────────────────────────────────────────

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { state: { offset: 0, processedEventIds: [] }, isNew: true };
  try {
    return { state: JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')), isNew: false };
  } catch {
    return { state: { offset: 0, processedEventIds: [] }, isNew: true };
  }
}

function saveState(state, cfg) {
  // Keep dedupe memory bounded
  if (state.processedEventIds.length > cfg.dedupeMemorySize) {
    state.processedEventIds = state.processedEventIds.slice(-cfg.dedupeMemorySize);
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

// ─── JSONL incremental reader ─────────────────────────────────────────────────

function readNewLines(filePath, fromOffset) {
  if (!fs.existsSync(filePath)) return { lines: [], newOffset: fromOffset };

  const stat = fs.statSync(filePath);
  if (stat.size <= fromOffset) return { lines: [], newOffset: stat.size };

  const fd     = fs.openSync(filePath, 'r');
  const length = stat.size - fromOffset;
  const buf    = Buffer.allocUnsafe(length);
  fs.readSync(fd, buf, 0, length, fromOffset);
  fs.closeSync(fd);

  const text  = buf.toString('utf8');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return { lines, newOffset: stat.size };
}

// ─── Event parsing ────────────────────────────────────────────────────────────

function parseEvent(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function isTaskAssigned(event) {
  const eventType = event?.type || event?.payload?.type;
  const taskId = event?.taskId || event?.payload?.taskId;
  const assignedTo = event?.assignedTo || event?.payload?.assignedTo;

  return (
    event &&
    typeof event === 'object' &&
    eventType === 'TASK_ASSIGNED' &&
    typeof assignedTo === 'string' &&
    typeof taskId === 'string'
  );
}

// ─── Intake prompt builder ────────────────────────────────────────────────────

/**
 * Builds the deterministic intake message sent to the agent.
 * This is the user turn — the system prompt comes from the agent's JSONL file.
 */
function buildIntakePrompt(event) {
  const taskId = event.taskId || event.payload?.taskId || '(missing-task-id)';
  const correlationId = event.correlationId || event.payload?.correlationId || '(no especificado)';
  const assignedTo = event.assignedTo || event.payload?.assignedTo || '(no especificado)';
  const description =
    event.payload?.description ||
    event.payload?.message ||
    event.message ||
    null;
  const dependsOn =
    (Array.isArray(event.dependsOn) && event.dependsOn.length > 0
      ? event.dependsOn
      : Array.isArray(event.payload?.dependsOn)
      ? event.payload.dependsOn
      : []);
  const acceptanceCriteria =
    (Array.isArray(event.acceptanceCriteria) && event.acceptanceCriteria.length > 0
      ? event.acceptanceCriteria
      : Array.isArray(event.payload?.acceptanceCriteria)
      ? event.payload.acceptanceCriteria
      : []);

  const lines = [
    `Revisá shared_context.jsonl: te fue asignada una tarea nueva.`,
    ``,
    `taskId:        ${taskId}`,
    `correlationId: ${correlationId}`,
    `assignedTo:    ${assignedTo}`,
    `status:        TASK_ASSIGNED`,
    `timestamp:     ${event.timestamp ?? new Date().toISOString()}`,
  ];

  if (event.parentTaskId) lines.push(`parentTaskId:  ${event.parentTaskId}`);
  if (description)      lines.push(``, `Descripción:`, description);
  if (dependsOn.length > 0) {
    lines.push(``, `dependsOn: ${dependsOn.join(', ')}`);
  }
  if (acceptanceCriteria.length > 0) {
    lines.push(``, `Criterios de aceptación:`);
    acceptanceCriteria.forEach(c => lines.push(`  - ${c}`));
  }

  lines.push(
    ``,
    `Acción requerida:`,
    `1. Leé profile.md, learnings.md y skills de tu directorio.`,
    `2. Publicá TASK_ACCEPTED en shared_context.jsonl.`,
    `3. Resumí en máximo 5 pasos qué harás.`,
    `4. Publicá TASK_IN_PROGRESS y comenzá.`,
  );

  return lines.join('\n');
}

// ─── System prompt loader ─────────────────────────────────────────────────────

/**
 * Loads the system prompt from the agent's JSONL file.
 * File format: single JSON line {"role":"system","content":"..."}
 */
function loadSystemPrompt(cfg, agentName) {
  const slug     = cfg.agentMap[agentName];
  if (!slug) return null;
  const filePath = path.join(cfg.systemPromptsDir, `${slug}.jsonl`);
  if (!fs.existsSync(filePath)) {
    log('warn', `System prompt file not found for ${agentName}`, { filePath });
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim().split('\n')[0];
    const obj = JSON.parse(raw);
    return obj.content ?? null;
  } catch (err) {
    log('warn', `Failed to parse system prompt for ${agentName}`, { err: err.message });
    return null;
  }
}

// ─── OpenCode dispatch ────────────────────────────────────────────────────────

/**
 * Dispatches a task to an agent via OpenCode.
 *
 * OpenCode non-interactive usage:
 *   opencode run --session <id> "prompt"        — send into an existing session
 *   opencode run --prompt "..." "prompt"        — fresh run with custom prompt
 *   opencode run --format json "prompt"          — structured output
 *
 * The dispatcher prefers an active session (from config.sessions[agentName]).
 * If no session is configured, it starts a fresh non-interactive run with
 * the system prompt from the agent's JSONL file.
 */
async function dispatchToAgent(cfg, event, intakePrompt, systemPrompt) {
  const agentName   = event.assignedTo;
  const sessionId   = cfg.sessions?.[agentName];
  const opencodeBin = cfg.opencodeBin ?? 'opencode';

  // Build the command arguments
  const cmdArgs = ['run'];

  if (sessionId) {
    // Send to an existing named session
    cmdArgs.push('--session', sessionId);
  } else {
    // No session — pass prompt override if available
    if (systemPrompt) {
      cmdArgs.push('--prompt', systemPrompt);
    }
  }

  // Non-interactive: print output and exit
  // OpenCode exits after responding when a message is passed as argument
  cmdArgs.push('--format', 'default');
  cmdArgs.push(intakePrompt);

  log('info', `Dispatching to ${agentName}`, {
    taskId:    event.taskId,
    sessionId: sessionId ?? '(new session)',
    live:      IS_LIVE,
  });

  if (!IS_LIVE) {
    log('info', `[DRY-RUN] Would run: ${opencodeBin} ${cmdArgs.map(a => JSON.stringify(a)).join(' ')}`);
    return { success: true, dryRun: true };
  }

  try {
    const { stdout, stderr } = await execFileAsync(opencodeBin, cmdArgs, {
      timeout: cfg.opencodeTimeout ?? 120_000,
      env: process.env,
      // Windows-safe: don't use shell, execFile handles PATH lookup
    });

    if (stdout) log('info', `[${agentName}] stdout`, { preview: stdout.slice(0, 300) });
    if (stderr) log('warn', `[${agentName}] stderr`, { preview: stderr.slice(0, 300) });

    return { success: true };
  } catch (err) {
    log('error', `Dispatch failed for ${agentName}`, {
      taskId: event.taskId,
      code:   err.code,
      msg:    err.message?.slice(0, 300),
    });
    return { success: false, error: err.message };
  }
}

// ─── Main poll loop ───────────────────────────────────────────────────────────

async function pollOnce(cfg, state) {
  const { lines, newOffset } = readNewLines(cfg.sharedContextPath, state.offset);

  if (lines.length === 0) return;

  state.offset = newOffset;

  for (const line of lines) {
    const event = parseEvent(line);
    if (!isTaskAssigned(event)) continue;

    // Deduplicate
    const eventId = event.eventId || line;
    if (state.processedEventIds.includes(eventId)) {
      log('debug', `Skipping already-processed event`, { taskId: event.taskId });
      continue;
    }

    const agentName = event.assignedTo;

    if (!cfg.agentMap[agentName]) {
      log('warn', `No agentMap entry for '${agentName}', skipping`, { taskId: event.taskId });
      state.processedEventIds.push(eventId);
      continue;
    }

    const intakePrompt = buildIntakePrompt(event);
    const systemPrompt = loadSystemPrompt(cfg, agentName);

    const result = await dispatchToAgent(cfg, event, intakePrompt, systemPrompt);

    if (result.success) {
      state.processedEventIds.push(eventId);
      log('info', `Dispatch OK`, { agentName, taskId: event.taskId, dryRun: result.dryRun ?? false });
    } else {
      // Don't mark as processed — retry on next poll
      log('error', `Dispatch FAILED, will retry next poll`, { agentName, taskId: event.taskId });
    }
  }
}

async function main() {
  const cfg   = loadConfig();
  const loadedState = loadState();
  const state = loadedState.state;

  log('info', `Dispatcher starting`, {
    mode:     IS_LIVE ? 'LIVE' : 'DRY-RUN',
    pollMs:   POLL_MS,
    watching: cfg.sharedContextPath,
    config:   CFG_PATH,
    state:    STATE_PATH,
  });

  if (!fs.existsSync(cfg.sharedContextPath)) {
    log('warn', `shared_context.jsonl not found at ${cfg.sharedContextPath} — will retry when it appears`);
  } else if (loadedState.isNew && cfg.startFromEnd !== false) {
    const stat = fs.statSync(cfg.sharedContextPath);
    state.offset = stat.size;
    saveState(state, cfg);
    log('info', `State bootstrap startFromEnd=true`, { offset: state.offset });
  }

  // Graceful shutdown
  let running = true;
  process.on('SIGINT',  () => { log('info', 'SIGINT received, shutting down'); running = false; });
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
