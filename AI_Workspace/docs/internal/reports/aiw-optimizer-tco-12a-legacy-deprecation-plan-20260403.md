# TCO-12A Legacy Deprecation Plan

## Metadata
- taskId: `aiw-opt-tco-12a-legacy-deprecation-plan-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Objective
Define and execute the formal retirement strategy for temporary legacy compatibility mode (`MCP_CONTEXT_LEGACY_PAYLOAD_MODE`) and routine broad recency reads.

## Delivered changes

### 1) Formal legacy retirement policy
- Added `AI_Workspace/docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`.
- Defines:
  - formal retirement gate,
  - stable-window targets,
  - rollback triggers and rollback sequence,
  - final retirement condition and one-day execution rule.

### 2) Contract alignment
- Updated `AI_Workspace/docs/internal/specs/token-context-contract-v1.md` legacy rollout rules to reference the canonical retirement checklist and broad-fallback gate requirement.

### 3) Final runbook alignment
- Updated `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md` with explicit `TCO-12A` legacy retirement procedure and gating sequence.

### 4) Runtime readiness execution helper
- Added `AI_Workspace/scripts/check-legacy-deprecation-readiness.mjs`.
- Script executes live readiness checks against:
  - `/api/health`
  - `/api/context/observability`
  - `/api/context/wave_canary`
- Gate checks implemented:
  - legacy mode disabled,
  - zero legacy hit rate,
  - broad fallback under target,
  - no critical observability alerts,
  - canary freeze inactive,
  - wave-3 not in rollback,
  - stable window covered.

## Validation

Executed in `AI_Workspace/`:

```bash
node AI_Workspace/scripts/check-legacy-deprecation-readiness.mjs
node --test AI_Workspace/scripts/context-observability.test.mjs AI_Workspace/scripts/relevance-read-modes.test.mjs
```

Results:
- readiness check: `ready=true`
  - `legacyModeHitRate=0`
  - `broadFallbackRate=0`
  - `freeze.active=false`
  - `wave3 rolloutAction=continue`
  - stable window covered (`lookbackHours=60`, target `>=60h`)
- regression verification: `9/9` tests passing.

Additional supporting evidence reused from Tester:
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-benchmark-recheck-20260403.md`
  - confirms `legacyModeHitRate=0`, `broadFallbackRate=0`, and no active alerts in recheck suite.

## Acceptance criteria mapping
1. Criterio formal de salida de legacy mode definido -> **PASS**
2. Uso de broad scan cae por debajo del target en ventana estable -> **PASS** (`broadFallbackRate=0`, lookback `60h`)
3. Compat mode puede apagarse en staging sin incidentes -> **PASS** (`contextLegacyPayloadMode=false`, alertas críticas `0`)
4. Fecha/condición de retiro documentada con rollback claro -> **PASS** (retirement condition + rollback sequence in spec/runbook)

## Artifacts
- `AI_Workspace/docs/internal/specs/token-context-legacy-deprecation-plan-v1.md`
- `AI_Workspace/docs/internal/specs/token-context-contract-v1.md`
- `AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md`
- `AI_Workspace/scripts/check-legacy-deprecation-readiness.mjs`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-12a-legacy-deprecation-plan-20260403.md`
