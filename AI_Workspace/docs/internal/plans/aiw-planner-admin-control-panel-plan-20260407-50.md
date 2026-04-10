# Admin Control Panel — Plan de ejecución v2

**taskId:** `aiw-planner-admin-control-panel-plan-20260407-01`
**correlationId:** `aiw-admin-control-panel-20260407`
**branch:** `feature/admin-control-panel`
**estado:** `PLAN_PROPOSED`
**reemplaza:** `aiw-planner-admin-control-panel-plan-20260407-50`

---

## Análisis de correcciones aplicadas respecto al plan v1

### ❌ Error 1 — taskId del plan con seq=50 sin justificación
El plan original usaba `...-50`. Si no hay 49 tareas previas del Planner ese día, la secuencia genera confusión en el dispatcher. Corregido a `...-01`.

### ❌ Error 2 — Tester (tarea 10) no dependía de la tarea 06 (routing guard)
El AC del Tester valida "usuario admin accede al panel" y "usuario no admin recibe bloqueo", comportamientos que dependen directamente de `aiw-frontend-admin-access-routing-20260407-06`. Sin esa dependencia, el Tester podría ejecutarse antes de que el guard exista, haciendo los tests inválidos.

### ❌ Error 3 — Tarea 07 AC vago: "Error/loading/empty quedan diferenciados"
No especificaba el mecanismo. Un agente implementaría `useState` local, React Query, Zustand o console.log según lo que se le ocurriera. Corregido con estados explícitos de React Query.

### ❌ Error 4 — Tarea 07 skills incorrectas (`frontend-design`, `design-guide`)
Tarea 07 es de API client y React Query hooks, no de diseño visual. `design-guide` no aplica para escribir funciones de fetching. Corregido a `shadcn` (para integración de TanStack Query) y removido el mismatch.

### ❌ Error 5 — Tarea 08 mecanismo de filtros no especificado
El AC decía "filtros actualizan charts y tablas con una sola fuente de estado visible" sin definir si era URL searchParams, Zustand o useState local. Si el agente elige `useState`, los filtros no sobreviven a un refresh ni son compartibles por URL. Corregido a `searchParams` de URL como fuente de verdad.

### ❌ Error 6 — Tarea 06 sin AC para token expirado durante sesión admin
El routing guard cubría acceso inicial y redirección, pero no el caso de sesión expirada mientras el admin navega el panel. Si el token expira, el admin vería un 401 o un panel roto sin comportamiento definido.

### ❌ Error 7 — Riesgo de timezone sin AC en ninguna tarea
El riesgo "Filtrado temporal inconsistente por timezone" estaba documentado con "API normaliza en UTC" como mitigación, pero ninguna tarea tenía un AC que lo verificara. Riesgo sin AC = riesgo ignorado. Agregado AC explícito en tarea 05.

### ❌ Error 8 — Tarea 05 no cubría ledger completamente vacío
El AC decía "si un punto no tiene datos devuelve 0" pero no cubría el caso de ledger recién desplegado sin ningún registro. En ese caso la API podría devolver null, array vacío o error 500 según implementación.

### ❌ Error 9 — Tarea 09 usa skill `cost-optimization` de existencia incierta
Reemplazado por `distributed-tracing` que sí está confirmada en el workspace.

### 💡 Mejoras incorporadas (no eran errores, pero mejoran calidad)
- Tarea 02: AC agrega creación de índices en `paid_at` y `status` para queries de métricas.
- Tarea 08: AC agrega skeleton loaders (el panel llamará 3 endpoints en paralelo).
- Tarea 08: AC especifica que paginación es server-side (sincronizada con API, no client-side).
- Tarea 08: AC agrega enmascaramiento de datos sensibles (emails, datos de pago).

---

## 1) Contexto inspeccionado (evidencia real)

