# OpenCode Dispatcher Reconcile Window Hardening

## Metadata
- taskId: `aiw-opt-opencode-reconcile-window-hardening-20260404-01`
- correlationId: `aiw-opencode-autonomy-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Problem
The first false-negative fix solved immediate retries, but still used a short reconciliation tuning unsuitable for real live latency. For async agent responses above ~20s, dispatcher could still mark failures prematurely and retry too aggressively.

## Hardening objectives
1. Safe default reconcile window for real latency.
2. Robust polling/backoff during reconciliation.
3. Backoff-based retry scheduling to avoid loops.
4. Evidence-first success criteria before retrying.

## Changes implemented

### 1) Reconciliation window defaults hardened
Updated `AI_Workspace/scripts/opencode-task-dispatcher.mjs` defaults:
- `dispatchFailureReconcileMs: 30000`
- `dispatchFailureReconcileInitialPollMs: 400`
- `dispatchFailureReconcileMaxPollMs: 4000`

Reconciliation polling now uses bounded exponential backoff.

### 2) Retry strategy hardened
Added retry backoff controls:
- `dispatchRetryBaseDelayMs: 2000`
- `dispatchRetryMaxDelayMs: 30000`

Unreconciled failures are persisted as `failedDispatches` in state with attempt counters and next retry timestamp.

### 3) Evidence-first retry gate
Before any retry attempt, dispatcher now checks for lifecycle evidence (`TASK_ACCEPTED`, `TASK_IN_PROGRESS`, `TASK_COMPLETED`, `TEST_PASSED`) for the same task.

If evidence exists:
- mark assignment event as processed,
- clear failed record,
- log recovery,
- skip retry.

### 4) Retry queue processing
Dispatcher now processes persisted `failedDispatches` every poll cycle (including no-new-lines cycles), so recovery and retry scheduling are not tied to new event arrival.

### 5) Config surface alignment
Updated both configs with new knobs:
- `AI_Workspace/scripts/opencode-dispatch.config.example.json`
- `AI_Workspace/scripts/opencode-dispatch.config.json`

## Test coverage updates
Updated `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`:
- existing reconciliation test adapted to new config knobs,
- new test: `dispatcher uses retry backoff and recovers before next retry when lifecycle arrives later`.

This test verifies:
- failed dispatch creates retry schedule,
- delayed lifecycle evidence is detected before retry,
- failed record is cleared and event is marked processed.

## Validation

```bash
node --test AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs
```

Results:
- `4/4` passing.

## Acceptance mapping
1. Reconcile window hardened for >20s latency -> **PASS**
2. Poll/backoff robustness implemented -> **PASS**
3. Success determined by MCP lifecycle evidence before retry -> **PASS**
4. Retry loop risk reduced via persisted backoff scheduling -> **PASS**
5. Tests and report updated -> **PASS**

## Artifacts
- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`
- `AI_Workspace/scripts/opencode-dispatcher-validation.test.mjs`
- `AI_Workspace/scripts/opencode-dispatch.config.example.json`
- `AI_Workspace/scripts/opencode-dispatch.config.json`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-opencode-reconcile-window-hardening-20260404.md`
