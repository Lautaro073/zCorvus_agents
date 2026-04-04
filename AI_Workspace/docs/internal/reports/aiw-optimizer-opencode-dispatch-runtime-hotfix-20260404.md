# OpenCode Dispatcher Runtime Hotfix

## Metadata
- taskId: `aiw-opt-opencode-dispatch-runtime-hotfix-20260404-01`
- correlationId: `aiw-opencode-autonomy-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Problem
Dispatcher live mode had runtime gaps that prevented stable autonomous dispatch:
1. `AI_Workspace/scripts/opencode-dispatch.config.json` had empty `sessions`.
2. `AI_Workspace/scripts/agent-prompts/*.jsonl` files were missing.
3. Dispatcher state needed clean bootstrap to avoid stale offset/replay behavior.

Observed evidence (pre-hotfix):
- `AI_Workspace/.runtime/opencode-task-dispatcher.log` showed warnings for missing system prompt files and repeated dispatch failures in live mode.

## Fix applied

### 1) Runtime session map completed
- Updated `AI_Workspace/scripts/opencode-dispatch.config.json` with session IDs per agent based on `start_orchestrator.bat`.

### 2) Prompt assets provisioned
- Added prompt files under `AI_Workspace/scripts/agent-prompts/`:
  - `orchestrator.jsonl`
  - `planner.jsonl`
  - `observer.jsonl`
  - `frontend.jsonl`
  - `backend.jsonl`
  - `tester.jsonl`
  - `documenter.jsonl`
  - `ai_workspace_optimizer.jsonl`

### 3) Clean dispatcher bootstrap state
- Reset `AI_Workspace/.runtime/opencode-task-dispatcher.state.json` with current end offset and empty dedupe list for clean post-hotfix startup.

### 4) Live dispatch validation (real task)
- Started dispatcher in live mode with production config.
- Published real smoke task assignment for `Documenter`.
- Confirmed automatic dispatch via runtime log and downstream `Documenter` lifecycle events (`TASK_ACCEPTED` + `TASK_IN_PROGRESS`).
- Closed smoke task with `TASK_CANCELLED` after verification.

## Validation commands

```bash
opencode --version
opencode run --help
opencode run --session ses_2d2a38f49ffeIuock0vn7moQKl "[dispatcher smoke] Confirm session is alive; reply with OK only."
node --test AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --live --config AI_Workspace/scripts/opencode-dispatch.config.json --poll-ms 400
node AI_Workspace/scripts/mcp-publish-event.mjs --agent Orchestrator --type TASK_ASSIGNED --task aiw-documenter-opencode-hotfix-smoke-1775280432806 --assignedTo Documenter --status assigned --priority high --correlation aiw-opencode-autonomy-20260404 --description "Smoke validation: Documenter dispatch after runtime hotfix"
```

## Validation results
- OpenCode CLI available (`1.2.26`) and `run` semantics confirmed.
- Dispatcher regression tests pass (`2/2`).
- Runtime log confirms Documenter dispatch attempt with active session id:
  - `Dispatching to Documenter ... "sessionId":"ses_2d2a38f49ffeIuock0vn7moQKl"`
- `shared_context.jsonl` confirms autonomous agent execution after assignment:
  - `TASK_ACCEPTED` by `Documenter` for smoke task
  - `TASK_IN_PROGRESS` by `Documenter` for smoke task

## Acceptance mapping
1. Config sessions completed from startup source -> **PASS**
2. Prompt files guaranteed for all `agentMap` entries -> **PASS**
3. Clean state bootstrap applied -> **PASS**
4. Live dispatch verified on real `TASK_ASSIGNED` (Documenter) -> **PASS**

## Artifacts
- `AI_Workspace/scripts/opencode-dispatch.config.json`
- `AI_Workspace/scripts/agent-prompts/orchestrator.jsonl`
- `AI_Workspace/scripts/agent-prompts/planner.jsonl`
- `AI_Workspace/scripts/agent-prompts/observer.jsonl`
- `AI_Workspace/scripts/agent-prompts/frontend.jsonl`
- `AI_Workspace/scripts/agent-prompts/backend.jsonl`
- `AI_Workspace/scripts/agent-prompts/tester.jsonl`
- `AI_Workspace/scripts/agent-prompts/documenter.jsonl`
- `AI_Workspace/scripts/agent-prompts/ai_workspace_optimizer.jsonl`
- `AI_Workspace/.runtime/opencode-task-dispatcher.state.json`
- `AI_Workspace/.runtime/opencode-task-dispatcher.log`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-opencode-dispatch-runtime-hotfix-20260404.md`
