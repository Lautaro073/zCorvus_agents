# AgentMonitor V2 Runbook

## Metadata
- taskId: `aiw-documenter-v2-doc-delta-final-20260331-01`
- correlationId: `aiw-agentmonitor-v2-20260330`
- docType: `runbook`
- featureSlug: `agentmonitor-v2`
- owner: `Documenter`
- updatedAt: `2026-03-31 (final delta update)`

## Purpose
Operational guide for running, validating, and troubleshooting AgentMonitor V2 (`agentmonitor-v2/`).

## Prerequisites
- Node.js 18+
- npm 9+
- MCP server available (`MCP_Server/`)
- Browsers for Playwright installed (`chromium`, `firefox`, `webkit`)

## 1) Local startup

### Step A - Install dependencies
```bash
cd agentmonitor-v2
npm install
```

### Step B - Start V2 app
```bash
npm run dev
```
Default Vite URL: `http://localhost:5173`

### Step C - Start MCP server
```bash
cd MCP_Server
npm install
npm start
```
Default MCP URL: `http://127.0.0.1:4311`

## 2) Endpoint strategy (same-origin by default)
Current V2 endpoint resolution is centralized in `agentmonitor-v2/src/lib/mcpEndpoints.ts`.

Default behavior:
- API: `/api` (same-origin)
- WebSocket: `ws(s)://<current-host>/ws`

Optional overrides:
- `VITE_MCP_HTTP_BASE`
- `VITE_MCP_WS_URL`

For `/monitor` runtime, this default same-origin strategy is the recommended mode.

## 3) `/monitor` routing and fallback controls

`MCP_Server/monitor-server.js` now serves AgentMonitor V2 on `/monitor` by default.

### Environment flags
- `MCP_MONITOR_UI_VARIANT=v2|legacy` (default `v2`)
- `MCP_MONITOR_FALLBACK_TO_LEGACY=true|false` (default `true`)

### Runtime behavior
1. If variant is `v2` and V2 dist exists, `/monitor` serves `agentmonitor-v2/dist`.
2. If V2 dist is missing and fallback is enabled, `/monitor` falls back to legacy `AgentMonitor/`.
3. `/pixel` remains independent and is still served by pixel webview routing.

### Proven reference
- `docs/internal/reports/aiw-optimizer-v2-monitor-route-report-20260330.md`

### Verification commands
```bash
# monitor health and active variant
curl http://127.0.0.1:4311/api/health

# monitor route
curl -I http://127.0.0.1:4311/monitor

# pixel route
curl -I http://127.0.0.1:4311/pixel/
```

Expected:
- `/api/health` returns `monitorVariant` and active `monitorDir`.
- `/monitor` returns 200 and serves current configured variant.
- `/pixel` returns 200 and remains available.

## 4) Final fixes covered in this runbook delta

This runbook includes final post-QA fixes validated in the latest rechecks:

1. Same-origin endpoint strategy and stable `/monitor` runtime.
2. Invalid timestamp handling with safe fallbacks (`sin fecha`) via `lib/timestamp.ts`.
3. KPI/chart synchronization via status normalization (`lib/mcpStatus.ts`).
4. Clickable UX hardening (sidebar/header/timeline/task-groups) and notifications with toast controls and dedupe/throttle.

## 5) Build and preview
```bash
cd agentmonitor-v2
npm run build
npm run preview
```

## 6) QA and E2E execution

### Install Playwright browsers (first time)
```bash
cd agentmonitor-v2
npx playwright install chromium firefox webkit
```

### Official QA commands (sequential)
```bash
npm run test:e2e:smoke
npm run test:e2e:regression
npm run test:e2e:visual
```

### Final delta recheck commands
```bash
npx playwright test tests/e2e/clickable-gaps.spec.ts tests/e2e/notifications-toast.spec.ts
npx vitest run src/hooks/useDashboardMetrics.test.tsx
```

### Optional full suite
```bash
npm run test:e2e
```

### Optional debug modes
```bash
npm run test:e2e:ui
npm run test:e2e:headed
```

### Current validated evidence
- QA final report: `docs/internal/reports/aiw-tester-v2-test-01-final-report-20260330.md`
- UX clickable + notifications recheck: `docs/internal/reports/aiw-tester-v2-ux-clickable-notifications-recheck-report-20260331.md`
- Metrics desync recheck: `docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`
- HTML report: `agentmonitor-v2/playwright-report/index.html`
- Visual snapshots: `agentmonitor-v2/tests/e2e/visual.spec.ts-snapshots/`

## 7) Performance checks
```bash
cd agentmonitor-v2
npm run build
npm run perf:budget
```

