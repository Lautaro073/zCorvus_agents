# Admin Sales Metrics Regression QA

- taskId: `aiw-tester-admin-sales-metrics-regression-20260408-33`
- correlationId: `aiw-admin-control-panel-20260407`
- agent: `Tester`
- date: `2026-04-08`
- status: `TEST_PASSED`

## Objective

Validar regresión de métricas admin para confirmar que ventas/ingresos no quedan en cero falsamente cuando hay suscripciones y que se mantiene coherencia entre escenarios `ledger`, `subscriptions_fallback` y `none`.

## Acceptance criteria matrix

1. Escenario con suscripciones y `sale_events` vacío devuelve ventas/ingresos > 0 cuando corresponde -> **PASS**
2. Escenario con `sale_events` poblado mantiene coherencia con ledger -> **PASS**
3. Escenario sin ventas mantiene `registrations` correctas y `sales=0` sin false zeros globales -> **PASS**
4. Dictamen final con evidencia reproducible -> **PASS**

## Context7

Context7 not required.

Motivo: la validación se centró en lógica y contratos internos de backend (`admin.metrics.controller`, SQL/querying propio, suites Jest/Supertest existentes).

## Executed checks

### A) Regression suites

Command:

- `npm test -- admin.metrics.test.js admin.routes.test.js admin.subscriptions.test.js`

Result:

- Suites: `3 passed / 3 total`
- Tests: `21 passed / 21 total`

Cobertura relevante observada:

- authz contract `/api/admin` (`401/403/200`) y envelope consistente.
- `metrics` con granularidad day/custom, zero-fill por bucket y validaciones de query.
- fallback desde `token` cuando no hay ventas `paid` en `sale_events` para el rango.
- `filtersApplied.salesSource` reportado (`ledger`, `subscriptions_fallback`, `none`).

### B) Probe reproducible adicional de escenarios críticos

Comando ejecutado (node+supertest inline) sobre `/api/admin/metrics`:

- escenario fallback (`2031-05-10..12` con token enterprise activo) ->
  - `status=200`
  - `salesSource=subscriptions_fallback`
  - `salesCount=1`
  - `grossRevenue=9900`
- escenario none (`2030-01-01..03` sin ventas ni tokens) ->
  - `status=200`
  - `salesSource=none`
  - `salesCount=0`
  - `registrations=0`
- escenario registration-only (`2032-01-01..03` con usuario creado en rango y sin ventas) ->
  - `status=200`
  - `salesSource=none`
  - `salesCount=0`
  - `registrations=1`

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-admin-sales-metrics-regression-20260408.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-sales-from-subscriptions-fix-20260408.md`
- `Backend/controllers/admin/metrics.controller.js`
- `Backend/tests/admin.metrics.test.js`
- `Backend/tests/admin.routes.test.js`
- `Backend/tests/admin.subscriptions.test.js`

## Verdict

`TEST_PASSED`

La regresión de métricas admin queda aprobada para el alcance solicitado.
