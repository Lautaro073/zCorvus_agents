# TCO-11 - Token Budget Enforcement and Truncated Metadata

## Metadata
- taskId: `aiw-opt-tco-11-token-budget-enforcement-truncated-metadata-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Objective
Enforce hard token budgets for compact relevance-first views and expose explicit truncation continuity metadata (`truncated`, `nextCursor`, `nextExpansionHint`) without silencing critical signals.

## Delivered changes

### 1) Hard budget enforcement per compact view
- Updated `AI_Workspace/MCP_Server/lib/context-read-modes.js`:
  - Added per-view budget defaults:
    - `agent_inbox`: target `1200`, hard `1800`
    - `task_snapshot`: target `1600`, hard `2400`
    - `correlation_snapshot`: target `2200`, hard `3200`
  - Added budget enforcement passes that trim payload sections to stay under hard limit.
  - Added `tokenBudget` metadata in snapshots:
    - `targetTokens`, `hardTokens`, `estimatedTokensBefore`, `estimatedTokensAfter`, `truncatedByBudget`, `withinHardLimit`.

### 2) Truncation continuity metadata
- Compact snapshots now emit explicit continuation metadata:
  - `truncated` (`true|false`)
  - `nextCursor` (`object|null`)
  - existing `nextExpansionHint` retained with truncation-aware reasoning.

### 3) Critical signal preservation under truncation
- Budget truncation keeps `blocked/failed` tasks prioritized for inbox/correlation paths.
- Correlation truncation applies critical-first ordering before dropping lower-priority items.

### 4) Runtime budget configuration
- Added monitor env support in `AI_Workspace/MCP_Server/monitor-server.js` and mcp-stdio support in `AI_Workspace/MCP_Server/mcp-stdio.js`:
  - `MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS`
  - `MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS`
  - `MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS`
  - `MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS`
  - `MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS`
  - `MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS`
- `/api/health` now exposes effective compact-view budgets.

### 5) Contract updates
- Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`:
  - `nextCursor` contract added,
  - `tokenBudget` metadata contract added,
  - truncation continuity rules strengthened.

## Validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/context-sidecars.test.mjs
node --test scripts/context-read-modes.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-event-contract.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Result: all suites passed.

Coverage highlights:
- budget enforcement with `nextCursor` in inbox,
- critical task preservation under correlation truncation,
- truncated metadata present in relevance-first responses,
- no regressions in MCP smoke and event contract tests.

## Before/after evidence (reproducible)

Executed:

```bash
node scripts/analyze-token-budget-enforcement-impact.mjs
```

Sample selectors:
- `taskId`: `aiw-observer-pixel-interactivity-20260327-01`
- `correlationId`: `aiw-agentmonitor-pixel-experience-20260326`

Measured comparisons (relaxed hard limits vs enforced defaults):

1. **agent_inbox**
   - bytes: `11741` -> `6960` (`-40.72%`)
   - estimated tokens: `2882` -> `1687`
   - `truncated=true`, `nextCursor.scope=tasks`
2. **task_snapshot**
   - bytes: `2290` -> `2288` (`-0.09%`)
   - estimated tokens: `519` -> `519` (already under hard limit)
   - `truncated=false`, `nextCursor=null`
3. **correlation_snapshot**
   - bytes: `14140` -> `12949` (`-8.42%`)
   - estimated tokens: `3481` -> `3184`
   - `truncated=true`, `nextCursor.scope=correlation_tasks`

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/lib/context-sidecars.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/context-read-modes.test.mjs`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`
- `AI_Workspace/scripts/analyze-token-budget-enforcement-impact.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-11-token-budget-enforcement-truncated-metadata-20260403.md`
