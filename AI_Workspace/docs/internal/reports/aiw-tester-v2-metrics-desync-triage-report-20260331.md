# AgentMonitor V2 Metrics Desync Triage Report

- Task ID: `aiw-tester-v2-metrics-desync-triage-20260331-01`
- Correlation ID: `aiw-agentmonitor-v2-20260330`
- Runtime: `http://127.0.0.1:4311/monitor`
- Date: 2026-03-31

## Reported issue

"Los graficos se actualizan, pero los numeros KPI no".

## Reproduction and evidence

### Steps executed

1. Captured baseline KPI/cards + sparkline points from dashboard.
2. Published one new MCP event with `type=TASK_IN_PROGRESS` and `status=in_progress`.
3. Captured KPI/cards + sparkline points again.
4. Compared before/after values.

### Command evidence

```bash
node scripts/metrics-snapshot.mjs before
# publish event TASK_IN_PROGRESS with status=in_progress
node scripts/metrics-snapshot.mjs after
node -e "...compare before/after..."
```

### Observed output (before -> after)

- `Tareas activas`: value `0 -> 0` (no change), sparkline changed (`polylineChanged=true`)
- `Tasa de cierre`: value `0% -> 0%` (no change), sparkline changed (`polylineChanged=true`)
- `Tiempo promedio`: value `0.0m -> 0.0m` (no change), sparkline changed (`polylineChanged=true`)

This confirms desynchronization: line charts update while KPI values remain stale/zero.

## Root cause

Status normalization mismatch in dashboard metrics hook.

- In `useDashboardMetrics`, `getEventStatus` prefers `event.status` over `event.type`.
- Incoming real events use lowercase statuses (`assigned`, `in_progress`, `completed`, `blocked`, etc.).
- KPI logic compares against uppercase constants (`TASK_ASSIGNED`, `TASK_IN_PROGRESS`, `TASK_BLOCKED`, `TASK_COMPLETED`).
- Result: KPI counters fail to match statuses and stay at 0/stale.
- Trend charts still move because minute bucket counts are based on all events regardless of status mapping.

## File/line references (root cause)

- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:4`
  - `ACTIVE_STATUSES` expects uppercase task statuses.
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:7`
  - `getEventStatus` returns raw `event.status` first.
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:63`
  - active task count uses uppercase set membership.
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:64`
  - blocked count checks `status === 'TASK_BLOCKED'`.
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:65`
  - completed count checks `status === 'TASK_COMPLETED'`.

## Impact map

- **Affected**
  - Dashboard KPI cards in SummaryGrid (active, blocked, completion rate, avg cycle).
  - Hero values that depend on those KPI counters (active/blocked).
- **Not equally affected**
  - Sparkline charts inside KPI cards (minute buckets) continue updating.
  - Timeline/task listing panels continue rendering events.

## Recommended fix (for Frontend)

Normalize status once before comparisons:

1. In `useDashboardMetrics`, normalize with helper (e.g. uppercase map):
   - `assigned -> TASK_ASSIGNED`
   - `accepted -> TASK_ACCEPTED`
   - `in_progress -> TASK_IN_PROGRESS`
   - `blocked -> TASK_BLOCKED`
   - `completed -> TASK_COMPLETED`
   - `failed -> TASK_FAILED`
   - `cancelled -> TASK_CANCELLED`
2. Apply normalized status for:
   - latest status map
   - active/blocked/completed counts
   - assigned/completed cycle-time tracking

## Regression test recommendation

- Add unit test in `useDashboardMetrics.test.tsx` that feeds lowercase statuses and asserts KPI values are non-zero/expected.
- Add E2E check (Playwright) that publishes a lowercase `in_progress` event and verifies:
  - KPI value updates (not stuck)
  - sparkline updates
  - KPI and chart stay consistent.

## Artifacts

- `AI_Workspace/agentmonitor-v2/scripts/metrics-snapshot.mjs`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/before.json`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/after.json`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/before.png`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/after.png`

## QA verdict

`TEST_FAILED` — desync is reproduced and root cause confirmed.
