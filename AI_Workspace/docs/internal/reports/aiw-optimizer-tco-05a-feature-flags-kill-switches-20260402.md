# TCO-05A Feature Flags & Kill Switches Report

- **taskId:** `aiw-opt-tco-05a-feature-flags-kill-switches-20260402-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Implement operational toggles and kill switches for context optimization capabilities, with runtime visibility and rollback behavior via env flags.

## Implemented Flags

### Core capability flags

- `MCP_CONTEXT_SLIM_API_EVENTS_ENABLED` (default `true`)
- `MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED` (default `true`)
- `MCP_CONTEXT_MESSAGE_BUDGET_ENABLED` (default `true`)
- `MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED` (default `true`)

### Compatibility and control flags

- `MCP_CONTEXT_LEGACY_PAYLOAD_MODE` (default `false`)
- `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED` (default `false`)
- `MCP_CONTEXT_MESSAGE_TARGET_CHARS` (default `160`)
- `MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS` (default `280`)

### Plan-aligned umbrella flags (exposed for rollout governance)

- `MCP_CONTEXT_SIDECARS_ENABLED` (default `true`)
- `MCP_CONTEXT_RELEVANCE_READS_ENABLED` (default `true`)
- `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED` (default `true`)
- `MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED` (default `true`)

## Code Changes

1. `AI_Workspace/MCP_Server/monitor-server.js`
   - Reads all context flags.
   - Exposes full flag state in `/api/health` under `contextFlags` and `contextMessageBudget`.
   - Uses `MCP_CONTEXT_SLIM_API_EVENTS_ENABLED` for `/api/events` compact/expanded default behavior.

2. `AI_Workspace/scripts/mcp-publish-event.mjs`
   - Applies capability flags at writer runtime:
     - message budget gate,
     - artifact offload gate,
     - canonical normalization gate,
     - token-budget master gate.
   - Dry-run now includes `eventPreview` to inspect effective persisted shape without writing.

3. `AI_Workspace/MCP_Server/mcp-stdio.js`
   - Same gating behavior as CLI writer for parity.

4. `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
   - Required flags list updated to include new kill switches.

## Validation Evidence

### A) Health visibility (default)

`GET /api/health` confirms defaults:

- `sidecarsEnabled=true`
- `relevanceReadsEnabled=true`
- `tokenBudgetsEnabled=true`
- `slimApiEventsEnabled=true`
- `canonicalNormalizationEnabled=true`
- `messageBudgetEnabled=true`
- `artifactOffloadEnabled=true`
- `handoffSummariesEnabled=true`
- `messageBudgetHardEnabled=false`

### B) Runtime rollback behavior (all switches off + legacy on)

With env toggles set to disabled and `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true`:

- `/api/health` reflects all flags as expected.
- `/api/events` defaults to expanded mode (`payloadMode=expanded`).
- `tasks[].events` restored by default (legacy behavior).

### C) Writer-level kill switch checks (dry-run)

1. `MCP_CONTEXT_MESSAGE_BUDGET_ENABLED=false`
   - no trimming, message remains unchanged.
2. `MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED=false`
   - offload hint suppressed and state downgraded to budget-only trim.
3. `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`
   - canonical normalization and message budget effectively bypassed (legacy-compatible payload in preview).

### D) Regression tests

```bash
node --test AI_Workspace/scripts/mcp-event-contract.test.mjs
```

Result: **18 passed**, **0 failed**.

## Acceptance Criteria Mapping

- Flags/kill-switches per capability implemented and documented -> **done**
- Runtime rollback by env/config without code edits -> **done**
- `/api/health` exposes flag state -> **done**
- Toggle validation with reproducible evidence -> **done**

## Artifacts

- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-05a-feature-flags-kill-switches-20260402.md`
