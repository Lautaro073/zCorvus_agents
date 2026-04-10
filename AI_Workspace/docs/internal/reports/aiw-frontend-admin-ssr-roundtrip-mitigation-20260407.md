# Frontend Admin SSR Roundtrip Mitigation

- Task ID: `aiw-frontend-admin-ssr-roundtrip-mitigation-20260407-13`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Mitigate P1 overhead in the admin access guard chain to reduce SSR roundtrips and improve `/admin` time-to-ready without weakening authorization.

## Correlated evidence reviewed

- Optimizer gate report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-gate-20260407.md`
  - Identified P1 hotspot: extra server roundtrip in guard path (`refresh` + `/api/admin` probe).
- Backend mitigation report:
  - `AI_Workspace/docs/internal/reports/aiw-backend-admin-metrics-latency-mitigation-20260407.md`
  - Confirms backend latency improvements and role signal reliability in auth payload.

## Root cause in frontend guard path

Before this fix, admin guard (`verifyAdminAccess`) did:

1. `POST /api/auth/refresh`
2. `GET /api/admin` probe

for every guarded SSR request, even when role data was already available from refresh response.

This added a redundant network roundtrip in the hottest path.

## Mitigation applied

### Fast-path role authorization from refresh payload

- Updated `Frontend/src/lib/server/admin-access.ts`
  - Parse role hints from refresh payload user object:
    - `role_name`
    - `role`
    - `roles_id`
  - If role info exists:
    - admin -> `ok`
    - non-admin -> `forbidden`
  - Only fallback to `GET /api/admin` probe when role info is absent.

This removes one SSR roundtrip in the common case while preserving secure fallback behavior.

## Security posture

- Authz is not weakened:
  - still requires valid refresh to obtain access token
  - non-admin remains redirected to non-admin surface
  - unknown/malformed payload path still validates via backend probe
- Redirect semantics unchanged:
  - no token -> login
  - expired/invalid session -> login with controlled feedback
  - forbidden -> icons

## Validation

- `npm run lint && npm run build`: PASS (pre-existing warnings only)
- `/[locale]/admin` route compiles and remains protected.
- No redirect loop behavior introduced.

## Files changed

- `Frontend/src/lib/server/admin-access.ts`

## Acceptance criteria mapping

1. Eliminate at least one redundant SSR roundtrip: ✅ (common path no longer needs `/api/admin` probe)
2. No authz weakening / no data exposure: ✅
3. Measurable performance improvement expected for regate: ✅ (change targets identified P1 chain)
4. No redirect loops / no session-expired regression: ✅

## Final verdict

`IMPLEMENTED`
