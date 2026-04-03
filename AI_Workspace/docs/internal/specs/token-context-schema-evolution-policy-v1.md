# Token Context Schema Evolution Policy v1

## Metadata
- taskId: `aiw-opt-tco-01a-schema-evolution-policy-20260402-01`
- correlationId: `aiw-token-context-optimization-20260331`
- docType: `spec`
- featureSlug: `token-context-optimization`
- owner: `AI_Workspace_Optimizer`
- collaborators: `Planner` (review approved), `Documenter` (terminology sync completed)
- dependsOn:
  - `aiw-opt-tco-01-context-contract-20260402-01`
  - `aiw-planner-tco-01-review-20260402-01`
  - `aiw-documenter-tco-01-collab-20260402-01`
- schemaPolicyVersion: `ctx-schema-policy.v1`
- updatedAt: `2026-04-02 (documenter terminology sync)`

## Goal
Define how compact context schemas evolve over time without breaking consumers, while preserving safe fallback behavior and deterministic CI validation.

This policy governs all views in the context contract family:

1. `get_agent_inbox`
2. `get_task_snapshot`
3. `get_correlation_snapshot`

## Terminology alignment with Token Context Contract v1

To avoid naming drift across specs, payloads and fixtures:

1. **Operation names** use `get_*` format:
   - `get_agent_inbox`
   - `get_task_snapshot`
   - `get_correlation_snapshot`
2. **Payload `view` identifiers** use canonical values without `get_`:
   - `agent_inbox`
   - `task_snapshot`
   - `correlation_snapshot`
3. **Fixture manifest and CI validation** must use canonical payload `view` identifiers.

## Versioning Model

### Schema family and format
- Family prefix: `ctx-contract`
- Version format: `ctx-contract.v<major>`
- Example: `ctx-contract.v1`, `ctx-contract.v2`

### Semantic rules
1. **Major version bump (`vN -> vN+1`)**
   - Required for removals, field renames, enum tightening, semantic changes, or required-field additions that can break existing consumers.
2. **Additive change inside same major**
   - Allowed if all existing required fields remain unchanged and old consumers can ignore the new field.
3. **No silent behavior changes**
   - Any decision-impacting semantics (`decisionSafety`, truncation behavior, fallback semantics) must be explicitly versioned and documented.

## Compatibility Contract

### Backward compatibility (new consumer reads older payload)
- **Supported** by default.
- New consumers must parse older major versions and normalize to current internal model when possible.

### Forward compatibility (old consumer reads newer payload)
- **Not guaranteed** across major versions.
- Required behavior for old consumers:
  1. Detect unsupported major version.
  2. Enter safe fallback path (`fallback_required`).
  3. Request expansion (`taskId`, `correlationId`, or bounded agent query) instead of making writeback decisions.

### Unknown fields policy
- Consumers must ignore unknown additive fields within supported major version.
- Unknown fields must never override required canonical semantics.

## Coexistence Windows

### Standard coexistence window
- Minimum coexistence: **2 release waves** and **3 operational days** in staging.
- During coexistence:
  - producers may emit both old and new versions (or provide compatibility bridge),
  - consumers must expose compatibility telemetry.

### Exit criteria from old major
All must be true before deprecating old major version:

1. `legacy_mode_hit_rate = 0` during the full stable window.
2. No `critical` compatibility incidents.
3. CI fixtures pass for both current major and migration scenarios.
4. Orchestrator sign-off on migration readiness.

## Migration Criteria for Consumers

A consumer is migration-ready when:

1. It validates `schemaVersion` at parse time.
2. It supports safe fallback on unsupported major versions.
3. It preserves `decisionSafety` guarantees under fallback (`read_only` or `requires_expansion`).
4. It passes fixture validation in CI for:
   - native version read,
   - backward read,
   - forward read fallback.

## CI Fixtures and Validation Strategy

### Fixture set
- Manifest: `AI_Workspace/docs/internal/specs/fixtures/context-contract/manifest.json`
- v1 fixtures:
  - `AI_Workspace/docs/internal/specs/fixtures/context-contract/v1/agent_inbox.v1.json`
  - `AI_Workspace/docs/internal/specs/fixtures/context-contract/v1/task_snapshot.v1.json`
  - `AI_Workspace/docs/internal/specs/fixtures/context-contract/v1/correlation_snapshot.v1.json`
- v2 migration fixture:
  - `AI_Workspace/docs/internal/specs/fixtures/context-contract/v2/task_snapshot.v2.additive.json`

### Validation command (CI-ready)

```bash
node AI_Workspace/scripts/validate-context-contract-fixtures.mjs
```

The validator enforces:
1. required global envelope fields,
2. view-specific required fields,
3. schemaVersion format and decisionSafety enums,
4. compatibility scenarios declared in manifest.

Additional policy requirements:
5. when schema evolution changes `agent_inbox` or `correlation_snapshot`, fixture coverage must be expanded to include affected views,
6. if new canonical enums are introduced, CI validation must include explicit enum coverage rules.

## Compatibility Scenarios (normative)

| Producer fixture | Consumer version | Expected result |
|---|---|---|
| `ctx-contract.v1` | `ctx-contract.v1` | `native` |
| `ctx-contract.v1` | `ctx-contract.v2` | `backward_compatible` |
| `ctx-contract.v2` | `ctx-contract.v1` | `fallback_required` |
| `ctx-contract.v2` | `ctx-contract.v2` | `native` |

## Rollback and Safety Rules

1. If compatibility validation fails in CI, block rollout.
2. If runtime parser mismatch is detected, force fallback and emit operational alert.
3. If compatibility incidents exceed threshold, freeze wave and revert to previous stable major.

## Implementation Guidance for Next Tasks

This policy is a prerequisite for:

- TCO-03 (`/api/events` slimming)
- TCO-04 (payload normalization)
- TCO-07 (relevance-first read modes)

Future implementation tasks should consume this spec as the source policy for migration and CI enforcement.

## Documenter collaboration notes (2026-04-02)

Applied from `docs/internal/reports/aiw-planner-tco-01a-review-20260402.md`:

1. Added explicit terminology contract to keep operation names and payload view identifiers consistent.
2. Incorporated forward fixture expansion guidance for `agent_inbox` and `correlation_snapshot` when future versions touch those views.
3. Added explicit CI extension rule for newly introduced canonical enums.
4. Kept `Orchestrator sign-off on migration readiness` as exit criterion for old-major deprecation, not as a blocker for this policy baseline.
