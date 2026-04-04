# Dispatcher Contract Fix (MCP v1)

## Metadata
- taskId: `aiw-opt-dispatcher-contract-fix-20260404-01`
- correlationId: `aiw-dispatcher-contract-fix-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Scope guard
Applied only dispatcher-scoped changes:
- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`
- this report + registry entry

No unrelated feature changes were introduced.

## Problem
Dispatcher diverged from the active MCP event contract and produced unstable behavior in assignment detection, lifecycle reconciliation, and dedupe keying.

## Fixes applied

### 1) TASK_ASSIGNED detection by `event.type`
- `isTaskAssigned()` now matches `type === TASK_ASSIGNED`.

### 2) Lifecycle reconciliation by `event.type`
- lifecycle advance matching now uses `type` values:
  - `TASK_ACCEPTED`, `TASK_IN_PROGRESS`, `TASK_COMPLETED`, `TEST_PASSED`.

### 3) Stable dedupe key
- dedupe now uses:
  - primary: `eventId`
  - fallback: `taskId`

### 4) OpenCode session invocation compatibility (`-s`)
- dispatcher live command uses:
  - `opencode run -s <sessionId> "<intake>"` for existing sessions
  - `opencode run "<intake>"` for fresh run

### 5) Retry-queue consistency
- failed dispatch records now persist both `eventId` and `type` in `assignmentEvent` snapshot for replay consistency.

## Validation

### Regression test suite
```bash
node --test AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs
```
- Result: `4/4` pass.

### Live smoke (real TASK_ASSIGNED)
- Published smoke assignments and confirmed downstream automation:
  - `TASK_ASSIGNED`: `aiw-documenter-dispatcher-contract-fix-smoke-1775288353382`
  - `TASK_ACCEPTED` + `TASK_IN_PROGRESS` by `Documenter` observed in `shared_context.jsonl`
  - repeated confirmation with `aiw-documenter-dispatcher-contract-fix-smoke-1775288494068`

Smoke tasks were then closed via `TASK_CANCELLED` to avoid dangling QA tasks.

## Acceptance mapping
1. Detect TASK_ASSIGNED by `event.type` -> **PASS**
2. Reconcile lifecycle by `type` -> **PASS**
3. Stable dedupe by `eventId` (fallback `taskId`) -> **PASS**
4. Keep OpenCode session invocation valid with `-s` -> **PASS**
5. Live smoke confirms automatic `TASK_ACCEPTED`/`TASK_IN_PROGRESS` -> **PASS**

## Artifacts
- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-dispatcher-contract-fix-20260404.md`
