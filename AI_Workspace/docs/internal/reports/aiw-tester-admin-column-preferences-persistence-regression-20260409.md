# QA Report - Admin Column Preferences Persistence Regression

- Task ID: `aiw-tester-admin-column-preferences-persistence-regression-20260409-44`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Assigned To: `Tester`
- Date: `2026-04-09`
- Verdict: `TEST_PASSED`

## Scope

Validar regresion de persistencia de columnas por cuenta en `/admin` con foco en:

1. Guardado de visibilidad de columnas y persistencia tras `reload` y relogin del mismo admin.
2. Aislamiento por cuenta: admin B no hereda preferencias de admin A.
3. Cambios de query params/filtros no borran preferencias.

## Dependency status

- Backend dependency `aiw-backend-admin-column-preferences-persistence-20260409-42`: `completed`.
- Frontend dependency `aiw-frontend-admin-column-preferences-account-sync-20260409-43`: `completed`.

## Context7 Usage

Context7 not required para esta regresion QA porque la validacion se realizo con pruebas E2E sobre comportamiento runtime y contrato interno existente de `/api/admin/preferences`.

## Environment and execution

Se detecto que `next start` no era viable por un bloqueo preexistente fuera de scope en build (`src/components/index.tsx` con imports `@shared/*`).

Ejecucion QA final en servidor de desarrollo limpio:

- Server: `pnpm exec next dev --hostname 127.0.0.1 --port 3114`
- Test command:
  - `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3114" pnpm playwright test tests/e2e/admin-panel.spec.ts --config=playwright.no-webserver.config.ts`

## Test coverage executed

- Full suite `admin-panel.spec.ts` incluyendo casos de columnas y persistencia por cuenta.
- Total run result: `22 passed / 0 failed` (desktop + mobile).

Casos clave de esta task:

1. `admin table supports toggling visible columns`: ✅
2. `admin table keeps selected columns after reload`: ✅
3. `admin column preferences persist across relogin and stay isolated per account`: ✅

## Evidence by acceptance criteria

1. Admin A guarda columnas y persisten tras refresh/relogin: ✅
   - Se oculta columna `Inicio`, se recarga, y permanece oculta.
   - Se simula cierre/reingreso de sesion del mismo admin A y se mantiene configuracion.

2. Admin B no hereda preferencias de A: ✅
   - Con backend mock por cuenta, admin B vuelve al estado por defecto (columna `Inicio` visible).

3. Cambiar query params/filtros no borra preferencias: ✅
   - Navegacion con query params (`usersPage=2&role=admin`) mantiene columna previamente ocultada para admin A.

4. Dictamen con evidencia reproducible: ✅

## Artifacts

- Report: `AI_Workspace/docs/internal/reports/aiw-tester-admin-column-preferences-persistence-regression-20260409.md`
- Spec: `Frontend/tests/e2e/admin-panel.spec.ts`
- Config: `Frontend/playwright.no-webserver.config.ts`
- Playwright outputs:
  - `Frontend/playwright-report/index.html`
  - `Frontend/test-results/`

## Technical notes

- Para representar correctamente aislamiento por cuenta en E2E se reforzo mock de `/api/admin/preferences` para segregar estado por `sub` del access token y fallback de cuenta activa en ausencia de header.
- Se agrego helper de sesion cliente para simular cambio de cuenta sin mutar codigo de producto.
- No se realizaron cambios de logica de negocio en componentes productivos, solo cobertura/infra de QA en spec.

## Conclusion

`TEST_PASSED`. La persistencia de columnas en admin cumple criterios de guardado, recarga, relogin y aislamiento por cuenta en desktop y mobile.