Optional analyzer and lighthouse:
```bash
npm run build:analyze
npm run perf:lighthouse
```

Perf baseline and budgets reference:
- `docs/internal/reports/aiw-optimizer-agentmonitor-v2-perf-report.md`

## 8) Troubleshooting

### Issue: App loads but no live events
Symptoms:
- dashboard renders data but does not react to new MCP events.

Checks:
1. Verify endpoint resolution from `mcpEndpoints.ts` and active env overrides.
2. Confirm MCP health endpoint:
   - `http://127.0.0.1:4311/api/health`
3. Confirm WS endpoint availability:
   - `ws://127.0.0.1:4311/ws`
4. Check browser console for network/WS errors.

### Issue: E2E fails with flaky data
Checks:
1. Confirm fixture mode in `playwright.config.ts`:
   - `VITE_E2E_USE_FIXTURES=true`
2. Re-run tests sequentially (avoid port collisions).
3. Use `npm run test:e2e:headed` for visual debugging.

### Issue: KPI cards and charts diverge
Checks:
1. Verify status normalization helper `lib/mcpStatus.ts` is used by both `useDashboardMetrics` and `useMetricsAggregations`.
2. Verify timestamp helper `lib/timestamp.ts` is used where sorting or bucketing happens.
3. Re-run:
   - `npx vitest run src/hooks/useDashboardMetrics.test.tsx`
   - `npm run test:e2e:regression`

### Issue: Notifications flood or duplicate
Checks:
1. Verify header constants:
   - `TOAST_LIMIT`
   - `TOAST_THROTTLE_MS`
2. Check toast controls in notifications popover (toggle, pause, severity filter).
3. Re-run dedicated tests:
   - `npx playwright test tests/e2e/notifications-toast.spec.ts`

### Issue: Performance budget fails
Checks:
1. Run `npm run build` and inspect generated chunk sizes.
2. Run `npm run perf:budget` and read failing threshold.
3. If needed, profile with `npm run build:analyze` and lazy-load heavy panels.

### Issue: Legacy monitor confusion
Rule:
- V2 QA and operations in this runbook apply only to `agentmonitor-v2/`.
- Do not mix with legacy `/monitor` or `/pixel` flows.

### Issue: `/monitor` serves unexpected UI variant
Checks:
1. Read monitor health payload and confirm `monitorVariant` and `monitorDir`.
2. Validate env flags:
   - `MCP_MONITOR_UI_VARIANT`
   - `MCP_MONITOR_FALLBACK_TO_LEGACY`
3. If expecting V2, verify `agentmonitor-v2/dist/index.html` exists.
4. Restart monitor server after changing env vars.

### Issue: `/pixel` unavailable after monitor changes
Checks:
1. Verify `http://127.0.0.1:4311/pixel/` returns 200.
2. Confirm pixel webview dist path is present in monitor server health output.
3. Ensure route testing uses `/pixel/` and not `/monitor/pixel`.

## 9) Operational checklist
- [ ] `npm install` completed in `agentmonitor-v2/`
- [ ] `npm run dev` starts without errors
- [ ] MCP server is up and reachable
- [ ] Endpoint strategy is same-origin or explicit overrides are configured
- [ ] `/monitor` responds with expected variant (v2 or legacy)
- [ ] `/pixel/` responds correctly after monitor startup
- [ ] `npm run build` passes
- [ ] `npm run test:e2e:smoke` passes
- [ ] `npm run test:e2e:regression` passes
- [ ] `npm run test:e2e:visual` passes
- [ ] `npx playwright test tests/e2e/clickable-gaps.spec.ts tests/e2e/notifications-toast.spec.ts` passes
- [ ] `npx vitest run src/hooks/useDashboardMetrics.test.tsx` passes
- [ ] `npm run perf:budget` passes

## 10) Related documents
- Architecture spec: `docs/internal/specs/agentmonitor-v2-architecture.md`
- API reference: `docs/api/mcp-events-schema.md`
- V2 plan: `docs/internal/plans/aiw-agentmonitor-v2-plan-20260330.md`
- Tester report: `docs/internal/reports/aiw-tester-v2-test-01-final-report-20260330.md`
- UX clickable recheck: `docs/internal/reports/aiw-tester-v2-ux-clickable-notifications-recheck-report-20260331.md`
- Metrics desync recheck: `docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`
- Optimizer perf report: `docs/internal/reports/aiw-optimizer-agentmonitor-v2-perf-report.md`
- Monitor route switch report: `docs/internal/reports/aiw-optimizer-v2-monitor-route-report-20260330.md`
