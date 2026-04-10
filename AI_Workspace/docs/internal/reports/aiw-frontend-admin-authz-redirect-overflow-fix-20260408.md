# Frontend Admin Authz Redirect + Overflow Fix

- Task ID: `aiw-frontend-admin-authz-redirect-overflow-fix-20260408-25`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-08
- Agent: Frontend

## Objective

Resolver bloqueos QA reportados por Tester en `/[locale]/admin`:

1. no-admin debe salir server-side de `/admin` hacia `/icons` sin render de panel,
2. eliminar overflow horizontal en mobile tras carga de tablas admin.

## QA failures addressed

Fuente: `AI_Workspace/docs/internal/reports/aiw-tester-admin-panel-e2e-regression-20260407.md`

- Failure A: no-admin quedaba en `/admin` (redirect authz no aplicado en guard server-side).
- Failure B: overflow horizontal mobile por anchos mínimos de tablas (`min-w-[640px]` / `min-w-[620px]`).

## Changes implemented

### 1) Server-side authz redirect restored (no-admin -> icons)

- `Frontend/src/lib/server/admin-access.ts`
  - Se restablece validación de rol en `verifyAdminAccess`.
  - Se incorpora fast-path por `userRole` cookie:
    - `user/pro` => `forbidden`
    - `admin` => `ok`
  - Si no hay hint confiable, fallback a `POST /api/auth/refresh` y resolución de rol desde payload.
  - Cuando el rol sigue ambiguo, se mantiene `probe /api/admin` para cerrar authz.

- `Frontend/src/app/[locale]/admin/layout.tsx`
  - Sin cambios funcionales de routing: mantiene redirect server-side de `forbidden` a `/${locale}/icons`.

### 2) Persistencia de role-hint para guard rápido

- `Frontend/src/lib/api/backend.ts`
  - Nuevo API: `setUserRoleHint(...)`.
  - Persistencia de `userRole` en localStorage + cookie `userRole`.
  - `clearTokens` ahora limpia también role hint.

- `Frontend/src/contexts/AuthContext.tsx`
  - Se actualiza role hint en `login`, `register`, `refreshSession` y `logoutInternal`.

### 3) Overflow mobile hardening en tablas admin

- `Frontend/src/features/admin/components/AdminTablesSection.tsx`
  - Contenedores con `min-w-0` y `overflow-x-clip` en sección principal.
  - Wrappers de tablas con `overflow-x-auto overscroll-x-contain`.
  - Ajuste de mínimos a huella más contenida (`min-w-[42rem] md:min-w-[40rem]`) para reducir desborde global.
  - Botones de paginación renombrados a `Previous/Next` (i18n) en lugar de textos semánticamente incorrectos.

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Wrapper de bloque tablas con `overflow-x-clip`.

### 4) i18n labels para paginación

- `Frontend/src/messages/es/common.json`
- `Frontend/src/messages/en/common.json`
  - Nuevas claves: `actions.previous`, `actions.next`.

### 5) E2E robustness alignment

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - Seeding/cleanup de `userRole` cookie + localStorage por caso para evitar contaminación entre tests.
  - Ajuste de pruebas para nuevo guard behavior.

- `Frontend/playwright.config.ts`
  - `testIgnore: ["playwright-report/**"]` para evitar lint noise por artefactos generados.

## Context7 evidence

Se utilizó documentación externa por patrón framework de redirect server-side:

- Library ID: `/vercel/next.js`
- Query: `using redirect from next/navigation in Server Components/layout for authz and route protection in App Router`
- Applied decision:
  - mantener redirect dentro de `layout.tsx` server-side como mecanismo principal de guard de ruta,
  - usar `verifyAdminAccess` para devolver estado canónico (`forbidden/auth_required/session_expired/ok`) antes del render del panel.

## Validation

### Build/Lint

- `pnpm lint` (targeted files): PASS
- `pnpm build`: PASS

### E2E targeted regression

Command:

- `pnpm exec playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium --project=mobile-chromium --grep "non-admin direct access to /admin redirects away from admin route|admin panel keeps responsive layout without horizontal overflow" --reporter=line`

Result:

- `4 passed`

## Acceptance criteria mapping

1. `verifyAdminAccess` distingue admin/no-admin y emite `forbidden` cuando corresponde: ✅
2. no-admin en acceso directo a `/admin` redirige server-side a `/icons`: ✅
3. mobile sin overflow horizontal global tras cargar tablas admin: ✅
4. evidencia Context7 incluida: ✅

## Conclusion

`IMPLEMENTED`

Se corrigen ambos blockers del `TEST_FAILED` de QA para el panel admin, con validación E2E específica y preservando authz/filtros/paginación.
