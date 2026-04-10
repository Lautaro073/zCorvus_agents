# Frontend Admin LCP Above-the-Fold Mitigation

- Task ID: `aiw-frontend-admin-lcp-abovefold-mitigation-20260407-21`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Aplicar mitigación adicional de LCP y `timeToReady` tail en `/[locale]/admin`, priorizando first paint/above-the-fold real y difiriendo contenido no crítico sin romper UX, filtros, paginación ni authz.

## Input baseline (regate-19)

Referencia de `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407-19.md`:

- Admin `timeToReady p95`: `2066 ms`
- Admin `LCP p95`: `1700 ms`
- Admin `CLS p95`: `0.0000`

## Mitigaciones implementadas

1. **Diferimiento más agresivo de bloques no críticos**
   - `Frontend/src/app/[locale]/admin/page.tsx`
   - Se mantiene carga diferida de tablas y sección de métricas mediante `detailsEnabled`.
   - Se extendió activación automática a `3200ms` o interacción real (`touchstart`, `pointerdown`, `keydown`, `focusin`, `wheel`) para reducir trabajo inicial.

2. **Queries controladas por fase de render**
   - `Frontend/src/features/admin/hooks/useAdminMetrics.ts`
   - `Frontend/src/features/admin/hooks/useAdminUsers.ts`
   - `Frontend/src/features/admin/hooks/useAdminSubscriptions.ts`
   - Uso de opción `enabled` para evitar fetch de bloques diferidos durante primera pintura.

3. **Above-the-fold simplificado y estable**
   - `Frontend/src/app/[locale]/admin/page.tsx`
   - Fallbacks estáticos livianos para tablas/métricas antes de habilitar contenido diferido.
   - Conservación de layout estable para proteger CLS.

4. **Se conserva funcionalidad admin**
   - `Frontend/src/features/admin/components/AdminTablesSection.tsx`
   - Se mantiene paginación/filtros y flujo de refresh; authz sigue en layout server/admin guard existente.

## Validation

- `pnpm build`: PASS
- `pnpm lint`: FAIL por issues preexistentes fuera de scope (`.perf/*` con `require()` + warnings legacy en módulos no tocados)

## Context7 evidence

Fuentes consultadas para APIs externas usadas por la mitigación:

1. **Next.js dynamic import (`next/dynamic`)**
   - Library ID: `/vercel/next.js`
   - Query: `In App Router, when using next/dynamic with ssr false, does the importing file need to be a Client Component?`
   - Hallazgo clave: para `ssr: false`, el patrón documentado requiere componente cliente (`"use client"`) y carga dinámica en cliente.
   - Decisión aplicada: se mantuvo `Frontend/src/app/[locale]/admin/page.tsx` como Client Component y se preservó `dynamic(..., { ssr: false })` para secciones no críticas.

2. **TanStack Query (`useQuery` + `enabled`)**
   - Library ID: `/tanstack/query`
   - Query: `React Query useQuery enabled option for conditional queries and behavior when enabled is false then true`
   - Hallazgo clave: `enabled: false` evita ejecución hasta habilitarse; al cambiar a `true` la query corre normalmente.
   - Decisión aplicada: gating de fetches no críticos con `enabled` en hooks admin (`metrics/users/subscriptions`) durante first render.

## Perf smoke evidence (local)

Entorno de medición: servidor aislado `127.0.0.1:3002` + Playwright script existente.

- Script: `Frontend/.perf/admin-regate-final/collect-web-vitals-playwright.js`
- Artifacts:
  - `Frontend/.perf/admin-regate-21/admin-web-vitals-playwright-final-stable.json`
  - `Frontend/.perf/admin-regate-21/admin-web-vitals-playwright-final-stable-rerun.json`
  - `Frontend/.perf/admin-regate-21/home-web-vitals-playwright-postfix.json`

Run representativo (sin outlier extremo):

- `timeToReady p95`: `2129 ms` (no cumple objetivo de -20% vs `2066 ms`)
- `LCP p95`: `1760 ms` (no cumple objetivo de -20% vs `1700 ms`)
- `CLS p95`: `0.0000`

Rerun muestra alta varianza por outlier frío (`run 1`), confirmando sensibilidad de cola:

- `timeToReady p95`: `3427 ms`
- `LCP p95`: `3052 ms`

## Acceptance criteria assessment

1. LCP p95 reduce >=20% vs regate-19: ❌
2. timeToReady p95 reduce >=20% vs regate-19: ❌
3. Non-critical diferido sin romper UX/accesibilidad: ✅
4. No rompe authz/filtros/paginación: ✅

## Conclusion

`PARTIAL_IMPLEMENTATION`.

Se completó la mitigación de estructura above-the-fold y diferimiento adicional, pero con evidencia local actual no se alcanza el objetivo cuantitativo de p95. Se recomienda nuevo pase enfocado en la causa del outlier frío (pipeline inicial de datos/admin shell) antes de solicitar regate final del Optimizer.
