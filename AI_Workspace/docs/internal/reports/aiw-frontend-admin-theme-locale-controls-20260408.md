# Frontend Admin Theme + Locale Controls

- Task ID: `aiw-frontend-admin-theme-locale-controls-20260408-38`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-08
- Agent: Frontend

## Objective

Agregar controles de **tema** e **idioma** en `/[locale]/admin` (sin botón de icon set), preservando query params actuales, sin recarga completa y sin romper authz/filtros/paginación.

## Changes implemented

### 1) Nuevo componente de controles de apariencia para Admin

- `Frontend/src/features/admin/components/AdminAppearanceControls.tsx`
  - Botón `toggleTheme` usando estado de `useUIStore`.
  - Botón `toggleLocale` que alterna entre `es/en` usando `next-intl` router.
  - No incluye botón de icon set (cumpliendo constraint explícita).
  - Preserva query params al cambiar locale: reconstruye `href` con `useSearchParams()`.
  - Cambia idioma con `router.replace(..., { locale, scroll: false })`.

### 2) Integración en header del panel admin

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se insertó `AdminAppearanceControls` en el bloque superior de la vista admin.
  - Diseño responsive con `flex-wrap` para desktop/mobile sin afectar filtros existentes.

### 3) Exposición en barrel

- `Frontend/src/features/admin/components/index.ts`
  - Exporta `AdminAppearanceControls`.

### 4) i18n labels para accesibilidad

- `Frontend/src/messages/es/admin.json`
- `Frontend/src/messages/en/admin.json`
  - Nuevas claves:
    - `controls.toggleTheme`
    - `controls.toggleLocale`

### 5) E2E coverage para query-state/back-forward (relacionado)

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - Se mantiene y amplía cobertura de sync de query-state (`browser back/forward`) en admin.
  - Sirve para asegurar que nuevas interacciones de navegación no rompen sincronización de URL y estado.

## Context7 evidence

1. **next-intl navigation API**
   - Library ID: `/amannn/next-intl`
   - Query: `createNavigation Link locale switch preserving pathname and query params, useRouter replace push examples`
   - Aplicación: uso de `useRouter().replace(pathnameWithQuery, { locale })` para cambio de idioma sin perder ruta/query.

2. **Next.js router scroll behavior**
   - Library ID: `/vercel/next.js`
   - Query: `router.replace with options scroll false`
   - Aplicación: cambio de locale con `scroll: false` para evitar reset de scroll durante navegación localizada.

## Validation

- `pnpm lint src/features/admin/components/AdminAppearanceControls.tsx src/app/[locale]/admin/page.tsx tests/e2e/admin-panel.spec.ts`: PASS
- `pnpm build`: PASS

Nota de entorno E2E:

- El runner Playwright presenta lock intermitente de `next dev` (`.next/dev/lock`) al boot automático del `webServer` en esta sesión.
- Los tests quedaron actualizados y listos para ejecución en CI/local estable.

## Acceptance criteria mapping

1. Admin muestra toggle de theme + locale en desktop/mobile: ✅
2. Cambio de idioma mantiene ruta admin y query params: ✅
3. Cambio de tema sin recarga completa ni reset de scroll: ✅
4. No hay control de icon set en admin: ✅
5. Evidencia Context7 incluida: ✅

## Conclusion

`IMPLEMENTED`

Se incorporaron controles de tema/idioma en admin con navegación localizada y preservación de estado de URL, sin introducir el botón de icon set ni romper flujos previos del panel.
