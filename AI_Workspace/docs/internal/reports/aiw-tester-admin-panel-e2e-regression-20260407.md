# Admin Panel E2E Regression Report

- taskId: `aiw-tester-admin-panel-e2e-regression-20260407-10`
- correlationId: `aiw-admin-control-panel-20260407`
- agent: `Tester`
- date: `2026-04-08`
- status: `TEST_FAILED`

## Scope

Validar gate E2E/regresion del panel admin con foco en permisos por rol, session handling (401), sincronizacion de filtros UI/API, responsive y accesibilidad basica.

## Acceptance criteria matrix

1. Admin accede y usa panel con KPIs/tablas/filtros en `/[locale]/admin` -> **PASS**
2. No-admin y no-auth redirigen sin exponer datos admin -> **FAIL**
3. Token expirado redirige a login con feedback controlado -> **PASS**
4. Filtros `day|month|year|custom` sincronizan UI y API -> **PASS**
5. Resultado final con evidencia reproducible -> **PASS**

## Context7 evidence

- context7.libraryId: `/microsoft/playwright`
- context7.query: `Best practices for route mocking with page.route, using expect(page).toHaveURL, and avoiding flaky assertions when checking responsive layout overflow in mobile viewport`
- context7.appliedDecision:
  - usar `page.route` para respuestas deterministicas de APIs admin/auth en E2E;
  - usar `expect(page).toHaveURL(...)` para verificar redirects;
  - usar aserciones de viewport/overflow con evidencia reproducible por proyecto.

## Evidence executed

### A) Backend contract/regression (PASS)

Command:

- `npm test -- admin.routes.test.js admin.users.test.js admin.subscriptions.test.js admin.metrics.test.js`

Result:

- `4/4` suites PASS
- `25/25` tests PASS

### B) Frontend E2E admin panel (FAIL)

Command:

- `pnpm exec playwright test tests/e2e/admin-panel.spec.ts`

Result:

- `7` passed / `3` failed
- Failed checks:
  1. `non-admin direct access to /admin redirects away from admin route` (desktop)
  2. `non-admin direct access to /admin redirects away from admin route` (mobile)
  3. `admin panel keeps responsive layout without horizontal overflow` (mobile)

## Failures with root cause and reproduction

### Failure 1: Non-admin can stay in `/es/admin` (redirect missing)

- Severity: `high` (authz UX gate)
- Expected: usuario no-admin en acceso directo a `/es/admin` debe redirigir a `/es/icons`.
- Actual: URL permanece en `/es/admin`; se renderiza superficie admin y llamadas admin fallan dentro del contenido.
- Repro:
  1. Inyectar sesion con refresh token valido y rol `user`.
  2. Abrir `/es/admin`.
  3. Observar que no hay redirect a `/es/icons`.
- Root cause:
  - `verifyAdminAccess()` no valida rol ni estado real de autorizacion; solo verifica presencia de cookie `refreshToken` y retorna `ok`.
  - Referencia: `Frontend/src/lib/server/admin-access.ts:9` y `Frontend/src/lib/server/admin-access.ts:17`.
  - `admin/layout.tsx` depende de estados `forbidden|auth_required|session_expired`, pero `forbidden` nunca se emite desde `verifyAdminAccess`.
  - Referencia: `Frontend/src/app/[locale]/admin/layout.tsx:21`.

### Failure 2: Overflow horizontal en viewport mobile

- Severity: `medium` (responsive gate)
- Expected: no overflow horizontal no intencional en mobile.
- Actual: overflow medido `278px` en mobile durante render completo de tablas.
- Repro:
  1. Abrir `/es/admin` con sesion admin.
  2. Forzar carga de tablas (`Actualizar`).
  3. Medir `Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth)`.
  4. Resultado observado: `278`.
- Root cause probable:
  - Tablas con anchuras minimas fijas (`min-w-[640px]` y `min-w-[620px]`) en secciones mobile generan desborde global.
  - Referencias: `Frontend/src/features/admin/components/AdminTablesSection.tsx:66` y `Frontend/src/features/admin/components/AdminTablesSection.tsx:148`.

## Artifacts

- Spec E2E creado/ejecutado:
  - `Frontend/tests/e2e/admin-panel.spec.ts`
- Backend evidence:
  - salida de `npm test -- admin.routes.test.js admin.users.test.js admin.subscriptions.test.js admin.metrics.test.js`
- Frontend evidence (Playwright):
  - `Frontend/test-results/admin-panel-Admin-panel-QA-709ca-rects-away-from-admin-route-desktop-chromium`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-709ca-rects-away-from-admin-route-mobile-chromium`
  - `Frontend/test-results/admin-panel-Admin-panel-QA-99228-without-horizontal-overflow-mobile-chromium`

## Verdict

`TEST_FAILED`

Gate no aprobable hasta resolver:

1. Redirect de no-admin en guard server-side de `/[locale]/admin`.
2. Overflow horizontal mobile en panel admin.
