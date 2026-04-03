# TCO-13A Negative Matrix Recheck Report

- Task ID: `aiw-tester-tco-13a-negative-matrix-recheck-20260403-01`
- Correlation ID: `aiw-token-context-optimization-20260331`
- Date: 2026-04-03
- Agent: Tester

## Objective

Recheck TCO-13A after Optimizer fix for `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`.

## Scope revalidated

1. invalid `sourceWatermark`
2. watermark mismatch across sidecars
3. incomplete/corrupted sidecars
4. sidecars disabled -> broad fallback
5. relevance reads toggle behavior
6. hard token limits with truncation metadata when enabled
7. token budget toggle disabling metadata and truncation when disabled

## Command executed

```bash
node --test scripts/context-sidecars.test.mjs scripts/relevance-read-modes.test.mjs
```

## Result

- **11/11 PASS**

Key previously failing case now passes:

- `token budget flag disables budget metadata and truncation enforcement`

Validated behavior:

- with `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false`
  - compact snapshots do **not** emit `tokenBudget`
  - compact budget truncation path does **not** force `truncated=true`
- with toggle enabled
  - previous TCO-11/TCO-11A budget behavior still works

## Acceptance criteria mapping

1. Matrix negative/fault injection vuelve a verde -> **PASS**
2. No regresión en stale/watermark/corrupt sidecars -> **PASS**
3. Toggle de budget desactiva metadata y truncation como se esperaba -> **PASS**
4. Evidencia reproducible publicada -> **PASS**

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13a-negative-matrix-recheck-20260403.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13a-negative-matrix-recheck-tests-20260403.txt`
- `AI_Workspace/scripts/context-sidecars.test.mjs`
- `AI_Workspace/scripts/relevance-read-modes.test.mjs`

## Final verdict

`TEST_PASSED`
