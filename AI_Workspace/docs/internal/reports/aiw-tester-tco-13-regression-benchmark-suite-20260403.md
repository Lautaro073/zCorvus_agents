# TCO-13 Regression + Benchmark Suite Report

- Task ID: `aiw-tester-tco-13-regression-benchmark-suite-20260403-01`
- Correlation ID: `aiw-token-context-optimization-20260331`
- Date: 2026-04-03
- Agent: Tester

## Scope

Validate TCO-13 acceptance criteria for:

1. compatibility + schema fixtures,
2. compact snapshots and fallback behavior,
3. token/cost benchmark reproducibility,
4. key operational metrics collection.

## Commands executed

```bash
node scripts/validate-context-contract-fixtures.mjs
node scripts/check-profile-context-conformance.mjs
node --test scripts/context-read-modes.test.mjs scripts/context-sidecars.test.mjs scripts/context-observability.test.mjs
node --test scripts/monitor-sidecars.test.mjs
node scripts/context-token-baseline.mjs > docs/internal/reports/aiw-tester-tco-13-context-token-baseline-20260403.json
node scripts/analyze-token-budget-enforcement-impact.mjs > docs/internal/reports/aiw-tester-tco-13-budget-impact-20260403.json
```

Additional metrics capture:

```bash
node -e "...spawn monitor server and fetch /api/context/observability..."
node -e "...compute incident/conflict/ack metrics from shared_context.jsonl..."
```

## Results summary

### 1) Contract and profile conformance

- `validate-context-contract-fixtures`: **PASS**
  - fixtures validated: 4
  - compatibility scenarios: all PASS
- `check-profile-context-conformance`: **PASS**
  - profiles checked: 8/8
  - broad-read-default violations: 0
  - required flags in fixtures (`truncated/degradedMode/decisionSafety`): PASS

### 2) Regression coverage for compact/fallback behavior

- `context-read-modes + context-sidecars + context-observability`: **PASS (13/13)**
- `monitor-sidecars.test.mjs`: **FAIL (1/2)**
  - failing test: `monitor server detects corrupted sidecar and rebuilds safely`
  - assertion failure: integrity hash remained `sha256:corrupted` when test expected rebuilt hash.

### 3) Benchmark evidence (before/after comparable)

- Baseline generated:
  - `shared_context.jsonl`: 844,309 bytes (~211,077 tokens), 910 events
  - `/api/events?limit=50` payload: 128,195 bytes (~32,049 tokens)
  - `get_events` equivalent limit 50: 61,749 bytes (~15,437 tokens)
  - duplication factor: `2.08x`
- Budget enforcement impact sample:
  - `agent_inbox` bytes reduction: **45.4%**
  - `task_snapshot` bytes reduction: **0.07%**
  - `correlation_snapshot` bytes reduction: **8.48%**

### 4) Required metrics measured

- Snapshot sufficiency/handoff/broad fallback (baseline dataset output): measured in
  - `contextQualityKpisBaseline` (includes `snapshotsSufficientWithoutExpansionPercent`, `handoffShortByCompletedTaskPercent`, `tasksRequiringFallbackBroadScanPercent`).
- Operational SLI sample measured in observability payload:
  - `staleRate`, `degradedRate`, `truncatedRate`, `broadFallbackRate`, `rebuildSuccessRate`, `watermarkLagEventsP95`, `legacyModeHitRate`.
- Correlation-level incident metrics measured from JSONL:
  - `snapshotConflictRate`: 0
  - `partialWriteIncidents`: 3 (regex-based signal from correlation event text)
  - `waveRolloutIncidents`: 0
  - `alertAckTimeMinutesAvg`: null (`0` samples in current window)

## Acceptance criteria mapping

1. Benchmark before/after comparable y reproducible -> **PASS**
2. QA de vistas compactas + fallbacks legacy/degraded aprobado -> **FAIL**
   - blocker: `monitor-sidecars.test.mjs` failing on corrupted sidecar rebuild path.
3. Métricas snapshot sufficiency/handoff continuity/broad fallback rate medidas -> **PASS**
4. Métricas snapshot conflict/partial write/wave incidents/alert ack time medidas -> **PASS (with no-sample note for alert ack)**
5. Resultado final con evidencia/artifacts -> **PASS**

## Root cause for failing criterion

`monitor-sidecars.test.mjs` indicates a regression/behavior mismatch in corrupted sidecar handling. Under the tested path, monitor did not replace the corrupted integrity hash as expected by the test assertion.

This directly affects confidence in fallback safety guarantees and blocks full approval of TCO-13.

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-benchmark-suite-20260403.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-context-token-baseline-20260403.json`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-budget-impact-20260403.json`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-tests-20260403.txt`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-monitor-sidecars-test-20260403.txt`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-observability-sample-20260403.json`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-incident-metrics-20260403.json`

## Final verdict

`TEST_FAILED`
