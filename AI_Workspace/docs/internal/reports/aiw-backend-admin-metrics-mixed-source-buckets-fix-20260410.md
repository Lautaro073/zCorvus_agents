# Backend Admin Metrics Mixed Source Buckets Fix

- Task ID: `aiw-backend-admin-metrics-mixed-source-buckets-fix-20260410-55`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-10
- Agent: Backend

## Objective

Corregir undercount en `GET /api/admin/metrics` cuando el rango contiene buckets mixtos: algunos con ledger y otros que requieren fallback desde subscriptions.

## Root cause

- La implementacion actual elegia una sola fuente global por rango (`ledger` o `subscriptions_fallback`).
- Si existia al menos una venta en ledger, se descartaba el fallback para buckets sin ledger, causando undercount.

## Fix

- Updated `Backend/controllers/admin/metrics.controller.js`:
  - combinacion por bucket, no por rango global.
  - prioridad por bucket:
    - usar ledger si ese bucket tiene ventas pagadas
    - si no, usar fallback desde subscriptions para ese bucket
  - `filtersApplied.salesSource` ahora puede devolver `mixed` cuando se usaron ambas fuentes.
- Updated `Backend/docs/admin-api-contract.md` para documentar precedencia por bucket y `salesSource=mixed`.

## Tests

- Updated `Backend/tests/admin.metrics.test.js`:
  - aislado el fixture base de ledger en rango futuro dedicado para evitar colisiones con datos del workspace.
  - agregado caso mixto ledger + fallback por buckets distintos.
  - verificadas KPIs totales y bucket fallback especifico.

## Validation

- `npm test -- admin.metrics.test.js` -> PASS (`10/10`)

Note: ejecutar `auth + subscriptions + metrics + proRole` en un solo proceso Jest disparo errores transitorios de `libsql` (`SQLITE_NOMEM/connection not opened`) por contencion del entorno compartido. Las suites relevantes pasaron correctamente al ejecutarse por grupos razonables.

## Artifacts

- `Backend/controllers/admin/metrics.controller.js`
- `Backend/tests/admin.metrics.test.js`
- `Backend/docs/admin-api-contract.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-metrics-mixed-source-buckets-fix-20260410.md`

## Final verdict

`IMPLEMENTED`
