# Token Context Rollout Final Runbook v1

## Metadata
- taskId: `aiw-documenter-tco-14-runbook-agent-operating-guide-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Documenter`
- contributors: `Observer`, `AI_Workspace_Optimizer`, `Planner`, `Tester`
- updatedAt: `2026-04-03 (tco-14 final consolidation)`
- policyRef: `token-context-wave-canary-policy-v1`

## Scope
Final operational runbook for rollout and steady-state operation of compact context architecture.

This runbook defines:
1. rollout go/no-go and freeze handling,
2. degraded/stale safety policy in operations,
3. budget and flag governance,
4. legacy retirement sequence,
5. good/bad MCP query patterns.

## Final operating model

### Mandatory read order (summary-first)
1. `get_agent_inbox`
2. `get_task_snapshot`
3. `get_correlation_snapshot`
4. bounded expansion only when needed

### Safety-first decision rule
Use compact snapshots for execution decisions only when:
1. `stale=false`
2. `degradedMode=false`
3. `decisionSafety=safe_for_triage`

If not true, switch to read-only triage and expand safely.

## Runtime health commands

```bash
curl http://127.0.0.1:4311/api/health
curl http://127.0.0.1:4311/api/context/observability
curl http://127.0.0.1:4311/api/context/wave_canary
```

Minimum healthy baseline:
1. `contextFlags.sidecarsEnabled=true`
2. `contextFlags.relevanceReadsEnabled=true`
3. `contextLegacyPayloadMode=false`
4. `contextObservability.alerts` has no critical alerts
5. `contextCanary.snapshot.freeze.active=false`

## Wave go/no-go checklist
1. active wave matches `MCP_CONTEXT_CANARY_ACTIVE_WAVE`
2. canary freeze is inactive
3. no critical observability alerts
4. sidecar provenance is healthy (`sourceWatermark` monotonic, no integrity mismatch)
5. incident counts remain within active wave thresholds

## Automatic freeze handling
When `freeze.active=true`:
1. stop wave progression immediately
2. keep sensitive operations read-only
3. run targeted remediation:
   - `docs/internal/guides/token-context-observability-runbook-20260403.md`
   - `docs/internal/guides/token-context-coldstart-sidecar-bootstrap-runbook-20260403.md`
4. resume rollout only with explicit owner approval event

## Degraded and stale operations policy

### Decision matrix
1. `normal`: full triage and writeback allowed
2. `stale`: triage allowed with warning, sensitive decisions require expansion
3. `degraded`: no writeback from compact snapshots, force rebuild or expansion
4. `stale+degraded`: expansion mandatory before action

### Transition goal (`degraded -> normal`)
Transition is successful only when all are true:
1. compact responses read in `snapshot_first` mode
2. `stale=false` and `degradedMode=false`
3. `decisionSafety=safe_for_triage`
4. observability and canary endpoints show no active critical blockers

## Budget and flags governance

### Core compact budget policy
From `token-context-budget-table-v1.md` (`ctx-budget.v1`):
1. `agent_inbox`: target 1200, hard 1800
2. `task_snapshot`: target 1600, hard 2400
3. `correlation_snapshot`: target 2200, hard 3200

### Required runtime flags
1. `MCP_CONTEXT_SIDECARS_ENABLED`
2. `MCP_CONTEXT_RELEVANCE_READS_ENABLED`
3. `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED`
4. `MCP_CONTEXT_MESSAGE_BUDGET_ENABLED`
5. `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED`
6. `MCP_CONTEXT_LEGACY_PAYLOAD_MODE`

### Budget override path
Use env overrides documented in:
- `docs/internal/runbooks/token-context-budget-adjustment-runbook.md`

## Legacy retirement (TCO-12A)
1. run readiness checker:

```bash
node AI_Workspace/scripts/check-legacy-deprecation-readiness.mjs
```

2. require full gate pass:
   - `legacyModeHitRate=0`
   - `broadFallbackRate <= 0.10`
   - `freeze.active=false`
   - wave-3 `rolloutAction != rollback`
3. keep `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false` for full stable window
4. if rollback trigger appears, temporarily enable legacy mode and publish incident evidence
5. keep expanded `/api/events?includeTaskEvents=true` as debug-only path

## Good and bad MCP query patterns

### Good patterns
1. agent intake:

```bash
curl "http://127.0.0.1:4311/api/context/get_agent_inbox?assignedTo=Documenter&limit=5"
```

2. task decision context:

```bash
curl "http://127.0.0.1:4311/api/context/get_task_snapshot?taskId=aiw-documenter-tco-14-runbook-agent-operating-guide-20260403-01&sensitiveAction=true"
```

3. correlation triage:

```bash
curl "http://127.0.0.1:4311/api/context/get_correlation_snapshot?correlationId=aiw-token-context-optimization-20260331&limit=10"
```

### Bad patterns (except deep debug incidents)
1. broad recency read as default:

```bash
curl "http://127.0.0.1:4311/api/events?limit=50"
```

2. forcing expanded payloads for routine intake:

```bash
curl "http://127.0.0.1:4311/api/events?includeTaskEvents=true&limit=50"
```

3. unbounded expansion without scope (`taskId`, `correlationId`, `assignedTo`)

## Exit criteria per wave
1. minimum observation window completed
2. no critical incidents in window
3. no unresolved critical observability alerts
4. owner approval event published

## Related artifacts
- `docs/internal/specs/token-context-contract-v1.md`
- `docs/internal/specs/token-context-budget-table-v1.md`
- `docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`
- `docs/internal/specs/token-context-observability-slo-v1.md`
- `docs/internal/guides/token-context-observability-runbook-20260403.md`
- `docs/internal/guides/token-context-coldstart-sidecar-bootstrap-runbook-20260403.md`
- `docs/internal/guides/token-context-agent-operating-guide-v1.md`
