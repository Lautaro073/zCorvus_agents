# Token Context Agent Operating Guide v1

## Metadata
- taskId: `aiw-documenter-tco-14-runbook-agent-operating-guide-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Documenter`
- updatedAt: `2026-04-03`

## Audience
Guide for agent profiles and new contributors operating on the compact context model.

## Goal
Ensure every agent can:
1. read context with minimal token cost,
2. expand only when required,
3. preserve decision safety,
4. publish short and traceable MCP events.

## Mandatory workflow

### 1) Context read order
1. `get_agent_inbox`
2. `get_task_snapshot`
3. `get_correlation_snapshot`
4. explicit expansion only when snapshot is insufficient

### 2) Default limits
1. intake: `limit=5`
2. normal triage/debug: `limit=10`
3. broad reads `limit>=20`: only with explicit deep-debug justification

### 3) Message budget
1. target: `<=160` chars
2. soft limit: `<=280` chars
3. if longer detail is needed, move detail to artifact and publish short MCP summary + `artifactPaths`

## MCP event lifecycle discipline
For assigned tasks, use this state flow:

1. `TASK_ASSIGNED` (Orchestrator)
2. `TASK_ACCEPTED`
3. `TASK_IN_PROGRESS`
4. `ARTIFACT_PUBLISHED` or `DOC_UPDATED` (when applicable)
5. `TASK_COMPLETED`

Always include:
1. `taskId`
2. `correlationId`
3. `assignedTo`
4. `status`
5. `timestamp` (runtime generated)

## Compact schema quick examples

### `agent_inbox` minimal shape

```json
{
  "view": "agent_inbox",
  "schemaVersion": "ctx-contract.v1",
  "sourceWatermark": "jsonl:942",
  "integrityHash": "sha256:...",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "agent": "Documenter",
  "tasks": [],
  "truncated": false,
  "nextExpansionHint": null,
  "nextCursor": null
}
```

### `task_snapshot` minimal shape

```json
{
  "view": "task_snapshot",
  "schemaVersion": "ctx-contract.v1",
  "sourceWatermark": "jsonl:942",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "task": {
    "taskId": "aiw-...",
    "status": "in_progress",
    "latestSummary": "..."
  },
  "handoff": {
    "summary": "..."
  },
  "truncated": false,
  "nextExpansionHint": null,
  "nextCursor": null
}
```

### `correlation_snapshot` minimal shape

```json
{
  "view": "correlation_snapshot",
  "schemaVersion": "ctx-contract.v1",
  "sourceWatermark": "jsonl:942",
  "decisionSafety": "safe_for_triage",
  "correlationId": "aiw-token-context-optimization-20260331",
  "overallStatus": "in_progress",
  "tasks": [],
  "truncated": false,
  "nextExpansionHint": null,
  "nextCursor": null
}
```

## Degraded mode operating rules
1. if `degradedMode=true`, treat snapshot as read-only.
2. if `stale=true`, avoid sensitive decisions without expansion.
3. if `decisionSafety=requires_expansion`, do not execute writeback based only on compact snapshot.
4. when both stale+degraded are present, expansion/rebuild is mandatory.

## Flags every agent should understand
1. `MCP_CONTEXT_SIDECARS_ENABLED`
2. `MCP_CONTEXT_RELEVANCE_READS_ENABLED`
3. `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED`
4. `MCP_CONTEXT_MESSAGE_BUDGET_ENABLED`
5. `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED`
6. `MCP_CONTEXT_LEGACY_PAYLOAD_MODE`

## Good and bad query examples

### Good

```bash
curl "http://127.0.0.1:4311/api/context/get_agent_inbox?assignedTo=Documenter&limit=5"
curl "http://127.0.0.1:4311/api/context/get_task_snapshot?taskId=aiw-documenter-tco-14-runbook-agent-operating-guide-20260403-01"
curl "http://127.0.0.1:4311/api/context/get_correlation_snapshot?correlationId=aiw-token-context-optimization-20260331&limit=10"
```

### Bad (unless deep-debug incident)

```bash
curl "http://127.0.0.1:4311/api/events?limit=50"
curl "http://127.0.0.1:4311/api/events?includeTaskEvents=true&limit=50"
```

## Task closure checklist for agents
1. artifact/report path exists
2. docs registry entry updated (for documentation tasks)
3. `DOC_UPDATED` or equivalent artifact event emitted
4. `TASK_COMPLETED` emitted with short operational summary
5. no unresolved blockers hidden from final event

## References
- `docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
- `docs/internal/specs/token-context-contract-v1.md`
- `docs/internal/specs/token-context-budget-table-v1.md`
- `docs/internal/specs/token-context-wave-canary-policy-v1.md`
- `docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`
