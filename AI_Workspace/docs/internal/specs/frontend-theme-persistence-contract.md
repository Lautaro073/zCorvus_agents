# Frontend Theme Persistence Contract

## Metadata

- taskId: `aiw-documenter-i18n-canonical-sync-20260406-33`
- correlationId: `aiw-frontend-i18n-common-canonical-20260406`
- owner: `Documenter`
- updatedAt: `2026-04-06 (i18n canonical sync)`

## Scope

Define the canonical flow for visual preferences in `Frontend` so SSR, store bootstrap, and client persistence stay aligned without FOUC.

This contract also captures the final post-QA alignment for:

1. auth session persistence behavior across premium/home navigation,
2. i18n usage consistency for shared labels and locale routes.

## Source Of Truth

- Persistent storage: cookie `user_prefs`
- Read on SSR: `Frontend/src/lib/server/preferences.ts`
- Write on client: `Frontend/src/components/controllers/AppearanceSync.tsx`
- API contract: `Frontend/src/app/api/preferences/route.ts`
- Auth refresh/session source: `Frontend/src/contexts/AuthContext.tsx` + `Frontend/src/lib/api/backend.ts`
- i18n server wrapper: `Frontend/src/i18n/server.ts`
- i18n request config: `Frontend/src/i18n/request.ts`

## Canonical Order

1. SSR reads `user_prefs` via `getServerPreferences()`.
2. SSR normalizes the cookie with the official product defaults.
3. `Frontend/src/app/[locale]/layout.tsx` renders `<html>` with the resolved `theme` class.
4. `UIStoreProvider` receives the same normalized preferences as `initialState`.
5. `AppearanceSync` applies the current store theme to the DOM on mount.
6. Only after the user changes `theme`, `iconSet`, or `layer`, `AppearanceSync` sends `POST /api/preferences`.
7. The route handler normalizes the payload again, stores `user_prefs`, and returns `200` with the persisted payload.

This avoids an extra bootstrap round-trip: the first paint comes from SSR + provider state, not from a client fetch.

## Auth Session Persistence Alignment (post-QA)

To avoid false logout between premium icons and home:

1. Refresh token read/write/clear is unified in `Frontend/src/lib/api/backend.ts`.
2. `AuthContext` uses the same backend helpers instead of direct cookie-only management.
3. Restore and refresh logic share a single token source-of-truth with bidirectional backfill (cookie/localStorage).
4. Locale remounts should not trigger redundant refresh when runtime auth state is already initialized.

Validated by:

- `docs/internal/reports/aiw-frontend-auth-session-persistence-fix-20260406.md`
- `docs/internal/reports/aiw-tester-auth-session-regression-20260406.md`

## Official Defaults

If the cookie is missing, malformed, or partially invalid, all layers must use the same fallback:

```json
{
  "theme": "light",
  "iconSet": "core",
  "layer": "expanded"
}
```

These defaults are centralized in `Frontend/src/lib/preferences/contract.ts` to avoid accidental divergence from store-only hardcodes.

## Cookie Contract

- Name: `user_prefs`
- Format: JSON string with `theme`, `iconSet`, `layer`
- `httpOnly: false`
- `sameSite: "lax"`
- `secure: process.env.NODE_ENV === "production"`
- `maxAge: 31536000`
- `path: "/"`

## Client Sync Rules

- `AppearanceSync` must use `POST /api/preferences`.
- `AppearanceSync` must send same-origin credentials.
- `AppearanceSync` must not issue a persistence write on initial mount if store state already matches SSR.
- DOM theme class updates happen immediately on mount and on local preference changes.
- Failed writes do not block local theme application; they log an error and wait for the next valid user change.

## i18n Canonical Constraints (post-QA)

1. Shared UI labels must come from canonical `common` namespace keys.
2. Route/domain namespaces (`home`, `premium`, `auth`) are only for domain-specific copy.
3. Route/layout files consume server translation helpers through `@/i18n/server` wrapper conventions.
4. Avoid fallback literals (`|| "..."`) in localized route files under `src/app/[locale]`.
5. Canonical common keys for icon UI include:
   - `common.icons.library`
   - `common.icons.sets`
   - `common.icons.category`
   - `common.icons.set`
   - `common.icons.pro`
   - `common.icons.categories.local`
   - `common.icons.categories.external`
   - `common.icons.categories.premium`

Validated by:

- `docs/internal/reports/aiw-frontend-i18n-hardcoded-text-fix-20260406.md`
- `docs/internal/reports/aiw-frontend-i18n-show-all-fix-20260406.md`
- `docs/internal/reports/aiw-frontend-i18n-common-canonical-migration-20260406.md`
- `docs/internal/reports/aiw-tester-i18n-show-all-recheck-20260406.md`

## Migrated route and surface map (canonical i18n)

Routes and surfaces explicitly aligned to canonical i18n behavior:

1. `Frontend/src/app/[locale]/auth/login/page.tsx`
2. `Frontend/src/app/[locale]/auth/signup/page.tsx`
3. `Frontend/src/app/[locale]/auth/register/page.tsx`
4. `Frontend/src/app/[locale]/premium/page.tsx`
5. `Frontend/src/app/[locale]/premium/success/page.tsx`
6. `Frontend/src/app/[locale]/loading.tsx`
7. `Frontend/src/app/[locale]/error.tsx`
8. `Frontend/src/app/[locale]/icons/page.tsx`
9. `Frontend/src/app/[locale]/icons/[type]/all/page.tsx`
10. `Frontend/src/app/[locale]/icons/[type]/[id]/page.tsx`
11. `Frontend/src/features/icons-explorer/components/IconGridList.tsx`
12. `Frontend/src/features/icons-explorer/components/TypesIcons.tsx`

## Acceptance Mapping

- `POST /api/preferences` is the canonical write path and returns `200` with normalized preferences.
- SSR -> store -> client order is explicit and documented.
- Missing/invalid cookies use the official fallback, not an accidental store default.
- No extra client bootstrap fetch is required, so the flow does not add FOUC.
- Session continuity for authenticated premium/home navigation and hard refresh is part of the expected baseline.
- i18n canonical usage (`common` shared labels + no fallback literals in localized routes) is part of the expected baseline.
