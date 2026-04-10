# Backend Admin Latency Mitigation

- Task ID: `aiw-backend-admin-metrics-latency-mitigation-20260407-12`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Backend

## Objective

Reduce p95 latency for:

- `GET /api/admin/metrics`
- `GET /api/admin/users`
- `GET /api/admin/subscriptions`

Targets:

- metrics <= 700ms
- users <= 550ms
- subscriptions <= 700ms

## Reproducible benchmark method

- Script: `Backend/scripts/benchmark-admin-latency.js`
- Command: `node scripts/benchmark-admin-latency.js`
- Defaults: `BENCH_WARMUP=5`, `BENCH_REQUESTS=30`
- Sample endpoints benchmarked:
  - `/api/admin/metrics?granularity=day&from=2026-04-01T00:00:00Z&to=2026-04-08T00:00:00Z`
  - `/api/admin/users?page=1&pageSize=20&search=sub&role=pro&sortBy=token_finish_date&sortDir=desc`
  - `/api/admin/subscriptions?page=1&pageSize=20&status=active&expiringInDays=7`

## Baseline (before)

- metrics p95: `1049.92ms`
- users p95: `703.88ms`
- subscriptions p95: `917.32ms`

## Changes implemented

### 1) Remove per-request admin role DB hit on admin routes

- Updated `Backend/middlewares/auth.middleware.js`
  - Populate `req.user.role` from persisted `user.role_name` (join already present in `User.findById`) instead of relying on token claim.
- Updated `Backend/middlewares/role.middleware.js`
  - Fast-path authorization using `req.user.role` when available.
  - Added in-memory role-id to role-name cache with TTL (5 minutes) to avoid repeated `roles` lookups when fallback is needed.

### 2) Make admin SQL index-friendly

- Updated `Backend/controllers/admin/metrics.controller.js`
  - Replaced `datetime(column)` wrappers in filters/grouping with direct column comparisons and direct `strftime` column usage.
  - Added one-time schema/index bootstrap guard (`ensureSaleEventsSchemaOnce`) to avoid repeated index DDL checks per request.
- Updated `Backend/controllers/admin/users.controller.js`
  - Replaced dynamic `datetime(...)` predicates with parameterized timestamp comparisons.
  - Added one-time index bootstrap for hot columns (`user.created_at`, `user.roles_id`, `user.token_id`, `user.email`, `user.username`, `token.finish_date`).
  - Removed unconditional extra count query by using `COUNT(*) OVER()` in data query and fallback count only for empty out-of-range pages.
- Updated `Backend/controllers/admin/subscriptions.controller.js`
  - Replaced `datetime(...)` wrappers in `status`, `from`, `to`, and ordering paths with direct comparisons.
  - Added one-time index bootstrap for `user.token_id`, `token.start_date`, `token.finish_date`, `token.type`.
  - Removed unconditional extra count query via `COUNT(*) OVER()` with fallback count only when needed.
  - Updated summary counts query to use precomputed `now/threshold` bound parameters.

## Validation

- `npm test -- admin.users.test.js admin.subscriptions.test.js admin.metrics.test.js` -> PASS (19/19)

## Benchmark (after)

Run timestamp: `2026-04-07T16:21:46.788Z`

- metrics: p95 `369.13ms` (target <= 700ms) -> PASS
- users: p95 `368.25ms` (target <= 550ms) -> PASS
- subscriptions: p95 `575.36ms` (target <= 700ms) -> PASS

## Before vs after (p95)

- metrics: `1049.92ms -> 369.13ms` (improvement: `680.79ms`, ~64.8%)
- users: `703.88ms -> 368.25ms` (improvement: `335.63ms`, ~47.7%)
- subscriptions: `917.32ms -> 575.36ms` (improvement: `341.96ms`, ~37.3%)

## Final verdict

`IMPLEMENTED`
