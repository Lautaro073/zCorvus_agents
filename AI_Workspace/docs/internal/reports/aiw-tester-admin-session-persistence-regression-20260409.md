# QA Report - Admin Session Persistence Regression

- Task ID: `aiw-tester-admin-session-persistence-regression-20260409-48`
- Correlation ID: `aiw-admin-auth-session-stability-20260409`
- Assigned To: `Tester`
- Date: `2026-04-09`
- Verdict: `TEST_FAILED`

## Scope

Validar regresion de persistencia de sesion admin post-fix (task 47) con foco en:

1. Login admin -> `/admin` -> refresh multiples sin expiracion prematura con token valido.
2. Ausencia de expiracion inmediata/intermitente luego de refresh.
3. Comportamiento consistente de redireccion al no tener sesion valida.

## Dependency status

- Frontend dependency `aiw-frontend-admin-session-persistence-fix-20260409-47`: `completed`.

## Context7 usage

Context7 not required para esta regresion QA porque la validacion fue sobre comportamiento runtime E2E del repo (sin incorporar APIs/framework patterns externos nuevos).

## Environment and execution

- Build: `pnpm build` -> PASS
- Playwright server mode: `PLAYWRIGHT_PORT=3115`
- Config: `Frontend/playwright.config.ts`

## Test matrix and results

1. Initial validation after task 47

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts`
   - Result: `PASS (24/24)`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/auth-session-persistence.spec.ts`
   - Result: `PASS (4/4)`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts`
   - Result: `FAILED (26/28)`
   - Failed test (desktop/mobile):
     - `Admin panel QA regression > unauthenticated direct access to /admin redirects to login`
   - Error observed:
     - Expected URL: `/es/auth/login(?:\?|$)`
     - Actual URL: `http://127.0.0.1:3115/es/admin`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --workers=1`
   - Result: `PASS (28/28)`

- Repro focused concurrent run:
   - `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --grep "unauthenticated direct access to /admin redirects to login|cookie-backed refresh token keeps session between premium icons and home|localStorage-backed refresh token keeps session and backfills cookie"`
   - Result: `FAILED (4/6)` with the same 2 failures on unauth `/admin` redirect.

2. Revalidation after task 49 (`aiw-frontend-admin-unauth-redirect-consistency-fix-20260410-49`)

- `pnpm eslint "src/middleware.ts"`
  - Result: `PASS`

- `pnpm build`
  - Result: `PASS`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts`
  - Result: `PASS (24/24)`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/auth-session-persistence.spec.ts`
  - Result: `PASS (4/4)`

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --grep "unauthenticated direct access to /admin redirects to login|cookie-backed refresh token keeps session between premium icons and home|localStorage-backed refresh token keeps session and backfills cookie"`
  - Result: `PASS (6/6)`
  - Conclusion: el fix de redirect unauth funciona y el fallo original queda resuelto.

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts`
  - Result: `FAILED (26/28)`
  - New failed test (desktop/mobile):
    - `Admin panel QA regression > admin can load panel and keep filters synced with metrics API`
  - Error observed:
    - Expected: locator `[data-chart]` visible
    - Actual: timeout 10s con `element(s) not found`, aunque el snapshot de página muestra heading de métricas, KPIs, eje del chart y tabla de usuarios renderizados.

- Focused repro for the new failure:
  - `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --grep "admin can load panel and keep filters synced with metrics API|cookie-backed refresh token keeps session between premium icons and home|localStorage-backed refresh token keeps session and backfills cookie"`
  - Result: `FAILED (4/6)`
  - Failure reproduced again on desktop/mobile for the same admin metrics smoke test.

## Failure details

### Failure ID: `AC_REDIRECT_CONSISTENCY_UNAUTH_CONCURRENT`

- Acceptance criterion impacted:
  - "Al vencer TTL real, el sistema redirige de forma consistente (sin loops ni estados rotos)".
- Expected:
  - Usuario sin sesion al entrar a `/es/admin` debe terminar en `/es/auth/login` de forma consistente.
- Actual:
  - Bajo corrida concurrente con otras pruebas de sesion, la vista de login aparece pero la URL queda en `/es/admin` durante el timeout del test.
- Root cause (QA):
  - Comportamiento no determinista de guard/redireccion de auth en escenario concurrente de suites (pasa en aislado y serial, falla en concurrente), indicando condicion de carrera o fuga de estado entre bootstrap de sesion y verificacion de ruta.

### Failure ID: `AC_ADMIN_METRICS_SELECTOR_CONCURRENCY`

- Acceptance criterion impacted:
  - "Login admin -> `/admin` -> refresh multiples sin expiracion prematura con token valido" y estabilidad funcional completa del dashboard admin bajo regresion concurrente.
- Expected:
  - En corrida concurrente combinada, el dashboard admin debe cargar el chart de métricas y mantener sincronía UI/API igual que en suite aislada.
- Actual:
  - Bajo corrida concurrente con `auth-session-persistence.spec.ts`, el test `admin can load panel and keep filters synced with metrics API` falla en desktop y mobile esperando `locator("[data-chart]").first()`; el contenedor esperado no aparece dentro del timeout aunque el snapshot confirma que el contenido visual del chart y la tabla ya están en la página.
- Root cause (QA):
  - Persistencia admin ya no expira de forma prematura, pero el gate concurrente sigue siendo no determinista: existe una inconsistencia entre el contenedor DOM esperado por la prueba (`[data-chart]`) y el render efectivo del bloque de métricas bajo carga concurrente. Esto apunta a una carrera/render inestable del chart en el flujo admin, no al redirect unauth que ya quedó corregido.

## Reproduction steps

1. En `Frontend/`, ejecutar:
   - `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts`
2. Verificar el estado según commit evaluado:
   - Antes de task 49: fallan 2 tests (desktop/mobile) para `unauthenticated direct access to /admin redirects to login`.
   - Después de task 49: fallan 2 tests (desktop/mobile) para `admin can load panel and keep filters synced with metrics API`.
3. Para el fallo actual, ejecutar repro focal:
   - `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --grep "admin can load panel and keep filters synced with metrics API|cookie-backed refresh token keeps session between premium icons and home|localStorage-backed refresh token keeps session and backfills cookie"`
4. Confirmar evidencia en `error-context.md`, screenshot y trace de ambos proyectos.

## Artifacts

- Report: `AI_Workspace/docs/internal/reports/aiw-tester-admin-session-persistence-regression-20260409.md`
- Specs:
  - `Frontend/tests/e2e/admin-panel.spec.ts`
  - `Frontend/tests/e2e/auth-session-persistence.spec.ts`
- Playwright outputs:
  - `Frontend/playwright-report/index.html`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-3fb3c-to-admin-redirects-to-login-desktop-chromium/`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-3fb3c-to-admin-redirects-to-login-mobile-chromium/`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-4d31c-ers-synced-with-metrics-API-desktop-chromium/`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-4d31c-ers-synced-with-metrics-API-mobile-chromium/`

## Conclusion

`TEST_FAILED`. El fix de middleware de task 49 corrige la inconsistencia original de redirección unauth a `/admin`, pero el gate concurrente completo sigue fallando con una nueva inconsistencia reproducible en la carga/render del chart de métricas admin. No se aprueba avance hasta estabilizar también este flujo y revalidar en corrida combinada concurrente.
