# Frontend i18n Common Canonical Migration

- Task ID: `aiw-frontend-i18n-common-canonical-migration-20260406-32`
- Correlation ID: `aiw-frontend-i18n-common-canonical-20260406`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Align UI labels to the project's canonical i18n scheme by removing non-canonical fallback literals and ensuring shared labels come from the `common` namespace consistently.

## Canonical baseline used

- Namespace loading remains routed through `Frontend/src/i18n/request.ts`.
- Root provider in `Frontend/src/app/[locale]/layout.tsx` remains scoped to global namespaces (`common`, `auth`) as the canonical shared UI source.
- Route/domain namespaces (`home`, `premium`, `auth`) continue to be used only for domain-specific copy.

## Changes applied

### 1) Auth pages: canonical source for shared fields/loading

- `Frontend/src/app/[locale]/auth/login/page.tsx`
  - Removed fallback literal in login success toast.
  - Switched loading label to `common("actions.loading")`.

- `Frontend/src/app/[locale]/auth/signup/page.tsx`
  - Switched loading label to `common("actions.loading")`.

- `Frontend/src/app/[locale]/auth/register/page.tsx`
  - Added `common` translator.
  - Switched shared field labels to `common("fields.*")`.
  - Switched loading label to `common("actions.loading")`.
  - Removed non-canonical fallback literals from toasts/labels.

### 2) Premium flow: canonical translations without fallback literals

- `Frontend/src/app/[locale]/premium/page.tsx`
  - Removed fallback literals from error toasts; now uses canonical `premium.errors.*` keys only.

- `Frontend/src/app/[locale]/premium/success/page.tsx`
  - Removed fallback literals from success/error toasts; now uses canonical `premium.success.*` and `premium.errors.unknown` keys only.

### 3) Global states: canonical common keys only

- `Frontend/src/app/[locale]/loading.tsx`
  - Removed fallback literal and kept `common("states.loading")` only.

- `Frontend/src/app/[locale]/error.tsx`
  - Removed fallback literals for heading/body/actions.
  - Kept canonical `common.errors.*` and `common.actions.*` keys only.

## Verification

- Code scan for fallback literals in localized app pages (`|| "..."`) after migration: no remaining matches under `Frontend/src/app/[locale]/**/*.tsx`.
- Code scan for auth field/loading labels using non-canonical namespace: no remaining matches.
- `npm run lint`: PASS with unrelated pre-existing warnings only.
- `npm run build`: PASS.

## Files changed

- `Frontend/src/app/[locale]/auth/login/page.tsx`
- `Frontend/src/app/[locale]/auth/signup/page.tsx`
- `Frontend/src/app/[locale]/auth/register/page.tsx`
- `Frontend/src/app/[locale]/premium/page.tsx`
- `Frontend/src/app/[locale]/premium/success/page.tsx`
- `Frontend/src/app/[locale]/loading.tsx`
- `Frontend/src/app/[locale]/error.tsx`

## Final verdict

`FIXED`
