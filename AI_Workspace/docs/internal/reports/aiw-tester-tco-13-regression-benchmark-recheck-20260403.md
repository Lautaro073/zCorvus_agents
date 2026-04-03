# TCO-13 Regression + Benchmark Recheck Report

- Task ID: `aiw-tester-tco-13-regression-benchmark-recheck-20260403-01`
- Correlation ID: `aiw-token-context-optimization-20260331`
- Date: 2026-04-03
- Agent: Tester

## Objective

Recheck TCO-13 after Optimizer fix for corrupted sidecar fallback integrity.

## Commands executed

```bash
node scripts/validate-context-contract-fixtures.mjs
node scripts/check-profile-context-conformance.mjs
node --test scripts/context-read-modes.test.mjs scripts/context-sidecars.test.mjs scripts/context-observability.test.mjs scripts/monitor-sidecars.test.mjs
node scripts/context-token-baseline.mjs > docs/internal/reports/aiw-tester-tco-13-context-token-baseline-recheck-20260403.json
node scripts/analyze-token-budget-enforcement-impact.mjs > docs/internal/reports/aiw-tester-tco-13-budget-impact-recheck-20260403.json
```

Additional runtime sample:

```bash
node -e "...spawn monitor server and fetch /api/context/observability..."
```

## Results

### Contract + profile checks
- `validate-context-contract-fixtures`: **PASS**
- `check-profile-context-conformance`: **PASS**
  - 8/8 profiles conformant
  - no broad-read-default violations

### Regression suite
- `context-read-modes + context-sidecars + context-observability + monitor-sidecars`: **PASS (15/15)**
- Previously failing case now passes:
  - `monitor server detects corrupted sidecar and rebuilds safely`

### Benchmark / budget evidence
- Recheck baseline:
  - `shared_context.jsonl`: 853,302 bytes (~213,326 tokens), 918 events
  - `/api/events?limit=50`: 128,148 bytes (~32,037 tokens)
  - `get_events` equivalent limit 50: 61,607 bytes (~15,402 tokens)
  - duplication factor: `2.08x`
- Recheck budget impact sample:
  - `agent_inbox`: **47.85%** reduction
  - `task_snapshot`: **0.07%** reduction
  - `correlation_snapshot`: **0.08%** reduction

### Runtime observability sample
- `policyVersion`: `ctx-observability.v1`
- `staleRate`: `0`
- `degradedRate`: `0`
- `broadFallbackRate`: `0`
- `rebuildSuccessRate`: `1`
- `legacyModeHitRate`: `0`
- active alerts: `0`

## Acceptance criteria mapping

1. `monitor-sidecars.test.mjs` pasa 100% -> **PASS**
2. Regression + benchmark suite TCO-13 en verde -> **PASS**
3. No regresión en fallback legacy/degraded y snapshots -> **PASS**
4. Evidencia reproducible publicada -> **PASS**

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-benchmark-recheck-20260403.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-tests-recheck-20260403.txt`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-context-token-baseline-recheck-20260403.json`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-budget-impact-recheck-20260403.json`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-observability-sample-recheck-20260403.json`

## Final verdict

`TEST_PASSED`
