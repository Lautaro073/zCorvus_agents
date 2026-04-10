# Frontend Admin Unauth Redirect Consistency Fix

- Task ID: `aiw-frontend-admin-unauth-redirect-consistency-fix-20260410-49`
- Correlation ID: `aiw-admin-auth-session-stability-20260409`
- Date: 2026-04-10
- Agent: Frontend

## Objective

Corregir inconsistencia detectada por QA donde acceso no autenticado a `/admin` mostraba login pero podia mantener URL en `/es/admin` bajo ejecucion concurrente.

## Root cause

El redirect de no autenticado para `/admin` dependia de capas tardias (layout/page/hydration). Bajo concurrencia, aparecia un estado hibrido: contenido de login renderizado sin consolidar URL final a `/es/auth/login` dentro del timeout de prueba.

## Changes implemented

### Early redirect en middleware para `/admin` sin refresh cookie

- `Frontend/src/middleware.ts`
  - Se reemplaza export directo de `createMiddleware(routing)` por wrapper custom.
  - Nueva logica:
    - detectar rutas admin (`/admin` y `/{locale}/admin`),
    - validar presencia de cookie `refreshToken`,
    - si falta, redirigir de forma temprana a `/{locale}/auth/login` con `NextResponse.redirect`.
  - Si hay cookie, se delega al middleware i18n existente (`next-intl`).

Con esto, el caso unauth queda resuelto en borde antes del render de App Router, eliminando el estado URL `/admin` + vista login.

## Context7 evidence

- Not required for this task.
- Motivo: fix de flujo interno de enrutamiento/auth en este repositorio, sin introducir API externa nueva.

## Validation

### Reproduccion del fallo (before)

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts --grep "unauthenticated direct access to /admin redirects to login|cookie-backed refresh token keeps session between premium icons and home|localStorage-backed refresh token keeps session and backfills cookie"`
  - BEFORE fix: `FAILED (4/6)`
  - Fallas: desktop/mobile en `unauthenticated direct access to /admin redirects to login`
  - Sintoma: URL quedaba en `/es/admin`.

### Verificacion post-fix

- Mismo comando focused concurrent: `PASS (6/6)`
- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts`: `PASS (24/24)`
- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts tests/e2e/auth-session-persistence.spec.ts`: `PASS (28/28)`
- `pnpm eslint "src/middleware.ts"`: `PASS`
- `pnpm build`: `PASS`

## Acceptance criteria mapping

1. Unauth a `/admin` redirige a `/login` con URL final correcta desktop/mobile: ✅
2. No estado hibrido URL admin + vista login bajo concurrencia: ✅
3. No rompe persistencia admin con sesion valida: ✅ (suites admin + auth persistence en verde)
4. Artefactos y cierre MCP con evidencia: ✅
5. Context7 no requerido o evidencia: ✅ (`not required` documentado)

## Conclusion

`IMPLEMENTED`

La redireccion unauth de `/admin` ahora se resuelve en middleware con URL final estable, eliminando la inconsistencia reportada en QA concurrente.
