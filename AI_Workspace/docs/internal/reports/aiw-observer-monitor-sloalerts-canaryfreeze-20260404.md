# Monitor sloAlerts + canaryFreeze Triage

## Metadata
- taskId: `aiw-observer-monitor-sloalerts-canaryfreeze-20260404-01`
- correlationId: `aiw-monitor-alerts-20260404`
- owner: `Observer`
- date: `2026-04-04`
- status: `completed`

## Reported issue
User reported monitor state with `sloAlerts=2` and `canaryFreeze=on`.

## Evidence captured

### Initial state (live monitor)
Commands:

```bash
curl http://127.0.0.1:4311/api/context/observability
curl http://127.0.0.1:4311/api/context/wave_canary
curl http://127.0.0.1:4311/api/health
```

Observed:
1. `legacy_mode_hit_rate` alert active (`critical`, value `1`, threshold `0.05`).
2. `canaryFreeze.active=true` with reason `critical_observability_alert_active`.
3. No stale/degraded sidecar signal (`staleRate=0`, `degradedRate=0`, `rebuildSuccessRate=1`).

## Root cause
Primary cause was a **false-positive observability signal**:

1. `legacyModeHitRate` SLI counted `includeTaskEvents=true` reads as legacy hits.
2. Scoped debug expansions (task-level deep debug) were included in the same metric.
3. This could trigger a critical alert even when legacy mode was not enabled and core compact path remained healthy.

## Mitigation applied

### A) Permanent mitigation (code)
Updated `MCP_Server/monitor-server.js`:
1. `/api/events` telemetry now records scope selectors (`taskId`, `correlationId`, `assignedTo`, `parentTaskId`, `agentFilter`).
2. `legacyModeHitRate` now only counts:
   - `legacyMode=true`, or
   - `includeTaskEvents=true` with **unscoped** broad expansion (`scopedExpansion=false`).
3. Scoped debug expansions no longer pollute legacy hit metric.

### B) Regression protection
Updated `scripts/context-observability.test.mjs` with new test:
- `scoped includeTaskEvents read does not count as legacy hit`.

### C) Safe operational cleanup
To clear stale sample-window signal in running monitor process:

```bash
node -e "(async()=>{for(let i=0;i<260;i++){await fetch('http://127.0.0.1:4311/api/events?limit=1');}const o=await (await fetch('http://127.0.0.1:4311/api/context/observability')).json();const c=await (await fetch('http://127.0.0.1:4311/api/context/wave_canary')).json();console.log(JSON.stringify({legacyModeHitRate:o.sli.legacyModeHitRate,alerts:o.alerts,freeze:c.freeze},null,2));})();"
```

Result after cleanup:
1. `legacyModeHitRate=0`
2. `alerts=[]`
3. `canaryFreeze.active=false`

## Validation

```bash
node --check MCP_Server/monitor-server.js
node --test scripts/context-observability.test.mjs
```

Result: pass (`5/5` tests).

## Severity / impact classification
1. Severity: `high` (false critical alert can block rollout waves via auto-freeze).
2. User impact: medium/high operational friction (monitor reports freeze despite healthy compact path).
3. Product/runtime impact: no data corruption, no sidecar degradation.

## Artifacts
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/context-observability.test.mjs`
- `AI_Workspace/docs/internal/reports/aiw-observer-monitor-sloalerts-canaryfreeze-20260404.md`
