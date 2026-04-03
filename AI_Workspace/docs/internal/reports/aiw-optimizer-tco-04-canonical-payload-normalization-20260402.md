# TCO-04 Canonical Payload Normalization Report

- **taskId:** `aiw-opt-tco-04-canonical-payload-normalization-20260402-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Eliminate canonical field duplication inside event `payload` when the same values already exist at top-level event fields, while preserving a legacy compatibility fallback.

## Changes Implemented

### 1) Shared normalization helper

Updated `AI_Workspace/MCP_Server/lib/event-contract.js`:

- Added `CANONICAL_PAYLOAD_FIELDS`.
- Added `normalizeEventPayloadForStorage(payload, topLevelFields, options)`.
- Normalization removes duplicated canonical fields from payload unless legacy mode is enabled.

### 2) Writer normalization in CLI publisher

Updated `AI_Workspace/scripts/mcp-publish-event.mjs`:

- Uses shared helper before persistence.
- Supports legacy fallback via env flag:
  - `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true` -> preserve legacy payload duplication.
- Promotes `dependsOn` and `artifactPaths` to top-level event fields for canonical consistency.

### 3) Writer normalization in MCP stdio tool

Updated `AI_Workspace/MCP_Server/mcp-stdio.js`:

- Uses shared helper before appending events.
- Honors same fallback flag `MCP_CONTEXT_LEGACY_PAYLOAD_MODE`.

### 4) Contract documentation sync

Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` with canonical payload normalization contract and fallback behavior.

## Validation

### Unit tests

Command:

```bash
node --test AI_Workspace/scripts/mcp-event-contract.test.mjs
```

Result:

- `14 passed`, `0 failed`
- Includes dedicated tests for payload normalization and legacy mode behavior.

### Savings methodology (reproducible)

Command:

```bash
node AI_Workspace/scripts/analyze-canonical-payload-savings.mjs
```

Measured on representative current context (`shared_context.jsonl`):

- Events analyzed: `828`
- Before: `739,455` bytes (~`184,864` tokens)
- After normalization: `566,368` bytes (~`141,592` tokens)
- Savings: `173,087` bytes (~`43,272` tokens)
- Reduction: **23.41%**

Acceptance target (`>=20%`) satisfied.

## Acceptance Criteria Mapping

- Writer updated to remove canonical duplication on new events -> **done** (both publishers)
- >=20% savings validated on representative context -> **done** (**23.41%**)
- Legacy compatibility with guard/fallback -> **done** (`MCP_CONTEXT_LEGACY_PAYLOAD_MODE`)
- Before/after reproducible methodology and evidence -> **done** (analysis script + output)

## Artifacts

- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/scripts/mcp-event-contract.test.mjs`
- `AI_Workspace/scripts/analyze-canonical-payload-savings.mjs`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-04-canonical-payload-normalization-20260402.md`
