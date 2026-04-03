# Token Context Observability Runbook

## Metadata
- owner: `Observer`
- relatedTaskId: `aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- updatedAt: `2026-04-03`

## Scope
Operational response guide for context SLO alerts emitted by monitor runtime:
- `snapshot_stale_rate`
- `snapshot_rebuild_success_rate`
- `watermark_lag_events`
- `legacy_mode_hit_rate`

## Primary telemetry endpoints
1. `GET /api/context/observability`
2. `GET /api/health` (`contextObservability` + context flags)
3. `GET /api/events` (debug expansion only when needed)
4. `GET /api/context/wave_canary` (wave freeze and rollback posture)

## Response workflow
1. Confirm severity and affected SLI in `/api/context/observability`.
2. Check `contextFlags` in `/api/health` for misconfigured toggles.
3. If alert is critical, pause rollout actions that depend on compact snapshots.
4. Apply targeted remediation below.
5. Recheck observability endpoint until alert clears.

## Alert playbooks

### 1) `snapshot_stale_rate`

Symptoms:
- `sli.staleRate` exceeds warning/critical threshold.

Checks:
1. Verify sidecar freshness in `/api/health`:
   - `contextSidecars.cachedRebuiltAt`
   - `contextSidecars.lastValidatedAt`
2. Inspect compact reads for fallback mode (`readMode`, `broadFallbackUsed`).

Actions:
1. Force sidecar rebuild by restarting monitor server process.
2. Validate `MCP_CONTEXT_SIDECARS_ENABLED=true` and `MCP_CONTEXT_RELEVANCE_READS_ENABLED=true`.
3. If stale persists, temporarily route sensitive operations through explicit debug expansion.

Exit criteria:
- `staleRate` returns below warning threshold.

### 2) `snapshot_rebuild_success_rate`

Symptoms:
- rebuild success drops below target.

Checks:
1. Review monitor logs for `Failed to rebuild context sidecars`.
2. Validate sidecar files in `MCP_Server/sidecars/` are writable.
3. Confirm source context file integrity (`MCP_Server/shared_context.jsonl`).

Actions:
1. Repair file permission/path issues.
2. Regenerate sidecars by restarting monitor server.
3. If sidecars remain invalid, switch to degraded fallback and escalate to Optimizer.

Exit criteria:
- rebuild success trend returns above warning threshold.

### 3) `watermark_lag_events`

Symptoms:
- `watermarkLagEventsP95` exceeds threshold.

Checks:
1. Compare `sli.watermarkLagEventsCurrent` vs threshold.
2. Confirm watcher is active and processing updates.
3. Validate sidecar watermark monotonicity.

Actions:
1. Trigger sidecar refresh (restart monitor server process).
2. Reduce heavy debug traffic (`includeTaskEvents=true`) during recovery.
3. If lag remains high, escalate as drift incident.

Exit criteria:
- p95 and current lag return below warning threshold.

### 4) `legacy_mode_hit_rate`

Symptoms:
- non-zero legacy read usage in compact-first mode.

Checks:
1. Inspect `contextLegacyPayloadMode` in `/api/health`.
2. Check consumers issuing expanded `/api/events` reads.

Actions:
1. Disable legacy mode (`MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false`) when safe.
2. Move consumers back to compact snapshots (`get_agent_inbox`, `get_task_snapshot`, `get_correlation_snapshot`).
3. Keep expanded `/api/events` strictly as debug-only path.

Exit criteria:
- `legacyModeHitRate` returns to zero for stable observation window.

## Escalation
Escalate to:
1. `AI_Workspace_Optimizer` for runtime/rebuild failures.
2. `Orchestrator` when critical alert blocks rollout gates.

## Canary linkage
Wave rollout/abort policy is defined in:
- `AI_Workspace/docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`

## Verification checklist
After remediation verify:
1. `/api/context/observability` alerts list is empty or downgraded.
2. `/api/health` shows expected context flags.
3. Compact snapshot reads remain default path.
