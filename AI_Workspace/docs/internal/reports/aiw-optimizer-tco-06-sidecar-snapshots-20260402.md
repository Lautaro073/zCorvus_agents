# TCO-06 - Sidecar Snapshots

## Metadata
- taskId: `aiw-opt-tco-06-sidecar-snapshots-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Scope
Implement sidecar snapshots for context hot reads:

1. `latest_by_task`
2. `latest_by_correlation`
3. `open_by_agent`

with provenance (`sourceWatermark`, `sourceEventId`, `rebuiltAt`, `integrityHash`) and snapshot-first usage in common monitor reads.

## Implementation

### 1) Sidecar builder and writer
- Added `AI_Workspace/MCP_Server/lib/context-sidecars.js`.
- New builder `buildSidecarPayloads(events, options)` creates:
  - `latest_by_task`
  - `latest_by_correlation`
  - `open_by_agent`
- Envelope includes:
  - `schemaVersion: ctx-sidecar.v1`
  - `buildVersion: context-sidecar@1.0.0`
  - `sourceWatermark: jsonl:<eventCount>`
  - `sourceEventId`, `rebuiltAt`, `maxAgeMs`, `decisionSafety`, `truncated`
  - `integrityHash` (`sha256`) per sidecar payload.
- Sidecars are persisted with atomic writes (`tmp + rename`) via `writeSidecarsAtomically`.

### 2) Monitor runtime integration
- Updated `AI_Workspace/MCP_Server/monitor-server.js`.
- Added sidecar cache + context fingerprint (`size`, `mtimeMs`) to avoid rebuilding on every read.
- Added `ensureSidecarsUpToDate()`:
  - rebuilds on context change,
  - caches parsed events + sidecars,
  - fails safe (event-scan fallback if sidecar rebuild errors).
- `/api/events` now uses snapshot-first task grouping when:
  - `MCP_CONTEXT_SIDECARS_ENABLED=true`
  - `MCP_CONTEXT_RELEVANCE_READS_ENABLED=true`
  - `includeTaskEvents=false`
- Response now exposes:
  - `contract.relevanceReadMode` (`sidecar_snapshot_first` or `event_scan`)
  - `sidecar` block (`enabled`, `used`, `cacheHit`, `provenance`).
- `/api/health` now exposes sidecar runtime metadata:
  - sidecar directory,
  - file names,
  - cached watermark + rebuild timestamp.

### 3) Invalidation rules (documented behavior)
1. Rebuild at server startup when sidecars are enabled.
2. Rebuild on context file change (`watch` -> `context_file_changed`).
3. Rebuild when context fingerprint differs (`size` or `mtimeMs`).
4. Reuse cached sidecars only when fingerprint is unchanged.
5. On rebuild failure, sidecar mode is disabled for that read and fallback is `event_scan`.

## Verification

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/monitor-server.js
node --check MCP_Server/lib/context-sidecars.js
node --test scripts/monitor-sidecars.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results:
- `monitor-sidecars.test.mjs`: pass
- `mcp-smoke.test.mjs`: pass

Additional verification (2026-04-03 reconciliation):

```bash
node --test AI_Workspace/scripts/monitor-sidecars.test.mjs AI_Workspace/scripts/mcp-smoke.test.mjs AI_Workspace/scripts/context-sidecars.test.mjs
node AI_Workspace/scripts/analyze-relevance-read-modes-impact.mjs
```

Results:
- Sidecar/monitor regression suite: `9/9` pass.
- Relevance read impact sample:
  - `agent_inbox` bytes: `314310 -> 7579` (`-97.59%`)
  - `task_snapshot` bytes: `9146 -> 2816` (`-69.21%`)
  - `correlation_snapshot` bytes: `443209 -> 12591` (`-97.16%`)
  - intake broad reads: `3 -> 0` (`-100%`)

## Acceptance criteria mapping

1. Sidecars `latest_by_task/latest_by_correlation/open_by_agent` disponibles y poblados -> **PASS**
2. Lectura summary-first funcional sin broad scans por defecto -> **PASS**
3. Reglas de invalidación/refresh documentadas y verificadas -> **PASS**
4. Impacto de latencia/tokens reportado con metodología reproducible -> **PASS**

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/monitor-sidecars.test.mjs`
- `AI_Workspace/scripts/context-sidecars.test.mjs`
- `AI_Workspace/scripts/analyze-relevance-read-modes-impact.mjs`
- `AI_Workspace/MCP_Server/sidecars/latest_by_task.json` (runtime generated)
- `AI_Workspace/MCP_Server/sidecars/latest_by_correlation.json` (runtime generated)
- `AI_Workspace/MCP_Server/sidecars/open_by_agent.json` (runtime generated)
