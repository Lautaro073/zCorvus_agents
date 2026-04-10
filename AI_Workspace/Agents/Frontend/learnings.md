## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Antes de desarrollar una nueva caracteristica, asegurate siempre de haber leido tus skills actuales en `Agents/Frontend/skills`.
- Prevencion futura: Revisar `learnings.md` en la fase `accepted` antes de transicionar a `in_progress`.

## 2026-04-07 - i18n request/server init cycle
- Trigger: `aiw-frontend-fix-icons-getrequestconfig-init-20260407-48`
- Regla aprendida: No importar `getRequestConfig` desde wrappers locales de i18n (`@/i18n/server`) cuando se define `src/i18n/request.ts`; usar import directo desde `next-intl/server`.
- Prevencion futura: Mantener separadas las capas de i18n: bootstrap (`request.ts`) directo a upstream, runtime helpers (`getMessages/getTranslations`) en wrapper local.

## 2026-04-07 - admin async layout stability
- Trigger: `aiw-frontend-admin-cls-stability-mitigation-20260407-16`
- Regla aprendida: En pantallas data-heavy, no usar un unico skeleton corto para tablas/listados; reservar altura estable por seccion y usar skeletons con geometria similar al estado final.
- Prevencion futura: En nuevos dashboards, definir `min-height` por bloque asincrono (KPIs, tablas, series) desde la primera implementacion y revisar CLS en transicion loading->success durante PR.

## 2026-04-07 - frontend package manager discipline
- Trigger: correccion de flujo durante `aiw-frontend-admin-lcp-first-render-mitigation-20260407-18`
- Regla aprendida: En este repo frontend se ejecuta con `pnpm` para lint/build/scripts; evitar `npm run` para no mezclar lockfile/flujos.
- Prevencion futura: Antes de validar cualquier task frontend, correr checklist base con `pnpm lint` y `pnpm build` y mantener comandos de medicion tambien desde contexto `pnpm`.

## 2026-04-07 - perf gate measurement hygiene
- Trigger: `aiw-frontend-admin-lcp-first-render-mitigation-20260407-18`
- Regla aprendida: No confiar en un unico run de Web Vitals; siempre ejecutar minimo 2-3 corridas y reportar run representativo + outliers para evitar conclusiones falsas por ruido de warmup/entorno.
- Prevencion futura: Para tasks de performance, incluir en reporte: (1) rerun de confirmacion, (2) puerto/server aislado cuando haya interferencia, (3) comparacion porcentual contra gate de referencia.

## 2026-04-07 - p95 tail realism for admin perf
- Trigger: `aiw-frontend-admin-lcp-abovefold-mitigation-20260407-21`
- Regla aprendida: Optimizar solo skeleton/fallback visual no garantiza bajar p95 de LCP/timeToReady; la cola fría puede seguir dominada por costo real de primer render y sincronización de datos.
- Prevencion futura: En siguientes mitigaciones priorizar reduccion de trabajo real antes de `domContentLoaded` (render path + hydration + gating de consultas), y evaluar outliers como señal principal de riesgo para gate.

## 2026-04-08 - cold-start guard cost on protected routes
- Trigger: `aiw-frontend-admin-coldstart-tail-mitigation-20260408-23`
- Regla aprendida: En rutas protegidas, validaciones server-side que encadenan fetches al backend durante render (ej: refresh + probe) pueden dominar el outlier de run1 y romper p95, aunque medianas sean buenas.
- Prevencion futura: Mantener el guard de layout en chequeos baratos (presencia de cookie/sesión) y mover validación profunda al consumo de API ya autenticado con manejo robusto de 401/403 en hooks.

## 2026-04-08 - no repetir trade-off que rompe authz QA
- Trigger: `aiw-frontend-admin-authz-redirect-overflow-fix-20260408-25`
- Regla aprendida: Mitigaciones de performance en guards no deben eliminar la señal de `forbidden`; si se simplifica authz, se debe conservar una ruta confiable para distinguir no-admin antes de renderizar `/admin`.
- Prevencion futura: Cuando optimice guards, aplicar fast-path con role-hint persistido (`userRole` cookie/storage) + fallback robusto (refresh/probe) y cubrir explícitamente el caso no-admin en E2E.

