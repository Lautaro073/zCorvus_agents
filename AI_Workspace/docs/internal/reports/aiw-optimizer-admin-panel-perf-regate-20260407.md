# Admin Panel Performance Re-Gate

- taskId: `aiw-optimizer-admin-panel-perf-regate-20260407-14`
- correlationId: `aiw-admin-control-panel-20260407`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-07`
- status: `completed_fail_gate`

## Objective

Re-run the `/[locale]/admin` performance gate after backend/frontend mitigations and decide whether QA E2E (`aiw-tester-admin-panel-e2e-regression-20260407-10`) can be unblocked.

## Scope and constraints

- Scope: measurement and gate decision only (no new product fixes)
- Route under test: `http://127.0.0.1:3000/es/admin`
- Baseline route for comparison: `http://127.0.0.1:3000/es` (baseline collected in gate `...-09`)
- Mitigations included in this re-gate:
  - Backend: `aiw-backend-admin-metrics-latency-mitigation-20260407-12`
  - Frontend: `aiw-frontend-admin-ssr-roundtrip-mitigation-20260407-13`

## Methodology

1. Re-gate admin Web Vitals sampling
   - Playwright Chromium, 7 runs (`Frontend/.perf/admin-regate/admin-web-vitals-playwright.json`)
   - Metrics: `timeToReady`, `LCP`, `CLS`, `INP approximation`
2. Post-fix backend latency re-benchmark
   - Command: `node scripts/benchmark-admin-latency.js`
   - Environment defaults: warmup=5, requests=30
   - Result summary persisted in `Frontend/.perf/admin-regate/admin-api-latency-benchmark-summary.json`
3. Bundle delta confirmation
   - No client-admin module changes in mitigations (frontend mitigation touched server-only guard in `Frontend/src/lib/server/admin-access.ts`)
   - Route chunk delta remains that of previous gate artifact

## Re-gate measurements (post-fix)

### Admin route (`/es/admin`) - Playwright (7 samples)

- timeToReady: p50 `3401 ms`, p95 `4604 ms`
- LCP: p50 `1028 ms`, p95 `2172 ms`
- CLS: p50 `0.2764`, p95 `0.4611`
- INP approx: p50 `24 ms`, p95 `32 ms`

### Backend API latency benchmark (30 samples)

- `/api/admin/metrics`: p50 `342.75 ms`, p95 `379.71 ms`
- `/api/admin/users`: p50 `342.36 ms`, p95 `372.26 ms`
- `/api/admin/subscriptions`: p50 `522.72 ms`, p95 `554.97 ms`

### Bundle delta status

- Admin-only delta (from prior gate artifact): `+3,189 bytes gzip` (`+0.581%`)
- Current mitigation set did not change client admin page chunks; no new bundle inflation signal.

## Comparative analysis

### 1) Baseline vs re-gate (gate criterion)

Baseline (`/es`) from gate `...-09`:

- timeToReady: p50 `1272 ms`, p95 `1303 ms`
- LCP: p50 `180 ms`, p95 `196 ms`

Re-gate admin vs baseline deltas:

- timeToReady: p50 `+167.37%`, p95 `+253.34%`
- LCP: p50 `+471.11%`, p95 `+1008.16%`

Result: still far beyond accepted threshold (`>20%` regression).

### 2) Failed gate vs re-gate (trend)

Failed gate admin (`...-09`) metrics:

- timeToReady: p50 `3352 ms`, p95 `4527 ms`
- LCP: p50 `1060 ms`, p95 `2304 ms`
- CLS: p50 `0.0074`, p95 `0.0074`

Re-gate delta vs failed gate:

- timeToReady: p50 `+1.46%`, p95 `+1.70%` (slightly worse)
- LCP: p50 `-3.02%`, p95 `-5.73%` (slight improvement)
- CLS: p50 `+3658.75%`, p95 `+6168.45%` (severe regression)

### 3) API latency trend (failed gate vs re-gate benchmark)

- `/api/admin/metrics` p95: `1042.55 ms -> 379.71 ms` (`-63.58%`)
- `/api/admin/users` p95: `700.22 ms -> 372.26 ms` (`-46.84%`)
- `/api/admin/subscriptions` p95: `920.85 ms -> 554.97 ms` (`-39.73%`)

Interpretation: backend mitigation is effective and no longer the dominant bottleneck.

## Hotspots classification (re-gate)

### P1

1. **Render stability (CLS) regression on admin first view**
   - Evidence: CLS p50 `0.2764`, p95 `0.4611`.
   - Impact: fails UX stability expectations and introduces visible layout jumps.
2. **End-to-end admin route readiness still above gate envelope**
   - Evidence: timeToReady p95 `4604 ms`, still `+253.34%` vs baseline.

### P2

1. **LCP remains structurally high vs baseline**
   - Evidence: LCP p95 `2172 ms` vs baseline `196 ms`.

### P3

1. **Authenticated Lighthouse parity harness still pending**
   - Existing Windows EPERM post-write behavior remains operational noise.

## CLS root-cause addendum (post-gate)

Additional forensic traces were collected after the gate decision to pinpoint the high-CLS source:

- Layout-shift trace artifact: `Frontend/.perf/admin-regate/admin-cls-diagnosis.json`
- Layout timeline artifact: `Frontend/.perf/admin-regate/admin-cls-timeline.json`

Key findings:

1. CLS is dominated by two late shifts:
   - `0.1015` at ~`3151.8 ms`
   - `0.1539` at ~`3475.0 ms`
2. Primary shifted nodes are below the KPI block:
   - `section.grid.gap-4.xl:grid-cols-2`
   - `section.rounded-[2rem].border.border-border/70.bg-background/80.p-4.sm:p-5`
3. At load timeline level, first section height increases from `115.9 px` to `387.9 px` (`+272 px`) around `2.2s`, which moves following sections down by the same amount inside viewport.
4. The table section also expands strongly (`213.8 px` -> `1187.7 px`) as async data replaces loading placeholders, amplifying instability pressure.

Interpretation:

- Backend latency improvements succeeded, but frontend layout reservation is insufficient for async admin data.
- CLS P1 is structural (late geometry expansion), not an API latency regression.

## Gate decision

**FAIL**

Reason:

- Re-gate does not satisfy the non-major-regression criterion against baseline.
- Although backend API latency improved strongly, user-visible route outcomes remain outside threshold.
- CLS regressed from low/stable values to high/unstable values, creating a new P1 blocker.

## QA unblock decision

- Tester task `aiw-tester-admin-panel-e2e-regression-20260407-10` remains **BLOCKED**.
- Re-open only after a frontend stabilization pass addresses CLS + readiness and a new gate run confirms threshold compliance.

## Artifacts

- Report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407.md`
- Re-gate evidence:
  - `Frontend/.perf/admin-regate/admin-web-vitals-playwright.json`
  - `Frontend/.perf/admin-regate/admin-api-latency-benchmark-summary.json`
  - `Frontend/.perf/admin-regate/admin-regate-comparison.json`
  - `Frontend/.perf/admin-regate/admin-cls-diagnosis.json`
  - `Frontend/.perf/admin-regate/admin-cls-timeline.json`
  - `Frontend/.perf/admin-regate/diagnose-cls.js`
  - `Frontend/.perf/admin-regate/diagnose-cls-timeline.js`
- Prior gate references:
  - `Frontend/.perf/admin-gate/home-web-vitals-playwright.json`
  - `Frontend/.perf/admin-gate/admin-web-vitals-playwright.json`
  - `Frontend/.perf/admin-gate/admin-api-latency.json`
  - `Frontend/.perf/admin-gate/admin-bundle-delta.json`
