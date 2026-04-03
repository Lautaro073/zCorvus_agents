# TCO-06A - Atomic Sidecar Writes and Idempotent Rebuilds

## Metadata
- taskId: `aiw-opt-tco-06a-atomic-sidecars-idempotent-rebuilds-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Objective
Harden sidecar runtime behavior after TCO-06 with:

1. atomic writes,
2. deterministic and idempotent rebuilds,
3. corruption/partial-write detection,
4. safe consumer fallback behavior.

## Delivered changes

### 1) Atomic sidecar persistence and deterministic fingerprints
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
  - Atomic writes kept as `tmp + rename` per sidecar file.
  - Added `contentFingerprint` per sidecar using canonical payload hashing that excludes volatile timestamps (`generatedAt`, `rebuiltAt`) and mutable integrity fields.
  - Added `integrityHash` validation over full persisted payload.

### 2) Corruption and partial-write detection
- `validateSidecarPayload(...)` validates:
  - required shape and required fields,
  - expected view name,
  - `sourceWatermark` format,
  - `contentFingerprint` match,
  - `integrityHash` match.
- `readValidatedSidecars(...)` validates the full sidecar set and rejects watermark mismatch across files.

### 3) Safe consumer fallback in monitor runtime
- `AI_Workspace/MCP_Server/monitor-server.js`
  - Cache path validates on-disk sidecars before reuse.
  - If sidecars are invalid, monitor rebuilds from JSONL.
  - If rebuild fails but disk sidecars are valid, monitor enters degraded sidecar fallback.
  - If rebuild fails and no valid sidecars exist, monitor falls back to `event_scan` mode.
  - API telemetry now includes sidecar source and fallback context.

## Validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/context-sidecars.test.mjs
node --test scripts/monitor-sidecars.test.mjs
```

Results:
- `context-sidecars.test.mjs`: pass (idempotent fingerprint + integrity tamper detection)
- `monitor-sidecars.test.mjs`: pass (corrupted sidecar detection and safe auto-rebuild)

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/context-sidecars.test.mjs`
- `AI_Workspace/scripts/monitor-sidecars.test.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-06a-atomic-sidecars-idempotent-rebuilds-20260402.md`
