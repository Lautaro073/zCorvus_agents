# Admin API Contract

## Scope

Base contract for admin endpoints under `/api/admin` with strict authorization and uniform response envelope.

## Authorization

- All `/api/admin/*` endpoints require valid JWT.
- Without token -> `401`.
- Authenticated non-admin user -> `403`.

## Uniform envelope

Successful responses follow:

```json
{
  "success": true,
  "message": "...",
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "limit": 20,
    "total": 0,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "filtersApplied": {
    "search": null,
    "role": null,
    "subscriptionStatus": null,
    "sortBy": "id",
    "sortDir": "desc",
    "expiringInDays": 7
  },
  "generatedAt": "2026-04-07T13:30:00.000Z"
}
```

Validation errors for query params follow:

```json
{
  "success": false,
  "message": "Invalid query parameter",
  "invalidParam": "limit",
  "expected": "integer between 1 and 100",
  "received": "9999"
}
```

## Endpoints

### `GET /api/admin`

Readiness endpoint for admin API.

### `GET /api/admin/users`

Returns paginated user list for admin panel.

Supported query params:

- `page` integer, `1..100000` (default `1`)
- `pageSize` integer, `1..100` (default `20`)
- `limit` integer alias of `pageSize` for backward compatibility
- `search` string, max 120 chars (matches username/email)
- `role` enum: `admin | user | pro`
- `subscriptionStatus` enum: `active | expiring | expired | none`
- `expiringInDays` integer, `1..365` (default `7`)
- `sortBy` enum: `id | created_at | username | email | role_name | token_finish_date`
- `sortDir` enum: `asc | desc`

Invalid `sortBy/sortDir` do not fail the request; they fall back to stable ordering `id DESC`.

### `GET /api/admin/subscriptions`

Returns paginated subscriptions list and summary counters for cards.

Supported query params:

- `status` enum: `active | expiring | expired`
- `planType` enum: `pro | enterprise`
- `expiringInDays` integer, `1..365` (default `7`)
- `from` ISO-8601 date/time (normalized to UTC ISO)
- `to` ISO-8601 date/time (normalized to UTC ISO)
- `page` integer, `1..100000` (default `1`)
- `pageSize` integer, `1..100` (default `20`)

### `GET /api/admin/metrics`

Returns KPI summary and timeseries using `sale_events` as preferred source, with subscription-token fallback when ledger is empty/partial for buckets in range.

Supported query params:

- `granularity` enum: `day | month | year | custom` (default `day`)
- `from` ISO-8601 UTC datetime, required when `granularity=custom`
- `to` ISO-8601 UTC datetime, required when `granularity=custom`

Behavior:

- `custom` requires both `from` and `to` in UTC (`...Z`).
- Response includes:
  - `data.kpis`: `registrations`, `salesCount`, `grossRevenue`, `netRevenue`
  - `data.timeseries`: zero-filled buckets for `day|month|year`
- Sales precedence per request range:
  - If range has paid `sale_events`, use ledger as source for all buckets.
  - If range has no paid `sale_events`, fallback to `token.start_date` sales estimation for `pro|enterprise`.
- Fallback pricing used for subscription-derived revenue:
  - `pro = 4900` cents
  - `enterprise = 9900` cents
- If no sales source exists in range, sales KPIs are zero and timeseries remains zero-filled (not empty).
- `filtersApplied.salesSource` indicates source used: `ledger | subscriptions_fallback | none`.

Unknown query params are rejected with `400` and `invalidParam`.

### `GET /api/admin/preferences`

Returns persisted admin dashboard column preferences for the authenticated admin account.

Response `data`:

- `columnVisibility`: object with boolean flags by column key
- `columnOrder`: ordered array of column keys

If no persisted row exists, returns defaults.

### `PATCH /api/admin/preferences`

Upserts admin dashboard preferences for authenticated admin.

Accepted payload keys:

- `columnVisibility` (optional): partial/full object with keys:
  - `username`, `email`, `role`, `status`, `plan`, `startDate`, `tokenExpiry`
  - each value must be boolean
  - at least one column must remain visible after merge
- `columnOrder` (optional): non-empty array of unique keys from same set

Rules:

- Must include at least one of `columnVisibility` or `columnOrder`.
- Unknown keys rejected with `400` and `invalidParam`.
- Persisted per authenticated admin `user_id` with idempotent upsert.

`PUT /api/admin/preferences` behaves the same as `PATCH` for compatibility.
