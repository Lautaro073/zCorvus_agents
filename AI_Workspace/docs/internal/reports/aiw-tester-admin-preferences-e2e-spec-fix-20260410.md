# QA Report - Admin Preferences E2E Spec Fix

- Task ID: `aiw-tester-admin-preferences-e2e-spec-fix-20260410-56`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Assigned To: `Tester`
- Date: `2026-04-10`
- Verdict: `TEST_PASSED`

## Scope

Reparar la spec Playwright de persistencia de preferencias/columnas admin para que:

1. no falle por `use-before-init` o referencias invalidas,
2. siga validando persistencia real tras `reload` y `relogin`,
3. no genere falsos verdes frente al hardening SSR authz reciente.

## Root cause

Se detectaron dos problemas en la cobertura E2E actual:

1. En `admin table keeps selected columns after reload`, la spec pasaba `resolvePreferencesAccountKey: () => activeAccount.id` antes de declarar `activeAccount`, dejando un `use-before-init`/referencia invalida dentro del mock.
2. Tras el hardening SSR de `verifyAdminAccess`, los tests admin dependian de fetches server-side a `http://localhost:3001`. Los mocks de `page.route()` no interceptan ese tráfico SSR, por lo que la suite podia redirigir a `/auth/login?session=expired` aun con mocks client-side correctos.

## Changes applied

### 1) Backend stub deterministico para el guard SSR admin

- Nuevo archivo: `Frontend/tests/e2e/admin-auth-stub-server.mjs`
- Cubre:
  - `POST /api/auth/refresh`
  - `GET /api/admin`
  - `GET /__qa_stub_health`
- Devuelve respuestas deterministicas para tokens admin, forged y non-admin, permitiendo que el guard SSR valide comportamiento real sin depender de un backend externo mutable.

### 2) Boot automático del stub en Playwright

- `Frontend/playwright.config.ts`
- `Frontend/playwright.no-webserver.config.ts`
- Se agrega `webServer` para levantar el stub SSR backend antes de ejecutar la suite.

### 3) Corrección de la spec de preferencias

- `Frontend/tests/e2e/admin-panel.spec.ts`
- `admin table keeps selected columns after reload`:
  - ahora declara una identidad `activeAccount` real antes de usarla,
  - y alinea `mockRefreshAuth(..., activeAccount)` con `resolvePreferencesAccountKey`.
- `admin column preferences persist across relogin and stay isolated per account`:
  - se restaura fallback `resolvePreferencesAccountKey: () => activeAccount.id` para que requests sin header auth inicial sigan aisladas por cuenta.

## Context7 evidence

- `context7.libraryId`: `/microsoft/playwright`
- `context7.query`: `Does Playwright config support webServer as an array of multiple servers? Example starting multiple services before tests.`
- `context7.appliedDecision`: se uso `webServer` multiple para arrancar un stub backend SSR junto al frontend y mantener la suite deterministica sin depender de un backend real compartido.

## Validation

- `pnpm exec eslint "tests/e2e/admin-panel.spec.ts" "tests/e2e/admin-auth-stub-server.mjs" "playwright.config.ts" "playwright.no-webserver.config.ts"`
  - Result: `PASS`

- `pnpm playwright test tests/e2e/admin-panel.spec.ts --grep "admin table keeps selected columns after reload|admin column preferences persist across relogin and stay isolated per account"`
  - Result: `PASS (4/4)`

- `pnpm playwright test tests/e2e/admin-panel.spec.ts`
  - Result: `PASS (26/26)`

## Acceptance criteria mapping

1. El caso corre sin `use-before-init`: `PASS`
2. La prueba valida persistencia real tras `reload/relogin`: `PASS`
3. No se introducen falsos verdes en la suite admin: `PASS` (`admin-panel.spec.ts` completa en verde en desktop/mobile)

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-admin-preferences-e2e-spec-fix-20260410.md`
- `Frontend/tests/e2e/admin-panel.spec.ts`
- `Frontend/tests/e2e/admin-auth-stub-server.mjs`
- `Frontend/playwright.config.ts`
- `Frontend/playwright.no-webserver.config.ts`
- `Frontend/playwright-report/index.html`

## Conclusion

`TEST_PASSED`. La spec de persistencia de preferencias admin vuelve a ser confiable: elimina la referencia invalida, cubre el guard SSR endurecido con backend stub deterministico y mantiene la suite admin completa sin falsos verdes.
