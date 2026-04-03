# AgentMonitor V2 Architecture Spec

## Metadata
- taskId: `aiw-documenter-v2-doc-delta-final-20260331-01`
- correlationId: `aiw-agentmonitor-v2-20260330`
- docType: `spec`
- featureSlug: `agentmonitor-v2`
- owner: `Documenter`
- updatedAt: `2026-03-31 (final delta update)`

## Scope
This spec documents the implemented architecture of AgentMonitor V2 in `agentmonitor-v2/`.
It reflects the current code and QA artifacts, not the intended target state from planning docs.

## Source of truth used
- `agentmonitor-v2/src/main.tsx`
- `agentmonitor-v2/src/App.tsx`
- `agentmonitor-v2/src/hooks/useMcpEvents.ts`
- `agentmonitor-v2/src/lib/wsClient.ts`
- `agentmonitor-v2/src/lib/mcpEndpoints.ts`
- `agentmonitor-v2/src/lib/mcpStatus.ts`
- `agentmonitor-v2/src/lib/timestamp.ts`
- `agentmonitor-v2/src/store/monitorStore.ts`
- `agentmonitor-v2/src/types/mcp.ts`
- `agentmonitor-v2/src/components/agentStage/AgentAvatar.tsx`
- `agentmonitor-v2/src/index.css`
- `agentmonitor-v2/src/components/layout/Sidebar.tsx`
- `agentmonitor-v2/src/components/layout/Header.tsx`
- `agentmonitor-v2/playwright.config.ts`
- `MCP_Server/monitor-server.js`
- `docs/api/mcp-events-schema.md`
- `docs/internal/reports/aiw-optimizer-agentmonitor-v2-perf-report.md`
- `docs/internal/reports/aiw-optimizer-v2-monitor-route-report-20260330.md`
- `docs/internal/reports/aiw-tester-v2-test-01-final-report-20260330.md`
- `docs/internal/reports/aiw-tester-v2-ux-clickable-notifications-recheck-report-20260331.md`
- `docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`

## High-level architecture

### Runtime stack
- UI framework: React 19 + TypeScript + Vite 8
- Data/cache layer: TanStack Query
- UI state layer: Zustand (persisted slice)
- Design system: Tailwind v4 + shadcn/ui + Radix primitives
- Motion/visual libs present: framer-motion, react-spring, svg.js, lottie-react
- E2E/visual testing: Playwright (chromium, firefox, webkit)

### App composition
1. `src/main.tsx` mounts the app and QueryClientProvider.
2. `src/App.tsx` composes dashboard shell and feature panels.
3. Core panels:
   - Dashboard hero + summary (`dashboard/*`)
   - Agent stage (`agentStage/*`)
   - Critical panel (`criticalPanel/*`)
   - Timeline (`timeline/*`)
   - Task groups (`taskGroups/*`)
4. Heavy panels are lazy-loaded through `React.lazy` + `Suspense`.

### UI and localization delta
- Agent avatars are now SVG-based per agent role in `agentStage/AgentAvatar.tsx`.
- Status semantics include animated states (`idle`, `active`, `in-progress`, `blocked`, `completed`, `failed`, `pending`).
- Motion behavior is centralized in CSS keyframes in `src/index.css` with reduced-motion support.
- User-facing fallback copy in `src/App.tsx` is localized to Spanish.
- Sidebar navigation is hash-driven and explicitly clickable (`Sidebar.tsx` with section anchors and active state).
- Header search exposes realtime result count feedback and notification controls (`Header.tsx`).

## Data flow and connectivity

### Current V2 client flow
1. Initial data fetch in `useMcpEvents` uses compact relevance-first views (`GET /api/context/get_agent_inbox`) by default.
2. Realtime updates use same-origin `ws(s)://<host>/ws` via websocket envelope messages (`connected`, `events_updated`, `latestEvent`).
3. Snapshot task summaries are normalized into event-like stream entries for dashboard/timeline rendering.
4. Deep debug expansion is explicit (`get_task_snapshot`, `get_correlation_snapshot`, targeted `/api/events?taskId=...&includeTaskEvents=true`) and not used as default intake.
5. Context safety metadata (`degradedMode`, `stale`, `truncated`, `decisionSafety`, `readMode`) is exposed in the UI.

### Endpoint strategy
Endpoint resolution is centralized in `src/lib/mcpEndpoints.ts`:
- API base default: `/api` (same-origin)
- WS default: protocol-aware same-origin `/ws`
- Optional overrides:
  - `VITE_MCP_HTTP_BASE`
  - `VITE_MCP_WS_URL`

This removes hardcoded cross-origin defaults and stabilizes runtime access from `/monitor`.

### Fixture mode for deterministic tests
When `VITE_E2E_USE_FIXTURES=true`:
- network fetch and websocket dependency are bypassed in `useMcpEvents`,
- tests execute against deterministic data paths.

