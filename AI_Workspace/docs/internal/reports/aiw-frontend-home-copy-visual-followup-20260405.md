# Frontend Home Copy Visual Follow-up

- Task ID: `aiw-frontend-home-copy-visual-followup-20260405-13`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-05
- Agent: Frontend

## Objective

Remove the copy regression introduced on Home and restore a cleaner composition closer to the original product tone, without undoing the real authenticated-header viewport fix.

## User-reported regression

The user explicitly rejected the added explanatory copy and CTA labels introduced during the recent home/icons redesign, including examples such as:

- `Navega mejor`
- `Abrir coleccion`
- other explanatory helper text that felt like narration instead of product copy

## Root cause

The previous redesign added a new content layer (`hero`, `catalog`, CTA helper copy) that did not exist in the original home translation contract. That changed the tone of Home from concise/product-like to explanatory/editorial.

## Fix applied

### `Frontend/src/app/[locale]/page.tsx`

- Restored Home to the original concise structure:
  - logo/header
  - two-line tagline
  - year divider + icon families strip
  - footer with `Z-ICONS` and `AppearanceSwitcher`
- Kept the authenticated-header safety fix (`justify-start` instead of centered full-height layout).
- Kept the responsive header container hardening needed for real authenticated users.

### `Frontend/src/messages/es/home.json`
### `Frontend/src/messages/en/home.json`

- Removed the added `hero` and `catalog` text blocks.
- Restored the home copy contract to the original translation set.

### `Frontend/src/app/[locale]/icons/page.tsx`

- Removed extra helper copy inherited from the same regression path.
- Removed visible CTA helper text like `Abrir coleccion` / `Open collection`.
- Simplified the route header to the original tagline direction.

## Validation

```bash
pnpm exec playwright test tests/e2e/home-auth-visual.spec.ts --project desktop-chromium --project mobile-chromium
pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts
pnpm lint
pnpm build
```

Results:

- `home-auth-visual.spec.ts`: **4/4 PASS**
- `visual-regression-deep.spec.ts`: **32/32 PASS**
- `pnpm lint`: PASS with unrelated pre-existing warnings only
- `pnpm build`: PASS

## Files changed

- `Frontend/src/app/[locale]/page.tsx`
- `Frontend/src/app/[locale]/icons/page.tsx`
- `Frontend/src/messages/es/home.json`
- `Frontend/src/messages/en/home.json`

## Final verdict

`FIXED`
