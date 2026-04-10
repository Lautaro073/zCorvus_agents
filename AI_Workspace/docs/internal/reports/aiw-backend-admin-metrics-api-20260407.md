# Backend Admin Metrics API

- Task ID: `aiw-backend-admin-metrics-api-20260407-05`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Backend

## Objective

Implementar `GET /api/admin/metrics` con KPIs y serie temporal por granularidad (`day|month|year|custom`) usando `sale_events` como fuente de verdad.

## Implemented

### 1) Metrics controller

- New file: `Backend/controllers/admin/metrics.controller.js`
- Features:
  - Validación de `granularity` (`day|month|year|custom`).
  - `custom` exige `from` y `to` en ISO-8601 UTC (`...Z`).
  - Rechaza parámetros desconocidos con `400 invalidParam`.
  - Normaliza y resuelve rango temporal.
  - Genera buckets continuos (day/month/year) y rellena huecos con cero.
  - Calcula KPIs:
    - `registrations`
    - `salesCount`
    - `grossRevenue`
    - `netRevenue` (`amount_total_cents - amount_tax_cents`, lower bounded at 0)
  - Si no hay ventas en el rango:
    - `kpis` en cero
    - `timeseries: []`
  - Envelope: `data`, `filtersApplied`, `generatedAt`.

### 2) Route wiring

- Updated `Backend/routes/admin.routes.js`
  - Added `GET /api/admin/metrics` wired to `getAdminMetrics`.

### 3) Contract docs

- Updated `Backend/docs/admin-api-contract.md`
  - Added metrics endpoint contract and validation behavior.

### 4) Tests

- Added `Backend/tests/admin.metrics.test.js`
  - 401 without token
  - 403 non-admin
  - day metrics with KPI assertions
  - zero-filled continuous buckets
  - granularity validation
  - custom from/to requirement
  - UTC ISO format enforcement
  - empty-ledger behavior (kpis zero + timeseries empty)

## Validation run

- `npm test -- admin.metrics.test.js` -> PASS (7/7)
- `npm test -- admin.users.test.js admin.subscriptions.test.js admin.routes.test.js stripe.webhook.ledger.test.js auth.test.js` -> PASS (40/40)

## Final verdict

`IMPLEMENTED`
