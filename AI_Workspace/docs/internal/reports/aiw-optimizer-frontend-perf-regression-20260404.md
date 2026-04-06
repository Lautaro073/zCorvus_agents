# Frontend Performance Regression Gate

## Metadata
- taskId: `aiw-optimizer-frontend-perf-regression-20260404-09`
- correlationId: `aiw-frontend-ux-theme-persistence-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-05`
- status: `completed`

## Objective
Validate performance regression risk after visual changes on home, icons, and premium surfaces, with focus on:
1. LCP delta vs baseline threshold (+20%),
2. CLS stability on affected routes,
3. bundle growth cap (+50KB gz).

## Scope confirmation
User correction applied: this task was executed against `Frontend/` (pnpm), not `AI_Workspace/agentmonitor-v2`.

## Commands executed

```bash
pnpm build
ANALYZE=true pnpm build
pnpm dlx lighthouse http://localhost:3000/en --only-categories=performance --output=json --output-path=.perf/home-lcp-retry.json --chrome-flags="--headless --no-sandbox" --throttling-method=provided --disable-storage-reset
pnpm dlx lighthouse http://localhost:3000/en/premium/success --only-categories=performance --output=json --output-path=.perf/premium-success-lcp.json --chrome-flags="--headless --no-sandbox" --throttling-method=provided --disable-storage-reset
```

## Build and bundle findings

- Frontend build passes in `pnpm` workflow.
- Aggregate client chunks (from `.next/static/chunks`) measured at:
  - raw: `5,360,313` bytes
  - gzip: `1,120,998` bytes
- Largest gzip chunks:
  - `e5f8ffb53dc6782e.js`: `289,827` bytes
  - `228ae7e2b1b0cf2b.js`: `237,999` bytes
  - `b03cad71653da1da.js`: `214,157` bytes

## Core Web Vitals evidence

### Home (`/en`)
From `Frontend/.perf/home-lcp-retry.json`:
- LCP: `8.34s`
- CLS: `0`
- FCP: `7.94s`
- TBT: `591ms`

### Premium success (`/en/premium/success`)
- Lighthouse run did not complete within CLI timeout in this environment.
- No stable JSON metric artifact produced for that route in this run.

## Acceptance criteria evaluation

1. **LCP no regression >20% vs baseline (home + premium/success)** -> **BLOCKED/NOT PROVEN**
   - Home measured (8.34s), but numeric baseline value is not documented in `frontend-performance-baseline.md` and premium/success run timed out.
2. **CLS <= 0 on affected routes** -> **PARTIAL PASS**
   - Home CLS = `0`.
   - Premium/success not measured due to timeout.
3. **Bundle increase <= 50KB gz vs baseline** -> **BLOCKED/NOT PROVEN**
   - Current gzip total measured, but no explicit baseline gzip figure/version anchor for direct delta comparison in available spec/report artifacts.

## P1 / P2 / P3 triage

### P1
- Missing baseline numeric anchor for direct delta calculations (LCP/bundle) in available frontend baseline artifact.

### P2
- Premium success lighthouse instability/timeouts in current local measurement setup.

### P3
- Non-blocking build warnings (`baseline-browser-mapping` age, middleware->proxy deprecation) should be scheduled separately.

## Recommended next fixes before QA handoff

1. Lock baseline numbers in a dedicated artifact (`home`, `premium/success`, gzip bundle snapshot with commit SHA).
2. Run premium success perf on controlled server session (single Next process, warmed route) and persist JSON artifacts.
3. Add scripted delta checker (`current vs baseline`) for LCP/CLS/bundle to remove manual ambiguity.

## Artifacts
- `AI_Workspace/docs/internal/reports/aiw-optimizer-frontend-perf-regression-20260404.md`
- `Frontend/.perf/home-lcp-retry.json`
- `Frontend/.perf/home-lcp.json`
