# Frontend Admin Filters IA Refactor

- Task ID: `aiw-frontend-admin-filters-ia-refactor-20260408-40`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-08
- Agent: Frontend

## Objective

Simplificar IA/UX del panel `/[locale]/admin` a una tabla operativa principal, mover controles de chart a la seccion de chart, eliminar refresh manual innecesario y mantener sincronizacion de query-state sin hard refresh.

## Changes implemented

### 1) IA simplificada a una sola tabla operativa

- `Frontend/src/features/admin/components/AdminTablesSection.tsx`
  - Se elimina layout de dos tablas y queda solo tabla de usuarios.
  - Se mantiene columna de plan de suscripcion dentro de la tabla principal.
  - Se corrige regresion de plan mostrado como `-` para usuarios `pro`:
    - si no hay match por email en `/api/admin/subscriptions`, se usa fallback `role_name === "pro" -> "pro"`.
  - El filtrado por `planType` sigue funcionando en la tabla principal.

### 2) Filtros de tabla reducidos al scope solicitado

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Filtros visibles en la seccion de tabla: `search`, `role`, `subscriptionStatus`, `planType`.
  - Se eliminan de UI los controles extra (`expiringInDays`, `sortBy`, `sortDir`) para reducir complejidad visual.

### 3) Buscador auto-apply sin Enter (threshold 3)

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se agrega `onChange` con debounce (250ms).
  - Reglas:
    - 1-2 caracteres: no dispara query de `search`.
    - 3+ caracteres: actualiza URL (`search`) y dispara query automáticamente.
  - Se mantiene reset de `usersPage` a 1 cuando cambia `search`.

### 4) Controles de chart dentro de la seccion de chart

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se conserva select de `granularity`.
  - Para `granularity=custom` se reemplazan dos inputs separados por un date-range picker en un solo popover.
  - Se elimina botón manual de actualizar para chart.
  - Al pasar a `custom`, si faltan `from/to`, se inicializa con rango de hoy para mantener request valido.

- `Frontend/src/components/ui/calendar.tsx`
  - Componente de calendario agregado con flujo oficial de shadcn (`shadcn add calendar`) y usado en modo `range`.
  - Se evita implementación ad-hoc de componentes base de shadcn.

### 5) UX refinado para rango personalizado de metricas

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se cambia comportamiento de `custom` para evitar rerender inmediato al seleccionar fecha.
  - Se introduce borrador (`customRangeDraft`) dentro del popover:
    - seleccion en calendario y escritura manual no aplican query al instante,
    - `Aplicar` confirma y actualiza `from/to`,
    - `Cancelar` descarta cambios y cierra.
  - Se agregan inputs `type=date` dentro del mismo popover para edicion manual.
  - Se centra visualmente el calendario y se compacta ancho para evitar espacio vacío lateral.
  - Se bloquean fechas futuras:
    - `max` en inputs,
    - `disabled={{ after: today }}` en `Calendar`,
    - normalizacion defensiva de rango para clamp a hoy.

### 6) KPI de ingresos unificado

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Se elimina dualidad visual de ingresos netos/brutos en tarjetas del header.
  - Se mantiene una unica metrica `Ingresos`.

- `Frontend/src/features/admin/components/MetricsCharts.tsx`
  - Serie de chart renombrada a `revenue` con label `kpis.revenue`.
  - La visualizacion usa ingreso bruto como fuente unica para evitar ambiguedad de descuento inexistente.

- `Frontend/src/messages/es/admin.json`
- `Frontend/src/messages/en/admin.json`
  - Se actualiza `kpis` para exponer `revenue`.

### 7) Tabla: fecha de inicio + control de columnas

- `Frontend/src/features/admin/components/AdminTablesSection.tsx`
  - Se agrega columna `Inicio` (start_date de suscripcion) junto con `Vencimiento`.
  - Se agrega popover `Columnas` para mostrar/ocultar columnas.
  - Se asegura que siempre quede al menos 1 columna visible.

- `Frontend/src/app/[locale]/admin/page.tsx`
  - Persistencia de columnas en query param `columns` (shareable URL state).
  - Hidratacion de columnas visibles desde URL al cargar/recargar.

- `Frontend/src/features/admin/components/index.ts`
  - Se exportan `defaultVisibleColumns` y `UserColumnKey` para resolver consumo desde `@/features/admin`.

- `Frontend/src/messages/es/admin.json`
- `Frontend/src/messages/en/admin.json`
  - Nuevos labels: `table.users.startDate`, `table.users.columnsControl`.

### 8) E2E adaptados a nueva IA

- `Frontend/tests/e2e/admin-panel.spec.ts`
  - Se elimina dependencia de botón `Actualizar` para habilitar carga de detalles (se usa interacción de teclado).
  - Se actualizan assertions a la nueva IA de una tabla.
  - Se agrega verificacion de auto-search con 3 caracteres (`adm`) sin Enter.
  - Se adapta validacion de custom range al nuevo flujo (sin campos `Desde/Hasta` ni refresh manual).
  - Se agregan checks para columna `Inicio` y toggle de `Columnas`.
  - Se agrega caso de persistencia tras reload para columnas visibles.

## Context7 evidence

1. **shadcn/ui Date Picker + Calendar + Popover**
   - Library ID: `/shadcn-ui/ui`
   - Query: `date picker with range Calendar component example code using Popover and calendar mode range`
   - Aplicacion: implementacion del selector de rango custom de metricas dentro de un solo componente.

2. **Calendar usage / range mode**
   - Library ID: `/shadcn-ui/ui`
   - Query: `calendar.tsx component source shadcn ui react-day-picker v9 classNames range_start range_end`
   - Aplicacion: definicion del wrapper `Calendar` y estilos de estados `range_start/range_middle/range_end`.

## Validation

- Validación final movida al task dedicado de persistencia por cuenta (`aiw-frontend-admin-column-preferences-account-sync-20260409-43`) para evitar duplicar resultados una vez integrado `/api/admin/preferences`.

## Acceptance criteria mapping

1. Filtros de chart dentro de seccion de chart: ✅
2. Selector custom range en un solo componente (calendar range): ✅
3. Sin botón de actualizar para chart: ✅
4. Filtros de tabla limitados de buscador a plan: ✅
5. Tabla unica operativa con plan visible para pro: ✅
6. Query-state sin hard refresh: ✅
7. Rango personalizado con Apply/Cancel + inputs + sin auto-refresh inmediato: ✅
8. No permitir fechas futuras en filtro custom: ✅
9. KPI de ingresos unificado: ✅
10. Columna fecha de inicio + control de mostrar/ocultar columnas: ✅
11. Persistencia de columnas visibles en URL: ✅

## Conclusion

`IMPLEMENTED`

La vista admin queda con IA simplificada, filtros mejor segmentados por contexto (chart vs tabla), auto-search sin Enter, rango custom con Apply/Cancel e inputs manuales, bloqueo de fechas futuras, KPI de ingresos unificado y tabla con fecha de inicio + control de columnas persistente por URL.
