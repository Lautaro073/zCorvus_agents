# Frontend Admin Column Preferences Account Sync

- Task ID: `aiw-frontend-admin-column-preferences-account-sync-20260409-43`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-09
- Agent: Frontend

## Objective

Integrar en frontend la persistencia por cuenta de columnas visibles del panel admin, usando `GET/PATCH /api/admin/preferences`, para que la configuración no dependa de query params y sobreviva recargas/sesiones por usuario autenticado.

## Changes implemented

### 1) Cliente API admin preferences

- `Frontend/src/lib/api/backend.ts`
  - Se agregan tipos:
    - `AdminPreferenceColumnKey`
    - `AdminPreferencesData`
    - `AdminPreferencesResult`
    - `UpdateAdminPreferencesPayload`
  - Se agregan funciones:
    - `getAdminPreferences()` -> `GET /api/admin/preferences`
    - `updateAdminPreferences(payload)` -> `PATCH /api/admin/preferences`
  - Se mantiene manejo de auth con `handleAdminAuthError` para 401.

### 2) Hook de datos y mutación para preferencias

- `Frontend/src/features/admin/hooks/useAdminPreferences.ts` (nuevo)
  - Query React Query para cargar preferencias por cuenta.
  - Mutation para guardar cambios de visibilidad/orden.
  - Redirect controlado a login en `401` (alineado con hooks admin existentes).
  - `onSuccess` de mutation sincroniza cache de query (`setQueryData`) para consistencia UI.

- `Frontend/src/features/admin/hooks/index.ts`
  - Exporta `useAdminPreferences`.

### 3) Persistencia de columnas en la pantalla admin (sin URL)

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se elimina dependencia de `columns` en search params para visibilidad.
  - Se integra `useAdminPreferences` y se deriva estado visible desde backend.
  - Se agrega estado optimista local para feedback inmediato al togglear.
  - Cada toggle ejecuta `PATCH /api/admin/preferences` con delta de `columnVisibility`.
  - Se conserva regla de no permitir ocultar la ultima columna visible.

### 4) Tabla admin conectada al estado persistido

- `Frontend/src/features/admin/components/AdminTablesSection.tsx`
  - Recibe `visibleColumns` y `onToggleColumnVisibility` desde `page.tsx`.
  - Mantiene columna `Inicio` (fecha de inicio) y `Vencimiento`.
  - Conserva popover `Columnas` para mostrar/ocultar columnas.
  - Exporta `defaultVisibleColumns` y `UserColumnKey`.

- `Frontend/src/features/admin/components/index.ts`
  - Re-export de `defaultVisibleColumns` y `UserColumnKey` para consumo vía `@/features/admin`.

### 5) E2E adaptados al nuevo contrato (persistencia por cuenta)

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - Mock nuevo de `GET/PATCH /api/admin/preferences` con estado en memoria por test.
  - Se elimina asunción de persistencia por URL (`columns=`).
  - Se valida:
    - toggle de columna `Inicio` (hide/show),
    - persistencia tras `reload` usando preferencias de API.
  - Cobertura regresión completa del panel admin en desktop y mobile permanece en verde tras la integración.

## Context7 evidence

- Not required for this task.
- Motivo: implementación basada en contrato interno ya documentado (`Backend/docs/admin-api-contract.md`, sección `GET/PATCH /api/admin/preferences`) y patrones React Query ya presentes en el codebase.

## Validation

- `pnpm eslint src/lib/api/backend.ts src/features/admin/hooks/useAdminPreferences.ts src/features/admin/hooks/index.ts src/features/admin/components/AdminTablesSection.tsx src/features/admin/components/index.ts src/app/[locale]/admin/page.tsx tests/e2e/admin-panel.spec.ts`: PASS
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium --grep "admin table supports toggling visible columns|admin table keeps selected columns after reload"`: PASS (2/2)
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=desktop-chromium`: PASS (10/10)
- `pnpm playwright test tests/e2e/admin-panel.spec.ts --project=mobile-chromium`: PASS (10/10)
- `pnpm build`: BLOCKED por issue preexistente fuera de scope en `src/components/index.tsx` (`@shared/*` imports no resueltos)

## Acceptance criteria mapping

1. Cargar preferencias por cuenta al entrar: ✅
2. Aplicar visibilidad en tabla con estado consistente: ✅
3. Guardar cambios via backend, no por query params: ✅
4. Mantener UX de toggle sin flicker significativo: ✅
5. Persistencia comprobada al recargar: ✅
6. URL no es fuente de verdad para columnas (solo filtros navegables): ✅

## Conclusion

`IMPLEMENTED`

La configuración de columnas del admin dejó de depender de la URL y ahora queda persistida por cuenta usando el backend de preferencias, con integración completa en UI y cobertura E2E focalizada.
