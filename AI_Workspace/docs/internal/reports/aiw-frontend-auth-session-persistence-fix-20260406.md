# Frontend Auth Session Persistence Fix

- Task ID: `aiw-frontend-auth-session-persistence-fix-20260406-27`
- Correlation ID: `aiw-auth-session-persistence-20260406`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Fix session loss when navigating between premium icons routes and home by unifying refresh token persistence between `AuthContext` and backend API client so restore/auth checks work consistently across navigation and hard refresh.

## Root cause

- `AuthContext` was reading/writing refresh token only via cookies (`js-cookie`).
- `backend.ts` was reading/clearing refresh token only via `localStorage`.
- This created storage mismatch states:
  - cookie present but localStorage missing (or vice versa),
  - `refreshAccessToken()` unable to find token in expected store,
  - false logout / guard redirect behavior.

## Fix applied

### `Frontend/src/lib/api/backend.ts`

- Added unified refresh token storage primitives:
  - `setRefreshToken(refreshToken, expiresAt?)`
  - `getRefreshToken()` with bidirectional backfill (`localStorage <-> cookie`)
  - cookie helpers (`getCookieValue`, `setCookieValue`, `removeCookieValue`)
- Updated `clearTokens()` to clear both localStorage and cookies for refresh token + expiry.
- Kept access-token memory model unchanged.

### `Frontend/src/contexts/AuthContext.tsx`

- Removed direct `js-cookie` dependency.
- Switched refresh token flow to backend unified helpers:
  - reads via `getRefreshToken()`
  - writes via `setRefreshToken()` after `getRefreshTokenFromServer()`
  - cleanup delegated to `clearTokens()`
- `restoreSession` and refresh flow now use same source of truth as API client.

### E2E regression coverage

- Added dedicated session persistence test:
  - `Frontend/tests/e2e/auth-session-persistence.spec.ts`
- Covers:
  - cookie-backed refresh token session continuity from `/icons/premium/fa-solid` -> `/` -> refresh -> back to premium route
  - localStorage-backed token continuity and cookie backfill verification

## Validation

```bash
pnpm lint
pnpm build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_HEALTHCHECK_URL=http://127.0.0.1:3000/es pnpm exec playwright test tests/e2e/auth-session-persistence.spec.ts --project desktop-chromium --project mobile-chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_HEALTHCHECK_URL=http://127.0.0.1:3000/es pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project desktop-chromium --project mobile-chromium
```

Results:

- `pnpm lint`: PASS with unrelated pre-existing warnings only
- `pnpm build`: PASS
- `auth-session-persistence.spec.ts`: **4/4 PASS**
- `visual-regression-deep.spec.ts`: **40/40 PASS**

## Files changed

- `Frontend/src/lib/api/backend.ts`
- `Frontend/src/contexts/AuthContext.tsx`
- `Frontend/tests/e2e/auth-session-persistence.spec.ts`

## Final verdict

`FIXED`
