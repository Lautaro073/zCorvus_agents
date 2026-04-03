# Token Context Observability SLO v1

## Metadata
- docId: `token-context-observability-slo-v1`
- featureSlug: `token-context-optimization`
- schemaVersion: `ctx-observability.v1`
- owner: `Observer`
- updatedAt: `2026-04-03`
- relatedTaskId: `aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403-01`

## Objective
Define the SLI/SLO and runtime alert thresholds for compact context infrastructure and relevance-first consumers.

## Signals

### Snapshot quality
1. `staleRate`
   - definition: stale compact snapshots / total compact snapshot reads.
   - warning: `> 0.01`
   - critical: `> 0.02`

2. `degradedRate`
   - definition: degraded compact snapshots / total compact snapshot reads.
   - informational SLI for trend visibility.

3. `truncatedRate`
   - definition: truncated compact snapshots / total compact snapshot reads.
   - informational SLI to tune per-view budgets.

4. `broadFallbackRate`
   - definition: broad fallback reads / total compact snapshot reads.
   - operational target: keep close to zero in steady state.

### Sidecar reliability
1. `rebuildSuccessRate`
   - definition: successful sidecar rebuild attempts / total rebuild attempts.
   - warning: `< 0.995`
   - critical: `< 0.99`

2. `watermarkLagEventsP95`
   - definition: p95 lag between current context event count and sidecar watermark count.
   - warning: `>= 5 events`
   - critical: `>= 20 events`

3. `watermarkLagEventsCurrent`
   - definition: current lag between live events and sidecar watermark.
   - used in runbook triage for immediate drift checks.

### Legacy usage
1. `legacyModeHitRate`
   - definition: legacy-mode reads (`includeTaskEvents=true` or legacy payload mode) / `/api/events` reads.
   - warning: `> 0`
   - critical: `> 0.05` (or immediate critical when `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true`)

## Runtime endpoint contract

`GET /api/context/observability`

Returns:
- `policyVersion`
- `sampleSizes`
- `sli`
- `thresholds`
- `alerts[]`
- `runbooks`

## Alert taxonomy

| alert id | meaning | severity levels |
|---|---|---|
| `snapshot_stale_rate` | stale snapshots exceed threshold | warning, critical |
| `snapshot_rebuild_success_rate` | sidecar rebuild reliability degraded | warning, critical |
| `watermark_lag_events` | sidecar watermark drift exceeds threshold | warning, critical |
| `legacy_mode_hit_rate` | legacy reads detected in compact-first model | warning, critical |

## Operational notes
1. Alerts are calculated continuously from bounded in-memory samples.
2. Snapshot and sidecar signals are exposed in both:
   - `GET /api/context/observability`
   - `GET /api/health` under `contextObservability`
3. Active alert transitions are logged by monitor runtime for auditability.

## Runbook reference
- `AI_Workspace/docs/internal/guides/token-context-observability-runbook-20260403.md`
- `AI_Workspace/docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
