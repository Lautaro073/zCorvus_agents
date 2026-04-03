# Token Context Contract v1

## Metadata
- taskId: `aiw-opt-tco-01-context-contract-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- docType: `spec`
- featureSlug: `token-context-optimization`
- owner: `AI_Workspace_Optimizer`
- collaborators: `Documenter` (clarity sync completed), `Planner` (approved_with_non_blocking_notes)
- schemaVersion: `ctx-contract.v1`
- updatedAt: `2026-04-02 (documenter clarity sync)`

## Objective
Define the operational context contract used by agents to consume compact context safely and consistently, replacing broad time-window reads as the default workflow.

This contract standardizes three compact views:

1. `get_agent_inbox`
2. `get_task_snapshot`
3. `get_correlation_snapshot`

## Design Principles
1. `summary-first`: compact snapshot first, expansion on demand.
2. `source-of-truth`: `shared_context.jsonl` is canonical history.
3. `decision-safe`: each snapshot explicitly declares `decisionSafety`.
4. `bounded-context`: every view enforces token budgets and truncation semantics.
5. `legacy-safe`: rollout supports compatibility mode and reversible fallback.

## Naming consistency

To keep this contract aligned with `token-context-schema-evolution-policy-v1`:

1. API operations use `get_*` names:
   - `get_agent_inbox`
   - `get_task_snapshot`
   - `get_correlation_snapshot`
2. Payload `view` values use canonical identifiers without `get_`:
   - `agent_inbox`
   - `task_snapshot`
   - `correlation_snapshot`

## Canonical Enums

### Task status
- `pending`
- `accepted`
- `in_progress`
- `blocked`
- `completed`
- `failed`
- `cancelled`

### Decision safety
- `safe_for_triage`
- `read_only`
- `requires_expansion`

### Operational severity
- `info`
- `warning`
- `medium`
- `high`
- `critical`

## Global Envelope (required in all compact views)

```json
{
  "view": "agent_inbox|task_snapshot|correlation_snapshot",
  "schemaVersion": "ctx-contract.v1",
  "generatedAt": "2026-04-02T05:10:00.000Z",
  "buildVersion": "context-snapshot@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "uuid",
  "sourceWatermark": "jsonl:766",
  "integrityHash": "sha256:...",
  "rebuiltAt": "2026-04-02T05:10:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "truncated": false,
  "nextCursor": null
}
```

### Required envelope rules
- `schemaVersion` is mandatory and must be parseable by consumers.
- `sourceWatermark` must be monotonic.
- `integrityHash` must validate snapshot integrity.
- `nextExpansionHint` must be explicit in payload shape (object or `null`) to avoid consumer drift.
- `truncated=true` requires `nextExpansionHint` plus `nextCursor` (or equivalent continuation metadata) with actionable expansion path.
- `stale=true` requires explicit consumer handling (see fallback matrix).

### `nextExpansionHint` shape

`nextExpansionHint` is required in all compact views as:

```json
{
  "nextExpansionHint": {
    "scope": "task|correlation|agent",
    "query": "taskId|correlationId|assignedTo selector",
    "reason": "truncated|stale|degraded|consumer_request",
    "recommendedLimit": 10
  }
}
```

When no expansion is needed, return:

```json
{
  "nextExpansionHint": null
}
```

### `nextCursor` shape

`nextCursor` is required as explicit field (`object|null`) in compact views. Example forms:

```json
{
  "nextCursor": null
}
```

```json
{
  "nextCursor": {
    "scope": "tasks|correlation_tasks|task_details",
    "offset": 10,
    "total": 57
  }
}
```

## View Contract: `get_agent_inbox`

### Required fields
- Envelope fields
- `agent`
- `openTaskCount`
- `blockedTaskCount`
- `needsAttentionCount`
- `tasks[]`
- `nextExpansionHint` (`object|null`)
- `nextCursor` (`object|null`)

### Task item minimum
- `taskId`
- `correlationId`
- `status`
- `priority`
- `latestEventType`
- `latestSummary`
- `updatedAt`
- `nextAction`

### Compact example

```json
{
  "view": "agent_inbox",
  "schemaVersion": "ctx-contract.v1",
  "generatedAt": "2026-04-02T05:10:00.000Z",
  "buildVersion": "context-snapshot@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "b992f3d2-2b48-4c10-9d78-af3ad2841dcb",
  "sourceWatermark": "jsonl:766",
  "integrityHash": "sha256:abcd1234",
  "rebuiltAt": "2026-04-02T05:10:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "agent": "AI_Workspace_Optimizer",
  "openTaskCount": 1,
  "blockedTaskCount": 0,
  "needsAttentionCount": 1,
  "tasks": [
    {
      "taskId": "aiw-opt-tco-01-context-contract-20260402-01",
      "correlationId": "aiw-token-context-optimization-20260331",
      "status": "in_progress",
      "priority": "high",
      "latestEventType": "TASK_IN_PROGRESS",
      "latestSummary": "Defining context contract and compact schemas",
      "updatedAt": "2026-04-02T05:00:31.943Z",
      "nextAction": "Publish versioned spec and request Planner review",
      "artifactPaths": [
        "AI_Workspace/docs/internal/specs/token-context-contract-v1.md"
      ]
    }
  ],
  "truncated": false,
  "nextCursor": null
}
```

## View Contract: `get_task_snapshot`

### Required fields
- Envelope fields
- `task` object
- `handoff` object (compact continuation summary)
- `nextExpansionHint` (`object|null`)
- `nextCursor` (`object|null`)

### Task object minimum
- `taskId`
- `correlationId`
- `assignedTo`
- `status`
- `priority`
- `dependsOn[]`
- `description`
- `acceptanceCriteria[]`
- `latestEventType`
- `latestSummary`
- `updatedAt`
- `blockers[]`
- `nextAction`
- `handoffSummary`

### Compact example

```json
{
  "view": "task_snapshot",
  "schemaVersion": "ctx-contract.v1",
  "generatedAt": "2026-04-02T05:10:00.000Z",
  "buildVersion": "context-snapshot@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "b992f3d2-2b48-4c10-9d78-af3ad2841dcb",
  "sourceWatermark": "jsonl:766",
  "integrityHash": "sha256:efgh5678",
  "rebuiltAt": "2026-04-02T05:10:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "task": {
    "taskId": "aiw-opt-tco-01-context-contract-20260402-01",
    "correlationId": "aiw-token-context-optimization-20260331",
    "assignedTo": "AI_Workspace_Optimizer",
    "status": "in_progress",
    "priority": "high",
    "parentTaskId": null,
    "dependsOn": ["aiw-opt-tco-00-baseline-expansion-20260331-01"],
    "description": "Define and version compact context contract views",
    "acceptanceCriteria": [
      "Versioned spec in docs/internal/specs",
      "Formal schemas for inbox/task/correlation",
      "Rollout, fallback and legacy compatibility rules"
    ],
    "latestEventType": "TASK_IN_PROGRESS",
    "latestSummary": "Schema and fallback policy in progress",
    "updatedAt": "2026-04-02T05:00:31.943Z",
    "blockers": [],
    "nextAction": "Request Planner sign-off and Documenter collaboration",
    "handoffSummary": "Task aiw-opt-tco-01-context-contract-20260402-01 is in progress. Schema and fallback policy in progress. Next: Request Planner sign-off and Documenter collaboration.",
    "artifactPaths": [
      "AI_Workspace/docs/internal/specs/token-context-contract-v1.md"
    ]
  },
  "handoff": {
    "summary": "Task aiw-opt-tco-01-context-contract-20260402-01 is in progress. Schema and fallback policy in progress. Next: Request Planner sign-off and Documenter collaboration.",
    "status": "in_progress",
    "updatedAt": "2026-04-02T05:00:31.943Z",
    "nextAction": "Request Planner sign-off and Documenter collaboration",
    "blockers": [],
    "artifactPaths": [
      "AI_Workspace/docs/internal/specs/token-context-contract-v1.md"
    ]
  },
  "truncated": false,
  "nextCursor": null
}
```

## View Contract: `get_correlation_snapshot`

### Required fields
- Envelope fields
- `correlationId`
- `overallStatus`
- `activeTaskCount`
- `blockedTaskCount`
- `lastUpdatedAt`
- `criticalUpdates[]`
- `tasks[]`
- `handoff` object (compact continuation summary)
- `nextExpansionHint` (`object|null`)
- `nextCursor` (`object|null`)

### Compact example

```json
{
  "view": "correlation_snapshot",
  "schemaVersion": "ctx-contract.v1",
  "generatedAt": "2026-04-02T05:10:00.000Z",
  "buildVersion": "context-snapshot@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "b992f3d2-2b48-4c10-9d78-af3ad2841dcb",
  "sourceWatermark": "jsonl:766",
  "integrityHash": "sha256:ijkl9012",
  "rebuiltAt": "2026-04-02T05:10:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "correlationId": "aiw-token-context-optimization-20260331",
  "overallStatus": "in_progress",
  "activeTaskCount": 2,
  "blockedTaskCount": 0,
  "lastUpdatedAt": "2026-04-02T05:00:31.943Z",
  "criticalUpdates": [
    {
      "taskId": "aiw-opt-tco-01-context-contract-20260402-01",
      "status": "in_progress",
      "summary": "Context contract specification in drafting phase"
    }
  ],
  "tasks": [
    {
      "taskId": "aiw-opt-tco-00-baseline-expansion-20260331-01",
      "assignedTo": "AI_Workspace_Optimizer",
      "status": "completed",
      "latestSummary": "Baseline expanded with p50/p95 and intake-cost metrics",
      "updatedAt": "2026-04-02T04:57:45.416Z",
      "handoffSummary": "Task aiw-opt-tco-00-baseline-expansion-20260331-01 is completed. Baseline expanded with p50/p95 and intake-cost metrics."
    },
    {
      "taskId": "aiw-opt-tco-01-context-contract-20260402-01",
      "assignedTo": "AI_Workspace_Optimizer",
      "status": "in_progress",
      "latestSummary": "Contract schemas and fallback matrix being finalized",
      "updatedAt": "2026-04-02T05:00:31.943Z",
      "handoffSummary": "Task aiw-opt-tco-01-context-contract-20260402-01 is in progress. Contract schemas and fallback matrix being finalized."
    }
  ],
  "handoff": {
    "summary": "Correlation aiw-token-context-optimization-20260331 is in progress with 2/2 active tasks. Critical: aiw-opt-tco-01-context-contract-20260402-01 - Context contract specification in drafting phase.",
    "overallStatus": "in_progress",
    "activeTaskCount": 2,
    "blockedTaskCount": 0,
    "criticalTaskIds": [
      "aiw-opt-tco-01-context-contract-20260402-01"
    ]
  },
  "truncated": false,
  "nextCursor": null
}
```

## Message Budget Contract

### Event message budget
- Target: `<= 160` chars
- Soft limit: `<= 280` chars
- Hard limit mode (feature flag): reject or force truncation for messages above configured threshold

### Enforcement and flags
- `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED=false` (default): soft enforcement with warning + truncation to target budget.
- `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED=true`: messages above soft limit require `artifactPaths` or publication is rejected.
- Optional tuning:
  - `MCP_CONTEXT_MESSAGE_TARGET_CHARS` (default `160`)
  - `MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS` (default `280`)

### Long detail handling
- Long narrative content must be externalized to artifact files.
- MCP events should carry short operational summary + `artifactPaths`.

### Offload trace fields
- Writers may attach `messageBudget` metadata in payload with:
  - `originalLength`, `normalizedLength`, `state`, `offloadRequired`, `artifactPathsPresent`.
- If a message exceeds soft limit without artifacts (soft mode), writers may include `offloadHint` with recommended report path.

## Token Budget Contract (compact views)

Versioned budget source:
- `docs/internal/specs/token-context-budget-table-v1.md` (`policyVersion=ctx-budget.v1`)

| View | Target | Hard cap | Action when cap reached |
|---|---:|---:|---|
| `get_agent_inbox` | 1200 tokens | 1800 tokens | prioritize `needsAttention`, truncate task list, set `truncated=true` |
| `get_task_snapshot` | 1600 tokens | 2400 tokens | compact criteria/blockers, drop optional details, set `truncated=true` |
| `get_correlation_snapshot` | 2200 tokens | 3200 tokens | include active/critical tasks only, set `truncated=true` |

### Budget metadata in responses

Compact views should include `tokenBudget` metadata:

```json
{
  "tokenBudget": {
    "targetTokens": 1600,
    "hardTokens": 2400,
    "estimatedTokensBefore": 2890,
    "estimatedTokensAfter": 2388,
    "truncatedByBudget": true,
    "withinHardLimit": true
  }
}
```

This metadata is used for auditability of hard-limit enforcement.

## Cache and Fingerprint Contract

Compact snapshot consumers may receive cache/fingerprint metadata for repeated payload reuse:

```json
{
  "snapshotFingerprint": "sha256:...",
  "readAudit": {
    "cacheEnabled": true,
    "cacheHit": true,
    "cacheKey": "sha256:...",
    "cacheKeyFingerprint": "sha256:...",
    "cacheWatermark": "jsonl:1024",
    "cacheInvalidated": false
  }
}
```

Cache invalidation rule:
- watermark change (`sourceWatermark`) invalidates compact cache entries.

Operational target:
- compact cache + fingerprint layer should deliver measurable runtime savings (target range 10-30% in repeated compact reads).

Budget tuning procedure is defined in:
- `docs/internal/runbooks/token-context-budget-adjustment-runbook.md`

## Explicit out of scope for v1

The following budgets are intentionally deferred and do not block TCO-01:

1. `get_recent_failures` token budget calibration
2. downstream consumer-specific prompt budget tuning

These are handled in later execution tracks.

## Fallback and Debug Policy

### Normal mode
- `stale=false`, `degradedMode=false`, `decisionSafety=safe_for_triage`
- compact view can be used for triage and task execution decisions.

### Stale mode
- `stale=true`, `decisionSafety=read_only`
- triage allowed with warning, sensitive operations require expansion.

### Degraded mode
- `degradedMode=true`, `decisionSafety=read_only` or `requires_expansion`
- no writeback decisions from compact view; force rebuild or JSONL expansion.

### Degraded mode decision matrix (runtime policy)

All compact views may expose a `safetyPolicy` object to make degraded behavior explicit and auditable:

```json
{
  "safetyPolicy": {
    "operationalState": "normal|stale|degraded|stale+degraded",
    "allowReadOnly": true,
    "allowTriage": true,
    "allowWriteback": false,
    "forceRebuild": false,
    "forceJsonlExpansion": false,
    "criticalStale": false,
    "sensitiveAction": false
  }
}
```

Decision matrix:

| Estado | `decisionSafety` | allow_read_only | allow_triage | allow_writeback | force_rebuild | force_jsonl_expansion |
|---|---|---|---|---|---|---|
| `normal` | `safe_for_triage` | yes | yes | yes (if no extra blockers) | no | no |
| `stale` | `read_only` | yes | yes (with warning) | no | only for critical age or sensitive action | yes when sensitive |
| `degraded` | `read_only` | yes | limited | no | yes | yes |
| `stale+degraded` | `requires_expansion` | yes (informative) | no | no | yes | yes |

### Conflict rule
- If snapshot and `shared_context.jsonl` disagree, JSONL wins.

## Legacy Compatibility Contract

### Required flags
- `MCP_CONTEXT_SIDECARS_ENABLED` (default `true`)
- `MCP_CONTEXT_RELEVANCE_READS_ENABLED` (default `true`)
- `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED` (default `true`)
- `MCP_CONTEXT_REDACTION_ENABLED` (default `true`)
- `MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED` (default `true`)
- `MCP_CONTEXT_SLIM_API_EVENTS_ENABLED` (default `true`)
- `MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED` (default `true`)
- `MCP_CONTEXT_MESSAGE_BUDGET_ENABLED` (default `true`)
- `MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED` (default `true`)
- `MCP_CONTEXT_DEDUP_ENABLED` (default `true`)
- `MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED` (default `true`)
- `MCP_CONTEXT_COMPACT_CACHE_ENABLED` (default `true`)
- `MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES` (default `256`)
- `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED` (default `false` on initial rollout)
- `MCP_CONTEXT_LEGACY_PAYLOAD_MODE` (default `false`, temporary fallback only)
- View budget overrides:
  - `MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS`
  - `MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS`
  - `MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS`
  - `MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS`
  - `MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS`
  - `MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS`
- Handoff budget overrides:
  - `MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS`
  - `MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS`
  - `MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS`
  - `MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS`
- Sidecar validation cadence:
  - `MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS`

### Rollout rules
1. Keep legacy mode as emergency fallback only.
2. Any legacy hit in stable window is a rollback signal for current wave.
3. Exit criteria from legacy mode requires sustained zero-hit window.
4. Broad fallback usage must remain below target in the same stable window before final legacy retirement.
5. Canonical retirement checklist and rollback sequence are defined in `docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`.

## Snapshot Sufficiency Criteria

Compact snapshot is considered sufficient (`snapshot_sufficient=true`) when all are true:

1. `stale=false`
2. `degradedMode=false`
3. `decisionSafety=safe_for_triage`
4. required entity present (`taskId` or `correlationId` scope)
5. unresolved blockers are explicitly represented
6. `truncated=false` OR truncation includes enough data to decide next action

If any condition fails, consumer should escalate to expansion on demand.

## Snapshot redaction and memory safety guardrails

- Compact views must sanitize summaries for sensitive tokens and instruction-like contamination.
- If sensitive patterns are detected, values are redacted (`[REDACTED]`) before compact exposure.
- If instruction-like patterns are detected, summaries are sanitized (`[instruction-redacted]`) to avoid prompt contamination transfer.
- Guardrail telemetry can be exposed in compact summaries via safety metadata (for example `latestSummarySafety`).
- Runtime toggles:
  - `MCP_CONTEXT_REDACTION_ENABLED`
  - `MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED`

## Minimum Expansion Paths
- Task-focused debug: expand by `taskId`
- Epic-focused debug: expand by `correlationId`
- Agent-focused intake debug: expand by `assignedTo` + bounded `limit`
- `/api/events` deep debug mode: `includeTaskEvents=true` (expanded payload).

## `/api/events` payload mode contract

- Default mode is **compact** (`includeTaskEvents=false`), where `tasks[]` contains summaries (`eventCount`, `latestStatus`, `updatedAt`, etc.) without nested `task.events`.
- Explicit expansion mode is **expanded** (`includeTaskEvents=true`) for deep debugging.
- For temporary legacy compatibility, server may use `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true` to default to expanded mode until consumers migrate.

## Canonical payload normalization contract

- Writers must avoid canonical duplication inside `payload` when the same values are already present at top-level event fields.
- Canonical fields covered by normalization:
  - `taskId`, `assignedTo`, `status`, `priority`, `correlationId`, `parentTaskId`, `dependsOn`, `artifactPaths`, `payloadVersion`
- Legacy fallback is supported via `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true` (preserves duplicated payload shape temporarily).

## Deterministic dedup and noise suppression contract

- Writers may suppress lifecycle replay noise for `TASK_*` events when the latest lifecycle event for the same task has identical:
  - `taskId`, `type`, `status`, `agent`
  - semantic payload fingerprint (summary/action/artifact/dependency core fields).
- Suppression applies only within a bounded window (`MCP_CONTEXT_DEDUP_WINDOW_MS`, default `900000`).
- If the latest lifecycle transition differs (different status/type/agent), event must not be suppressed.
- If semantic payload differs, event must not be suppressed.
- Suppressed events should return explicit metadata (`suppressed=true`, dedupe reason/key) so behavior is auditable.
- Runtime toggle:
  - `MCP_CONTEXT_DEDUP_ENABLED` (default `true`)

## Compliance Checklist (for TCO-02 and TCO-02A)
- Profiles use summary-first order.
- Default intake limit <= 10.
- Message budget policy present in all core profiles.
- Broad reads (`limit >= 20`) require explicit debug intent.

## Planner / Documenter Evidence Hooks

For this spec to be considered signed-off in operations:

1. Planner review must be registered via MCP event evidence (`PLAN_PROPOSED`/review task outcome).
2. Documenter collaboration must be registered via MCP event evidence (`DOC_UPDATED` or equivalent artifact collaboration task).

This TCO-01 spec is publishable without blocking those tasks, but rollout should not proceed to TCO-03+ without both evidence gates.

## Collaboration notes (2026-04-02)

Applied from `docs/internal/reports/aiw-planner-tco-01-review-20260402.md`:

1. Made truncation expansion guidance explicit by requiring `nextExpansionHint` shape.
2. Clarified deferred budget topics as explicit out-of-scope for TCO-01.
3. Kept rollout gate requirement: TCO-03+ only after Planner + Documenter evidence is registered.
