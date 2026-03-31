# AgentMonitor V2 Route Switch Report

- **taskId:** `aiw-opt-v2-monitor-server-route-20260330-01`
- **correlationId:** `aiw-agentmonitor-v2-20260330`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-03-30

## Objective

Switch `/monitor` to AgentMonitor V2 while preserving `/pixel`, with optional legacy fallback.

## Changes Applied

1. Updated `AI_Workspace/MCP_Server/monitor-server.js` to support monitor UI variants:
   - `MCP_MONITOR_UI_VARIANT=v2|legacy` (default `v2`)
   - `MCP_MONITOR_FALLBACK_TO_LEGACY=true|false` (default `true`)
2. Active monitor directory resolution:
   - V2 target: `AI_Workspace/agentmonitor-v2/dist`
   - Legacy fallback: `AI_Workspace/AgentMonitor`
3. `/monitor` static routing now includes V2 root assets:
   - `/assets/*`
   - `/favicon.svg`
   - `/icons.svg`
4. `/pixel` routing left intact.
5. `/api/health` now reports monitor variant and active monitor directory.

## Verification

### V2 default behavior

- Command used: start server on `4312`, query `/api/health`, `/monitor`, `/pixel/`
- Result:
  - `healthStatus: 200`
  - `monitorStatus: 200`
  - `pixelStatus: 200`
  - `monitorVariant: v2`
  - `monitorDir: .../AI_Workspace/agentmonitor-v2/dist`
  - Monitor page contains V2 title (`agentmonitor-v2`)
  - Pixel page contains `webview-ui`

### Legacy flag behavior

- Command used: start server on `4313` with `MCP_MONITOR_UI_VARIANT=legacy`
- Result:
  - `status: 200`
  - `variant: legacy`
  - `monitorDir: .../AI_Workspace/AgentMonitor`

## Outcome

`/monitor` now serves AgentMonitor V2 by default, `/pixel` remains functional, and legacy fallback is available through environment flags.
