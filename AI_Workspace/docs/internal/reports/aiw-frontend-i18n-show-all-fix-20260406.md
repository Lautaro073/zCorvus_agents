# Frontend i18n Show All Fix

- Task ID: `aiw-frontend-i18n-show-all-fix-20260406-29`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Apply the remaining i18n fix reported by Tester: remove the hardcoded `Show All` literal from `IconGridList` and use locale messages (`es`/`en`) without changing UI behavior or layout.

## Fix applied

- `IconGridList` now uses `next-intl` translations and renders `common("actions.showAll")` for the bottom action button.
- Existing message keys already present in locale files were reused:
  - `Frontend/src/messages/es/common.json` -> `actions.showAll: "Mostrar todos"`
  - `Frontend/src/messages/en/common.json` -> `actions.showAll: "Show all"`

## Validation

- Source scan for `Show All` in `Frontend/src/**/*.tsx`: PASS (no remaining hardcoded literal).
- Lint run (`npm run lint`): PASS with unrelated pre-existing warnings only.
- Layout/responsive/a11y impact: no structural/class changes in the button container; keyboard/focus behavior remains unchanged.

## Files changed

- `Frontend/src/features/icons-explorer/components/IconGridList.tsx`

## Final verdict

`FIXED`
