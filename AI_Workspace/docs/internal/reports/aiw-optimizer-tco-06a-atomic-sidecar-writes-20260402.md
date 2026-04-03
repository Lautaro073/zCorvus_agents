# TCO-06A - Atomic Sidecar Writes and Idempotent Rebuilds

## Metadata
- taskId: `aiw-opt-tco-06a-atomic-sidecar-writes-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Objective
Harden sidecar runtime behavior after TCO-06 with:

1. atomic writes,
2. idempotent rebuild fingerprinting,
3. corruption/partial-write detection,
4. safe consumer fallback behavior.

## Delivered changes

### 1) Integrity and idempotence contract
- Updated `AI_Workspace/MCP_Server/lib/context-sidecars.js`:
  - added `contentFingerprint` per sidecar (stable hash that excludes volatile rebuild timestamps),
  - kept `integrityHash` for full payload integrity validation,
  - added validator `validateSidecarPayload(...)` for shape + hash checks,
  - added reader `readValidatedSidecars(...)` with cross-file watermark consistency check.

### 2) Corruption-aware runtime behavior
- Updated `AI_Workspace/MCP_Server/monitor-server.js`:
  - cache path now validates on-disk sidecars before reusing cached snapshot,
  - if validation fails, server rebuilds sidecars from JSONL,
  - if rebuild fails but disk sidecars are valid, server enters degraded fallback with disk sidecars,
  - if rebuild fails and disk sidecars are invalid, server falls back to `event_scan` safely.

### 3) Fallback telemetry in API
- `/api/events` now returns sidecar runtime context:
  - `sidecar.source` (`cache`, `rebuilt`, `disk_fallback`, `event_scan_fallback`),
  - `sidecar.degradedMode`,
  - `sidecar.fallbackReason`.

## Validation

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/lib/context-sidecars.js
node --check MCP_Server/monitor-server.js
node --test scripts/context-sidecars.test.mjs
node --test scripts/monitor-sidecars.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results:
- `context-sidecars.test.mjs`: pass (idempotent content fingerprint + tamper detection)
- `monitor-sidecars.test.mjs`: pass (snapshot-first path + corrupted sidecar auto-rebuild)
- `mcp-smoke.test.mjs`: pass (no regression in MCP health/events/websocket)

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/context-sidecars.test.mjs`
- `AI_Workspace/scripts/monitor-sidecars.test.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-06a-atomic-sidecar-writes-20260402.md`
