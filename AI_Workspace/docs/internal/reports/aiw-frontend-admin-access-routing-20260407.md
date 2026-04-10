# Frontend Admin Access Routing

- Task ID: `aiw-frontend-admin-access-routing-20260407-06`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Implement frontend admin access control for:

- Role-based post-login redirect.
- Server-side guard for `/{locale}/admin`.
- Controlled session-expired redirect flow.

Non-goals respected:

- No dashboard data hooks.
- No metrics UI implementation.

## Backend correlation reviewed

Artifacts and contracts consumed before implementation:

- `Backend/docs/admin-api-contract.md`
- `Backend/routes/admin.routes.js`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-revenue-ledger-20260407.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-users-subscriptions-apis-20260407.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-admin-metrics-api-20260407.md`

Key alignment points used:

- `/api/admin/*` requires auth + admin (401 without token, 403 for non-admin).
- `GET /api/admin` is a readiness probe suitable for guard verification.

## Changes applied

### 1) Login redirect by role

- Updated `Frontend/src/app/[locale]/auth/login/page.tsx`:
  - `login()` now returns the logged user from auth context.
  - Redirect logic:
    - `role_name === "admin"` -> `/admin`
    - otherwise -> `/icons`
  - Added controlled feedback for expired session via query param:
    - reads `?session=expired`
    - shows info toast once
    - replaces URL back to clean `/auth/login`

### 2) Auth context contract for role-aware redirect

- Updated `Frontend/src/contexts/AuthContext.tsx`:
  - `login(...)` return type changed from `Promise<void>` to `Promise<User>`.
  - Returns normalized `userObj` after successful login state hydration.

### 3) Server-side admin guard

- Added `Frontend/src/lib/server/admin-access.ts`:
  - Server-only helper `verifyAdminAccess()`.
  - Reads refresh token cookie.
  - Exchanges refresh token for access token via `/api/auth/refresh`.
  - Probes `/api/admin` with bearer access token.
  - Returns one of:
    - `ok`
    - `auth_required`
    - `session_expired`
    - `forbidden`

- Added `Frontend/src/app/[locale]/admin/layout.tsx`:
  - Enforces guard on server before rendering admin surface.
  - Redirect policy:
    - `auth_required` -> `/{locale}/auth/login`
    - `session_expired` -> `/{locale}/auth/login?session=expired`
    - `forbidden` -> `/{locale}/icons`

### 4) Admin route scaffold (minimal)

- Added `Frontend/src/app/[locale]/admin/page.tsx` as server component placeholder.
  - Keeps route render-safe for guarded admin entry without building dashboard UI.

### 5) i18n feedback copy

- Updated:
  - `Frontend/src/messages/es/auth.json`
  - `Frontend/src/messages/en/auth.json`
- Added key: `errors.sessionExpired`.

## Acceptance criteria mapping

1. Login redirects admin/non-admin by role: ✅
2. Direct non-admin access to admin route blocked before render: ✅ (server guard + redirect)
3. Guard is server-side (not only client-side): ✅ (`admin/layout.tsx` + server helper)
4. Expired token redirects to login with controlled feedback: ✅ (`?session=expired` + one-shot toast)
5. No redirect loops in restore/refresh flow: ✅
   - guard uses one-shot URL cleanup on login page (`router.replace('/auth/login')` after feedback)

## Validation

- `npm run lint` -> PASS (pre-existing warnings only)
- `npm run build` -> PASS
- Build route includes:
  - `/[locale]/admin`

## Files changed

- `Frontend/src/app/[locale]/auth/login/page.tsx`
- `Frontend/src/contexts/AuthContext.tsx`
- `Frontend/src/lib/server/admin-access.ts`
- `Frontend/src/app/[locale]/admin/layout.tsx`
- `Frontend/src/app/[locale]/admin/page.tsx`
- `Frontend/src/messages/es/auth.json`
- `Frontend/src/messages/en/auth.json`

## Final verdict

`IMPLEMENTED`
