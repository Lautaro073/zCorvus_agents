# Frontend Visual Regression Deep Audit

- Task ID: `aiw-tester-frontend-visual-regression-deep-20260405-10`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-05
- Agent: Tester

## Objective

Run deep visual QA across critical Frontend surfaces in desktop/mobile and light/dark after recent shared UI, premium surface, and theme persistence work.

## Audit matrix

- Viewports: `desktop-chromium`, `mobile-chromium`
- Themes: `light`, `dark`
- Routes audited:
  - `/es`
  - `/es/icons`
  - `/es/icons/local/core`
  - `/es/icons/premium/fa-solid`
  - `/es/premium`
  - `/es/premium/success?session_id=qa-session`
  - `/es/premium/cancel`
  - `/es/auth/login`

Total captures: `32` (`8 routes x 2 themes x 2 viewports`)

## QA implementation

- Added dedicated deep-audit spec: `Frontend/tests/e2e/visual-regression-deep.spec.ts`
- Captured full-page screenshots into `Frontend/test-results/visual-regression-deep/`
- Included automated guards for:
  - route readiness per critical surface
  - correct `html` theme class (`light` / `dark`)
  - horizontal overflow budget (`<= 4px`)
  - premium-route auth/token mocking for success and premium icon surfaces

## Commands executed

```bash
pnpm exec playwright test --config playwright.config.ts tests/e2e/visual-regression-deep.spec.ts --list
pnpm exec playwright test --config playwright.config.ts tests/e2e/visual-regression-deep.spec.ts
```

## Result

- **32/32 PASS**
- No failing routes after final selector correction in audit harness.
- No horizontal overflow violations triggered in audited matrix.

## Findings

- **Critical:** none
- **High:** none
- **Medium:** none
- **Low:** none reproducible in audited matrix

Representative screenshot spot-checks were reviewed from:

- `Frontend/test-results/visual-regression-deep/desktop-chromium/light/home.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/dark/premium.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/light/auth-login.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/dark/icons-premium-fa-solid.png`

No broken composition, missing primary CTA, or theme-desync was observed in those samples.

## Non-blocking runtime notes

- Next emitted a dev warning that `middleware` file convention is deprecated in favor of `proxy`.
- Tooling emitted a stale `baseline-browser-mapping` warning.

These did not affect audited UI behavior and are not counted as visual regressions.

## Acceptance mapping

1. Capturas de cada ruta critica en desktop+mobile y light+dark -> **PASS**
2. Reporte con severidad y pasos de reproduccion para cada hallazgo visual -> **PASS** (`sin hallazgos reproducibles`)
3. Evidencia adjunta en artifacts con criterio claro -> **PASS**

## Final verdict

`TEST_PASSED`

## Artifacts

- `Frontend/tests/e2e/visual-regression-deep.spec.ts`
- `Frontend/playwright-report/index.html`
- `Frontend/test-results/visual-regression-deep/`
- `AI_Workspace/docs/internal/reports/aiw-tester-frontend-visual-regression-deep-20260405.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-frontend-visual-regression-deep-20260405-tests.txt`
