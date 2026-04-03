# Token Context Budget Table v1

## Metadata
- docId: `token-context-budget-table-v1`
- featureSlug: `token-context-optimization`
- schemaVersion: `ctx-budget.v1`
- status: `approved`
- owner: `AI_Workspace_Optimizer`
- updatedAt: `2026-04-03`

## Purpose
Freeze versioned compact-view budgets and handoff budgets used by relevance-first snapshots.

This table is normative for:
- runtime enforcement,
- test validation of hard limits,
- safe tuning governance.

## Policy version
- `policyVersion`: `ctx-budget.v1`

## Compact view token budgets

| View | targetBudget (tokens) | hardBudget (tokens) | Hard-limit strategy |
|---|---:|---:|---|
| `agent_inbox` | 1200 | 1800 | prioritize critical tasks, trim summaries/actions, preserve blocked/failed |
| `task_snapshot` | 1600 | 2400 | compact optional task detail sections first, keep continuation fields |
| `correlation_snapshot` | 2200 | 3200 | critical-first task ordering, reduce non-critical items and summary verbosity |

## Handoff compaction budgets

| Handoff type | targetBudget (chars) | hardBudget (chars) | Notes |
|---|---:|---:|---|
| `task_handoff` | 160 | 220 | Short continuation summary for one task |
| `correlation_handoff` | 200 | 260 | Short continuity summary for one correlation |

## Runtime override env vars

### View token budgets
- `MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS`
- `MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS`
- `MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS`
- `MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS`
- `MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS`
- `MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS`

### Handoff char budgets
- `MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS`
- `MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS`
- `MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS`
- `MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS`

## Enforcement metadata contract

Each compact snapshot includes:

```json
{
  "tokenBudget": {
    "policyVersion": "ctx-budget.v1",
    "view": "agent_inbox",
    "targetTokens": 1200,
    "hardTokens": 1800,
    "estimatedTokensBefore": 2882,
    "estimatedTokensAfter": 1687,
    "truncatedByBudget": true,
    "withinHardLimit": true
  }
}
```

If truncation happens, compact views must include continuity metadata:
- `truncated=true`
- `nextCursor` (or compatible continuation object)
- `nextExpansionHint`

## Critical-signal preservation rule

Hard-limit truncation must preserve critical status visibility (`blocked`, `failed`) before dropping lower-priority items.

## Compatibility

- Consumers must treat unknown `policyVersion` as non-fatal and rely on explicit `tokenBudget` values.
- Tuning within this policy keeps `policyVersion=ctx-budget.v1`.
- Breaking semantics require new version (e.g. `ctx-budget.v2`).
