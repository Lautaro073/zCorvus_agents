# OpenCode Dispatcher False-Negative Fix

## Metadata
- taskId: `aiw-opt-opencode-dispatch-false-negative-fix-20260404-01`
- correlationId: `aiw-opencode-autonomy-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Problem
Live dispatcher could produce a false-negative failure state:
- `opencode -s` returned timeout/non-zero,
- dispatcher logged `Dispatch FAILED, will retry next poll`,
- but the assigned agent already published `TASK_ACCEPTED`/`TASK_IN_PROGRESS` for the same `taskId`.

Impact:
- redundant retries,
- duplicate dispatch risk,
- misleading failure signal in runtime logs.

## Root cause
Failure handling used only process exit status and did not reconcile against source-of-truth MCP lifecycle events in `shared_context.jsonl`.

## Fix implemented

### Dispatcher reconciliation policy
Updated `AI_Workspace/scripts/opencode-task-dispatcher.mjs`:
- Added configurable reconciliation window after dispatch failure:
  - `dispatchFailureReconcileMs` (default `5000`)
  - `dispatchFailureReconcilePollMs` (default `400`)
- Added lifecycle advance detection for same task:
  - `TASK_ACCEPTED`, `TASK_IN_PROGRESS`, `TASK_COMPLETED`, `TEST_PASSED`
- On failed process exit:
  - scan `shared_context.jsonl` for matching lifecycle advance event,
  - if found, mark dispatch as recovered and add `eventId` to dedupe state,
  - log `Dispatch recovered via lifecycle evidence`,
  - do not enter retry loop.

### Regression coverage
Updated `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs` with a dedicated test:
- `dispatcher reconciles failed session dispatch when task lifecycle already advanced`
- Reproduces failing runner + delayed lifecycle event and asserts:
  - recovery log emitted,
  - event marked processed,
  - no `Dispatch FAILED, will retry next poll` loop.

## Validation

```bash
node --test AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs
```

Results:
- `3/3` passing.
- New reconciliation case verified.

## Acceptance mapping
1. False-negative no longer produces retry loop when lifecycle already advanced -> **PASS**
2. Robust policy implemented (reconciliation by task lifecycle evidence) -> **PASS**
3. Test coverage updated for regression prevention -> **PASS**
4. Problem + solution persisted in learnings -> **PASS**

## Artifacts
- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-opencode-dispatch-false-negative-fix-20260404.md`
