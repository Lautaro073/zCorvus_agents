# Backend Admin Subscriptions SummaryCounts Filter Fix

- Task ID: `aiw-backend-admin-subscriptions-summarycounts-filter-fix-20260410-54`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-10
- Agent: Backend

## Objective

Corregir `GET /api/admin/subscriptions` para que `summaryCounts` refleje el mismo dataset filtrado que la tabla visible.

## Root cause

- `summaryCounts` se calculaba con una query separada que solo filtraba `u.token_id IS NOT NULL`.
- Los filtros activos (`status`, `planType`, `from`, `to`) afectaban la tabla paginada, pero no los agregados.

## Fix

- Updated `Backend/controllers/admin/subscriptions.controller.js`:
  - la query de `summaryCounts` ahora reutiliza `whereClause` y `whereArgs` del dataset principal.
  - mantiene el contrato API existente y solo alinea los agregados con los filtros activos.

## Tests

- Updated `Backend/tests/admin.subscriptions.test.js`:
  - valida coincidencia exacta de `summaryCounts` con filtro `status=expiring&planType=enterprise`
  - valida consistencia de `summaryCounts` con combinacion `planType + date range`

## Validation

- `npm test -- admin.subscriptions.test.js` -> PASS (`7/7`)

## Artifacts

- `Backend/controllers/admin/subscriptions.controller.js`
- `Backend/tests/admin.subscriptions.test.js`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-subscriptions-summarycounts-filter-fix-20260410.md`

## Final verdict

`IMPLEMENTED`
