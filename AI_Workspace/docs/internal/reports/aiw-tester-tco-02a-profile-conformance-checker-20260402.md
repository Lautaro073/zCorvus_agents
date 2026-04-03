# TCO-02A Profile & Context Conformance Checker Report

- Task ID: `aiw-tester-tco-02a-profile-conformance-checker-20260402-01`
- Correlation ID: `aiw-token-context-optimization-20260331`
- Date: 2026-04-02
- Agent: Tester

## Objective

Implement and validate an automated CI checker that enforces:

1. Profile governance conformance (8 core profiles)
2. No broad reads by default
3. Snapshot schema/sample conformance
4. Required flags (`truncated`, `degradedMode`, `decisionSafety`)

## Implementation

### New checker script

- `scripts/check-profile-context-conformance.mjs`

What it validates:

1. Required policy blocks in all 8 profiles:
   - `Gobernanza de contexto (TCO-02)`
   - mandatory order `get_agent_inbox -> get_task_snapshot -> get_correlation_snapshot -> expansion puntual`
   - default limits (`limit=5`, `limit=10`)
   - broad-read policy (`limit >= 20` with justification)
   - message budget + artifact offload (`artifactPaths`)
2. Fails if broad reads appear as defaults in profile command examples:
   - `get_events(... limit: >=20 ...)`
   - `/api/events?...limit=20+`
3. Snapshot fixtures contain required operational flags:
   - `truncated`
   - `degradedMode`
   - `decisionSafety` (valid enum)
4. Executes contract fixture validator:
   - `scripts/validate-context-contract-fixtures.mjs`

### CI integration

Workflow updated:

- `.github/workflows/ai-workspace-ci.yml`

Added step in `workspace` job:

```yaml
- name: Run profile/context conformance checker
  run: node scripts/check-profile-context-conformance.mjs
```

## Local execution evidence

Command:

```bash
node scripts/check-profile-context-conformance.mjs
```

Result:

- `ok: true`
- `checkedProfiles: 8`
- `profileChecks: 8/8 pass`
- `fixtureFlags: pass`
- `fixtureContract: pass`

## Acceptance criteria mapping

1. CI fails if profile reintroduces broad reads by default -> **PASS**
   - rule is enforced in checker + wired into CI workflow.
2. Checker validates mandatory base rules in 8 profiles -> **PASS**
   - all 8 profiles checked and passing.
3. Checker validates snapshot schema/samples and required flags -> **PASS**
   - runs fixture contract validator + explicit flags checks.
4. Reproducible execution evidence published -> **PASS**
   - command and successful output documented.

## Artifacts

- `AI_Workspace/scripts/check-profile-context-conformance.mjs`
- `AI_Workspace/.github/workflows/ai-workspace-ci.yml`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-02a-profile-conformance-checker-20260402.md`

## Verdict

`TEST_PASSED`
