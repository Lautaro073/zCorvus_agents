# Token Context Budget Adjustment Runbook

## Scope
Safe procedure to tune compact-view and handoff budgets without breaking snapshot consumers.

## Applies to
- `agent_inbox`
- `task_snapshot`
- `correlation_snapshot`
- `task_handoff`
- `correlation_handoff`

## Preconditions
1. Confirm current policy version in `/api/health` (`contextCompactViewBudgets.policyVersion`).
2. Confirm no open rollback incident for snapshot freshness/degraded mode.
3. Define objective (cost reduction, continuity improvement, or latency target).

## Change procedure

1. **Prepare candidate values**
   - Keep `hardBudget >= targetBudget`.
   - Do not reduce hard budgets below values that remove critical visibility.

2. **Apply via env overrides (staging first)**
   - View tokens:
     - `MCP_CONTEXT_*_TARGET_TOKENS`
     - `MCP_CONTEXT_*_HARD_TOKENS`
   - Handoff chars:
     - `MCP_CONTEXT_TASK_HANDOFF_*_CHARS`
     - `MCP_CONTEXT_CORRELATION_HANDOFF_*_CHARS`

3. **Run validation suite**
   - `node --test scripts/context-read-modes.test.mjs`
   - `node --test scripts/relevance-read-modes.test.mjs`
   - `node --test scripts/mcp-smoke.test.mjs`

4. **Run compliance analyzers**
   - `node scripts/analyze-token-budget-enforcement-impact.mjs`
   - `node scripts/analyze-budget-table-compliance.mjs`
   - Success criteria:
     - `withinHardLimit=true` for evaluated snapshots.
     - `truncated` responses include continuation metadata (`nextCursor`, `nextExpansionHint`).
     - critical statuses preserved under truncation.

5. **Publish evidence**
   - Update report in `docs/internal/reports/`.
   - Register updated docs in docs registry.
   - Emit MCP `ARTIFACT_PUBLISHED` and `TASK_COMPLETED` with evidence paths.

## Rollback

Use previous values for the changed env vars and restart monitor/MCP process.

Immediate rollback triggers:
1. `withinHardLimit=false` on evaluated snapshots.
2. Missing `nextCursor`/`nextExpansionHint` when `truncated=true`.
3. Critical statuses (`blocked`, `failed`) missing after truncation.
4. Consumer breakage due unexpected payload shape.

## Versioning rules

- Non-breaking threshold tuning keeps `ctx-budget.v1`.
- Any structural change in budget semantics requires new policy version (`ctx-budget.v2`) and explicit migration notes.
