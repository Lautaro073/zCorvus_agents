# Frontend Admin Session Persistence Fix

- Task ID: `aiw-frontend-admin-session-persistence-fix-20260409-47`
- Correlation ID: `aiw-admin-auth-session-stability-20260409`
- Date: 2026-04-09
- Agent: Frontend

## Objective

Investigar y corregir expiracion temprana de sesion admin en `/admin` tras refresh, evitando logout prematuro mientras exista refresh token valido, y manteniendo manejo consistente de expiracion real.

## Root cause

La superficie admin (`/[locale]/admin/page.tsx`) podia habilitar fetches de datos (hooks de users/subscriptions/metrics/preferences) antes de que `AuthContext` terminara de restaurar sesion.

En esa ventana, los hooks hacian requests sin `Authorization` (access token aun no seteado), recibian `401` y disparaban redirect a login (`/auth/login?session=expired`), aun cuando el refresh token seguia vigente y la sesion podia recuperarse segundos despues.

## Changes implemented

### 1) Gate de auth antes de cargar datos admin

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se integra `useAuth()` y se calcula `canLoadAdminData`:
    - `detailsEnabled && !authLoading && isAuthenticated && user?.role_name === "admin"`
  - `useAdminMetrics` y `useAdminPreferences` ahora se habilitan solo cuando `canLoadAdminData === true`.
  - `AdminTablesSection` recibe `enabled={canLoadAdminData}` para alinear users/subscriptions con el mismo gate.
  - Se agrega efecto de guard client-side:
    - si termina carga auth y no hay sesion: redirect a `/auth/login?session=expired`
    - si el rol no es admin: redirect a `/icons`
  - `onToggleColumnVisibility` ahora ignora acciones si aun no se habilito `canLoadAdminData`.

### 2) Gating en tabla admin para evitar requests tempranos

- `Frontend/src/features/admin/components/AdminTablesSection.tsx`
  - Nuevo prop opcional `enabled?: boolean` (default `true`).
  - `useAdminUsers(..., { enabled })`
  - `useAdminSubscriptions(..., { enabled: enabled && shouldLoadPlans })`

### 3) Regression test que reproduce la condicion de carrera

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - `mockAdminApis` agrega opcion `requireAuthHeader?: boolean`.
  - Cuando `requireAuthHeader` esta activo, endpoints admin devuelven `401` si falta header `Authorization`.
  - Nuevo test:
    - `admin keeps session when refresh token resolves slower than dashboard hydration`
    - simula `/api/auth/refresh` con delay (~3.8s) y exige auth header en APIs admin.
    - valida que el usuario permanece en `/es/admin` y se renderiza tabla una vez restaurada sesion.

## Context7 evidence

- Not required for this task.
- Motivo: bug de coordinacion interna de estado auth/hydration en el repo, sin necesidad de adoptar API o patron externo adicional.

## Validation

- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium --grep "admin keeps session when refresh token resolves slower than dashboard hydration"`: PASS (1/1)
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium --grep "expired admin API session redirects to login with controlled feedback|admin can load panel and keep filters synced with metrics API"`: PASS (2/2)
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium`: PASS (12/12)
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=mobile-chromium`: PASS (12/12)
- `pnpm playwright test tests/e2e/auth-session-persistence.spec.ts --project=desktop-chromium`: PASS (2/2)
- `pnpm eslint "src/app/[locale]/admin/page.tsx" "src/features/admin/components/AdminTablesSection.tsx" "tests/e2e/admin-panel.spec.ts"`: PASS
- `pnpm build`: PASS

## Acceptance criteria mapping

1. Login admin + 3 refresh consecutivos en `/admin` no fuerzan logout mientras token siga vigente: ✅ (cubierto por gate + regresion de refresh tardio y suites admin)
2. No loops login/admin ni estado fantasma tras refresh: ✅
3. Expiracion real TTL mantiene redirect/mensaje consistente: ✅ (test de sesion expirada sigue PASS)
4. Evidencia antes/despues y artifacts publicados: ✅
5. Context7 evidence o not required: ✅ (`not required` documentado)

## Conclusion

`IMPLEMENTED`

Se elimino la condicion de carrera entre hidratacion auth y fetches admin que provocaba `401` tempranos y logout prematuro. La carga de datos admin ahora espera sesion autenticada estable y rol admin confirmado.
