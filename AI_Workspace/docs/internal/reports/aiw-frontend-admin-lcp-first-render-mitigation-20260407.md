# Frontend Admin LCP First-Render Mitigation

- Task ID: `aiw-frontend-admin-lcp-first-render-mitigation-20260407-18`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Mitigar LCP y tail de `timeToReady` en `/[locale]/admin` con foco en first-render path, priorizando contenido above-the-fold y difiriendo bloques secundarios sin romper filtros/paginación/authz.

## Evidence reviewed

- Gate final fallido: `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407-17.md`
  - referencia pre-fix: admin `timeToReady p95 2884 ms`, `LCP p95 2548 ms`, `CLS p95 0.0000`

## Mitigaciones aplicadas

1. **Diferimiento de bloques secundarios (tablas) en primer render**
   - `Frontend/src/app/[locale]/admin/page.tsx`
   - `Frontend/src/features/admin/components/AdminTablesSection.tsx`
   - Se movieron tablas de usuarios/suscripciones a chunk dinámico (`ssr: false`) y se muestran placeholders estables inicialmente.

2. **Separación de componentes para bajar costo inicial del page chunk**
   - `Frontend/src/features/admin/components/KPICards.tsx`
   - `Frontend/src/features/admin/components/MetricsCharts.tsx`
   - `Frontend/src/features/admin/components/index.ts`
   - `Frontend/src/features/admin/index.ts`

3. **Contenedores con geometría estable + render diferido controlado**
   - `Frontend/src/app/[locale]/admin/page.tsx`
   - `content-visibility` + `contain-intrinsic-size` en bloques pesados
   - activación diferida de bloques secundarios tras interacción o timeout corto.

4. **Hooks admin preparados para habilitación condicional**
   - `Frontend/src/features/admin/hooks/useAdminUsers.ts`
   - `Frontend/src/features/admin/hooks/useAdminSubscriptions.ts`
   - `Frontend/src/features/admin/hooks/useAdminMetrics.ts`
   - Se agregó opción `enabled` para controlar fetch de forma explícita según fase de render.

## Validation

- `pnpm build`: PASS
- `pnpm lint`: FAIL por issues preexistentes fuera de scope (scripts `.perf` con `require()` + warnings legacy en módulos no modificados por esta task).

## Perf smoke (local)

Se ejecutó muestreo Playwright en servidor aislado (`127.0.0.1:3002`) con script existente:

- Script: `Frontend/.perf/admin-regate-final/collect-web-vitals-playwright.js`
- Evidencias:
  - `Frontend/.perf/admin-regate-final/admin-web-vitals-playwright-task18-final-3002-rerun.json`
  - `Frontend/.perf/admin-regate-final/home-web-vitals-playwright-task18-final-3002.json`

Resultado representativo (admin, rerun):

- `timeToReady p95`: `1895 ms` (vs `2884 ms`, mejora `-34.29%`)
- `LCP p95`: `1528 ms` (vs `2548 ms`, mejora `-40.03%`)
- `CLS p95`: `0.0000`

Nota: persiste varianza de cola en algunos runs fríos; se requiere regate oficial del Optimizer para decisión de gate final.

## Acceptance criteria mapping

1. LCP p95 mejora medible vs `...-17`: ✅ (evidencia local)
2. timeToReady p95 reduce >=25% vs `...-17`: ✅ (evidencia local)
3. Priorizar above-the-fold y diferir secundarios: ✅
4. No romper filtros/paginación/authz: ✅ (flujo funcional intacto en validación manual y build)

## Final verdict

`IMPLEMENTED`
