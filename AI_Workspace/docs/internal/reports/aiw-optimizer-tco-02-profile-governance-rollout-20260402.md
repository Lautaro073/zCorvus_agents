# TCO-02 Profile Governance Rollout Report

- **taskId:** `aiw-opt-tco-02-profile-governance-rollout-20260402-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Apply consistent context-governance rules to all core agent profiles:

1. Summary-first consultation order
2. Default read limits (intake/triage)
3. Broad-read justification policy
4. Message budget + artifact offload policy

## Files Updated

1. `AI_Workspace/Agents/Orchestrator/profile.md`
2. `AI_Workspace/Agents/Planner/profile.md`
3. `AI_Workspace/Agents/Backend/profile.md`
4. `AI_Workspace/Agents/Frontend/profile.md`
5. `AI_Workspace/Agents/Tester/profile.md`
6. `AI_Workspace/Agents/Observer/profile.md`
7. `AI_Workspace/Agents/Documenter/profile.md`
8. `AI_Workspace/Agents/AI_Workspace_Optimizer/profile.md`

## Diff Summary (by policy)

### 1) Consultation order (new, 8/8 profiles)

Added section `Gobernanza de contexto (TCO-02)` with mandatory order:

`get_agent_inbox -> get_task_snapshot -> get_correlation_snapshot -> expansion puntual`

### 2) Default limits (normalized)

- Updated intake examples from `limit: 20` to `limit: 5` in operational profiles.
- Added triage/debug default `limit=10` in the governance section.

Changed intake commands:

- Backend: `limit: 20 -> 5`
- Frontend: `limit: 20 -> 5`
- Tester: `limit: 20 -> 5`
- Observer: `limit: 20 -> 5`
- Documenter: `limit: 20 -> 5`
- Planner: `limit: 20 -> 5`
- Orchestrator sample API query: `limit=20 -> 5`

### 3) Broad reads policy (new, 8/8 profiles)

Added rule: `limit >= 20` only with explicit deep-debug justification and scoped selector (`taskId`, `correlationId`, `assignedTo`, or `parentTaskId`).

### 4) Message budget and artifact offload (new, 8/8 profiles)

Added rule:

- `message` ideal <= 160 chars
- soft cap <= 280 chars
- longer detail goes to `artifactPaths`

## Consistency Evidence

Verification queries were run to confirm full rollout:

- `Gobernanza de contexto (TCO-02)` present in 8 profiles
- Mandatory order string present in 8 profiles
- `limit=5` + `limit=10` guidance present in all target profiles
- message budget rule present in all target profiles

## Acceptance Criteria Mapping

- All main profiles updated consistently -> **done**
- Mandatory consultation order documented -> **done**
- Default limits and broad-read justification documented -> **done**
- Message budget + artifact offload documented -> **done**
- File-by-file evidence + diff summary published -> **done**
