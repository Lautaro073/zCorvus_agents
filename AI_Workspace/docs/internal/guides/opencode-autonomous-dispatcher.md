# OpenCode Autonomous Task Dispatch (MCP -> Agent)

## Metadata
- sourceTaskId: `aiw-documenter-opencode-autonomy-docs-20260404-01`
- correlationId: `aiw-opencode-autonomy-20260404`
- owner: `Documenter`
- updatedAt: `2026-04-04`

## Objective

Run agent intake automatically when a new `TASK_ASSIGNED` event is appended to
`AI_Workspace/MCP_Server/shared_context.jsonl`, without waiting for a manual
user message.

## Canonical assets

- Dispatcher: `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- Config template: `AI_Workspace/scripts/opencode-dispatch.config.example.json`
- Live config: `AI_Workspace/scripts/opencode-dispatch.config.json`
- Runtime state/logs: `AI_Workspace/.runtime/`
- Startup entrypoint: `start_orchestrator.bat`

## Architecture overview

1. Dispatcher tails new bytes from `shared_context.jsonl`.
2. It filters only `type === TASK_ASSIGNED`.
3. It builds a deterministic intake prompt from MCP payload fields.
4. It dispatches by `assignedTo`:
   - preferred: `opencode run -s <id> "<intake>"`
   - fallback: `opencode run "<intake>"`
5. It persists cursor and dedupe state (`offset`, `processedEventIds`, `failedDispatches`).

## Setup

### 1) Create runtime config

```cmd
copy AI_Workspace\scripts\opencode-dispatch.config.example.json AI_Workspace\scripts\opencode-dispatch.config.json
```

### 2) Verify config keys

Required keys:
- `sharedContextPath`
- `agentMap`
- `sessions`
- `startFromEnd`

Recommended hardening keys:
- `dispatchFailureReconcileMs: 30000`
- `dispatchFailureReconcileInitialPollMs: 400`
- `dispatchFailureReconcileMaxPollMs: 4000`
- `dispatchRetryBaseDelayMs: 2000`
- `dispatchRetryMaxDelayMs: 30000`

### 3) Ensure `opencode` is available

```bash
opencode --version
opencode run --help
```

## Session model

Session IDs are configured in `scripts/opencode-dispatch.config.json` under
`sessions.<AgentName>`. If a session ID is empty, dispatcher falls back to fresh
non-interactive run.

Reference source for session alignment is `start_orchestrator.bat`.

## Run commands

Dry-run:

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --config AI_Workspace/scripts/opencode-dispatch.config.json
```

Live mode:

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --live --config AI_Workspace/scripts/opencode-dispatch.config.json
```

With explicit runtime files:

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --live --config AI_Workspace/scripts/opencode-dispatch.config.json --state AI_Workspace/.runtime/opencode-task-dispatcher.state.json --log AI_Workspace/.runtime/opencode-task-dispatcher.log --poll-ms 300
```

## Logging and signal semantics

Current expected signal model:

1. `INFO Dispatching to <Agent>`
2. If command fails: `WARN Dispatch command failed; entering reconciliation`
3. During waiting: `WARN Dispatch pending reconciliation`
4. If lifecycle evidence appears: `WARN Dispatch recovered via lifecycle evidence`
5. Only unreconciled expiry should emit: `ERROR Dispatch unreconciled; retry scheduled`

This removes false terminal errors when downstream MCP evidence confirms success.

## Troubleshooting runbook

### Case A: Empty sessions map
Symptom:
- dispatcher uses fresh runs unexpectedly.

Fix:
1. Fill `sessions` in `scripts/opencode-dispatch.config.json`.
2. Ensure IDs match active OpenCode sessions from `start_orchestrator.bat`.

### Case B: Stale bootstrap state
Symptom:
- replay of old `TASK_ASSIGNED` events or cursor mismatch.

Fix:
1. stop dispatcher,
2. rotate or remove state file under `.runtime/`,
3. restart with `startFromEnd=true` for clean bootstrap.

### Case C: False-negative dispatch failure
Symptom:
- process command failure appears even though assigned agent already published
  `TASK_ACCEPTED`/`TASK_IN_PROGRESS`.

Fix path already implemented:
1. lifecycle reconciliation against MCP events,
2. 30s reconciliation window,
3. backoff retry scheduling,
4. log-signal hardening (warn on recovered path).

If still unresolved, inspect:
- `.runtime/opencode-task-dispatcher*.log`
- `.runtime/opencode-task-dispatcher*.state.json`
- `MCP_Server/shared_context.jsonl`

## QA progression and current gate state

Chronology under correlation `aiw-opencode-autonomy-20260404`:

1. Integration validation: `TEST_PASSED`
2. Live smoke: `TEST_FAILED` (false-negative)
3. Live smoke recheck: `TEST_FAILED` (5s window too short)
4. Final gate recheck: `TEST_FAILED` (false error signal still present)
5. Signal recheck after log fix: `TEST_PASSED`

Current operational conclusion:
- autonomous dispatch works,
- lifecycle recovery works,
- strict no-false-error signal gate passed in latest Tester recheck.

## Daily operator checklist

1. `opencode --version` returns OK.
2. MCP monitor server is up (`http://127.0.0.1:4311/monitor`).
3. Dispatcher is running in live mode with correct config.
4. `sessions` and prompt files are present for target agents.
5. Latest smoke/recheck report status is PASS before declaring stable gate.

## Related evidence

- `docs/internal/reports/aiw-optimizer-opencode-dispatch-integration-20260404.md`
- `docs/internal/reports/aiw-optimizer-opencode-dispatch-runtime-hotfix-20260404.md`
- `docs/internal/reports/aiw-optimizer-opencode-dispatch-false-negative-fix-20260404.md`
- `docs/internal/reports/aiw-optimizer-opencode-reconcile-window-hardening-20260404.md`
- `docs/internal/reports/aiw-optimizer-opencode-dispatch-log-signal-fix-20260404.md`
- `docs/internal/reports/aiw-tester-opencode-live-smoke-signal-recheck-20260404.md`
