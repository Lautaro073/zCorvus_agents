# TCO-07A - Degraded Mode Decision Matrix

## Metadata
- taskId: `aiw-opt-tco-07a-degraded-mode-decision-matrix-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Objective
Define and apply explicit degraded-mode policy for compact snapshots so consumers can avoid unsafe decisions when `stale`, `degradedMode`, or both are present.

## Delivered changes

### 1) Runtime decision matrix implementation
- Updated `AI_Workspace/MCP_Server/lib/context-read-modes.js`.
- Added explicit policy resolution for states:
  - `normal`
  - `stale`
  - `degraded`
  - `stale+degraded`
- Added `safetyPolicy` metadata in snapshot envelope:
  - `operationalState`
  - `allowReadOnly`, `allowTriage`, `allowWriteback`
  - `forceRebuild`, `forceJsonlExpansion`
  - `criticalStale`, `sensitiveAction`
- `decisionSafety` now follows matrix behavior:
  - `normal` -> `safe_for_triage`
  - `stale` -> `read_only`
  - `degraded` -> `read_only`
  - `stale+degraded` -> `requires_expansion`

### 2) Sensitive-action policy support
- Added `sensitiveAction` input support for all relevance-first reads:
  - HTTP API endpoints (`monitor-server.js`)
  - MCP stdio tools (`mcp-stdio.js`)
- For stale snapshots with `sensitiveAction=true`, policy escalates to forced rebuild/expansion behavior.

### 3) Critical event preservation in fallback/truncation
- Updated inbox selection to prioritize critical statuses (`blocked`, `failed`) before truncation.
- Ensures fallback paths do not silently hide critical tasks in compact responses.

### 4) Contract documentation
- Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` with:
  - explicit degraded decision matrix,
  - `safetyPolicy` runtime shape and semantics.

## Validation

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/lib/context-read-modes.js
node --check MCP_Server/monitor-server.js
node --check MCP_Server/mcp-stdio.js
node --test scripts/context-read-modes.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results:
- `context-read-modes.test.mjs`: pass (normal/stale/degraded/stale+degraded matrix + critical truncation behavior)
- `relevance-read-modes.test.mjs`: pass (fallback audit + degraded metadata)
- `mcp-smoke.test.mjs`: pass (no MCP regression)

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/context-read-modes.test.mjs`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-07a-degraded-mode-decision-matrix-20260402.md`
