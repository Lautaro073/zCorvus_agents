# TCO-13A Budget Toggle Wiring Fix

- Task ID: `aiw-opt-tco-13a-budget-toggle-fix-20260403-01`
- Correlation ID: `aiw-token-context-optimization-20260331`
- Date: 2026-04-03
- Agent: AI_Workspace_Optimizer

## Objective

Fix the blocker reported by Tester where `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`
still produced compact snapshot budget metadata and truncation behavior.

## Root cause

- `monitor-server.js` and `mcp-stdio.js` defined the flag but did not propagate a runtime
  `enabled=false` signal inside compact view budget configuration.
- `context-read-modes.js` parsed the budget table `enabled` field, but enforcement functions
  (`enforceAgentInboxBudget`, `enforceTaskSnapshotBudget`, `enforceCorrelationBudget`)
  always ran and always emitted `tokenBudget` metadata.
- Agent/correlation snapshots also still applied limit-based truncation under compact mode,
  violating the expected behavior for the explicit budget kill switch.

## Implementation

### 1) Wire budget table enable flag at runtime

- Updated `MCP_Server/monitor-server.js` `getCompactViewBudgets()` to include:
  - `enabled: MCP_CONTEXT_TOKEN_BUDGETS_ENABLED`
- Updated `MCP_Server/mcp-stdio.js` `getCompactViewBudgets()` with the same field for parity.

### 2) Honor disable flag in read-mode enforcement

- Updated `MCP_Server/lib/context-read-modes.js`:
  - `resolveViewBudget()` now returns `enabled`.
  - `enforceAgentInboxBudget()` returns the snapshot unchanged when disabled.
  - `enforceTaskSnapshotBudget()` returns the snapshot unchanged when disabled.
  - `enforceCorrelationBudget()` returns the snapshot unchanged when disabled.

### 3) Disable compact truncation path when budgets are disabled

- Updated `buildAgentInboxSnapshot()` and `buildCorrelationSnapshot()` to bypass compact
  truncation slicing when `enabled=false`, so `truncated` is not asserted by compact policy.

## Verification

### Reproduction before fix

`node --test AI_Workspace/scripts/relevance-read-modes.test.mjs`

- Failing case: `token budget flag disables budget metadata and truncation enforcement`
- Observed: `payloadWithoutBudgets.tokenBudget` present and `truncated=true`.

### Validation after fix

`node --test AI_Workspace/scripts/relevance-read-modes.test.mjs`

- Result: `5/5` passing.

`node --test AI_Workspace/scripts/context-read-modes.test.mjs AI_Workspace/scripts/context-sidecars.test.mjs AI_Workspace/scripts/mcp-smoke.test.mjs AI_Workspace/scripts/monitor-sidecars.test.mjs`

- Result: `17/17` passing.

## Acceptance criteria mapping

1. With `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`, no compact `tokenBudget` metadata or compact truncation policy is applied -> **PASS**
2. With toggle enabled, existing behavior is preserved and tests pass -> **PASS**
3. No TCO-11/TCO-11A regression on compact read modes -> **PASS**
4. Technical report with before/after evidence published -> **PASS**

## Files changed

- `AI_Workspace/MCP_Server/lib/context-read-modes.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-13a-budget-toggle-fix-20260403.md`