### Data quality guards
- Invalid timestamps are normalized through `lib/timestamp.ts` helper functions with safe fallbacks.
- Event status values are normalized through `lib/mcpStatus.ts` to handle lowercase and alias forms (for example `in_progress` -> `TASK_IN_PROGRESS`).
- Context observability telemetry is consumed from `GET /api/context/observability` and surfaced in dashboard context health for SLO alert visibility.
- Wave canary rollout telemetry is consumed from `GET /api/context/wave_canary` and exposed in dashboard context health (`activeWave`, `canaryFreeze`).

## Serving architecture (`/monitor` and `/pixel`)

### Monitor server role
`MCP_Server/monitor-server.js` acts as the runtime bridge that serves monitor UIs and MCP APIs.

### Routing behavior
- `/monitor` serves **AgentMonitor V2** by default from `agentmonitor-v2/dist`.
- `/pixel` remains served from pixel webview dist and is not replaced by V2.
- `/api/events`, `/api/health`, and `/ws` remain part of the same monitor server runtime.

### Runtime stability detail
The route switch keeps `/monitor` and `/pixel` independently reachable while exposing monitor variant diagnostics in `/api/health`.

### Variant and fallback controls
- `MCP_MONITOR_UI_VARIANT=v2|legacy` (default `v2`)
- `MCP_MONITOR_FALLBACK_TO_LEGACY=true|false` (default `true`)

If V2 dist assets are missing and fallback is enabled, monitor server switches `/monitor` to legacy UI.

## State model

### Global store (`monitorStore`)
- persisted keys: focused agent and filter state
- non-persisted keys: events stream and connection status
- max in-memory events: 1000

### Query cache (`queryClient`)
- stale time: 30s
- gc time: 5m
- retry: 1
- refetch on focus: disabled

## Component boundaries

### Layout and shell
- `layout/AppShell.tsx`: page frame
- `layout/Header.tsx`, `layout/Sidebar.tsx`: navigation and top controls

### Domain feature modules
- `dashboard/*`: top KPIs and summary cards
- `agentStage/*`: focused agent panel and quick actions
- `criticalPanel/*`: alert prioritization and quick resolve panel
- `timeline/*`: event stream and filters
- `filters/*`: user filtering controls and presets
- `taskGroups/*`: grouped task tracking and dependency cues
- `metrics/*`: advanced charts and aggregations

## MCP contract mapping

### Event types
The V2 type model includes operational MCP events such as:
- task lifecycle events (`TASK_*`)
- QA/incident events (`TEST_*`, `INCIDENT_*`)
- documentation and artifact events (`DOC_UPDATED`, `ARTIFACT_PUBLISHED`)
- planning/collaboration events (`PLAN_PROPOSED`, `SUBTASK_REQUESTED`)

### API reference
Canonical server contract is documented in:
- `docs/api/mcp-events-schema.md`

## Performance architecture

### Implemented optimizations (from perf report)
- Vite manual chunking by dependency domains.
- Lazy loading of non-critical panels.
- Lightweight SVG trend rendering in summary cards.
- Single-pass derivation patterns in top-level app computations.

### Current reported budgets
- initial JS gzip <= 150 KB
- initial CSS gzip <= 12 KB
- total JS gzip <= 170 KB
- entry JS raw <= 30 KB

Reported status in perf artifact: PASS.

## QA architecture and quality gates

### Playwright setup
- config file: `agentmonitor-v2/playwright.config.ts`
- projects: chromium, firefox, webkit
- core scripts:
  - `npm run test:e2e:smoke`
  - `npm run test:e2e:regression`
  - `npm run test:e2e:visual`

### Final QA delta verification
- UX clickable + notifications recheck:
  - command: `npx playwright test tests/e2e/clickable-gaps.spec.ts tests/e2e/notifications-toast.spec.ts`
  - result: 6/6 passed across chromium/firefox/webkit
- Metrics desync recheck:
  - KPI and sparkline synchronization validated after status normalization
  - regression and unit checks reported as passed

### QA evidence
- final QA report: `docs/internal/reports/aiw-tester-v2-test-01-final-report-20260330.md`
- ux clickable + notifications report: `docs/internal/reports/aiw-tester-v2-ux-clickable-notifications-recheck-report-20260331.md`
- metrics desync recheck report: `docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`
- html report: `agentmonitor-v2/playwright-report/index.html`
- visual snapshots: `agentmonitor-v2/tests/e2e/visual.spec.ts-snapshots/`

## Known constraints
- V2 currently uses fallback sample events when no live stream is available.
- WS message envelope from MCP (`events_updated` + `latestEvent`) must stay aligned with V2 client parsing strategy.
- `/monitor` variant behavior depends on env flags and V2 dist presence at runtime.

## Non-goals
- This spec does not redefine MCP contracts.
- This spec does not replace perf or QA reports.
- This spec does not document pixel webview internals.
