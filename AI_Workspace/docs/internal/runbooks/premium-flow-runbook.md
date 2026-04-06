# Premium Flow Runbook

## Metadata

- taskId: `aiw-documenter-i18n-canonical-sync-20260406-33`
- correlationId: `aiw-frontend-i18n-common-canonical-20260406`
- owner: `Documenter`
- updatedAt: `2026-04-06 (i18n canonical sync)`

## Scope

Operational runbook for premium flow and related UX/runtime paths:

1. premium page and return routes (`/premium`, `/premium/success`, `/premium/cancel`),
2. session continuity over premium icons navigation,
3. i18n canonical behavior in premium/home/icons surfaces,
4. troubleshooting and validation checklist.

## Source of truth

- `docs/internal/reports/aiw-frontend-auth-session-persistence-fix-20260406.md`
- `docs/internal/reports/aiw-tester-auth-session-regression-20260406.md`
- `docs/internal/reports/aiw-frontend-i18n-hardcoded-text-fix-20260406.md`
- `docs/internal/reports/aiw-frontend-i18n-show-all-fix-20260406.md`
- `docs/internal/reports/aiw-frontend-i18n-common-canonical-migration-20260406.md`
- `docs/internal/reports/aiw-tester-i18n-show-all-recheck-20260406.md`
- `docs/internal/reports/aiw-frontend-icons-visual-polish-20260406.md`
- `docs/internal/reports/aiw-frontend-home-final-polish-20260406.md`

## Runtime flow

### 1) Session restore and token continuity

1. Auth restore starts in `AuthContext`.
2. Refresh token is resolved via backend unified helpers (`getRefreshToken` / `setRefreshToken`).
3. Navigation between premium icons routes and home keeps auth state consistent.
4. Hard refresh on authenticated premium/home routes should not force redirect to login when token is valid.

### 2) Premium return pages

1. `/premium/success` and `/premium/cancel` surface status toasts and route feedback.
2. Error paths use canonical translation keys (no fallback literals).
3. Session refresh and user state should remain stable after return navigation.

### 3) Home/icons visual + i18n baseline

1. Shared labels must come from `common` namespace keys.
2. `Show all` action in icons grid is localized (`Mostrar todos` / `Show all`).
3. Home and icons surfaces keep post-polish layout intent without reintroducing hardcoded copy.

## Canonical i18n rules

1. Shared labels: `common.*`
2. Domain labels: `home.*`, `premium.*`, `auth.*`
3. Route/layout server translation usage through `@/i18n/server` wrapper conventions.
4. No fallback literals (`|| "..."`) in localized route files.

Canonical icon keys expected in shared namespace:

- `common.icons.library`
- `common.icons.sets`
- `common.icons.category`
- `common.icons.set`
- `common.icons.pro`
- `common.icons.categories.local`
- `common.icons.categories.external`
- `common.icons.categories.premium`

## Routes migrated to canonical i18n

The following routes/surfaces are part of the canonical migration baseline:

1. `auth/login`, `auth/signup`, `auth/register`
2. `premium/page`, `premium/success`
3. locale `loading` and `error`
4. `icons/index`, `icons/[type]/all`, `icons/[type]/[id]`
5. icon explorer components (`IconGridList`, `TypesIcons`)

## Verification checklist

### Auth session continuity

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_HEALTHCHECK_URL=http://127.0.0.1:3000/es pnpm exec playwright test --config playwright.config.ts tests/e2e/auth-session-persistence.spec.ts --project desktop-chromium --project mobile-chromium
```

Expected:
- session preserved on `/es/icons/premium/fa-solid` -> `/es`
- hard refresh keeps authenticated state

### i18n show-all and visual scope

```bash
PLAYWRIGHT_PORT=3000 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project=desktop-chromium --project=mobile-chromium --grep "icons-index|icons-local-all|icons-local-core"
```

Expected:
- localized `Show all` behavior validated in `/es` and `/en`
- no visual regressions in targeted icons grid scope

## Troubleshooting

### Issue: false logout between premium and home

Checks:
1. Verify unified token helpers are used by both AuthContext and backend client.
2. Verify refresh token continuity across cookie/localStorage states.
3. Re-run `auth-session-persistence.spec.ts`.

### Issue: hardcoded text appears again in localized UI

Checks:
1. Search for literals in localized routes:
   - `rg "\|\| \"" Frontend/src/app/[locale] --glob "*.tsx"`
2. Verify `common.icons.*` and `common.actions.showAll` keys are intact.
3. Re-run i18n + visual targeted checks.

### Issue: locale switch triggers unnecessary auth refresh

Checks:
1. Confirm runtime auth state cache behavior in `AuthContext` remains active.
2. Validate no redundant refresh calls on locale remount.
3. Re-run auth regression check.

## Final operational baseline

1. Theme persistence remains SSR-first with consistent cookie contract.
2. Auth session persistence remains stable across premium/home transitions and hard refresh.
3. i18n canonical model is enforced for shared labels and localized routes.
4. Home/icons premium visual polish remains intact post-fixes.
5. No fallback literals are expected in localized route pages included in the migrated scope.
