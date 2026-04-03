# TCO-05 Message Budget + Artifact Offload Report

- **taskId:** `aiw-opt-tco-05-message-budget-artifact-offload-20260402-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Implement message budget enforcement/warnings and operational artifact offload behavior for MCP event publishing.

## Changes Implemented

### 1) Shared message budget policy

Updated `AI_Workspace/MCP_Server/lib/event-contract.js`:

- Added defaults:
  - `targetChars=160`
  - `softLimitChars=280`
  - `hardLimitEnabled=false`
- Added `applyMessageBudgetPolicy(payload, options)`.
- Behavior:
  - trims long `payload.message` to target budget,
  - emits `messageBudget` metadata,
  - suggests offload via `offloadHint` when soft limit is exceeded without artifacts,
  - enforces hard mode rejection when message exceeds soft limit and `artifactPaths` is missing.

### 2) Enforcement in both writers

- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/mcp-stdio.js`

Both now apply the same policy before persistence.

Flags supported:

- `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED`
- `MCP_CONTEXT_MESSAGE_TARGET_CHARS`
- `MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS`

### 3) Contract documentation update

Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` with:

- enforcement modes and flags,
- offload trace fields (`messageBudget`, `offloadHint`).

### 4) Tests and impact analyzer

- Added tests in `AI_Workspace/scripts/mcp-event-contract.test.mjs` for:
  - trim behavior,
  - offload suggestion,
  - hard-mode rejection without artifacts,
  - hard-mode success with artifacts.
- Added analyzer: `AI_Workspace/scripts/analyze-message-budget-impact.mjs`.

## Validation Evidence

### Unit tests

```bash
node --test AI_Workspace/scripts/mcp-event-contract.test.mjs
```

Result: **18 passed**, **0 failed**.

### Message-length improvement toward target

```bash
node AI_Workspace/scripts/analyze-message-budget-impact.mjs
```

Measured on current representative context:

- Before avg message length: **160.35 chars**
- Projected after writer policy: **117.44 chars**
- Improvement: **26.76% reduction**
- Max message length projected after policy: **160**

This moves average below the target threshold direction (`<160`) for newly written events.

### Artifact offload flow (traceable)

Dry-run evidence with `mcp-publish-event`:

1. Long message without artifacts (soft mode):
   - message is trimmed,
   - `messageBudget.state=trimmed_offload_suggested`,
   - `offloadHint` included.
2. Long message over soft limit, hard mode, no artifacts:
   - publish rejected (expected).
3. Long message over soft limit, hard mode, with artifacts:
   - accepted,
   - `messageBudget.state=trimmed_with_artifact_offload`,
   - `artifactPathsPresent=true`.

## Acceptance Criteria Mapping

- Warning/enforcement for long messages -> **done**
- Short handoff policy applied and documented -> **done**
- Average message length improves toward target with evidence -> **done**
- Artifact offload flow functional and traceable -> **done**

## Artifacts

- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/mcp-event-contract.test.mjs`
- `AI_Workspace/scripts/analyze-message-budget-impact.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-05-message-budget-artifact-offload-20260402.md`
