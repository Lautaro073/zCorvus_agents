# Token Context Wave Canary Policy v1

## Metadata
- docId: `token-context-wave-canary-policy-v1`
- featureSlug: `token-context-optimization`
- schemaVersion: `ctx-canary.v1`
- owner: `Observer`
- collaborators: `AI_Workspace_Optimizer`, `Planner`
- relatedTaskId: `aiw-observer-tco-12c-wave-canary-policy-abort-thresholds-20260403-01`
- updatedAt: `2026-04-03`

## Objective
Formalize rollout blast radius, minimum observation windows, incident/rollback thresholds, and automatic freeze criteria for each rollout wave.

## Policy source
- Runtime endpoint: `GET /api/context/wave_canary`
- Runtime embed in health: `GET /api/health` -> `contextCanary`

## Global freeze rules
1. automatic freeze when at least one critical incident is detected.
2. automatic freeze when at least one critical observability alert is active.
3. automatic freeze when active wave requires rollback.

## Wave policy matrix

| Wave | Initial scope | Blast radius | Minimum observation | Incident threshold | Rollback threshold | Approval owner |
|---|---|---|---|---|---|---|
| `wave-1` | Planner + AI_Workspace_Optimizer | Internal non-critical tasks | 24h | `medium > 1` or `high > 0` | `critical >= 1` or stale spike sustained | AI_Workspace_Optimizer |
| `wave-2` | Observer + Documenter + AgentMonitorV2 | Compact-consumer path + observability UI | 48h | `medium > 2` or `high > 0` | `critical >= 1` or stale spike sustained | Observer |
| `wave-3` | Backend + Tester + Frontend + Orchestrator | Staging-wide consumer adoption | 48h + stable window | `medium > 2` or `high > 0` | `critical >= 1`, legacy hit sustained, or sidecar reliability degradation | Orchestrator |

## Auto-freeze criterion (mandatory)
Freeze must activate automatically for any active wave when either is true:
1. `critical_incident_detected`
2. `critical_observability_alert_active`

## Runtime tuning flags
- `MCP_CONTEXT_CANARY_ACTIVE_WAVE` (default: `wave-2`)
- `MCP_CONTEXT_CANARY_LOOKBACK_HOURS` (default: `48`)

## Linked runbook
- `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`

## Notes
1. This policy is rollout safety control, not replacement for SLO thresholds.
2. SLO signal definitions remain in `token-context-observability-slo-v1.md`.
