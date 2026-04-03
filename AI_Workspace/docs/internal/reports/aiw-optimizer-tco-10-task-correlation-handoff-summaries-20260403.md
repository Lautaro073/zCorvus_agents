# TCO-10 - Task and Correlation Handoff Summaries

## Metadata
- taskId: `aiw-opt-tco-10-task-correlation-handoff-summaries-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Objective
Generate compact handoff summaries for tasks and correlations so a new agent can continue work without rereading raw event history.

## Delivered changes

### 1) Compact handoff summary generation in read modes
- Updated `AI_Workspace/MCP_Server/lib/context-read-modes.js`:
  - Added deterministic compact handoff builders for task and correlation snapshots.
  - Added `handoffSummary` to inbox task items.
  - Added `task.handoffSummary` and top-level `handoff` in `get_task_snapshot`.
  - Added per-task `handoffSummary` and top-level `handoff` in `get_correlation_snapshot`.
  - Summary text is bounded for compact continuity (`task <= 220 chars`, `correlation <= 260 chars`).

### 2) Handoff summaries persisted in sidecars
- Updated `AI_Workspace/MCP_Server/lib/context-sidecars.js`:
  - `latest_by_task` now stores `handoffSummary` per task.
  - `latest_by_correlation` now stores `handoffSummary` per correlation.
  - Sidecar task projections include handoff summary for snapshot-first retrieval.

### 3) Runtime hygiene for generated sidecar artifacts
- Updated `AI_Workspace/MCP_Server/.gitignore` to ignore `/sidecars/` runtime files and temp artifacts.

### 4) Contract documentation updates
- Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`:
  - Added handoff fields in `get_task_snapshot` and `get_correlation_snapshot` contracts.
  - Added compact examples with `handoffSummary` and `handoff` payloads.

## Validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/context-sidecars.test.mjs
node --test scripts/context-read-modes.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-event-contract.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Results: all suites passed.

New coverage includes:
- handoff summaries present in sidecars,
- handoff summaries present and bounded in task/correlation snapshots,
- completed tasks keep recoverable handoff summary,
- relevance-first endpoint behavior unchanged.

## Handoff continuity evidence (>=85% objective)

Measured with:

```bash
node scripts/analyze-handoff-summary-coverage.mjs
```

Observed sample:
- task snapshots evaluated: `40`
- active correlation snapshots evaluated: `4`
- combined usable handoffs: `44/44` (`100%`)
- objective met (`>=85%`): `true`

## Before/after examples

From `analyze-handoff-summary-coverage.mjs` sample:

1. **Task continuity**
   - broad event payload bytes: `6091`
   - compact task snapshot bytes: `2112`
   - handoff summary length: `204`
2. **Correlation continuity**
   - broad event payload bytes: `350724`
   - compact correlation snapshot bytes: `13960`
   - handoff summary length: `241`

These examples show continuity-ready summaries while avoiding broad reads.

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
- `AI_Workspace/MCP_Server/.gitignore`
- `AI_Workspace/scripts/context-read-modes.test.mjs`
- `AI_Workspace/scripts/context-sidecars.test.mjs`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`
- `AI_Workspace/scripts/analyze-handoff-summary-coverage.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-10-task-correlation-handoff-summaries-20260403.md`
