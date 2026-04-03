# TCO-07 - Relevance-First MCP Read Modes

## Metadata
- taskId: `aiw-opt-tco-07-relevance-first-mcp-read-modes-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Objective
Implement relevance-first compact read modes for:

1. `get_agent_inbox`
2. `get_task_snapshot`
3. `get_correlation_snapshot`

with controlled and auditable fallback to broad historical scans only when needed.

## Delivered changes

### 1) Compact read mode builders
- Added `AI_Workspace/MCP_Server/lib/context-read-modes.js`.
- Implemented v1 snapshot builders:
  - `buildAgentInboxSnapshot(...)`
  - `buildTaskSnapshot(...)`
  - `buildCorrelationSnapshot(...)`
- Snapshot envelope includes:
  - `view`, `schemaVersion`, `buildVersion`, `maxAgeMs`
  - `sourceEventId`, `sourceWatermark`, `rebuiltAt`
  - `stale`, `degradedMode`, `decisionSafety`, `truncated`
  - `nextExpansionHint`, `integrityHash`

### 2) API endpoints for relevance-first reads
- Updated `AI_Workspace/MCP_Server/monitor-server.js` with endpoints:
  - `/api/context/get_agent_inbox`
  - `/api/context/get_task_snapshot`
  - `/api/context/get_correlation_snapshot`
- Added strict query validation and explicit error response (`400`) for missing selectors.
- Endpoints use sidecar snapshot-first path and fallback to broad scan only when necessary.

### 3) MCP stdio tool modes
- Updated `AI_Workspace/MCP_Server/mcp-stdio.js`:
  - Added tools: `get_agent_inbox`, `get_task_snapshot`, `get_correlation_snapshot`.
  - Added sidecar-backed read context on stdio path.
  - Tool output includes fallback audit (`readMode`, `broadFallbackUsed`).

### 4) Fallback auditing and transparency
- Added `readAudit` metadata to snapshots with:
  - `readMode`: `snapshot_first` or `broad_scan_fallback`
  - `broadFallbackUsed`: boolean
  - `fallbackReason`
  - source sidecar view metadata.
- `/api/health` now advertises read-mode endpoint paths.

## Validation

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/lib/context-read-modes.js
node --check MCP_Server/monitor-server.js
node --check MCP_Server/mcp-stdio.js
node --test scripts/context-sidecars.test.mjs
node --test scripts/monitor-sidecars.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results: all pass.

## Broad-read reduction and latency/token impact

Measured with:

```bash
node scripts/analyze-relevance-read-modes-impact.mjs
```

Sample selector set:
- `assignedTo`: `AI_Workspace_Optimizer`
- `taskId`: `aiw-tester-v2-test-01-20260330-01`
- `correlationId`: `aiw-agentmonitor-v2-20260330`

Before/after (broad `includeTaskEvents=true` vs relevance-first):

1. **Agent inbox**
   - bytes: `303410` -> `8395` (`-97.23%`)
   - duration: `23.45ms` -> `16.20ms` (`-30.92%`)
2. **Task snapshot**
   - bytes: `34880` -> `1504` (`-95.69%`)
   - duration: `15.78ms` -> `16.62ms` (`+5.32%` transient overhead, still within acceptable range)
3. **Correlation snapshot**
   - bytes: `443209` -> `7049` (`-98.41%`)
   - duration: `19.38ms` -> `15.28ms` (`-21.16%`)

Intake broad reads:
- before: `3`
- after: `0`
- reduction: `100%`

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`
- `AI_Workspace/scripts/analyze-relevance-read-modes-impact.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-07-relevance-first-mcp-read-modes-20260402.md`
