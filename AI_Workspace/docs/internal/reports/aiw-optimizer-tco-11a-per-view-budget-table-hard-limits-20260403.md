# TCO-11A - Per-View Budget Table and Hard Limits

## Metadata
- taskId: `aiw-opt-tco-11a-per-view-budget-table-hard-limits-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Objective
Freeze a versioned budget table per compact view/handoff, enforce hard limits in responses, and document safe tuning workflow.

## Delivered changes

### 1) Versioned budget table in runtime
- Updated `AI_Workspace/MCP_Server/lib/context-read-modes.js`:
  - added `VIEW_BUDGET_POLICY_VERSION=ctx-budget.v1`,
  - added `VIEW_BUDGET_TABLE_DEFAULTS` (views + handoff budgets),
  - added resolver supporting structured budget table (`policyVersion`, `views`, `handoff`) and legacy map shape.

### 2) Hard-limit metadata now policy-aware
- Snapshot `tokenBudget` now includes:
  - `policyVersion`,
  - `view`,
  - `targetTokens`, `hardTokens`,
  - `estimatedTokensBefore`, `estimatedTokensAfter`,
  - `truncatedByBudget`, `withinHardLimit`.

### 3) Handoff budgets integrated
- Task/correlation handoff generation now uses table-defined char budgets.
- Runtime overrides added for handoff budgets (target + hard chars).

### 4) Health and runtime budget table exposure
- Updated `AI_Workspace/MCP_Server/monitor-server.js`:
  - `/api/health` now exposes full budget table (`contextCompactViewBudgets`) including `policyVersion`, view budgets, and handoff budgets.
- Updated `AI_Workspace/MCP_Server/mcp-stdio.js` to use same table structure.

### 5) Versioned spec + runbook
- Added versioned budget table spec:
  - `AI_Workspace/docs/internal/specs/token-context-budget-table-v1.md`
- Added safe tuning runbook:
  - `AI_Workspace/docs/internal/runbooks/token-context-budget-adjustment-runbook.md`
- Updated contract spec references and continuation requirements:
  - `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`

## Acceptance criteria mapping

1. **Versioned table by view/handoff exists**
   - `token-context-budget-table-v1.md` with `policyVersion=ctx-budget.v1`.
2. **Each view defines target + hard budget**
   - fixed in runtime defaults and spec table.
3. **Tests verify hard limits**
   - relevance-mode test now checks `tokenBudget.withinHardLimit=true` under strict hard limits.
4. **Safe adjustment runbook/spec documented**
   - runbook created and linked from contract.

## Validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/context-sidecars.test.mjs
node --test scripts/context-read-modes.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-event-contract.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Result: all suites pass.

## Reproducible evidence

### A) Budget enforcement impact

```bash
node scripts/analyze-token-budget-enforcement-impact.mjs
```

Sample result:
- `agent_inbox`: `11879` -> `7213` bytes (`-39.28%`), `nextCursor` present on truncation
- `task_snapshot`: `2557` -> `2555` bytes (`-0.08%`) (already under hard limit)
- `correlation_snapshot`: `2944` -> `2942` bytes (`-0.07%`) (already under hard limit)

### B) Hard-limit compliance against table

```bash
node scripts/analyze-budget-table-compliance.mjs
```

Sample result:
- policy version: `ctx-budget.v1`
- task snapshot compliance: `40/40` (`100%`)
- correlation snapshot compliance: `6/6` (`100%`)
- combined hard-limit compliance: `46/46` (`100%`)

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/context-read-modes.test.mjs`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`
- `AI_Workspace/scripts/analyze-token-budget-enforcement-impact.mjs`
- `AI_Workspace/scripts/analyze-budget-table-compliance.mjs`
- `AI_Workspace/docs/internal/specs/token-context-budget-table-v1.md`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/runbooks/token-context-budget-adjustment-runbook.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-11a-per-view-budget-table-hard-limits-20260403.md`
