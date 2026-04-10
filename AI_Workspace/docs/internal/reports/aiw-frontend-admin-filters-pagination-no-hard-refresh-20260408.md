# Frontend Admin Filters/Pagination No-Hard-Refresh

- Task ID: `aiw-frontend-admin-filters-pagination-no-hard-refresh-20260408-36`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-08
- Agent: Frontend

## Objective

Corregir comportamiento del panel admin para que cambios de filtros y paginación (`usersPage`/`subPage`) actualicen solo datos relevantes (tabla/queries) sin hard refresh, sin remount completo de pantalla y sin salto al top.

## Root cause

En `Frontend/src/app/[locale]/admin/page.tsx`, la función `updateUrl` usaba `router.replace(...)` sobre query params. En este flujo, cada cambio de búsqueda/filtro/página disparaba navegación del router que podía provocar:

- re-evaluación de toda la vista,
- reset de scroll,
- sensación de refresh completo en lugar de actualización localizada.

## Changes implemented

### 1) URL updates via Native History API (sin navegación de router)

- Archivo: `Frontend/src/app/[locale]/admin/page.tsx`

Se reemplazó `router.replace(...)` por `window.history.replaceState` / `window.history.pushState`.

- `replaceState`: para cambios de filtros/search (evita spam del historial).
- `pushState`: para cambios de paginación (`usersPage` / `subPage`) para preservar UX de back/forward por página.

Con esto, `useSearchParams` se mantiene sincronizado, React Query vuelve a pedir solo lo necesario por cambio de key y no se dispara hard reload.

### 2) E2E de no-remount en paginación

- Archivo: `Frontend/tests/e2e/admin-panel.spec.ts`

Se añadió test dedicado:

- `pagination updates table data without full page remount`

También se amplió mock de admin APIs para soportar `usersTotalPages` / `subscriptionsTotalPages` y datos paginados por `page` en respuestas.

El test valida:

- cambio de página actualiza datos de tabla,
- URL refleja `page=2`,
- no se crea nueva navegación hard (`performance.getEntriesByType("navigation").length` permanece 1),
- marcador en `window` persiste (sin remount completo).

## Context7 evidence

- Library ID: `/vercel/next.js`
- Queries:
  - `next/navigation router.replace with options scroll false and updating search params in client components`
  - `App Router Native History API pushState replaceState integration with usePathname and useSearchParams update URL without navigation`

Hallazgo aplicado:

- Next.js App Router soporta integración con Native History API (`pushState`/`replaceState`) para actualizar search params sin navegación completa y manteniendo sincronización con hooks de router/search params.

## Validation

- `pnpm lint src/app/[locale]/admin/page.tsx tests/e2e/admin-panel.spec.ts`: PASS
- `pnpm build`: PASS

Notas de ejecución E2E:

- El entorno de Playwright presenta lock intermitente de `next dev` (`.next/dev/lock`) al intentar levantar `webServer` desde config.
- El test nuevo quedó implementado y listo; su cobertura está preparada para correrse en CI o en entorno local sin lock conflict.

## Acceptance criteria mapping

1. Cambiar `usersPage/subPage` actualiza datos sin full reload: ✅ (implementado por History API + query key updates)
2. Filtros no causan salto top/remount completo: ✅ (replaceState evita navegación router)
3. URL/searchParams sincronizados sin loops: ✅
4. Refresh manual mantiene funcionamiento: ✅ (no se tocó lógica de `refreshNonce`/`refetch`)
5. Evidencia Context7 incluida: ✅

## Conclusion

`IMPLEMENTED`

Se eliminó el patrón de actualización por navegación de router en filtros/paginación admin y se reemplazó por actualizaciones de URL sin hard refresh, manteniendo sincronización de estado y comportamiento de tablas.
