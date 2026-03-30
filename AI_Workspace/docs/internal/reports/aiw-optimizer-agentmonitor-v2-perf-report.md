# AgentMonitor V2 Performance Report (V2-PERF-01)

- **taskId:** `aiw-opt-v2-perf-01-20260330-01`
- **correlationId:** `aiw-agentmonitor-v2-20260330`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-03-30

## Scope

Baseline and optimization pass for AgentMonitor V2 focused on:

1. Bundle size and chunk strategy
2. Render-path efficiency in the top-level app composition
3. Perf budgets and automated guardrails

## Baseline vs Optimized

### Build Snapshot (before optimization)

- Command: `npm run build`
- Output snapshot:
  - `dist/assets/index-Cb4v-RcP.js`: **814.93 KB** (gzip **238.43 KB**)
  - `dist/assets/index-HLrAgvmk.css`: **48.71 KB** (gzip **9.04 KB**)

### Build Snapshot (after optimization)

- Command: `npm run build`
- Output snapshot:
  - Entry chunk `dist/assets/index-DE6qHFIK.js`: **19.55 KB** (gzip **6.90 KB**)
  - Total JS chunks: **425.03 KB** raw / **136.72 KB** gzip
  - Total CSS chunks: **48.94 KB** raw / **9.08 KB** gzip
  - Initial preload JS payload: **408.12 KB** raw / **130.87 KB** gzip

### Improvement Summary

- JS total (raw): `814.93 KB -> 425.03 KB` (**-47.8%**)
- JS total (gzip): `238.43 KB -> 136.72 KB` (**-42.7%**)
- Entry JS chunk: `814.93 KB -> 19.55 KB` (**-97.6%**)

## Changes Applied

1. **Code splitting and chunk strategy**
   - Updated `agentmonitor-v2/vite.config.ts` with manual vendor chunking for motion/icons/query/radix and shared vendor output.
   - Added conditional analyzer mode via `ANALYZE=true`.

2. **Lazy-load non-critical heavy panels**
   - Updated `agentmonitor-v2/src/App.tsx` to lazy-load:
     - `AgentStage`
     - `CriticalPanel`
     - `Timeline`
   - Added light fallbacks to keep first render responsive.

3. **Reduced chart overhead in dashboard summary cards**
   - Replaced Recharts sparkline rendering in `agentmonitor-v2/src/components/dashboard/MetricCard.tsx` with lightweight SVG polylines.
   - Preserves trend visualization with lower runtime and bundle cost on initial load.

4. **Render-path optimization in top-level state derivation**
   - Updated aggregation logic in `agentmonitor-v2/src/App.tsx` from repeated filter passes to single-pass maps and memoized derived lists.

## Lighthouse Baseline (Desktop, local preview)

- Source: `agentmonitor-v2/.perf/lighthouse.json`
- URL audited: `http://127.0.0.1:4173`

| Metric | Result |
|---|---:|
| Performance score | **88** |
| FCP | **2.2 s** |
| LCP | **2.5 s** |
| Speed Index | **2.2 s** |
| TBT | **340 ms** |
| CLS | **0.00** |
| TTI | **2.6 s** |
| Network transfer | **153 KB** |

Note: On this Windows host, Lighthouse writes valid JSON but can exit non-zero with temp-folder `EPERM` cleanup errors. Metrics in the JSON artifact are valid.

## Budgets and Guardrails

Added `agentmonitor-v2/scripts/check-perf-budget.mjs` and npm script `perf:budget`.

Current guardrails:

- Initial JS gzip <= **150 KB**
- Initial CSS gzip <= **12 KB**
- Total JS gzip <= **170 KB**
- Entry JS raw <= **30 KB**

Current status: **PASS** on all budget checks.

## Commands Used

- `npm run build`
- `ANALYZE=true npm run build`
- `npm run perf:budget`
- `npx lighthouse http://127.0.0.1:4173 --only-categories=performance --output=json --output-path=.perf/lighthouse.json --chrome-flags="--headless=new --no-sandbox"`

## Recommendations (P1/P2/P3)

- **P1:** Keep summary cards on lightweight SVG trend lines unless full chart interactivity is explicitly required.
- **P1:** Gate PRs with `npm run build && npm run perf:budget`.
- **P2:** Move optional advanced panels (metrics/task groups) behind route-level lazy boundaries when integrated into main shell.
- **P3:** Add repeated Lighthouse runs (3 samples) and report median values to reduce noise.
