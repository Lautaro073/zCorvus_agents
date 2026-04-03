# Token Context Cold Start and Sidecar Bootstrap Runbook

## Metadata
- taskId: `aiw-documenter-tco-06b-coldstart-sidecar-bootstrap-runbook-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Documenter`
- collaborators: `AI_Workspace_Optimizer`, `Observer`
- updatedAt: `2026-04-03`

## Scope
Operational runbook for TCO-06B covering:

1. clean startup from zero sidecars,
2. massive sidecar rebuild bootstrap,
3. integrity checks (`integrityHash`, `sourceWatermark`),
4. transition criteria from `degradedMode` to `normal`.

This runbook is aligned with:
- `docs/internal/specs/token-context-schema-evolution-policy-v1.md`
- `docs/internal/specs/token-context-observability-slo-v1.md`
- `docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
- `MCP_Server/lib/context-sidecars.js`
- `MCP_Server/monitor-server.js`

## Preconditions
1. `MCP_Server/shared_context.jsonl` exists and is readable.
2. `MCP_CONTEXT_SIDECARS_ENABLED=true`.
3. `MCP_CONTEXT_RELEVANCE_READS_ENABLED=true`.
4. Monitor server starts from `MCP_Server/monitor-server.js`.

## Sidecar files and invariants
Expected sidecar directory: `MCP_Server/sidecars/`

Required files:
- `latest_by_task.json`
- `latest_by_correlation.json`
- `open_by_agent.json`

Core invariants:
1. each sidecar validates shape and required fields,
2. all three sidecars share the same `sourceWatermark`,
3. `contentFingerprint` and `integrityHash` pass validation,
4. compact reads can run in `snapshot_first` mode without degraded fallback.

## Procedure A - Clean startup bootstrap

### A1. Stop monitor runtime
Stop any running `monitor-server.js` process.

### A2. Remove stale sidecars
From workspace root:

```bash
node --input-type=module -e "import fs from 'node:fs/promises'; import path from 'node:path'; const dir = path.join(process.cwd(),'MCP_Server','sidecars'); await fs.rm(dir, { recursive: true, force: true }); console.log('removed', dir);"
```

### A3. Start monitor server

```bash
node MCP_Server/monitor-server.js
```

Startup behavior expected by code path:
- monitor boot calls sidecar refresh with `forceRebuild=true`,
- sidecars are regenerated atomically (`tmp + rename`),
- service becomes available at `http://127.0.0.1:4311/monitor`.

### A4. Verify health and compact endpoints

```bash
curl http://127.0.0.1:4311/api/health
curl "http://127.0.0.1:4311/api/context/get_agent_inbox?assignedTo=Documenter&limit=5"
curl "http://127.0.0.1:4311/api/context/get_task_snapshot?taskId=aiw-documenter-tco-06b-coldstart-sidecar-bootstrap-runbook-20260403-01"
curl "http://127.0.0.1:4311/api/context/get_correlation_snapshot?correlationId=aiw-token-context-optimization-20260331"
```

Minimum expected signals:
1. `/api/health.contextFlags.sidecarsEnabled=true`
2. `/api/health.contextFlags.relevanceReadsEnabled=true`
3. compact responses expose `sourceWatermark`, `rebuiltAt`, `decisionSafety`.

## Procedure B - Massive rebuild validation

Use this procedure when sidecars are missing/corrupted, or after large context replay imports.

### B1. Trigger deterministic rebuild
Rebuild trigger is startup/restart driven in current runtime implementation:

1. restart `monitor-server.js`, or
2. remove sidecars and restart (Procedure A2 + A3).

### B2. Validate sidecar set and hashes

```bash
node --input-type=module -e "import path from 'node:path'; import { readValidatedSidecars } from './MCP_Server/lib/context-sidecars.js'; const sidecarDir = path.join(process.cwd(),'MCP_Server','sidecars'); const result = await readValidatedSidecars(sidecarDir); if (!result.ok) { console.error(result.error); process.exit(1); } const payloads = result.payloads; console.log(JSON.stringify({ ok: true, sourceWatermark: payloads.latestByTask.sourceWatermark, integrityHash: payloads.latestByTask.integrityHash, contentFingerprint: payloads.latestByTask.contentFingerprint }, null, 2));"
```

Expected:
1. `ok: true`
2. one shared `sourceWatermark` across sidecars,
3. valid `integrityHash` and `contentFingerprint`.

### B3. Verify observability SLO endpoint

```bash
curl http://127.0.0.1:4311/api/context/observability
```

Watch at least:
- `sli.staleRate`
- `sli.rebuildSuccessRate`
- `sli.watermarkLagEventsP95`
- `alerts[]`

## Degraded to normal transition criteria

Treat transition as complete only when all are true:

1. compact reads report `readAudit.readMode=snapshot_first` (no broad fallback),
2. envelope fields show `stale=false` and `degradedMode=false`,
3. `decisionSafety=safe_for_triage` for normal non-sensitive reads,
4. sidecar source is stable (`sourceWatermark` monotonic, `integrityHash` valid),
5. `/api/context/observability.alerts` has no active critical alert,
6. `rebuildSuccessRate` and `watermarkLag` are within SLO thresholds.

## Failure handling matrix

1. `sidecar validation failed` on disk:
   - rebuild via restart,
   - if rebuild fails and valid disk sidecar exists, runtime stays degraded with disk fallback,
   - if no valid sidecar exists, runtime falls back to event-scan mode.
2. `watermark mismatch across sidecars`:
   - treat as invalid set,
   - rebuild full set before resuming compact-only operations.
3. persistent stale/degraded compact views:
   - route sensitive actions through explicit expansion,
   - escalate to `AI_Workspace_Optimizer` and `Observer` with observability payload attached.

## Reproducible validation commands
Executed as reference for this runbook (see companion report):

```bash
node --test scripts/context-sidecars.test.mjs scripts/monitor-sidecars.test.mjs scripts/relevance-read-modes.test.mjs
node --test scripts/context-observability.test.mjs
node --input-type=module -e "import path from 'node:path'; import { readValidatedSidecars } from './MCP_Server/lib/context-sidecars.js'; const sidecarDir = path.join(process.cwd(), 'MCP_Server', 'sidecars'); const result = await readValidatedSidecars(sidecarDir); if (!result.ok) process.exit(1); console.log(result.payloads.latestByTask.sourceWatermark);"
```

## Related artifacts
- `docs/internal/reports/aiw-optimizer-tco-06a-atomic-sidecars-idempotent-rebuilds-20260402.md`
- `docs/internal/reports/aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403.md`
- `docs/internal/reports/aiw-tester-tco-13a-negative-matrix-recheck-20260403.md`
- `docs/internal/reports/aiw-documenter-tco-06b-coldstart-sidecar-bootstrap-validation-20260403.md`
