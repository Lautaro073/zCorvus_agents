# TCO-12C - Wave Canary Policy and Abort Thresholds

## Metadata
- taskId: `aiw-observer-tco-12c-wave-canary-policy-abort-thresholds-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Observer`
- collaborators: `AI_Workspace_Optimizer`, `Planner`
- status: `completed`
- date: `2026-04-03`

## Objective
Formalize wave rollout blast radius, minimum observation windows, incident/rollback thresholds, and automatic freeze criteria.

## Delivered changes

### 1) Runtime canary policy evaluator
- Added `AI_Workspace/MCP_Server/lib/context-canary-policy.js`:
  - policy contract `ctx-canary.v1`,
  - per-wave scope/threshold definitions,
  - automatic freeze rules,
  - rollout action evaluation (`continue`, `hold`, `rollback`).

### 2) Monitor API integration
- Updated `AI_Workspace/MCP_Server/monitor-server.js`:
  - new endpoint `GET /api/context/wave_canary`,
  - health exposure under `contextCanary`,
  - endpoint path listed in `/api/health.contextReadModePaths.waveCanary`.
- Added tuning flags:
  - `MCP_CONTEXT_CANARY_ACTIVE_WAVE`
  - `MCP_CONTEXT_CANARY_LOOKBACK_HOURS`

### 3) AgentMonitor V2 consumer adaptation
- Updated `AI_Workspace/agentmonitor-v2/src/hooks/useMcpEvents.ts`:
  - consumes `GET /api/context/wave_canary`.
- Updated `AI_Workspace/agentmonitor-v2/src/App.tsx`:
  - context panel shows `canaryFreeze` state and active wave.
- Updated `AI_Workspace/agentmonitor-v2/src/types/mcp.ts`:
  - added typed contract for wave canary report.

### 4) Policy docs + final runbook linkage
- Added policy spec:
  - `AI_Workspace/docs/internal/specs/token-context-wave-canary-policy-v1.md`
- Added final rollout runbook:
  - `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
- Linked canary policy from observability/coldstart guides:
  - `AI_Workspace/docs/internal/guides/token-context-observability-runbook-20260403.md`
  - `AI_Workspace/docs/internal/guides/token-context-coldstart-sidecar-bootstrap-runbook-20260403.md`

### 5) Tests
- Updated `AI_Workspace/scripts/context-observability.test.mjs` with:
  - canary endpoint contract validation,
  - freeze activation validation when critical observability alerts are active.

## Validation

Executed in `AI_Workspace/`:

```bash
node --check MCP_Server/monitor-server.js
node --test scripts/context-observability.test.mjs
npm --prefix agentmonitor-v2 run build
```

Result: pass.

## Acceptance criteria mapping
1. **Cada wave define alcance inicial y duracion minima**
   - covered in `token-context-wave-canary-policy-v1.md` and runtime canary endpoint.
2. **Cada wave define incident threshold y rollback threshold**
   - covered in policy matrix and runtime evaluator.
3. **Existe criterio de freeze automatico ante incidentes criticos**
   - implemented via canary freeze rules and endpoint output (`freeze.active`, `freeze.reasons`).
4. **Policy enlazada al runbook final**
   - policy references `token-context-rollout-final-runbook-v1.md` and runbook references policy.

## Artifacts
- `AI_Workspace/MCP_Server/lib/context-canary-policy.js`
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/agentmonitor-v2/src/hooks/useMcpEvents.ts`
- `AI_Workspace/agentmonitor-v2/src/App.tsx`
- `AI_Workspace/agentmonitor-v2/src/types/mcp.ts`
- `AI_Workspace/scripts/context-observability.test.mjs`
- `AI_Workspace/docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
- `AI_Workspace/docs/internal/reports/aiw-observer-tco-12c-wave-canary-policy-abort-thresholds-20260403.md`
