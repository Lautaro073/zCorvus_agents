# TCO-03 Slim `/api/events` Default Report

- **taskId:** `aiw-opt-tco-03-slim-api-events-default-20260402-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Make `/api/events` compact by default while keeping an explicit expanded debug mode and a legacy fallback switch.

## Changes Implemented

### 1) Compact default payload mode

Updated `AI_Workspace/MCP_Server/monitor-server.js`:

- Added query/filters support for `includeTaskEvents`.
- Default now resolves to compact mode (`includeTaskEvents=false`) unless legacy mode is enabled.
- `tasks[]` now returns compact summaries by default:
  - `eventCount`
  - `latestStatus`
  - `updatedAt`
  - plus lightweight metadata (`latestEventType`, `latestSummary`, ownership fields).

### 2) Explicit expanded debug mode

- `GET /api/events?...&includeTaskEvents=true` returns `tasks[].events` for deep debugging.
- Response now includes contract metadata:
  - `contract.payloadMode` (`compact|expanded`)
  - `contract.legacyPayloadMode`
  - `contract.expansionHint`

### 3) Legacy compatibility fallback

- Added env flag `MCP_CONTEXT_LEGACY_PAYLOAD_MODE`.
  - Default: `false` (compact-first)
  - If `true`, `/api/events` defaults to expanded legacy behavior.
- Exposed in `/api/health` as `contextLegacyPayloadMode`.

### 4) Contract documentation sync

Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` with:

- `/api/events` payload-mode contract
- `includeTaskEvents=true` expansion path
- legacy fallback flag note

## Verification Evidence

### Payload reduction check (same dataset, `limit=50`)

Measured against runtime server responses:

- Compact (`includeTaskEvents` default): **61,529 bytes**
- Expanded (`includeTaskEvents=true`): **117,246 bytes**
- Reduction: **47.52%**

Acceptance target (`>=45%`) satisfied.

### Shape verification

- Compact mode: `tasksWithEvents = 0`
- Expanded mode: `tasksWithEvents = tasks.length`
- Compact includes summary keys: `eventCount`, `latestStatus`, `updatedAt`

### Legacy fallback verification

With `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true`:

- `/api/events` default mode becomes `expanded`
- `tasks[].events` present without passing `includeTaskEvents=true`
- `/api/health` reports `contextLegacyPayloadMode: true`

## Acceptance Criteria Mapping

- `/api/events` no longer includes `task.events` by default -> **done**
- Payload reduction >=45% verified -> **done (47.52%)**
- Explicit expansion option exists for debug -> **done (`includeTaskEvents=true`)**
- Legacy compatibility covered with flag/fallback and documented -> **done**

## Artifacts

- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-03-slim-api-events-default-20260402.md`
