# Backend Admin Sales Metrics Fallback Fix

- Task ID: `aiw-backend-admin-sales-from-subscriptions-fix-20260408-32`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-08
- Agent: Backend

## Objective

Corregir métricas de ventas del panel admin para que no queden en cero cuando `sale_events` esté vacío o incompleto, usando fallback reproducible desde suscripciones (`token`) y manteniendo reglas explícitas de precedencia.

## Root cause

- `GET /api/admin/metrics` dependía totalmente de `sale_events` para KPIs de ventas.
- Si no había filas `paid` en el rango (ledger vacío/parcial), retornaba:
  - `salesCount/grossRevenue/netRevenue = 0`
  - y además `timeseries: []`
- Esto ocultaba ventas históricas existentes en `token.start_date` (suscripciones legacy o pre-ledger).

## Changes implemented

### 1) Sales fallback from subscriptions in metrics controller

- Updated `Backend/controllers/admin/metrics.controller.js`:
  - Added pricing constants for fallback:
    - `pro = 4900`
    - `enterprise = 9900`
  - Added one-time indexes to support fallback query path:
    - `idx_token_start_date`
    - `idx_token_type`
  - Added `subscriptionSalesSql` from `token` joined to `user` (distinct token scope), bucketed by `token.start_date`.
  - Revenue fallback calculation is deterministic by plan type.

### 2) Explicit source precedence rule

- Implemented range-level precedence:
  - If range has paid `sale_events` -> use ledger for all buckets (`salesSource=ledger`).
  - If range has no paid `sale_events` but has subscription tokens -> use fallback (`salesSource=subscriptions_fallback`).
  - If neither source has sales -> `salesSource=none`.
- Added source traceability in response:
  - `filtersApplied.salesSource`.

### 3) Preserve registrations and zero-filled series

- Removed empty-timeseries early return behavior.
- Timeseries remains zero-filled for requested range even when no sales.
- Registrations remain computed from `user.created_at` and are not forced to zero when `salesCount=0`.

### 4) Contract update

- Updated `Backend/docs/admin-api-contract.md`:
  - documented source precedence and fallback pricing.
  - documented `filtersApplied.salesSource` (`ledger | subscriptions_fallback | none`).
  - documented zero-filled timeseries behavior when no sales source exists.

## Tests

Updated `Backend/tests/admin.metrics.test.js`:

- Added coverage:
  - fallback from subscriptions when ledger is empty in range.
  - no-source case returns zero sales + zero-filled timeseries.
  - registrations preserved when sales are zero.
  - explicit `filtersApplied.salesSource` assertion for ledger path.

## Validation

- `npm test -- admin.metrics.test.js` -> PASS (9/9)
- `npm test -- admin.metrics.test.js admin.subscriptions.test.js admin.routes.test.js` -> PASS (21/21)

## Latency verification (post-change)

Benchmark command:

- `node scripts/benchmark-admin-latency.js`

Observed p95:

- metrics: `368.55ms` (target <= 700ms) -> PASS
- users: `386.24ms` (target <= 550ms) -> PASS
- subscriptions: `630.10ms` (target <= 700ms) -> PASS

## Context7

Context7 not required.

Reason: implementation uses internal SQL/business rules and existing project pricing conventions already defined in backend code (`stripe.controller.js`, `backfill-admin-sales-ledger.js`).

## Artifacts

- `Backend/controllers/admin/metrics.controller.js`
- `Backend/tests/admin.metrics.test.js`
- `Backend/docs/admin-api-contract.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-sales-from-subscriptions-fix-20260408.md`

## Final verdict

`IMPLEMENTED`
