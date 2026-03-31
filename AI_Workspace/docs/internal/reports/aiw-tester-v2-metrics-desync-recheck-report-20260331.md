# AgentMonitor V2 Metrics Desync Recheck Report

- Task ID: `aiw-tester-v2-metrics-desync-recheck-20260331-01`
- Correlation ID: `aiw-agentmonitor-v2-20260330`
- Runtime verified: `http://127.0.0.1:4311/monitor`
- Date: 2026-03-31

## Recheck goal

Validate that KPI counters and KPI sparklines are now synchronized after status normalization fix.

## Fix validation (code review)

- Status normalization added in `agentmonitor-v2/src/lib/mcpStatus.ts`.
- `useDashboardMetrics` now uses `getNormalizedEventStatus(event)` before KPI counting.
- `useMetricsAggregations` now also uses `getNormalizedEventStatus(event)` for consistency.

## Runtime reproducible check

### Method

1. Capture dashboard KPI+sparkline snapshot.
2. Publish new MCP event with lowercase status `in_progress`.
3. Capture dashboard snapshot again.
4. Compare KPI values and sparkline polyline changes.

### Commands

```bash
node scripts/metrics-snapshot.mjs recheck-before
# append TASK_IN_PROGRESS with status=in_progress
node scripts/metrics-snapshot.mjs recheck-after
node -e "...compare json snapshots..."
```

### Observed synchronization

- `Tareas activas`: `6 -> 7` and sparkline changed (`true`)
- `Tasa de cierre`: `57% -> 47%` and sparkline changed (`true`)
- `Tareas bloqueadas`: `0 -> 0` and sparkline unchanged (`false`), expected for non-blocking event
- `Tiempo promedio`: `20.1m -> 20.1m` and sparkline unchanged (`false`), expected for non-cycle event

Conclusion: KPI numbers now update coherently with event changes (no stale-zero mismatch).

## Regression checks

1. Unit tests:
   - `npx vitest run src/hooks/useDashboardMetrics.test.tsx`
   - Result: **2 passed** (includes lowercase normalization case)

2. Cross-browser E2E regression:
   - `npm run test:e2e:regression`
   - Result: **21 passed** (chromium/firefox/webkit)

3. Build:
   - `npm run build`
   - Result: **PASS**

## Acceptance criteria result

1. KPI numéricos reflejan cambios al mismo tiempo que gráficas: **PASSED**
2. Sin discrepancias entre tarjetas y sparklines bajo lowercase/TASK_*: **PASSED**
3. Sin regresión en completionRate/blocked/active/avgCycleTime: **PASSED**
4. Evidencia reproducible publicada: **PASSED**

## Artifacts

- `AI_Workspace/agentmonitor-v2/scripts/metrics-snapshot.mjs`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/recheck-before.json`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/recheck-after.json`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/recheck-before.png`
- `AI_Workspace/agentmonitor-v2/test-results/metrics-desync-triage/recheck-after.png`
- `AI_Workspace/docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`

## Final verdict

`TEST_PASSED`.
