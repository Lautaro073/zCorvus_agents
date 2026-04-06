# Frontend i18n Hardcoded Text Fix

- Task ID: `aiw-frontend-i18n-hardcoded-text-fix-20260406-24`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Remove hardcoded user-facing copy introduced during recent Home/Icons visual polishing and move labels to i18n messages (`es`/`en`) without altering approved visual direction.

## QA issue addressed

- QA detected hardcoded text on Home/Icons surfaces after visual polish (labels such as `Icon sets`, `Icon library`, `Category`, `Set`, and raw category names/`Pro`).

## Fix applied

### i18n messages

Added `common.icons` namespace keys:

- `library`
- `sets`
- `category`
- `set`
- `pro`
- `categories.local`
- `categories.external`
- `categories.premium`

Updated files:

- `Frontend/src/messages/es/common.json`
- `Frontend/src/messages/en/common.json`

### Home page hardcoded copy removal

- Replaced hardcoded `Icon sets` with `common("icons.sets")`.

Updated file:

- `Frontend/src/app/[locale]/page.tsx`

### Icons index hardcoded copy removal

- Replaced hardcoded `Icon library` with `common("icons.library")`.
- Replaced raw category chip text with localized `common("icons.categories.<category>")`.

Updated file:

- `Frontend/src/app/[locale]/icons/page.tsx`

### Icons detail/list surfaces hardcoded copy removal

- Replaced hardcoded `Category` with `common("icons.category")`.
- Replaced hardcoded `Set` with `common("icons.set")`.

Updated files:

- `Frontend/src/app/[locale]/icons/[type]/all/page.tsx`
- `Frontend/src/app/[locale]/icons/[type]/[id]/page.tsx`

### Types list category badge localization

- Replaced hardcoded `Pro` and raw category values with localized i18n strings:
  - `common("icons.pro")`
  - `common("icons.categories.<category>")`

Updated file:

- `Frontend/src/features/icons-explorer/components/TypesIcons.tsx`

## Validation

```bash
pnpm lint
pnpm build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_HEALTHCHECK_URL=http://127.0.0.1:3000/es pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project desktop-chromium --project mobile-chromium
```

Results:

- `pnpm lint`: PASS with unrelated pre-existing warnings only
- `pnpm build`: PASS
- `visual-regression-deep.spec.ts`: **40/40 PASS**

## Files changed

- `Frontend/src/messages/es/common.json`
- `Frontend/src/messages/en/common.json`
- `Frontend/src/app/[locale]/page.tsx`
- `Frontend/src/app/[locale]/icons/page.tsx`
- `Frontend/src/app/[locale]/icons/[type]/all/page.tsx`
- `Frontend/src/app/[locale]/icons/[type]/[id]/page.tsx`
- `Frontend/src/features/icons-explorer/components/TypesIcons.tsx`

## Final verdict

`FIXED`
