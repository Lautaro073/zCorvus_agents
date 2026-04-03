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

## Token & Context Optimization

### Baseline heuristics that proved useful

- `shared_context.jsonl` byte size gives a practical token proxy (`~bytes/4`) when provider-level token telemetry is unavailable.
- Measuring both `get_events` payload and `/api/events` payload is key: `/api/events` can be >2x heavier because task groups may embed full nested event arrays.
- Profile-driven intake analysis is actionable: scanning `Agents/*/profile.md` for default `get_events` limits quickly quantifies broad-window usage and per-agent intake token cost.

### Context contract hygiene

- Compact snapshots must share one strict envelope (`schemaVersion`, `sourceWatermark`, `integrityHash`, `stale`, `degradedMode`, `decisionSafety`) to avoid per-consumer interpretation drift.
- `truncated=true` without expansion hint creates hidden ambiguity; contract should always define an expansion path (`taskId`, `correlationId`, or bounded debug read).

### Schema evolution guardrail

- Version policy is not enough without fixtures; a manifest-driven compatibility check (`v1 native`, `v1->v2 backward`, `v2->v1 fallback`) gives deterministic migration gates for CI.

### Profile governance rollout

- Context optimization only becomes real when profile defaults change (`limit=20` to intake `limit=5` + triage `limit=10`); contracts alone do not reduce broad-read behavior.

### Slim API payload pattern

- `/api/events` should default to compact task summaries and expose deep debug via explicit `includeTaskEvents=true`.
- A dedicated legacy switch (`MCP_CONTEXT_LEGACY_PAYLOAD_MODE`) is an effective migration guard: new consumers get compact defaults, old consumers can keep expanded payloads temporarily.

### Canonical payload normalization

- Deduplicating canonical fields at write-time (top-level wins, payload compacted) gives material savings (~23% on current representative context) without losing semantics when readers use canonical top-level fields.

### Message budget enforcement

- Applying budget policy at writer entrypoints (CLI + MCP stdio) is the only reliable way to keep handoff messages short; profile guidance alone does not control runtime payload size.

### Kill-switch rollout safety

- Exposing all context flags in `/api/health` turns rollback into an observable operation; without health visibility, env-based kill switches are hard to trust during incidents.

### Snapshot safety guardrails

- Redaction and memory-safety checks should run at ingress (writer) and egress (compact summary response) to cover both new and historical data paths.

### High-ROI reduction pattern

- For monitor/API calls, returning `tasks` summary without nested `task.events` preserves UX while cutting payload size significantly.
- Canonical field duplication (`taskId`, `assignedTo`, `status`, etc.) at top-level + payload is measurable overhead and should be normalized at write-time.

### Sidecar snapshot discipline

- Sidecars should be rebuilt on context fingerprint change (`size` + `mtimeMs`) and on watcher events; this avoids full JSONL regrouping on every hot read.
- Snapshot-first is safest when responses expose provenance (`sourceWatermark`, `rebuiltAt`, `integrityHash`) and can fall back to event-scan mode on rebuild failure.
- Adding a stable `contentFingerprint` (excluding volatile rebuild timestamps) provides a deterministic idempotence signal for repeated rebuilds over the same watermark.
- Consumer path should validate sidecar files before reuse; on corruption (`integrityHash` mismatch or watermark mismatch), rebuild or fallback must be automatic.

### Relevance-first read modes

- Compact views (`agent_inbox`, `task_snapshot`, `correlation_snapshot`) should always emit explicit `readAudit` mode so broad-fallback usage can be measured.
- In practice, snapshot-first read modes can cut payload bytes by >95% versus broad `includeTaskEvents=true` scans for normal intake paths.

### Degraded mode decision policy

- `degradedMode` handling must be explicit at response level (`safetyPolicy`) so consumers know when triage/writeback is blocked and expansion is mandatory.
- When compact responses are truncated, prioritize critical task statuses (`blocked`, `failed`) first to avoid silent loss of high-risk signals.

### Deterministic dedup and noise suppression

- Dedupe should run at writer ingress (CLI publisher + MCP stdio), not only at read-time, to prevent permanent noise growth in `shared_context.jsonl`.
- Safe dedupe requires checking only against the latest lifecycle transition for the same task; this avoids collapsing legitimate re-entry transitions.
- A bounded dedupe window plus semantic payload hash keeps replay suppression deterministic while preserving meaningful updates.

### Handoff summary continuity

- Compact `handoffSummary` fields inside task/correlation snapshots substantially improve continuity and remove the need to read raw events for normal handoffs.
- Bounded summary lengths (task/correlation caps) make handoff quality predictable and prepare the path for per-view hard token budgets in TCO-11/TCO-11A.

### Per-view token hard limits

- Hard token budgets are most useful when every truncated response includes explicit continuation metadata (`truncated`, `nextCursor`, `nextExpansionHint`).
- Enforcing critical-first ordering before truncation protects high-risk signals (`blocked`, `failed`) even under aggressive budget pressure.

### Budget table governance

- Keep a versioned policy table (`policyVersion`) for view and handoff budgets so runtime behavior and docs stay in lockstep.
- Validate compliance with both tests and analyzer scripts; hard-limit adherence should be auditable (`tokenBudget.withinHardLimit`) rather than inferred.

### Compact cache and fingerprint layer

- Query cache effectiveness is highest when cache keys include selectors + safety flags + budget table values; this avoids stale shape reuse after tuning.
- Watermark-driven invalidation (`jsonl:<count>`) is a reliable safety boundary for compact snapshot cache coherence.
- Periodic sidecar disk validation (instead of per-read validation) preserves corruption safeguards while recovering measurable latency savings.

### Tester-driven fix memory (TCO-13)

- **Symptom:** `monitor-sidecars.test.mjs` failed because corrupted `integrityHash` stayed on disk after a read.
- **Root cause:** optimization shortcut skipped validation when context fingerprint was unchanged and within validation interval, ignoring direct sidecar-file tampering.
- **Guardrail:** compare sidecar file fingerprint (`SIDECAR_DIR` + `latest_by_task`) before taking fast cache path; if changed, force validation/rebuild.
- **Prevention rule:** never optimize read fast-paths without an explicit tamper/invalidation signal check for persisted artifacts used by the fast-path.

### Orchestrator dependency discipline

- Never self-start the next TCO task: execution must only begin after a matching `TASK_ASSIGNED` from Orchestrator.

### Tester-driven fix memory (TCO-13A)

- **Symptom:** with `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`, compact snapshots still emitted `tokenBudget` and marked responses as truncated.
- **Root cause:** budget enable flag was declared in runtime but not propagated/enforced end-to-end in compact view budget wiring.
- **Guardrail:** every feature flag must be asserted at config source and at the final enforcement function (not only at declaration layer).
- **Prevention rule:** for kill switches, add explicit negative-path tests that validate both metadata absence and behavior absence (no enforcement side effects).
