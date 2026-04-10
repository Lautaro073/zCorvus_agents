# Backend Admin Users + Subscriptions APIs

- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Backend

## Scope

- Task `aiw-backend-admin-users-query-api-20260407-03`
- Task `aiw-backend-admin-subscriptions-api-20260407-04`

## Implemented

### 1) Admin users query API

- New controller: `Backend/controllers/admin/users.controller.js`
  - Endpoint contract implemented on `GET /api/admin/users`.
  - Supports:
    - `page`
    - `pageSize` (max 100)
    - `limit` alias (backward-compatible)
    - `search`
    - `role`
    - `subscriptionStatus`
    - `sortBy`
    - `sortDir`
    - `expiringInDays`
  - Includes computed fields:
    - `role_name`
    - `token_finish_date`
    - `subscriptionStatus` (`active|expiring|expired|none`)
  - Envelope:
    - `data`, `pagination`, `filtersApplied`, `generatedAt`
  - Invalid sort handling:
    - Stable fallback `id DESC` (no hard error).

### 2) Admin subscriptions API

- New controller: `Backend/controllers/admin/subscriptions.controller.js`
  - Endpoint: `GET /api/admin/subscriptions`.
  - Supports filters:
    - `status` (`active|expiring|expired`)
    - `planType` (`pro|enterprise`)
    - `expiringInDays`
    - `from`, `to` (normalized UTC ISO-8601)
    - `page`, `pageSize`
  - Returns:
    - `data`
    - `summaryCounts` (`active`, `expiring`, `expired`, `total`)
    - `pagination`
    - `filtersApplied`
    - `generatedAt`

### 3) Routes wiring

- Updated `Backend/routes/admin.routes.js`
  - Keeps readiness route `/api/admin`
  - Delegates:
    - `/api/admin/users` -> `getAdminUsers`
    - `/api/admin/subscriptions` -> `getAdminSubscriptions`

### 4) Contract documentation

- Updated `Backend/docs/admin-api-contract.md` with:
  - New users query options and sort fallback semantics
  - New subscriptions endpoint contract

## Tests

- Added `Backend/tests/admin.users.test.js`
  - authz 401/403
  - users envelope
  - search/role/subscription filters
  - legacy `limit` alias
  - stable sort fallback semantics

- Added `Backend/tests/admin.subscriptions.test.js`
  - authz 401/403
  - envelope + summaryCounts
  - filters `status/planType`
  - UTC normalization for `from/to`
  - validation errors

## Validation run

- `npm test -- admin.users.test.js admin.subscriptions.test.js` -> PASS
- `npm test -- admin.routes.test.js stripe.webhook.ledger.test.js auth.test.js` -> PASS

## Final verdict

`IMPLEMENTED`
