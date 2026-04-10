# Admin Panel Performance Re-Gate 19

- taskId: `aiw-optimizer-admin-panel-perf-regate-20260407-19`
- correlationId: `aiw-admin-control-panel-20260407`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-07`
- status: `completed_fail_gate`

## Objective

Execute the new performance regate after frontend LCP/first-render mitigation and decide whether QA E2E can be unblocked.

## Scope and constraints

- Scope: measurement + gate decision only.
- Admin route: `http://127.0.0.1:3000/es/admin`
- Home reference route: `http://127.0.0.1:3000/es`
- Baseline references:
  - Original gate: `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-gate-20260407.md`
  - Prior regate: `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407-17.md`
- Mitigation under validation:
  - `aiw-frontend-admin-lcp-first-render-mitigation-20260407-18`

## Methodology

1. Built frontend artifact before measurement (`pnpm build`).
2. Restarted frontend production server and confirmed health.
3. Ran 7-run Playwright sampling for admin and home using:
   - `Frontend/.perf/admin-regate-final/collect-web-vitals-playwright.js`
4. Re-ran backend latency benchmark (`node scripts/benchmark-admin-latency.js`).
5. Consolidated deltas against gate baseline and regate-17.

## Measurements

### Admin route (`/es/admin`) - 7 runs

- timeToReady: p50 `1014 ms`, p95 `2066 ms`
- LCP: p50 `992 ms`, p95 `1700 ms`
- CLS: p50 `0.0000`, p95 `0.0000`
- INP approx: p50 `24 ms`, p95 `24 ms`

### Home route (`/es`) - 7 runs (same session)

- timeToReady: p50 `1221 ms`, p95 `1241 ms`
- LCP: p50 `128 ms`, p95 `184 ms`
- CLS: p50 `0.000050`, p95 `0.000050`
- INP approx: p50 `24 ms`, p95 `24 ms`

### Backend API latency benchmark (30 samples)

- `/api/admin/metrics`: p50 `352.69 ms`, p95 `395.36 ms`
- `/api/admin/users`: p50 `363.08 ms`, p95 `407.47 ms`
- `/api/admin/subscriptions`: p50 `548.99 ms`, p95 `643.80 ms`

## Comparative analysis

### 1) Admin regate-19 vs original baseline (gate-09 home)

- timeToReady: p50 `-20.28%` (better), p95 `+58.56%` (still major regression)
- LCP: p50 `+451.11%`, p95 `+767.35%` (still major regression)
- CLS: stable and near zero (good)

### 2) Admin regate-19 vs regate-17

- timeToReady: p50 `-3.43%`, p95 `-28.36%`
- LCP: p50 `-3.13%`, p95 `-33.28%`
- CLS: stable at zero in both runs

Interpretation:

- There is measurable improvement versus regate-17 on tail latency and LCP.
- Improvement is insufficient to satisfy gate threshold against original baseline.

### 3) API latency trend vs gate-09

- metrics p95: `1042.55 -> 395.36 ms` (`-62.08%`)
- users p95: `700.22 -> 407.47 ms` (`-41.81%`)
- subscriptions p95: `920.85 -> 643.80 ms` (`-30.09%`)

Interpretation:

- Backend remains substantially improved and is not the dominant blocker.

## Hotspots classification

### P1

1. **Admin LCP still far from baseline target**
   - Evidence: `1700 ms` p95 vs baseline `196 ms` p95.
2. **Admin timeToReady tail still above acceptable envelope**
   - Evidence: `2066 ms` p95 vs baseline `1303 ms` p95.

### P2

1. **Residual first-view critical-path cost in admin render pipeline**
   - Even post mitigation, above-the-fold path still significantly heavier than home.

### P3

1. **Authenticated Lighthouse parity harness still not standardized**
   - Playwright evidence is reproducible; parity harness remains optional debt.

## Gate decision

**FAIL**

Reason:

- Mitigation improved metrics versus regate-17, but gate criterion is tied to baseline regression envelope.
- LCP p50/p95 and timeToReady p95 remain above threshold.

## QA unblock decision

- `aiw-tester-admin-panel-e2e-regression-20260407-10` remains **BLOCKED**.
- Unblock only after another frontend pass materially reduces LCP first-render cost and a new regate confirms threshold compliance.

## Artifacts

- Report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407-19.md`
- Evidence:
  - `Frontend/.perf/admin-regate-19/admin-web-vitals-playwright.json`
  - `Frontend/.perf/admin-regate-19/home-web-vitals-playwright.json`
  - `Frontend/.perf/admin-regate-19/admin-api-latency-benchmark-summary.json`
  - `Frontend/.perf/admin-regate-19/admin-regate-19-comparison.json`
