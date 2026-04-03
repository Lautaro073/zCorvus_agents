# Documenter Validation Report - TCO-06B Cold Start and Sidecar Bootstrap

## Metadata
- taskId: `aiw-documenter-tco-06b-coldstart-sidecar-bootstrap-runbook-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `Documenter`
- date: `2026-04-03`

## Objective
Publish reproducible evidence for TCO-06B runbook acceptance:

1. clean startup/bootstrap procedure documented,
2. massive rebuild and integrity checks documented,
3. degraded to normal transition criteria documented,
4. validation evidence executable and traceable.

## Inputs used
1. `docs/internal/reports/aiw-optimizer-tco-06a-atomic-sidecars-idempotent-rebuilds-20260402.md`
2. `docs/internal/reports/aiw-observer-tco-12b-snapshot-slos-drift-alerting-20260403.md`
3. `docs/internal/reports/aiw-tester-tco-13a-negative-matrix-recheck-20260403.md`
4. `MCP_Server/lib/context-sidecars.js`
5. `MCP_Server/monitor-server.js`

## Commands executed by Documenter

### 1) Sidecar and read-mode regression suite

```bash
node --test scripts/context-sidecars.test.mjs scripts/monitor-sidecars.test.mjs scripts/relevance-read-modes.test.mjs
```

Observed result:
- `13/13 PASS`
- includes:
  - integrity tamper detection,
  - watermark mismatch rejection,
  - incomplete sidecar rejection,
  - safe auto-rebuild path,
  - relevance read fallback behavior,
  - token budget toggle behavior.

### 2) Observability endpoint suite

```bash
node --test scripts/context-observability.test.mjs
```

Observed result:
- `2/2 PASS`
- verifies SLO metrics exposure and legacy-mode alert behavior.

### 3) Live sidecar validation of current workspace state

```bash
node --input-type=module -e "import path from 'node:path'; import { readValidatedSidecars } from './MCP_Server/lib/context-sidecars.js'; const sidecarDir = path.join(process.cwd(), 'MCP_Server', 'sidecars'); const result = await readValidatedSidecars(sidecarDir); if (!result.ok) { console.error(JSON.stringify(result)); process.exit(1); } const wm = result.payloads.latestByTask.sourceWatermark; const ih = result.payloads.latestByTask.integrityHash; const fp = result.payloads.latestByTask.contentFingerprint; console.log(JSON.stringify({ ok: true, sourceWatermark: wm, integrityHashPrefix: String(ih).slice(0, 20), contentFingerprintPrefix: String(fp).slice(0, 20) }, null, 2));"
```

Observed result:
```json
{
  "ok": true,
  "sourceWatermark": "jsonl:942",
  "integrityHashPrefix": "sha256:a1c0f95b59d50",
  "contentFingerprintPrefix": "sha256:2a7fb23e388c9"
}
```

## Acceptance criteria mapping

1. Runbook de arranque limpio y bootstrap sidecar publicado -> `PASS`
2. Rebuild masivo documentado con checks de `integrityHash` y `sourceWatermark` -> `PASS`
3. Transicion `degraded -> normal` documentada con criterios verificables -> `PASS`
4. Evidencia reproducible publicada -> `PASS`

## Published artifacts
- `docs/internal/guides/token-context-coldstart-sidecar-bootstrap-runbook-20260403.md`
- `docs/internal/reports/aiw-documenter-tco-06b-coldstart-sidecar-bootstrap-validation-20260403.md`
