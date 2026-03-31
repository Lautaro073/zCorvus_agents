# AI_Workspace_Optimizer Learnings

## Skills Installation

### Always Ask for Target Agent
When installing skills from skills.sh, ALWAYS ask Orchestrator which agent should receive the skill before installing. Do NOT install globally with `-g` flag.

**Correct approach:**
1. Ask: "¿Qué agente usará esta skill?"
2. Install to: `AI_Workspace/Agents/{AgentName}/skills/`
3. Copy from global if already installed globally

### Skills by Agent (Reference)

| Agent | Skills Location |
|-------|----------------|
| Frontend | `AI_Workspace/Agents/Frontend/skills/` |
| Tester | `AI_Workspace/Agents/Tester/skills/` |
| Observer | `AI_Workspace/Agents/Observer/skills/` |
| Backend | `AI_Workspace/Agents/Backend/skills/` |
| Orchestrator | `AI_Workspace/Agents/Orchestrator/skills/` |
| Planner | `AI_Workspace/Agents/Planner/skills/` |
| Documenter | `AI_Workspace/Agents/Documenter/skills/` |

### Skills Installed to Date

- **Frontend**: svg-animation-engineer, dramatic-2000ms-plus, elevated-design, motion-designer, apple-ui-skills
- **Tester**: test-driven-development, systematic-debugging, playwright-testing
- **Observer**: layout-overflow-guardrails, observability-design-patterns

## Performance Audits

### AgentMonitor V2 Baseline Workflow

1. Run baseline build first (`npm run build`) and capture raw/gzip numbers from Vite output.
2. Add explicit chunk strategy in `vite.config.ts` (manual chunks + lazy routes/components).
3. Re-run build and compare "before vs after" using both total JS and entry chunk size.
4. Add automated guardrail script (`scripts/check-perf-budget.mjs`) so regressions fail fast.

### Lighthouse on Windows Caveat

`lighthouse` can finish auditing and still exit non-zero on Windows with `EPERM` when cleaning temp folders. Treat the run as valid if `.perf/lighthouse.json` is written, and parse that file for metrics.

### Playwright Determinism on Windows

- For Playwright `webServer.command` on Windows, environment vars must use `set VAR=value&& command` (Unix-style `VAR=value command` fails).
- To stabilize V2 E2E flows, run Playwright with `VITE_E2E_USE_FIXTURES=true` and disable `reuseExistingServer` so each run starts with fresh app state.
- Do not run Playwright commands that start `webServer` in parallel (`smoke` + `regression`) because both bind to the same port and can cause false `CONNECTION_REFUSED` failures.

### Monitor Server Routing (V2)

- AgentMonitor V2 build emits absolute asset paths (`/assets/*`, `/favicon.svg`), so serving only `/monitor/*` is insufficient.
- `monitor-server.js` must route root static assets to the active monitor UI directory while still keeping `/pixel/*` mapped to pixel webview.
- A server-side variant flag (`MCP_MONITOR_UI_VARIANT`) plus fallback-to-legacy guard keeps `/monitor` resilient when V2 dist is missing.
- Trailing slash is a runtime hazard: if `/monitor/` is not explicitly mapped to `/index.html`, server can attempt `readFile` on the monitor directory and return HTTP 500.
