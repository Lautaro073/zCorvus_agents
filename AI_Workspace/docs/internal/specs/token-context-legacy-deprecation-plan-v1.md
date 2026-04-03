# Token Context Legacy Deprecation Plan v1

## Metadata
- docId: `token-context-legacy-deprecation-plan-v1`
- featureSlug: `token-context-optimization`
- schemaVersion: `ctx-legacy-retirement.v1`
- owner: `AI_Workspace_Optimizer`
- relatedTaskId: `aiw-opt-tco-12a-legacy-deprecation-plan-20260403-01`
- updatedAt: `2026-04-03`

## Objective
Define the formal exit strategy for temporary legacy compatibility (`MCP_CONTEXT_LEGACY_PAYLOAD_MODE`) and routine broad recency reads once compact snapshots and canary safety controls are stable.

## Scope
1. Retirement readiness gate (formal criteria).
2. Staging cutover procedure.
3. Rollback path and stop conditions.
4. Final retirement condition for legacy mode.

## Formal retirement gate (must all pass)

### Runtime safety
1. `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false` in staging.
2. Wave canary freeze is inactive (`freeze.active=false`).
3. Wave-3 policy status is not rollback (`rolloutAction != rollback`).

### Stable-window quality targets
Stable window for TCO-12A is defined as the canary lookback window (default `60h`, tunable by `MCP_CONTEXT_CANARY_LOOKBACK_HOURS`).

During the full stable window:
1. `legacyModeHitRate = 0`.
2. `broadFallbackRate <= 0.10`.
3. No active critical observability alerts.
4. No wave-level rollback reasons.

## Retirement condition (final)
Legacy compatibility is considered retired when the formal gate passes for one full stable window and Orchestrator publishes approval to keep legacy mode disabled.

### Operational deadline rule
If the gate passes, execute permanent retirement actions within one operational day:
1. keep `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false`.
2. keep compact snapshot path as default.
3. keep expanded `/api/events?includeTaskEvents=true` as debug-only path.

## Staging cutover procedure
1. Confirm runtime status from:
   - `GET /api/health`
   - `GET /api/context/observability`
   - `GET /api/context/wave_canary`
2. Validate gate criteria with:
   - `node AI_Workspace/scripts/check-legacy-deprecation-readiness.mjs`
3. If ready, lock staging with:
   - `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false`
4. Observe for one stable window; monitor `legacyModeHitRate` and `broadFallbackRate`.
5. If any rollback trigger appears, execute rollback sequence.

## Rollback triggers
Immediate rollback to temporary legacy compatibility is allowed only if any is true:
1. `legacyModeHitRate > 0` sustained within stable window.
2. wave canary freeze activates.
3. any critical observability alert remains active.
4. sidecar integrity incident blocks compact reads.

## Rollback sequence
1. Set `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true` (temporary emergency fallback).
2. Record incident and reason in MCP events.
3. Keep compact snapshot diagnostics active for recovery.
4. Re-attempt retirement only after a fresh full stable window passes.

## References
- `docs/internal/specs/token-context-contract-v1.md`
- `docs/internal/specs/token-context-observability-slo-v1.md`
- `docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
