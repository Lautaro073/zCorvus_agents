# Admin Filters/Pagination UX Regression QA

- taskId: `aiw-tester-admin-filters-pagination-ux-regression-20260408-37`
- correlationId: `aiw-admin-control-panel-20260407`
- agent: `Tester`
- date: `2026-04-08`
- status: `TEST_PASSED`

## Objective

Validar regresión UX del panel admin para confirmar que filtros y paginación no disparan hard refresh, no rompen scroll/contexto y mantienen sincronización URL/UI incluyendo navegación back/forward.

## Acceptance criteria matrix

1. Cambiar página en users/subscriptions no hace reload completo ni salto al top -> **PASS**
2. Aplicar/limpiar filtros mantiene posición y estado visual -> **PASS**
3. URL refleja filtros/paginación sin romper back/forward browser -> **PASS**
4. Dictamen final con evidencia reproducible -> **PASS**

## Context7

Context7 not required.

Motivo: se verificó comportamiento sobre implementación ya definida en el repo (History API + searchParams) sin necesidad de decisiones nuevas de API externa.

## Executed checks

Command:

- `pnpm exec playwright test --config=playwright.no-webserver.config.ts tests/e2e/admin-panel.spec.ts --grep "pagination updates table data without full page remount|browser back/forward keeps admin query-state in sync"`

Result:

- `4 passed / 0 failed`
- proyectos: `desktop-chromium`, `mobile-chromium`

## Evidence details

- Caso `pagination updates table data without full page remount`:
  - verifica ausencia de remount global (`navigation entries` estable y marker persistente),
  - verifica scroll preservado,
  - verifica request de datos con `page=2`.
- Caso `browser back/forward keeps admin query-state in sync` (añadido para esta task):
  - `usersPage=2` se refleja en URL al paginar,
  - `goBack()` vuelve a estado/página previa,
  - `goForward()` restaura `usersPage=2` y datos coherentes.

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-admin-filters-pagination-ux-regression-20260408.md`
- `Frontend/tests/e2e/admin-panel.spec.ts`
- `Frontend/playwright.no-webserver.config.ts`
- `Frontend/playwright-report/index.html`

## Verdict

`TEST_PASSED`

Regresión UX de filtros/paginación admin aprobada para el alcance solicitado.
