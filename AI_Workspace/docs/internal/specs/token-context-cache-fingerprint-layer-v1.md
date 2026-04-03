# Token Context Cache + Fingerprint Layer v1

## Metadata
- docId: `token-context-cache-fingerprint-layer-v1`
- featureSlug: `token-context-optimization`
- schemaVersion: `ctx-cache.v1`
- status: `approved`
- owner: `AI_Workspace_Optimizer`
- updatedAt: `2026-04-03`

## Purpose
Define cache/fingerprint behavior for compact relevance-first snapshots.

## Scope
- `get_agent_inbox`
- `get_task_snapshot`
- `get_correlation_snapshot`

## Cache key model

Cache key is a deterministic hash of:
1. view name,
2. selector inputs (`assignedTo`, `taskId`, `correlationId`, `limit`),
3. safety/fallback flags (`allowBroadFallback`, `sensitiveAction`),
4. current budget table (`policyVersion`, view/handoff values),
5. runtime mode toggles relevant to snapshot shaping.

## Invalidation model

Primary invalidation source:
- `sourceWatermark` change (`jsonl:<count>`) invalidates cached compact payloads.

Additional invalidation controls:
- explicit clear (manual or process restart),
- bounded cache size (`maxEntries`) with oldest-entry eviction,
- sidecar validation cadence via `MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS`.

## Fingerprint model

Each compact response includes:
- `snapshotFingerprint` (`sha256`) for payload reuse tracking.

Read audit fields:
- `cacheEnabled`
- `cacheHit`
- `cacheKey`
- `cacheKeyFingerprint`
- `cacheWatermark`
- `cacheInvalidated`

## Runtime flags

- `MCP_CONTEXT_COMPACT_CACHE_ENABLED` (default `true`)
- `MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES` (default `256`)
- `MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS` (default `2000`)

## Health observability

`/api/health` should expose:
- compact cache enablement,
- cache size/max entries,
- hit/miss/invalidation counters,
- last invalidation reason/time.

## Performance objective

Target measurable runtime savings on repeated compact reads:
- `10-30%` average reduction in repeated-query latency.

## Safety constraints

1. Cache never overrides canonical history (`shared_context.jsonl`).
2. Watermark-based invalidation is mandatory.
3. Degraded/stale decision policy remains authoritative (`decisionSafety`, `safetyPolicy`).
