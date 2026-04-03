# PR19 Runtime Safety Fixes

## Metadata
- taskId: `aiw-opt-pr19-runtime-safety-fixes-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Objective
Resolve blocking PR #19 review findings before merge:
1. MCP stdio read tools must not fail when sidecar write persistence fails.
2. `/api/events` must keep `events` and `tasks` consistent under active filters.
3. Snapshot safety sanitization must cover critical payload string fields.
4. Legacy mode rollback semantics must be explicit and verifiable.

## Delivered fixes

### 1) mcp-stdio robust fallback on sidecar write failure
- Updated `AI_Workspace/MCP_Server/mcp-stdio.js`:
  - Added sidecar persistence fallback flow in `buildReadContext()`.
  - On `writeSidecarsAtomically` failure:
    - tries `readValidatedSidecars()` from disk,
    - if disk fallback unavailable, continues with in-memory sidecars.
  - Read tools now remain operational instead of hard-failing due to write-path issues.
  - Added env override support for testability:
    - `MCP_CONTEXT_SIDECARS_DIR`.

### 2) `/api/events` events/tasks consistency under filters
- Updated `AI_Workspace/MCP_Server/monitor-server.js`:
  - fixed `includeTaskEvents` default semantics to respect legacy mode rollback:
    - legacy mode now forces expanded default.
  - added `hasActiveTaskConsistencyFilters()` and disabled sidecar task projection for filtered reads.
  - Result: when task/type/agent/status/correlation filters are active, `tasks` are built from the already-filtered `events` set.

### 3) Sanitization hardening for critical string fields
- Updated `AI_Workspace/MCP_Server/lib/event-contract.js`:
  - added `MEMORY_SAFETY_CRITICAL_FIELD_PATTERN`.
  - extended memory-safety sanitization from only `message` to critical payload fields such as:
    - `summary`, `description`, `title`, `nextAction`, `rootCause`, `details`, `blocker`, `acceptanceCriteria`, `reason`, `note`, `instruction`.
  - added telemetry counter `memorySafetyFields` in guardrail metadata.

### 4) Legacy rollback semantics documentation
- Updated `AI_Workspace/docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`:
  - added explicit runtime rollback verification contract for `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true`.

## New / updated tests

### Added
- `AI_Workspace/scripts/mcp-stdio-read-fallback.test.mjs`
  - validates read tool behavior remains healthy when sidecar writes fail.
- `AI_Workspace/scripts/monitor-api-events-consistency.test.mjs`
  - validates events/tasks consistency with active filters.
  - validates legacy mode forces expanded `/api/events` default.

### Updated
- `AI_Workspace/scripts/mcp-event-contract.test.mjs`
  - added assertion for memory-safety sanitization in `description` and `nextAction`.

## Validation

Executed:

```bash
node --check AI_Workspace/MCP_Server/mcp-stdio.js && node --check AI_Workspace/MCP_Server/monitor-server.js && node --check AI_Workspace/MCP_Server/lib/event-contract.js
node --test AI_Workspace/scripts/mcp-stdio-read-fallback.test.mjs AI_Workspace/scripts/monitor-api-events-consistency.test.mjs AI_Workspace/scripts/mcp-event-contract.test.mjs AI_Workspace/scripts/relevance-read-modes.test.mjs AI_Workspace/scripts/context-observability.test.mjs AI_Workspace/scripts/monitor-sidecars.test.mjs AI_Workspace/scripts/context-sidecars.test.mjs
```

Results:
- syntax checks: pass
- regression suite: `45/45` pass

## Acceptance criteria mapping
1. Read tools no rompen por fallo de sidecar write -> **PASS**
2. `/api/events` mantiene consistencia `events/tasks` con filtros -> **PASS**
3. Sanitización cubre campos string críticos del payload -> **PASS**
4. Legacy rollback semantics documentadas y verificables -> **PASS**
5. Tests relevantes en verde + reporte before/after -> **PASS**

## Artifacts
- `AI_Workspace/MCP_Server/mcp-stdio.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`
- `AI_Workspace/scripts/mcp-stdio-read-fallback.test.mjs`
- `AI_Workspace/scripts/monitor-api-events-consistency.test.mjs`
- `AI_Workspace/scripts/mcp-event-contract.test.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-pr19-runtime-safety-fixes-20260403.md`
