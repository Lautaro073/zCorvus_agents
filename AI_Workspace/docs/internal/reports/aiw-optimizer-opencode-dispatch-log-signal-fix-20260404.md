# OpenCode Dispatcher Log Signal Fix

## Metadata
- taskId: `aiw-opt-opencode-dispatch-log-signal-fix-20260404-01`
- correlationId: `aiw-opencode-autonomy-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Problem
Dispatcher emitted `ERROR` immediately on non-zero/timeout command result, even when reconciliation later confirmed successful task lifecycle advancement. This produced gate noise and false incident signals.

## Root cause
Log severity was bound to transport/process failure, not to final delivery outcome after evidence reconciliation.

## Fix implemented

### Two-phase signaling
Updated `AI_Workspace/scripts/opencode-task-dispatcher.mjs` logging behavior:
1. On process failure, emit `WARN`:
   - `Dispatch command failed; entering reconciliation`
2. Before reconciliation wait, emit `WARN`:
   - `Dispatch pending reconciliation`
3. On successful evidence recovery, emit `WARN`:
   - `Dispatch recovered via lifecycle evidence`
4. Emit `ERROR` only if unreconciled after window and retry is scheduled:
   - `Dispatch unreconciled; retry scheduled`

This keeps retry/backoff behavior intact while removing false terminal error signals.

### Test updates
Updated `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs` to assert:
- no legacy false-error log string,
- recovery path logs are warn-style pending/recovered,
- unreconciled path logs only the final error when retry is actually scheduled.

## Validation

```bash
node --test AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs
```

Results:
- `4/4` passing.

## Acceptance mapping
1. No ERROR when reconciliation succeeds -> **PASS**
2. Two-phase pending/recovered signaling implemented -> **PASS**
3. ERROR emitted only on unreconciled expiry -> **PASS**
4. Retry backoff behavior preserved -> **PASS**
5. Tests + report updated -> **PASS**

## Artifacts
- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-opencode-dispatch-log-signal-fix-20260404.md`
