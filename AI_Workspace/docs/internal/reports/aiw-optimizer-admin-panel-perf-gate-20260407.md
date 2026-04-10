# Admin Panel Performance Gate

- taskId: `aiw-optimizer-admin-panel-perf-gate-20260407-09`
- correlationId: `aiw-admin-control-panel-20260407`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-07`
- status: `completed_fail_gate`

## Objective

Execute the performance gate for `/<locale>/admin` before QA E2E, with quantitative evidence for:

1. LCP, CLS, INP (p50/p95)
2. Admin route bundle delta versus baseline
3. P1/P2/P3 hotspots and mitigations
4. PASS or FAIL decision for QA handoff

## Scope and constraints

- Scope: measurement and diagnosis only (no product fixes)
- Target route: `http://127.0.0.1:3000/es/admin`
- Baseline route: `http://127.0.0.1:3000/es`

## Methodology

1. Build artifacts and chunk profile
   - `npm run build`
   - `npx next build --webpack`
   - Route-level chunk extraction from `page_client-reference-manifest.js`
2. Render/Web Vitals sampling with authenticated admin session
   - Playwright Chromium, 7 cold runs per route
   - Metrics captured: `timeToReady`, `domContentLoaded`, `FCP`, `LCP`, `CLS`, `INP approximation`
3. Backend latency sampling (real APIs, no mocks)
   - 20 requests per endpoint: `/api/admin/users`, `/api/admin/subscriptions`, `/api/admin/metrics`
4. Lighthouse support runs
   - Lighthouse generated JSON artifacts successfully
   - On Windows host, CLI exits with EPERM after artifact write (known behavior)

## Baseline versus admin (p50/p95)

### Home baseline (`/es`) - Playwright (7 samples)

- timeToReady: p50 `1272 ms`, p95 `1303 ms`
- LCP: p50 `180 ms`, p95 `196 ms`
- CLS: p50 `0.0000`, p95 `0.0000`
- INP approx: p50 `24 ms`, p95 `24 ms`

### Admin route (`/es/admin`) - Playwright (7 samples)

- timeToReady: p50 `3352 ms`, p95 `4527 ms`
- LCP: p50 `1060 ms`, p95 `2304 ms`
- CLS: p50 `0.0074`, p95 `0.0074`
- INP approx: p50 `32 ms`, p95 `32 ms`

### Delta admin vs baseline

- timeToReady: p50 `+163.52%`, p95 `+247.43%`
- LCP: p50 `+488.89%`, p95 `+1075.51%`
- INP approx: p50 `+33.33%` (absolute still low)
- CLS: non-zero increase (`0.0074`), still below common risk threshold (`0.1`)

## Bundle delta (admin module and dependencies)

Route chunk comparison (`/[locale]/admin` vs `/[locale]/page`):

- Admin total route client chunks: `551,838 bytes gzip`
- Home total route client chunks: `548,649 bytes gzip`
- Admin-only delta: `3,189 bytes gzip` (`+0.581%`)

Interpretation:

- Bundle delta is small and not the primary bottleneck
- Most weight is shared in existing common chunks

## Backend/admin API latency (20 samples per endpoint)

- `/api/admin/users`: p50 `672.15 ms`, p95 `700.22 ms`
- `/api/admin/subscriptions`: p50 `859.55 ms`, p95 `920.85 ms`
- `/api/admin/metrics`: p50 `1006.56 ms`, p95 `1042.55 ms`

Interpretation:

- API latency is high and directly impacts first meaningful admin render
- Metrics endpoint is the main latency hotspot

## Hotspots and priority

### P1

1. Slow initial data path to admin UI
   - Evidence: API p95 up to `1042.55 ms`, admin `timeToReady p95 4527 ms`
   - Code surface: `Frontend/src/app/[locale]/admin/page.tsx` (parallel data queries)
2. Access guard adds extra server roundtrip chain
   - Evidence: admin server guard validates refresh token then probes `/api/admin`
   - Code surface: `Frontend/src/lib/server/admin-access.ts`

### P2

1. Shared chunk mass remains large
   - Evidence: route totals around `~549-552 KB gzip`, admin-only delta tiny
2. Metrics block is list-based (no heavy chart lib), so rendering cost is mostly data wait
   - Evidence: no chart library detected on admin surface, timeseries rendered as simple rows

### P3

1. Authenticated Lighthouse scenario is not yet fully automated
   - Current Lighthouse hits login redirect for unauthenticated runs
   - Need authenticated harness for direct CWV parity in lighthouse outputs

## Gate decision

**FAIL**

Reason:

- Requirement was no major regression (`>20%`) versus baseline for route-level vitals.
- Admin LCP and time-to-ready exceed that threshold by a large margin (p50 and p95).
- QA E2E should remain blocked until P1 mitigations are applied and re-measured.

## Recommended mitigations (non-implementation)

1. **P1**: reduce first-view API latency
   - prioritize `/api/admin/metrics` query optimization and/or caching
2. **P1**: avoid serial auth probe overhead on admin SSR path
   - collapse refresh + admin probe to single trusted access check where feasible
3. **P2**: enforce admin perf budget gate in CI
   - fail when `timeToReady p50 > 3000 ms` or `p95 > 4500 ms`
4. **P3**: add authenticated Lighthouse harness
   - cookie-injected audit script producing admin-only CWV JSON artifacts

## Artifacts

- Report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-gate-20260407.md`
- Measurement artifacts:
  - `Frontend/.perf/admin-gate/admin-web-vitals-playwright.json`
  - `Frontend/.perf/admin-gate/home-web-vitals-playwright.json`
  - `Frontend/.perf/admin-gate/admin-vs-home-vitals-delta.json`
  - `Frontend/.perf/admin-gate/admin-api-latency.json`
  - `Frontend/.perf/admin-gate/admin-vs-home-route-chunks.json`
  - `Frontend/.perf/admin-gate/admin-bundle-delta.json`
  - `Frontend/.perf/admin-gate/lighthouse-admin-run1.json`
  - `Frontend/.perf/admin-gate/lighthouse-admin-run2.json`
  - `Frontend/.perf/admin-gate/lighthouse-admin-run3.json`
  - `Frontend/.perf/admin-gate/lighthouse-home-run1.json`
  - `Frontend/.perf/admin-gate/lighthouse-home-run2.json`
