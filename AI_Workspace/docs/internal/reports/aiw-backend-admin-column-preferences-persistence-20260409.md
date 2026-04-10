# Backend Admin Column Preferences Persistence

- Task ID: `aiw-backend-admin-column-preferences-persistence-20260409-42`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-09
- Agent: Backend

## Objective

Implementar persistencia por cuenta para preferencias de columnas del panel admin, con API segura por usuario admin autenticado, sin depender de URL.

## Implemented

### 1) DB schema + idempotent upsert

- Added `admin_preferences` schema creation in runtime bootstrap (`ensureAdminPreferencesSchemaOnce`) inside preferences controller.
- Added MySQL reference schema in `Backend/database.sql`:
  - table `admin_preferences`
  - PK `user_id`
  - `column_visibility_json`
  - `column_order_json`
  - timestamps + `ON DELETE CASCADE` FK to `user`
- Upsert behavior:
  - `INSERT ... ON CONFLICT(user_id) DO UPDATE ...`
  - ensures one row per admin user (idempotent writes).

### 2) Secure admin API endpoints

- Added new controller: `Backend/controllers/admin/preferences.controller.js`.
- Mounted routes under existing admin authz middleware:
  - `GET /api/admin/preferences`
  - `PATCH /api/admin/preferences`
  - `PUT /api/admin/preferences` (compat alias)
- Because routes are under `/api/admin` router, non-admin access remains blocked by existing `authenticateToken + isAdmin`.

### 3) Payload validation rules

- Accepted payload keys:
  - `columnVisibility`
  - `columnOrder`
- Validated constraints:
  - at least one of keys required
  - unknown top-level keys rejected
  - allowed columns strictly:
    - `username`, `email`, `role`, `status`, `plan`, `startDate`, `tokenExpiry`
  - visibility values must be boolean
  - at least one column must remain visible
  - order must be non-empty, unique, valid keys
- Merge strategy:
  - visibility merges against current persisted/default state
  - order normalizes and appends missing allowed keys for stable complete order

### 4) Contract documentation

- Updated `Backend/docs/admin-api-contract.md` with:
  - `GET /api/admin/preferences`
  - `PATCH /api/admin/preferences`
  - `PUT /api/admin/preferences`
  - payload constraints and error behavior.

## Tests

Added test suite:

- `Backend/tests/admin.preferences.test.js`

Coverage:

- 401 without token
- 403 for non-admin
- default preferences returned when no row exists
- save/read roundtrip via `PATCH`
- `PUT` compatibility
- idempotent upsert keeps single DB row
- persistence across renewed token for same admin user
- invalid payload -> 400
- hide-all-columns attempt -> 400

## Validation

- `npm test -- admin.preferences.test.js admin.routes.test.js` -> PASS (15/15)
- `npm test -- admin.metrics.test.js admin.users.test.js admin.subscriptions.test.js` -> PASS (21/21)

## Context7

Context7 not required.

Reason: implementation is internal DB schema + Express route/controller logic and follows existing project conventions without introducing external API/library uncertainty.

## Artifacts

- `Backend/controllers/admin/preferences.controller.js`
- `Backend/routes/admin.routes.js`
- `Backend/tests/admin.preferences.test.js`
- `Backend/docs/admin-api-contract.md`
- `Backend/database.sql`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-column-preferences-persistence-20260409.md`

## Final verdict

`IMPLEMENTED`
