# Playwright E2E (AgentMonitor V2)

Scope: this setup is only for `AI_Workspace/agentmonitor-v2`.

## Commands

- Install dependencies: `npm install`
- Install browsers: `npx playwright install chromium firefox webkit`
- Run full suite (all browsers): `npm run test:e2e`
- Run smoke gate: `npm run test:e2e:smoke`
- Run regression gate: `npm run test:e2e:regression`
- Run visual snapshot gate: `npm run test:e2e:visual`
- Update visual baselines: `npm run test:e2e:visual:update`
- Run with UI mode: `npm run test:e2e:ui`
- Run headed browser: `npm run test:e2e:headed`

## Current tests

- `tests/e2e/smoke.spec.ts`
  - Smoke load of V2 shell
- `tests/e2e/dashboard.spec.ts`
  - Hero and summary metrics visibility
- `tests/e2e/timeline.spec.ts`
  - Timeline search + status filter interactions
- `tests/e2e/filters.spec.ts`
  - Filter controls availability and incident filter activation
- `tests/e2e/task-groups.spec.ts`
  - Task group views by correlation and by agent
- `tests/e2e/critical-panel.spec.ts`
  - Critical alert drilldown to Quick Resolve panel
- `tests/e2e/accessibility.spec.ts`
  - Keyboard focus and Enter interactions (basic a11y smoke)
- `tests/e2e/visual.spec.ts`
  - Snapshot baselines for dashboard, timeline, filters, task groups, and critical panel

## Notes for Tester

- Playwright config file: `playwright.config.ts`
- Projects enabled: `chromium`, `firefox`, `webkit`.
- The runner starts Vite automatically on `http://127.0.0.1:4173`.
- E2E uses deterministic fixture mode (`VITE_E2E_USE_FIXTURES=true`) to avoid flaky dependence on live MCP endpoints during UI flow validation.
- Visual snapshots use component-level `data-testid` targets to keep baselines stable.
- No legacy monitor paths are used (`MCP_Server/monitor*` is out of scope here).