## 2026-04-08 - charts task discipline with no regressions
- Trigger: `aiw-frontend-admin-shadcn-charts-implementation-20260408-34`
- Regla aprendida: Al migrar visualización (lista -> chart), validar explícitamente que no se rompan escenarios QA de authz/session/overflow porque las rutas admin son sensibles a estado global entre tests.
- Prevencion futura: En cada cambio visual del panel admin, ejecutar suite e2e focalizada multi-proyecto (desktop+mobile) incluyendo no-admin redirect, expired session y overflow antes de cerrar task.

## 2026-04-08 - pagination/filter UX without route navigation
- Trigger: `aiw-frontend-admin-filters-pagination-no-hard-refresh-20260408-36`
- Regla aprendida: Para cambios frecuentes de query params en dashboards (paginación/filtros), usar `window.history.pushState/replaceState` evita remount global y salto de scroll que sí puede aparecer con `router.replace` en App Router.
- Prevencion futura: En vistas data-heavy, reservar `router.push/replace` para cambios de ruta reales; para solo query-state UI, usar History API + query keys de React Query para refresco localizado.

## 2026-04-08 - localized controls inside admin
- Trigger: `aiw-frontend-admin-theme-locale-controls-20260408-38`
- Regla aprendida: Controles de locale dentro de páginas con query-state complejo deben reconstruir `href` con search params actuales; cambiar locale sin arrastrar query rompe continuidad de filtros/paginación.
- Prevencion futura: Para switches de idioma in-page, usar `usePathname + useSearchParams + router.replace(..., { locale, scroll: false })` y mantener separados controles que no fueron solicitados (ej: icon set).

## 2026-04-08 - admin search threshold and plan fallback in single-table IA
- Trigger: `aiw-frontend-admin-filters-ia-refactor-20260408-40`
- Regla aprendida: Al consolidar dos tablas en una, no asumir que el endpoint de users trae plan_type; para evitar regressions de UX, resolver plan con fallback explicito (`role_name=pro -> plan pro`) cuando no exista match directo en subscriptions.
- Prevencion futura: En refactors de IA (merge de vistas), validar columnas derivadas con casos reales (pro/enterprise/none) y cubrir en E2E que filtros de texto usen umbral y debounce (>=3 chars) sin requerir Enter.

## 2026-04-09 - admin filters UX commit control and persistent table preferences
- Trigger: `aiw-frontend-admin-filters-ia-refactor-20260408-40` (continuation)
- Regla aprendida: Para filtros de fecha en dashboards, aplicar cambios en `onSelect` genera percepcion de UI brusca; mejor usar estado draft + acciones explicitas (Aplicar/Cancelar) y validar rangos (incluyendo no-futuro) antes de sincronizar URL/query.
- Prevencion futura: En controles de configuracion visual (columnas visibles), persistir por URL cuando el estado deba ser compartible/reproducible y evitar estado local efimero que se pierde al recargar.

## 2026-04-09 - admin column preferences must follow backend account contract
- Trigger: `aiw-frontend-admin-column-preferences-account-sync-20260409-43`
- Regla aprendida: Si existe contrato backend para preferencias por cuenta (`/api/admin/preferences`), no duplicar persistencia principal en query params; usar query params solo para estado navegable, no para settings persistentes del usuario.
- Prevencion futura: Antes de implementar persistencia UI, revisar `admin-api-contract.md`; cuando haya endpoint dedicado, integrar con hook de datos + mutation y cubrir persistencia post-reload en E2E.

## 2026-04-09 - admin auth hydration must gate data hooks
- Trigger: `aiw-frontend-admin-session-persistence-fix-20260409-47`
- Regla aprendida: En superficies protegidas por session refresh, no habilitar hooks de datos que dependen de `Authorization` antes de que `AuthContext` termine restauracion; hacerlo puede disparar `401` transitorio y logout falso.
- Prevencion futura: Para rutas admin, condicionar `enabled` de queries/mutations a `!authLoading && isAuthenticated && role_name === "admin"`, y cubrir con test E2E que simule refresh lento + APIs que rechazan requests sin auth header.

## 2026-04-10 - unauth admin redirect must be edge-first for URL consistency
- Trigger: `aiw-frontend-admin-unauth-redirect-consistency-fix-20260410-49`
- Regla aprendida: En acceso no autenticado a rutas protegidas, depender solo de redirects en capas de render/hydration puede dejar estados hibridos (vista login con URL protegida) bajo concurrencia.
- Prevencion futura: Para `/admin`, aplicar guard temprano en middleware (cookie `refreshToken` minima) y redirigir antes del render para garantizar URL final estable en desktop/mobile.