### Archivos revisados
- `AI_Workspace/architecture.md`
- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/MCP_Server/shared_context.jsonl`
- `AI_Workspace/Agents/Planner/profile.md`
- `AI_Workspace/Agents/Planner/learnings.md`
- `Backend/routes/index.js`
- `Backend/routes/user.routes.js`
- `Backend/routes/token.routes.js`
- `Backend/routes/stripe.routes.js`
- `Backend/controllers/user.controller.js`
- `Backend/controllers/token.controller.js`
- `Backend/controllers/stripe.controller.js`
- `Backend/controllers/auth.controller.js`
- `Backend/middlewares/auth.middleware.js`
- `Backend/middlewares/role.middleware.js`
- `Backend/models/User.js`
- `Backend/models/Token.js`
- `Backend/models/RefreshToken.js`
- `Backend/database.sql`
- `Frontend/src/app/[locale]/auth/login/page.tsx`
- `Frontend/src/contexts/AuthContext.tsx`
- `Frontend/src/lib/api/backend.ts`
- `Frontend/src/app/[locale]/layout.tsx`
- `Frontend/src/app/[locale]/premium/page.tsx`
- `Frontend/src/app/[locale]/premium/success/page.tsx`
- `Frontend/src/app/[locale]/icons/page.tsx`
- `Frontend/src/components/ui/button.tsx`
- `Frontend/src/components/ui/input.tsx`
- `Frontend/components.json`

### Hallazgos clave que condicionan el plan
1. **No existe surface admin en Frontend**: no hay ruta `/[locale]/admin` ni componentes de dashboard admin.
2. **Login sin redirección por rol**: `Frontend/src/app/[locale]/auth/login/page.tsx` redirige fijo a `/icons`.
3. **Ya existe base de auth/roles en Backend**: `authenticateToken` + `isAdmin` operativos; roles `admin/user/pro` ya definidos.
4. **Hay endpoints admin parciales, pero insuficientes para panel**: `GET /api/users` y `GET /api/tokens` sin paginación/filtros/joins de negocio.
5. **No existe ledger explícito de ventas**: solo hay `token` y webhook Stripe que crea token/rol. Sin ledger no hay métricas de ingresos por período.
6. **Shadcn base disponible**: `components.json` confirma shadcn instalado; no hay implementación actual de charts.

---

## 2) Objetivo

Definir un plan implementable para que, al iniciar sesión un usuario con rol `admin`, se habilite un panel de administración con:
- gestión de usuarios y suscripciones,
- métricas de registros/ventas/ganancias con filtros temporales (`day`, `month`, `year`, `custom`),
- APIs Backend paginadas y filtrables,
- UI en Frontend con tablas/charts de shadcn,
- gate de performance y QA antes de cierre.

---

## 3) Agentes y roles en esta EPIC

| Agente | Responsabilidad en este plan | No hace |
|---|---|---|
| `Backend` | APIs admin, modelo de datos de ventas, authz servidor, queries paginadas/filtradas | UI React |
| `Frontend` | Ruta admin, redirect por rol, guard de acceso, tablas/charts, estados vacío/error/loading | Route handlers Express o DB directa |
| `AI_Workspace_Optimizer` | Gate de performance y presupuesto de bundle/render | Implementación de UI de producto |
| `Tester` | E2E + regresión funcional/seguridad + evidencia reproducible | Implementar fixes |
| `Documenter` | Contratos API admin + runbook operativo + registry | Cambios de código |

---

## 4) Skills recomendadas por tarea

| Tarea | Skills recomendadas |
|---|---|
| Backend authz/contract | `nodejs-backend-patterns`, `nodejs-best-practices` |
| Backend ledger/SQL | `sql-optimization-patterns`, `nodejs-best-practices` |
| Backend query APIs | `nodejs-backend-patterns`, `sql-optimization-patterns` |
| Frontend routing/guard | `frontend-design`, `accessibility` |
| Frontend data hooks | `shadcn` |
| Frontend dashboard UI | `shadcn`, `frontend-design`, `accessibility`, `design-guide` |
| Performance gate | `distributed-tracing` |
| QA | `playwright-testing`, `systematic-debugging`, `test-driven-development` |
| Docs | `api-reference-documentation` |

---

## 5) Tareas por fase (atómicas y dependency-aware)

---

### Fase A — Backend foundation

#### `aiw-backend-admin-contract-authz-20260407-01`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** `[]`
- **description:** Crear router base `/api/admin/*` con protección estricta `authenticateToken + isAdmin`, envelope de respuesta consistente y validación de parámetros de entrada para todos los endpoints admin futuros.
- **skillsRecommended:** `nodejs-backend-patterns`, `nodejs-best-practices`
- **artefactos esperados:**
  - `Backend/routes/admin.routes.js` — router admin con middleware chain
  - `Backend/routes/index.js` — registro del router admin
  - `Backend/docs/admin-api-contract.md` — contrato de envelope y errores
- **acceptanceCriteria:**
  - Todas las rutas `/api/admin/*` devuelven `401` sin token y `403` para usuarios no admin.
  - Envelope de respuesta consistente: `{ data, pagination, filtersApplied, generatedAt }`.
  - Parámetros inválidos (`page`, `pageSize`, `sortBy`, `granularity`) devuelven `400` con mensaje descriptivo y campo `invalidParam`.
  - Ninguna ruta admin es accesible omitiendo el middleware de authz (test de regresión de seguridad incluido en documentación).

---

#### `aiw-backend-admin-revenue-ledger-20260407-02`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** `[]`
- **description:** Agregar tabla `sale_events` para métricas históricas de ventas/ganancias, integrando webhook Stripe con idempotencia y script de backfill para datos legacy. Crear índices necesarios para queries de métricas por fecha.
- **skillsRecommended:** `sql-optimization-patterns`, `nodejs-best-practices`
- **artefactos esperados:**
  - `Backend/database.sql` — DDL de tabla `sale_events` con índices
  - `Backend/controllers/stripe.controller.js` — integración idempotente del webhook
  - `Backend/scripts/backfill-admin-sales-ledger.js` — script de backfill con dry-run flag
- **acceptanceCriteria:**
  - Tabla `sale_events` existe con columnas: `id`, `user_id`, `plan_type`, `amount_cents`, `currency`, `status`, `paid_at`, `stripe_session_id`, `source`.
  - **Índices creados:** `idx_sale_events_paid_at` en `paid_at` e `idx_sale_events_status` en `status`. Sin estos índices, queries de métricas con rangos temporales serán lentas bajo volumen.
  - `checkout.session.completed` inserta evento de venta idempotente: misma `stripe_session_id` no duplica registro (upsert o check previo).
  - Backfill genera registros `source='legacy_token_backfill'` para tokens existentes sin evento Stripe. Soporta flag `--dry-run` que loguea sin insertar.
  - Ledger vacío (cero registros) no rompe queries de métricas: devuelve estructura válida con valores `0`.

---

### Fase B — Backend query APIs

#### `aiw-backend-admin-users-query-api-20260407-03`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-backend-admin-contract-authz-20260407-01`]
- **description:** Implementar `GET /api/admin/users` con paginación server-side, filtros, ordenamiento y proyección de estado de suscripción por usuario.
- **skillsRecommended:** `nodejs-backend-patterns`, `sql-optimization-patterns`
- **artefactos esperados:**
  - `Backend/controllers/admin/users.controller.js`
  - `Backend/routes/admin.routes.js` — registro del endpoint
- **acceptanceCriteria:**
  - Soporta parámetros: `page`, `pageSize` (máx. 100), `search` (por email/nombre), `role`, `subscriptionStatus`, `sortBy`, `sortDir`.
  - Respuesta incluye por usuario: `role_name`, `token_finish_date`, `subscriptionStatus` calculado con lógica explícita: `finish_date > now → 'active'`; `finish_date <= now → 'expired'`; `finish_date dentro de N días → 'expiring'` (N configurable); sin token → `'none'`.
  - `pageSize` máximo acotado a 100. Ordenamiento por columna declarada con fallback estable (`id DESC`).
  - Respuesta usa el envelope definido en tarea 01 (sin excepciones de formato).

---

#### `aiw-backend-admin-subscriptions-api-20260407-04`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-backend-admin-contract-authz-20260407-01`, `aiw-backend-admin-revenue-ledger-20260407-02`]
- **description:** Implementar `GET /api/admin/subscriptions` para vista operativa de suscripciones activas, con filtros temporales, de estado y resumen de conteos para cards de UI.
- **skillsRecommended:** `sql-optimization-patterns`, `nodejs-backend-patterns`
- **artefactos esperados:**
  - `Backend/controllers/admin/subscriptions.controller.js`
  - `Backend/routes/admin.routes.js` — registro del endpoint
- **acceptanceCriteria:**
  - Soporta filtros: `status`, `planType`, `expiringInDays`, `from`, `to`, `page`, `pageSize`.
  - Estado calculado con mecanismo explícito: `finish_date > now → 'active'`; `finish_date <= now → 'expired'`; dentro del umbral `expiringInDays → 'expiring'`.
  - Incluye `summaryCounts: { active, expiring, expired, total }` para las cards de KPI del dashboard.
  - **Rangos temporales normalizados a UTC:** el parámetro `from`/`to` se interpreta como UTC ISO-8601. Documentado explícitamente en el contrato del endpoint.

---

#### `aiw-backend-admin-metrics-api-20260407-05`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-backend-admin-revenue-ledger-20260407-02`, `aiw-backend-admin-users-query-api-20260407-03`, `aiw-backend-admin-subscriptions-api-20260407-04`]
- **description:** Implementar `GET /api/admin/metrics` con agregaciones de registros, ventas y ganancias por `day|month|year|custom` y serie temporal para charts.
- **skillsRecommended:** `sql-optimization-patterns`, `nodejs-backend-patterns`
- **artefactos esperados:**
  - `Backend/controllers/admin/metrics.controller.js`
  - `Backend/routes/admin.routes.js` — registro del endpoint
  - `Backend/tests/admin.metrics.test.js`
- **acceptanceCriteria:**
  - Valida `granularity` en `['day', 'month', 'year', 'custom']`; `custom` exige `from` y `to` en formato UTC ISO-8601; sin ellos devuelve `400`.
  - Devuelve `kpis: { registrations, salesCount, grossRevenue, netRevenue }` y `timeseries: [{ period, registrations, salesCount, grossRevenue }]` alineada al rango.
  - **Ledger vacío (cero registros):** la API devuelve `kpis` con valores `0` y `timeseries` con array vacío `[]`. No devuelve `null` ni `500`.
  - **Puntos sin datos en la serie:** cada punto del rango que no tenga datos devuelve `{ period, registrations: 0, salesCount: 0, grossRevenue: 0 }` — sin huecos en el array.
  - **Timezone:** todos los rangos temporales se calculan en UTC. Documentado en contrato con ejemplo: `from=2026-04-01T00:00:00Z` y `to=2026-04-07T23:59:59Z`.
  - Usa `sale_events` como fuente de verdad de ingresos; no mezcla con tabla `token` directamente.

---

### Fase C — Frontend access + data + UI

#### `aiw-frontend-admin-access-routing-20260407-06`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-backend-admin-contract-authz-20260407-01`]
- **description:** Implementar redirect post-login por rol y guard de acceso server-side para `/[locale]/admin`. Cubrir casos de token expirado y acceso directo por URL.
- **skillsRecommended:** `frontend-design`, `accessibility`
- **artefactos esperados:**
  - `Frontend/src/app/[locale]/auth/login/page.tsx` — redirect condicional por rol
  - `Frontend/src/app/[locale]/admin/layout.tsx` — guard server-side de la ruta admin
- **acceptanceCriteria:**
  - Si `role_name === 'admin'`, login redirige a `/<locale>/admin`; todos los demás roles redirigen a `/<locale>/icons`.
  - Acceso directo de usuario no admin a `/<locale>/admin` no renderiza el panel: redirige con feedback controlado (no página en blanco).
  - El guard es server-side (Next.js middleware o `layout.tsx` con `redirect()`), no solo client-side. Un usuario puede saltear la UI pero no ver datos reales sin el token correcto en el Backend.
  - **Token expirado durante sesión admin:** si la llamada a la API devuelve `401`, el usuario es redirigido automáticamente al login con mensaje "Sesión expirada". No se muestra panel roto ni datos parciales.
  - No se producen loops de redirección en hard refresh ni en restore de sesión.

---

#### `aiw-frontend-admin-data-hooks-20260407-07`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-backend-admin-users-query-api-20260407-03`, `aiw-backend-admin-subscriptions-api-20260407-04`, `aiw-backend-admin-metrics-api-20260407-05`]
- **description:** Crear funciones de API client y hooks de React Query para users/subscriptions/metrics con parámetros tipados y estados de UI diferenciados.
- **skillsRecommended:** `shadcn`
- **artefactos esperados:**
  - `Frontend/src/lib/api/backend.ts` — funciones `getAdminUsers`, `getAdminSubscriptions`, `getAdminMetrics` con params tipados en TypeScript
  - `Frontend/src/features/admin/hooks/useAdminUsers.ts`
  - `Frontend/src/features/admin/hooks/useAdminSubscriptions.ts`
  - `Frontend/src/features/admin/hooks/useAdminMetrics.ts`
- **acceptanceCriteria:**
  - Funciones `getAdminUsers`, `getAdminSubscriptions`, `getAdminMetrics` existen con parámetros tipados en TypeScript (sin `any`).
  - Query keys incluyen todos los filtros y parámetros de paginación para evitar cache collisions entre llamadas con distintos filtros.
  - Los tres estados están diferenciados con mecanismo explícito: `isLoading → skeleton UI`; `isError → mensaje de error con opción de retry`; `data.length === 0 → estado vacío con mensaje descriptivo`. Ninguno de los tres cae en el mismo estado visual.
  - Errores `401` del Backend disparan logout/redirect al login (no se muestran como error genérico).

---

#### `aiw-frontend-admin-dashboard-ui-20260407-08`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-frontend-admin-access-routing-20260407-06`, `aiw-frontend-admin-data-hooks-20260407-07`]
- **description:** Construir dashboard admin con secciones de KPI, tabla de usuarios, tabla de suscripciones y charts de shadcn para métricas con filtros temporales. Incluye skeleton loaders, paginación server-side y manejo de datos sensibles.
- **skillsRecommended:** `shadcn`, `frontend-design`, `accessibility`, `design-guide`
- **artefactos esperados:**
  - `Frontend/src/app/[locale]/admin/page.tsx`
  - `Frontend/src/features/admin/components/KPICards.tsx`
  - `Frontend/src/features/admin/components/UsersTable.tsx`
  - `Frontend/src/features/admin/components/SubscriptionsTable.tsx`
  - `Frontend/src/features/admin/components/MetricsCharts.tsx`
- **acceptanceCriteria:**
  - Cards KPI muestran: registros totales, ventas, ganancias brutas, suscripciones activas. Cada card tiene skeleton loader mientras carga.
  - **Fuente de verdad de filtros temporales:** los filtros `day/month/year/custom` se persisten en URL searchParams. Un refresh de página restaura los filtros activos sin resetear al estado por defecto. Un usuario puede compartir la URL con los filtros activos.
  - Filtros temporales actualizan KPI, charts y tablas de forma consistente con la misma fuente de estado (searchParams).
  - **Paginación server-side:** las tablas de usuarios y suscripciones llaman al Backend con `page` y `pageSize` por cambio de página. No se carga toda la data en cliente y se pagina visualmente.
  - Tablas tienen orden por columna, filtros y los tres estados (loading/error/vacío) accesibles.
  - **Skeleton loaders visibles** durante la carga inicial de cada sección (KPIs, tablas, charts) — no se muestra panel en blanco.
  - **Datos sensibles:** emails de usuarios se muestran enmascarados en la vista principal de tabla (`us***@domain.com`), expandibles solo con acción explícita. Datos de pago (amount) en formato moneda sin datos de tarjeta.
  - Layout responsive: mobile y desktop sin overflow horizontal no intencional.
  - Navegación por teclado operativa en tablas, filtros y controles de paginación.

---

### Fase D — Quality gates y cierre

#### `aiw-optimizer-admin-panel-perf-gate-20260407-09`
- **assignedTo:** `AI_Workspace_Optimizer`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-frontend-admin-dashboard-ui-20260407-08`]
- **description:** Ejecutar gate de performance para validar impacto de charts/tablas/filtros del panel admin antes de QA final.
- **skillsRecommended:** `distributed-tracing`
- **artefactos esperados:**
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-gate-20260407.md`
- **acceptanceCriteria:**
  - Se reporta delta de bundle del route `/admin` vs baseline documentado.
  - LCP, CLS e INP del panel admin medidos con Lighthouse. Si hay regresión >20% vs baseline, se publica lista P1/P2/P3 de fixes antes de habilitar QA.
  - Costo de render inicial del dashboard con datos reales (no mock) medido y documentado.

---

#### `aiw-tester-admin-panel-e2e-regression-20260407-10`
- **assignedTo:** `Tester`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [
    `aiw-backend-admin-metrics-api-20260407-05`,
    `aiw-frontend-admin-access-routing-20260407-06`,
    `aiw-frontend-admin-dashboard-ui-20260407-08`,
    `aiw-optimizer-admin-panel-perf-gate-20260407-09`
  ]
- **description:** Ejecutar suite de QA funcional y de permisos del Admin Control Panel (API + UI). Cubre acceso por rol, filtros temporales, paginación y seguridad básica.
- **skillsRecommended:** `playwright-testing`, `systematic-debugging`, `test-driven-development`
- **artefactos esperados:**
  - `Frontend/tests/e2e/admin-panel.spec.ts`
  - `AI_Workspace/docs/internal/reports/aiw-tester-admin-panel-e2e-regression-20260407.md`
- **acceptanceCriteria:**
  - Usuario admin: accede al panel, ve KPIs, puede paginar tablas y cambiar filtros temporales.
  - Usuario no admin: acceso directo a `/<locale>/admin` redirige con feedback sin renderizar datos.
  - Usuario sin sesión: acceso directo a `/<locale>/admin` redirige al login.
  - **Token expirado:** simular `401` desde API y verificar que redirige al login con mensaje "Sesión expirada".
  - Filtros `day/month/year/custom` actualizan KPI y charts sin desincronización visible.
  - Paginación/orden/filtros de tablas devuelven datos coherentes con API (se verifica con datos de seed).
  - Tests pasan en Chromium. Firefox y WebKit como best-effort.
  - Resultado publicado con `TEST_PASSED` o `TEST_FAILED` con evidencia reproducible y causa específica por fallo.

---

#### `aiw-documenter-admin-panel-doc-sync-20260407-11`
- **assignedTo:** `Documenter`
- **correlationId:** `aiw-admin-control-panel-20260407`
- **dependsOn:** [`aiw-tester-admin-panel-e2e-regression-20260407-10`]
- **description:** Publicar documentación final del contrato admin, fórmulas de métricas y runbook operativo del panel.
- **skillsRecommended:** `api-reference-documentation`
- **artefactos esperados:**
  - `AI_Workspace/docs/internal/specs/admin-control-panel-prd-20260407.md`
  - `AI_Workspace/docs/api/admin-control-panel-api.md`
  - `AI_Workspace/docs/internal/reports/aiw-documenter-admin-panel-doc-sync-20260407.md`
  - `AI_Workspace/docs/internal/registry/docs_registry.jsonl` — actualizado
- **acceptanceCriteria:**
  - Endpoints admin documentados con: params/filtros/paginación/errores/ejemplos de request-response.
  - Fórmulas de métricas (`registrations`, `salesCount`, `grossRevenue`, `netRevenue`) explicitadas y trazables a columna de `sale_events`.
  - **Timezone documentada**: semántica UTC con ejemplo de rango (`from=2026-04-01T00:00:00Z`).
  - Runbook cubre: acceso de admin, troubleshooting de 401, reset de sesión, backfill de ledger.
  - Registry `docs_registry.jsonl` actualizado con todos los documentos publicados.
  - `DOC_UPDATED` emitido con `artifactPaths` de todos los archivos.

---

## 6) Grafo de dependencias (corregido)

```text
aiw-backend-admin-contract-authz-20260407-01  ←── paralelo con 02
  ├─> aiw-backend-admin-users-query-api-20260407-03
  │     └─> aiw-backend-admin-metrics-api-20260407-05
  ├─> aiw-backend-admin-subscriptions-api-20260407-04 ←── paralelo con 03 cuando aplique
  │     └─> aiw-backend-admin-metrics-api-20260407-05
  └─> aiw-frontend-admin-access-routing-20260407-06
        └─> aiw-frontend-admin-dashboard-ui-20260407-08

aiw-backend-admin-revenue-ledger-20260407-02  ←── paralelo con 01
  ├─> aiw-backend-admin-subscriptions-api-20260407-04
  └─> aiw-backend-admin-metrics-api-20260407-05

aiw-backend-admin-metrics-api-20260407-05
  └─> aiw-frontend-admin-data-hooks-20260407-07
        └─> aiw-frontend-admin-dashboard-ui-20260407-08

aiw-frontend-admin-dashboard-ui-20260407-08
  └─> aiw-optimizer-admin-panel-perf-gate-20260407-09
        └─> aiw-tester-admin-panel-e2e-regression-20260407-10
              └─> aiw-documenter-admin-panel-doc-sync-20260407-11
```

> **Nota para Orchestrator — paralelismo explícito:**
> - Tareas `01` y `02` pueden arrancar simultáneamente (ninguna depende de la otra).
> - Tareas `03` y `04` pueden ejecutarse en paralelo una vez completada la `01` (para `03`) y ambas `01` y `02` (para `04`).

---

## 7) Asignación por agente

| Agente | Tareas |
|---|---|
| `Backend` | 01, 02, 03, 04, 05 |
| `Frontend` | 06, 07, 08 |
| `AI_Workspace_Optimizer` | 09 |
| `Tester` | 10 |
| `Documenter` | 11 |

---

## 8) Orden recomendado de implementación

```
1a. aiw-backend-admin-contract-authz-20260407-01   ←── paralelo con 1b
1b. aiw-backend-admin-revenue-ledger-20260407-02   ←── paralelo con 1a
2a. aiw-backend-admin-users-query-api-20260407-03  ←── paralelo con 2b (depende de 1a)
2b. aiw-backend-admin-subscriptions-api-20260407-04 ←── paralelo con 2a (depende de 1a + 1b)
3.  aiw-backend-admin-metrics-api-20260407-05      (depende de 1b + 2a + 2b)
4.  aiw-frontend-admin-access-routing-20260407-06  (depende de 1a)
5.  aiw-frontend-admin-data-hooks-20260407-07      (depende de 3)
6.  aiw-frontend-admin-dashboard-ui-20260407-08    (depende de 4 + 5)
7.  aiw-optimizer-admin-panel-perf-gate-20260407-09
8.  aiw-tester-admin-panel-e2e-regression-20260407-10
9.  aiw-documenter-admin-panel-doc-sync-20260407-11
```

---

## 9) Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación concreta |
|---|---|---|---|
| Métricas de ingresos inexactas por falta de ledger histórico | Alta | Alta | Tarea 02 crea `sale_events` + backfill con `source` explícito para distinguir datos legacy. Backfill tiene flag `--dry-run`. |
| Filtrado temporal inconsistente por timezone | Media | Alta | Tarea 04 y 05 normalizan rangos en UTC con documentación explícita. Tarea 10 (QA) verifica con escenarios de timezone. |
| Exposición del panel admin por solo guard cliente | Media | Crítico | Tarea 01: authz server-side obligatorio (`authenticateToken + isAdmin`) en Backend. Tarea 06: guard también en Next.js server-side, no solo client-side. |
| Panel roto al expirar sesión admin | Media | Alto | Tarea 06 cubre el caso: `401` del Backend → redirect al login. Tarea 10 lo testea explícitamente. |
| Degradación de performance por charts/tablas admin | Media | Alta | Gate 09 obligatorio antes de QA. Si hay regresión, se bloquea el avance. |
| Desalineación API/UI en filtros y paginación | Media | Alta | Tarea 07 tipa el contrato. Tarea 08 sincroniza filtros con URL searchParams. Tarea 10 valida con escenarios de orden/filtro/página. |
| Queries de métricas lentas sin índices en `sale_events` | Media | Alta | Tarea 02 crea índices en `paid_at` y `status` como AC explícito. |

---

## 10) Criterios de aprobación del plan

- [x] Basado en inspección real con evidencia de archivos concretos.
- [x] Todas las tareas usan taskId canónico `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>` con seq correcto.
- [x] Cada tarea incluye `assignedTo`, `correlationId`, `dependsOn`, `description`, `acceptanceCriteria`.
- [x] Dependencias cross-layer explícitas: Backend desbloquea Frontend.
- [x] Tester depende de tarea 06 (routing guard) además de 05, 08 y 09.
- [x] Gate de performance (Optimizer) antes de QA (Tester).
- [x] Cierre documental (Documenter) posterior a QA.
- [x] Riesgo de timezone tiene AC en tarea 04 y 05 (no solo en tabla de riesgos).
- [x] Token expirado durante sesión admin cubierto en tarea 06 y testado en tarea 10.
- [x] Ledger vacío cubierto en AC de tarea 05.
- [x] Índices en `sale_events` como AC explícito en tarea 02.
- [x] Skeleton loaders y paginación server-side en tarea 08.
- [x] Mecanismo de filtros (URL searchParams) especificado en tarea 08.
- [x] Skills de tarea 07 corregidas (removido mismatch de design-guide).
- [x] Paralelismo explícito en grafo y orden recomendado.
- [x] Riesgos con mitigación operativa concreta y trazable a tareas específicas.

---

## 11) Nota operativa para Orchestrator

Este plan propone tareas ejecutables pero **no asigna trabajo directamente**. La oficialización debe ocurrir vía `TASK_ASSIGNED` del Orchestrator usando estos `taskId` y `dependsOn`.