# Admin Panel Performance Re-Gate (Final)

- taskId: `aiw-optimizer-admin-panel-perf-regate-20260407-17`
- correlationId: `aiw-admin-control-panel-20260407`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-07`
- status: `completed_fail_gate`

## Objective

Run the final post-CLS-mitigation re-gate for `/<locale>/admin`, compare against baseline and previous failed gates, and decide if QA E2E can be unblocked.

## Scope and constraints

- Scope: measurement and decision only (no additional product changes)
- Route under test: `http://127.0.0.1:3000/es/admin`
- Home reference (same run): `http://127.0.0.1:3000/es`
- Historical references:
  - Gate 09: `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-gate-20260407.md`
  - Re-gate 14: `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407.md`
  - CLS mitigation report: `AI_Workspace/docs/internal/reports/aiw-frontend-admin-cls-stability-mitigation-20260407.md`

## Methodology

1. Web Vitals sampling (7 runs each route)
   - Script: `Frontend/.perf/admin-regate-final/collect-web-vitals-playwright.js`
   - Admin result: `Frontend/.perf/admin-regate-final/admin-web-vitals-playwright.json`
   - Home result: `Frontend/.perf/admin-regate-final/home-web-vitals-playwright.json`
2. CLS forensic spot-check
   - Script: `Frontend/.perf/admin-regate/diagnose-cls.js`
   - Result: `Frontend/.perf/admin-regate/admin-cls-diagnosis.json`
3. Backend latency benchmark (30 requests + warmup)
   - Command: `node scripts/benchmark-admin-latency.js`
   - Result: `Frontend/.perf/admin-regate-final/admin-api-latency-benchmark-summary.json`
4. Comparison synthesis
   - Result: `Frontend/.perf/admin-regate-final/admin-regate-final-comparison.json`

## Final re-gate measurements

### Admin route (`/es/admin`) - Playwright (7 samples)

- timeToReady: p50 `1050 ms`, p95 `2884 ms`
- LCP: p50 `1024 ms`, p95 `2548 ms`
- CLS: p50 `0.0000`, p95 `0.0000`
- INP approx: p50 `24 ms`, p95 `24 ms`

### Home route (`/es`) - Playwright (same run)

- timeToReady: p50 `1227 ms`, p95 `1234 ms`
- LCP: p50 `188 ms`, p95 `212 ms`
- CLS: p50 `0.000050`, p95 `0.000050`
- INP approx: p50 `24 ms`, p95 `24 ms`

### Backend API latency (30 samples)

- `/api/admin/metrics`: p50 `370.89 ms`, p95 `405.12 ms`
- `/api/admin/users`: p50 `399.59 ms`, p95 `434.53 ms`
- `/api/admin/subscriptions`: p50 `610.70 ms`, p95 `677.85 ms`

## Comparative analysis

### 1) Against original baseline (gate 09)

- timeToReady: p50 `-17.45%` (improved), p95 `+121.34%` (still major regression)
- LCP: p50 `+468.89%`, p95 `+1200.00%` (major regression remains)
- CLS: normalized to near zero in this run

### 2) Against failed re-gate 14

- timeToReady: p50 `-69.13%`, p95 `-37.36%` (strong improvement)
- LCP: p50 `-0.39%` (flat), p95 `+17.31%` (worse tail)
- CLS: p50/p95 `-100%` (resolved in sampled runs)

### 3) Backend trend vs gate 09

- metrics p95: `1042.55 -> 405.12 ms` (`-61.14%`)
- users p95: `700.22 -> 434.53 ms` (`-37.94%`)
- subscriptions p95: `920.85 -> 677.85 ms` (`-26.39%`)

Interpretation:

- CLS mitigation is effective (major stability recovery).
- Backend remains materially faster than pre-mitigation gate.
- LCP remains the dominant blocker for gate success, with very high p50/p95 over baseline.

## Hotspots classification

### P1

1. **Admin LCP remains far above baseline envelope**
   - Evidence: admin p95 `2548 ms` vs baseline p95 `196 ms`.
2. **Tail readiness still breaches threshold**
   - Evidence: timeToReady p95 `2884 ms` vs baseline p95 `1303 ms` (`+121.34%`).

### P2

1. **Warm-run variance is still high**
   - One heavy outlier run keeps p95 elevated despite improved p50.

### P3

1. **Authenticated Lighthouse parity remains pending**
   - Web Vitals gate is covered with Playwright artifacts; Lighthouse auth harness still not standardized.

## Gate decision

**FAIL**

Reason:

- Acceptance criterion requires major regressions to be eliminated versus baseline.
- CLS was fixed, but LCP and timeToReady p95 still exceed baseline by much more than acceptable threshold.

## QA unblock decision

- Tester task `aiw-tester-admin-panel-e2e-regression-20260407-10` remains **BLOCKED**.
- Unblock only after a further frontend performance mitigation targeting LCP/first-content render path and a new regate confirms threshold compliance.

## Artifacts

- Report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407-17.md`
- Final regate evidence:
  - `Frontend/.perf/admin-regate-final/admin-web-vitals-playwright.json`
  - `Frontend/.perf/admin-regate-final/home-web-vitals-playwright.json`
  - `Frontend/.perf/admin-regate-final/admin-api-latency-benchmark-summary.json`
  - `Frontend/.perf/admin-regate-final/admin-regate-final-comparison.json`
  - `Frontend/.perf/admin-regate-final/collect-web-vitals-playwright.js`
- CLS forensic support:
  - `Frontend/.perf/admin-regate/admin-cls-diagnosis.json`
