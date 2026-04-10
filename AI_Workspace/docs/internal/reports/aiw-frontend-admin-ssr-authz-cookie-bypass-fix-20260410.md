# Frontend Admin SSR Authz Cookie Bypass Fix

- Task ID: `aiw-frontend-admin-ssr-authz-cookie-bypass-fix-20260410-53`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-10
- Agent: Frontend

## Objective

Corregir bypass de autorizacion SSR en `/admin` causado por confiar en `userRole` como señal suficiente de admin.

## Root cause

`verifyAdminAccess` aceptaba acceso admin cuando encontraba `userRole=admin`, sin verificar la sesion en backend.

Resultado: una cookie controlable por cliente podia habilitar SSR de `/admin` sin evidencia confiable de rol.

## Changes implemented

### 1) Hardening de verificacion SSR admin

- `Frontend/src/lib/server/admin-access.ts`
  - Eliminado fast-path inseguro:
    - `if (hintedRole === "admin") return "ok"`
  - Ahora la ruta admin requiere validacion real via `POST /api/auth/refresh`.
  - Si backend confirma rol admin => `ok`.
  - Si backend responde no-admin => `forbidden`.
  - Si refresh falla/expira/no responde => `session_expired`.

### 2) Timeout defensivo en fetches de guard SSR

- `Frontend/src/lib/server/admin-access.ts`
  - Se agrego `ADMIN_ACCESS_FETCH_TIMEOUT_MS = 2000`.
  - Se aplica en:
    - refresh auth SSR (`/api/auth/refresh`)
    - probe admin scope (`/api/admin`)
  - Evita waits largos en escenarios de backend no disponible.

### 3) Regression E2E de cookie forjada

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - Nuevo caso: `forged admin role hint cookie does not bypass SSR admin guard`
  - Simula `refreshToken` invalido + `userRole=admin` forjada.
  - Verifica redireccion fuera de `/admin` y ausencia de heading del panel admin.

## Context7 evidence

- Not required for this task.
- Motivo: cambio de seguridad sobre logica SSR interna del repo, sin adopcion de API externa nueva.

## Validation

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium --grep "forged admin role hint cookie does not bypass SSR admin guard"`: PASS (1/1)
- `pnpm eslint "src/lib/server/admin-access.ts" "tests/e2e/admin-panel.spec.ts"`: PASS
- `pnpm build`: PASS

Validacion ampliada de no-regresion admin con stub backend temporal en `localhost:3001` (para cubrir guard SSR server-side en entorno local sin backend levantado):

- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium`: PASS (13/13)
- `PLAYWRIGHT_PORT=3115 pnpm playwright test tests/e2e/admin-panel.spec.ts --project=mobile-chromium`: PASS (13/13)

Nota de estabilidad observada:

- En corrida combinada concurrente `admin-panel + auth-session`, persiste intermitencia preexistente en `admin can load panel and keep filters synced with metrics API` (chart no visible dentro del timeout) ya reportada por QA en gates previos y no introducida por este fix.

## Acceptance criteria mapping

1. Cookie `userRole` forjada no permite renderizar `/admin`: ✅
2. Admin autenticado real mantiene acceso normal: ✅ (suite admin desktop/mobile en verde con evidencia backend de guard SSR)
3. No-admin/no-auth redirigen consistentemente sin romper fixes previos: ✅
4. Artefactos y cierre MCP: ✅
5. Context7 not required/evidence: ✅

## Conclusion

`IMPLEMENTED`

Se removio la confianza insegura en `userRole=admin` para SSR authz y se reemplazo por validacion de sesion/rol con backend, eliminando el bypass por cookie forjada.
