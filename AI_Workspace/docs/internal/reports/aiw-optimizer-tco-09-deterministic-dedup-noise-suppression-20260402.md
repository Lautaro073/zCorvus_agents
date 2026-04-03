# TCO-09 - Deterministic Dedup and Noise Suppression

## Metadata
- taskId: `aiw-opt-tco-09-deterministic-dedup-noise-suppression-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-02`

## Objective
Reduce redundant lifecycle events without losing real state transitions by applying deterministic dedup rules at MCP writer entrypoints.

## Delivered changes

### 1) Deterministic dedup contract logic
- Updated `AI_Workspace/MCP_Server/lib/event-contract.js`:
  - added `evaluateDeterministicDedupe(...)`,
  - added dedupe defaults (`enabled=true`, `windowMs=900000`),
  - dedupe key based on `taskId + type + status + agent + semantic payload hash`.

### 2) Writer entrypoint enforcement
- Updated `AI_Workspace/scripts/mcp-publish-event.mjs`:
  - applies dedupe decision before append,
  - suppresses duplicate lifecycle replay writes,
  - returns auditable suppression metadata.
- Updated `AI_Workspace/MCP_Server/mcp-stdio.js`:
  - same deterministic dedupe behavior for MCP stdio `append_event`.

### 3) Operational flags and visibility
- Added runtime flags:
  - `MCP_CONTEXT_DEDUP_ENABLED` (default `true`)
  - `MCP_CONTEXT_DEDUP_WINDOW_MS` (default `900000`)
- Exposed dedupe flag/window in monitor health response (`monitor-server.js`).

### 4) Spec updates
- Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` with dedupe/noise suppression contract and required flag entry.

## Rules implemented

1. Dedupe applies only to lifecycle `TASK_*` events.
2. Dedupe only triggers when latest lifecycle event for same task has same `type/status/agent` and same semantic payload fingerprint.
3. Real transition changes are preserved (different status/type/agent are never deduped).
4. Payload semantic differences are preserved (different summary/action/details are never deduped).
5. Dedupe only applies within configured time window.

## Validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/mcp-event-contract.test.mjs
node --test scripts/context-read-modes.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results:
- all suites passed.

New coverage highlights:
- exact lifecycle replay is suppressed in-window,
- real status transition is not suppressed,
- replay outside dedupe window is not suppressed.

## Signal-to-noise impact

Measured with:

```bash
node scripts/analyze-dedup-noise-impact.mjs
```

Current observed dataset (`shared_context.jsonl`):
- lifecycle events: `695`
- suppressed: `0` (dataset already clean)

Synthetic replay injection (50 duplicate lifecycle replays):
- lifecycle before: `745`
- lifecycle after dedupe: `700`
- suppressed: `45`
- replay suppression effectiveness: `90%`

This validates deterministic suppression behavior on replay noise while preserving non-replay transitions.

## Artifacts
- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/mcp-event-contract.test.mjs`
- `AI_Workspace/scripts/analyze-dedup-noise-impact.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-09-deterministic-dedup-noise-suppression-20260402.md`
