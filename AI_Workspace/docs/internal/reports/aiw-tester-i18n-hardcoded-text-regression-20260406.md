# i18n Hardcoded Text Regression Check

- Task ID: `aiw-tester-i18n-hardcoded-text-regression-20260406-25`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-06
- Agent: Tester

## Objective

Revalidate Home and Icons surfaces after the i18n cleanup to confirm previously hardcoded labels are localized in `es`/`en`, with no layout breakage due to text length.

## Inputs reviewed

- Frontend fix report:
  - `AI_Workspace/docs/internal/reports/aiw-frontend-i18n-hardcoded-text-fix-20260406.md`
- Updated files inspected:
  - `Frontend/src/app/[locale]/page.tsx`
  - `Frontend/src/app/[locale]/icons/page.tsx`
  - `Frontend/src/app/[locale]/icons/[type]/all/page.tsx`
  - `Frontend/src/app/[locale]/icons/[type]/[id]/page.tsx`
  - `Frontend/src/features/icons-explorer/components/TypesIcons.tsx`
  - `Frontend/src/features/icons-explorer/components/IconGridList.tsx`
  - `Frontend/src/messages/es/common.json`
  - `Frontend/src/messages/en/common.json`

## Validation executed

### 1) Hardcoded string scan (source)

- Searched for previous literals (`Icon library`, `Category`, `Set`, `Icon sets`, `Show All`) across `Frontend/src`.
- Result: previous Home/Icons literals are removed from target pages.
- Remaining finding:
  - `Show All` is still hardcoded in `Frontend/src/features/icons-explorer/components/IconGridList.tsx:176`.

### 2) Runtime i18n checks (`/es` and `/en`, desktop/mobile)

Executed an automated Playwright runtime audit script via `pnpm` over:

- `/es`, `/en`
- `/es/icons`, `/en/icons`
- `/es/icons/local/all`, `/en/icons/local/all`
- `/es/icons/local/core`, `/en/icons/local/core`

Assertions verified:

- `icons.sets` label resolves by locale
- `icons.library` label resolves by locale
- `icons.category` label resolves by locale
- `icons.set` label resolves by locale
- no horizontal overflow (`overflow = 0` on all sampled pages)

Results:

- Locale assertions on the above labels: **PASS**
- Overflow/layout sanity in sampled pages: **PASS**

### 3) Remaining issue validation (`Show All`)

- In authenticated premium route checks (`/icons/premium/fa-solid`), the `Show All` button was not visible in the sampled state.
- Static code inspection confirms the literal remains hardcoded and not localized.

## Acceptance mapping

1. Verificado en `/es` y `/en` que labels antes hardcoded ya vienen de i18n -> **PARTIAL PASS**
2. Sin roturas visuales ni de layout por longitud de texto -> **PASS**
3. Dictamen final PASS/FAILED con evidencia -> **PASS**

## Final verdict

`TEST_FAILED`

Reason: one target hardcoded label remains in code (`Show All`) at `Frontend/src/features/icons-explorer/components/IconGridList.tsx:176`, so the hardcoded-text cleanup is not fully complete.

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-i18n-hardcoded-text-regression-20260406.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-i18n-hardcoded-text-regression-20260406-tests.txt`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/es/homeSets.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/es/iconsLibrary.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/es/iconsCategory.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/es/iconsSet.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/en/homeSets.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/en/iconsLibrary.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/en/iconsCategory.png`
- `Frontend/test-results/i18n-hardcoded-regression/desktop-chromium/en/iconsSet.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/es/homeSets.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/es/iconsLibrary.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/es/iconsCategory.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/es/iconsSet.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/en/homeSets.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/en/iconsLibrary.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/en/iconsCategory.png`
- `Frontend/test-results/i18n-hardcoded-regression/mobile-chromium/en/iconsSet.png`
