# OpenCode Dispatch Live Smoke QA Report

- Task ID: `aiw-tester-opencode-dispatch-live-smoke-20260404-01`
- Correlation ID: `aiw-opencode-autonomy-20260404`
- Date: 2026-04-04
- Agent: Tester

## Objective

Validar en vivo, post-hotfix, que:

1. una `TASK_ASSIGNED` nueva se despacha automaticamente sin mensaje manual;
2. el agente objetivo publica `TASK_ACCEPTED` y `TASK_IN_PROGRESS`;
3. no aparecen errores en log del dispatcher durante la validacion.

## Dependency check

- `aiw-opt-opencode-dispatch-runtime-hotfix-20260404-01` -> **completed**.

## Commands executed

```bash
node scripts/opencode-task-dispatcher.mjs --live --config scripts/opencode-dispatch.config.json --state .runtime/opencode-task-dispatcher.live-smoke2.state.json --log .runtime/opencode-task-dispatcher.live-smoke2.log --poll-ms 300
node scripts/mcp-publish-event.mjs --agent Orchestrator --type TASK_ASSIGNED --task aiw-documenter-opencode-live-smoke-20260404-qa4 --assignedTo Documenter --status assigned --priority high --correlation aiw-opencode-autonomy-20260404 --description "QA live smoke dispatch verification post-hotfix"
```

## Evidence

### A) Auto-dispatch attempt occurred

- `AI_Workspace/.runtime/opencode-task-dispatcher.live-smoke2.log` shows:
  - `Dispatching to Documenter` for task `aiw-documenter-opencode-live-smoke-20260404-qa4`.

### B) Assigned agent advanced lifecycle automatically

- `AI_Workspace/MCP_Server/shared_context.jsonl` contains for `aiw-documenter-opencode-live-smoke-20260404-qa4`:
  - `TASK_ASSIGNED` (Orchestrator)
  - `TASK_ACCEPTED` (Documenter)
  - `TASK_IN_PROGRESS` (Documenter)

### C) Error observed in dispatcher runtime

- Same live-smoke log reports:
  - `Dispatch failed for Documenter` after ~120s
  - command shown in error path: `opencode run --session ... --format default ...`

## Root cause (QA)

`opencode run --session ...` can still deliver intake to the target session, but the dispatcher process treats the call as failed when command returns non-zero / timeout (`opencodeTimeout` boundary). This creates a **false-negative dispatch failure** in runtime logs even when downstream agent lifecycle events prove task intake succeeded.

## Acceptance mapping

1. Auto dispatch of new `TASK_ASSIGNED` -> **PASS**
2. Target agent emits `TASK_ACCEPTED` + `TASK_IN_PROGRESS` -> **PASS**
3. No dispatcher runtime errors during smoke -> **FAIL**

## Severity

- **High**: false-negative failures can trigger retries and duplicate intake attempts.

## Final verdict

`TEST_FAILED`

Live autonomy is functionally reachable, but QA gate remains blocked until dispatcher runtime no longer logs false dispatch failures in this scenario.

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-opencode-dispatch-live-smoke-20260404.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-opencode-dispatch-live-smoke-tests-20260404.txt`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-smoke2.log`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-smoke2.stdout.log`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-smoke2.state.json`
