# TCO-12B - Snapshot SLOs, Drift Detection & Alerting

## Metadata
- taskId: `aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Observer`
- status: `completed`
- date: `2026-04-03`

## Objective
Implement operational SLO/SLI visibility and alerting for compact snapshot reliability, drift detection, and legacy-read detection.

## Delivered changes

### 1) Runtime SLO instrumentation and drift detection
- Updated `AI_Workspace/MCP_Server/monitor-server.js`:
  - Added bounded in-memory SLI sample tracking for:
    - compact snapshot reads (`stale`, `degradedMode`, `truncated`, `broadFallback`)
    - sidecar cycles (`rebuildSuccess`, watermark lag)
    - `/api/events` legacy usage hits.
  - Added SLO evaluator producing alerts for:
    - `snapshot_stale_rate`
    - `snapshot_rebuild_success_rate`
    - `watermark_lag_events`
    - `legacy_mode_hit_rate`
  - Added runtime alert transition logging for active alerts.

### 2) Operational API exposure
- Added `GET /api/context/observability` endpoint with:
  - `sli`, `thresholds`, `alerts`, `runbooks`, sample metadata.
- Extended `GET /api/health` with `contextObservability` and new route path.

### 3) Consumer/UI adaptation (monitor-v2)
- Updated `AI_Workspace/agentmonitor-v2/src/hooks/useMcpEvents.ts`:
  - fetches `/api/context/observability` alongside compact snapshots.
- Updated `AI_Workspace/agentmonitor-v2/src/App.tsx`:
  - context panel now shows operational alert count and severity state.
- Updated `AI_Workspace/agentmonitor-v2/src/types/mcp.ts`:
  - added typed contracts for observability report and alerts.

### 4) Documentation and runbooks
- Added SLO spec:
  - `AI_Workspace/docs/internal/specs/token-context-observability-slo-v1.md`
- Added alert response runbook:
  - `AI_Workspace/docs/internal/guides/token-context-observability-runbook-20260403.md`
- Updated architecture spec to include observability endpoint and UI signal:
  - `AI_Workspace/docs/internal/specs/agentmonitor-v2-architecture.md`

### 5) Verification tests
- Added runtime endpoint tests:
  - `AI_Workspace/scripts/context-observability.test.mjs`

## Validation

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/monitor-server.js
node --test scripts/context-observability.test.mjs
npm --prefix agentmonitor-v2 run build
```

Result: pass.

## Acceptance criteria mapping
1. **SLOs/SLIs definidos y documentados con umbrales warning/critical**
   - fulfilled via `token-context-observability-slo-v1.md` and runtime thresholds.
2. **Drift detection implementada para stale/watermark/legacy hit rate**
   - fulfilled via monitor runtime SLI evaluator and alert logic.
3. **Alertas operativas activas y verificadas**
   - fulfilled via `/api/context/observability` endpoint + tests.
4. **Runbooks de respuesta por alerta publicados con evidencia**
   - fulfilled via `token-context-observability-runbook-20260403.md`.

## Artifacts
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/agentmonitor-v2/src/hooks/useMcpEvents.ts`
- `AI_Workspace/agentmonitor-v2/src/App.tsx`
- `AI_Workspace/agentmonitor-v2/src/types/mcp.ts`
- `AI_Workspace/scripts/context-observability.test.mjs`
- `AI_Workspace/docs/internal/specs/token-context-observability-slo-v1.md`
- `AI_Workspace/docs/internal/guides/token-context-observability-runbook-20260403.md`
- `AI_Workspace/docs/internal/reports/aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403.md`
