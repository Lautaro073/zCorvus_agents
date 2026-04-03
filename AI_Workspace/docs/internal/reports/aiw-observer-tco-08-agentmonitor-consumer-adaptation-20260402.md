# TCO-08 - AgentMonitor Consumer Adaptation (Snapshot-First)

## Metadata
- taskId: `aiw-observer-tco-08-agentmonitor-consumer-adaptation-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Observer`
- status: `completed`
- date: `2026-04-02`

## Objective
Adapt AgentMonitor consumers to use compact relevance-first context views by default (`get_agent_inbox`, targeted task/correlation snapshots), expose safety/freshness metadata in UI, and keep debug expansion explicit and auditable.

## Before vs after

### Before
1. Main monitor intake in `agentmonitor-v2` queried `/api/events` directly as default dataset.
2. UI did not surface compact-view metadata (`degradedMode`, `stale`, `truncated`, `decisionSafety`, `readMode`).
3. Debug detail expansion did not provide explicit audit trail for read mode/fallback behavior.

### After
1. Default intake path is snapshot-first via `/api/context/get_agent_inbox` per agent in `useMcpEvents`.
2. UI exposes context health metadata (degraded, stale, truncated, requiresExpansion, broadFallback counts) in the dashboard panel.
3. Event detail dialog includes explicit debug expansion action (`Expandir debug`) that calls:
   - `/api/context/get_task_snapshot` (sensitiveAction=true)
   - `/api/context/get_correlation_snapshot` (sensitiveAction=true)
   - targeted `/api/events?taskId=...&includeTaskEvents=true` only on demand
4. Each debug expansion is audited in memory with:
   - `readMode`, `broadFallbackUsed`, `decisionSafety`
   - `stale`, `degradedMode`, `truncated`
   - expanded event count

## Delivered changes
1. `agentmonitor-v2/src/hooks/useMcpEvents.ts`
   - Switched default fetch from broad `/api/events` to compact inbox snapshots.
   - Added conversion from snapshot task summaries into monitor event stream.
   - Added websocket envelope handling for `connected` / `events_updated` previews.
   - Added explicit debug expansion workflow and audit capture.
2. `agentmonitor-v2/src/types/mcp.ts`
   - Added compact view contracts and metadata types for context snapshots and audit.
3. `agentmonitor-v2/src/lib/wsClient.ts`
   - Updated websocket message typing to handle envelope payloads instead of assuming raw `McpEvent`.
4. `agentmonitor-v2/src/App.tsx`
   - Added context health panel exposing safety/freshness metadata.
   - Added debug expansion controls and audit rendering in event detail dialog.

## Validation
Executed in `AI_Workspace/agentmonitor-v2`:

```bash
npm run build
```

Result: pass.

## Acceptance criteria evidence
1. **Snapshots compactos por defecto**: monitor intake now uses `get_agent_inbox` as primary data source.
2. **Metadata visible en UI**: dashboard panel now shows `degraded/stale/truncated/requiresExpansion/broadFallback` counters.
3. **Expansion debug auditada**: dialog expansion stores and displays read-mode + safety metadata per expansion.
4. **Sin broad reads por defecto**: `/api/events` expanded mode is only used in explicit debug expansion for selected task.

## Artifacts
- `AI_Workspace/agentmonitor-v2/src/hooks/useMcpEvents.ts`
- `AI_Workspace/agentmonitor-v2/src/App.tsx`
- `AI_Workspace/agentmonitor-v2/src/lib/wsClient.ts`
- `AI_Workspace/agentmonitor-v2/src/types/mcp.ts`
- `AI_Workspace/docs/internal/reports/aiw-observer-tco-08-agentmonitor-consumer-adaptation-20260402.md`
