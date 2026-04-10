# Admin Control Panel PRD

## Metadata

- taskId: `aiw-planner-admin-control-panel-plan-20260407-50`
- correlationId: `aiw-admin-control-panel-20260407`
- owner: `Planner`
- status: `draft_for_execution`
- date: `2026-04-07`

## Product intent

Crear un panel administrativo para usuarios con rol `admin` que concentre gestion operativa de usuarios/suscripciones y monitoreo de negocio (registros, ventas, ganancias) con filtros temporales accionables.

## Problema a resolver

El sistema actual tiene auth por roles y endpoints parciales de administracion, pero no tiene:
1. entrada por rol a una superficie admin,
2. APIs de consulta admin paginadas y filtrables,
3. dashboard unificado con metricas de negocio y tendencias.

## Usuarios objetivo

1. **Admin operador**: necesita revisar usuarios y estado de suscripcion para soporte.
2. **Admin negocio**: necesita ver ventas/ganancias y cambios por periodo.

## Alcance funcional (MVP de panel admin)

### A. Acceso y seguridad
- Redirect post-login por rol:
  - `admin` -> `/<locale>/admin`
  - `user/pro` -> `/<locale>/icons`
- Guard de acceso en ruta admin.
- Endpoints admin protegidos por `authenticateToken + isAdmin`.

### B. Gestion de usuarios
- Tabla de usuarios con:
  - username, email, rol, estado de suscripcion, vencimiento.
- Filtros:
  - busqueda por texto,
  - role,
  - subscriptionStatus.
- Paginacion y ordenamiento por columna.

### C. Gestion de suscripciones
- Tabla de suscripciones con:
  - usuario, planType, estado, inicio, vencimiento.
- Filtros:
  - status,
  - planType,
  - expiringInDays,
  - rango de fechas.

### D. Metricas y charts
- KPIs:
  - registrations,
  - salesCount,
  - grossRevenue,
  - netRevenue.
- Serie temporal para charts con granularidad:
  - `day`, `month`, `year`, `custom`.
- Para `custom`, `from` y `to` obligatorios.

## Reglas de datos

1. **Estado de suscripcion** (mecanismo canonico inicial):
   - `finish_date > now` -> `active`
   - `finish_date <= now` -> `expired`
   - `expiring` por umbral configurable (`expiringInDays`).
2. **Fuente de ingresos**:
   - usar ledger de ventas persistido desde webhook Stripe,
   - con backfill marcado (`source=legacy_token_backfill`) para historico sin evento.
3. **Serie temporal**:
   - cualquier bucket sin datos retorna `0` (sin huecos ambiguos).

## Contrato API esperado (alto nivel)

1. `GET /api/admin/users`
   - query: `page`, `pageSize`, `search`, `role`, `subscriptionStatus`, `sortBy`, `sortDir`
2. `GET /api/admin/subscriptions`
   - query: `page`, `pageSize`, `status`, `planType`, `expiringInDays`, `from`, `to`
3. `GET /api/admin/metrics`
   - query: `granularity`, `from`, `to`

Todas las respuestas deben incluir `generatedAt` y, cuando aplique, bloque `pagination` y `filtersApplied`.

## Requisitos de UX/UI

- Implementacion con componentes tipo shadcn (tablas, tarjetas, filtros, charts).
- Estados obligatorios por bloque:
  - `loading`, `error`, `empty`, `success`.
- Responsive:
  - desktop (panel completo),
  - mobile (sin overflow horizontal no intencional).
- Accesibilidad:
  - foco visible,
  - orden de tab correcto,
  - labels de controles de filtro.

## Requisitos no funcionales

1. Performance gate obligatorio antes de QA final.
2. No exponer datos admin sin authz server-side.
3. Parametros de query validados y acotados (`pageSize` maximo).
4. Evidencia QA E2E de flujos criticos (admin y no admin).

## Criterios de aceptacion de producto

1. Admin inicia sesion y aterriza en `/<locale>/admin`.
2. No-admin no puede consumir ni renderizar panel admin.
3. Users/subscriptions/metrics se pueden filtrar y paginar desde UI y API en forma consistente.
4. Charts reflejan correctamente el rango temporal seleccionado.
5. QA y performance reportan estado apto para cierre.

## Fuera de alcance para esta iteracion

- Acciones mutativas complejas sobre usuarios/suscripciones (suspender/cancelar/reembolsar).
- BI avanzado (cohortes, predicciones, segmentacion avanzada).
- RBAC multi-nivel adicional a `admin/user/pro`.
