# i18n Show All Recheck

- Task ID: `aiw-tester-i18n-show-all-recheck-20260406-30`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-06
- Agent: Tester

## Objetivo

Revalidar el fix puntual del literal `Show All` en `/icons`, confirmando que ahora usa i18n en `/es` y `/en`, sin regresiones visuales en el grid.

## Evidencia técnica ejecutada

### 1) Verificacion de codigo fuente

- `Frontend/src/features/icons-explorer/components/IconGridList.tsx` ahora renderiza `common("actions.showAll")` en el boton de accion inferior.
- `Frontend/src/messages/es/common.json` contiene `actions.showAll = "Mostrar todos"`.
- `Frontend/src/messages/en/common.json` contiene `actions.showAll = "Show all"`.
- Escaneo de hardcode:
  - Comando: `rg "Show All" Frontend/src --glob "*.tsx"`
  - Resultado: sin coincidencias.

### 2) Verificacion runtime de i18n (es/en)

Se ejecuto validacion browser con Playwright (Chromium) sobre rutas premium para forzar visibilidad del boton:

- `/es/icons/premium/fa-solid` -> boton visible con texto `Mostrar todos`.
- `/en/icons/premium/fa-solid` -> boton visible con texto `Show all`.

Se mockearon endpoints de auth premium (`/api/auth/refresh`, `/api/tokens/me`) para asegurar un estado reproducible de sesion premium durante la prueba.

### 3) Sanity visual del grid icons

Suite focalizada de regresion visual:

- Comando:
  - `PLAYWRIGHT_PORT=3000 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project=desktop-chromium --project=mobile-chromium --grep "icons-index|icons-local-all|icons-local-core"`
- Resultado: `12 passed`.
- Cobertura validada:
  - `icons-index`, `icons-local-all`, `icons-local-core`
  - Desktop/Mobile
  - Light/Dark
- Sin fallas de layout reportadas por la suite en este scope.

## Acceptance criteria

1. Confirmado en `/es` y `/en` que `Show All` ya viene de i18n -> **PASS**
2. Sin regresiones visuales en grid icons -> **PASS**
3. Dictamen final con evidencia minima -> **PASS**

## Dictamen final

`TEST_PASSED`

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-i18n-show-all-recheck-20260406.md`
- `Frontend/test-results/i18n-show-all-recheck/es-icons-premium-fa-solid-show-all.png`
- `Frontend/test-results/i18n-show-all-recheck/en-icons-premium-fa-solid-show-all.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/light/icons-index.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/dark/icons-index.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/light/icons-local-all.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/dark/icons-local-all.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/light/icons-local-core.png`
- `Frontend/test-results/visual-regression-deep/desktop-chromium/dark/icons-local-core.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/light/icons-index.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/dark/icons-index.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/light/icons-local-all.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/dark/icons-local-all.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/light/icons-local-core.png`
- `Frontend/test-results/visual-regression-deep/mobile-chromium/dark/icons-local-core.png`
