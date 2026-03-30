# AgentMonitor V2 — Plan Revisado y Corregido

**correlationId:** aiw-agentmonitor-v2-20260330  
**taskId:** aiw-planner-agentmonitor-v2-plan-20260330-02  
**Versión:** 2.1 — skills Frontend recuperadas: motion-designer, svg-animation-engineer, elevated-design, apple-ui-skills, dramatic-2000ms-plus  
**Creado:** 2026-03-30  
**Estado:** PLAN_PROPOSED  
**Reemplaza:** aiw-planner-agentmonitor-v2-plan-20260330-01

---

## Análisis crítico del plan v1 (correcciones aplicadas)

### ❌ Error 1 — Asignaciones incorrectas de agente (el más grave)

El plan v1 asignó V2-UI-05, V2-UI-06, V2-UI-07 y V2-UI-08 a `AI_Workspace_Optimizer`. Esto es incorrecto:

| Tarea | V1 asignó a | Corrección | Razón |
|---|---|---|---|
| V2-UI-05 Metrics | AI_Workspace_Optimizer | **Observer + Frontend** | Optimizer mide y recomienda, no construye UI |
| V2-UI-06 Critical Panel | AI_Workspace_Optimizer | **Observer** | Es UI/UX operativa — rol de Observer |
| V2-UI-07 Filters | AI_Workspace_Optimizer | **Frontend** | Componentes de formulario — rol de Frontend |
| V2-UI-08 Task Groups | AI_Workspace_Optimizer | **Frontend** | Visualización de datos — rol de Frontend |

El rol de `AI_Workspace_Optimizer` en esta EPIC es: auditar performance, definir budgets de render, medir baselines, recomendar optimizaciones y gestionar el build/empaquetado. No implementa UI.

### ❌ Error 2 — Skills listadas con nombres ambiguos

El plan v1 referencia "Frontend: shadcn", "Frontend: design-guide" como si fueran skills del agente Frontend de este workspace. Son skills del agente Frontend **cuando corresponde**, y librerías/herramientas con sus propios comandos de instalación. Se separan claramente en este plan v2.

### ❌ Error 3 — No hay tarea de Backend

Si se migra a React (Option A), el Frontend necesita confirmar/adaptar cómo consume `/api/events` y `/ws`. Backend debe validar que sus endpoints soporten el nuevo cliente. Faltaba una tarea para esto.

### ❌ Error 4 — La decisión de migración no tiene criterios de decisión claros

V2-UI-01 pedía "elegir A o B" sin definir quién decide, con qué criterios, ni qué pasa si se elige B (la mayoría de tareas siguientes asumen React).

### ❌ Error 5 — V2-UI-09 (Testing) depende solo de V2-UI-01

Testing no puede "cubrir todos los componentes" si depende solo de Foundation. Debe tener dependencias reales de los componentes a testear, aunque se configure en paralelo.

### ❌ Error 6 — 5 skills de Frontend ausentes del plan (corregido en v2.1)

Las siguientes skills del agente Frontend existían en el workspace pero no estaban referenciadas en el plan v1 ni en la corrección v2.0. Son críticas para V2 dado el foco en animaciones y calidad visual:

| Skill | Rol en V2 |
|---|---|
| `motion-designer` | Animaciones de componentes, transiciones de estado, staggered reveals |
| `svg-animation-engineer` | SVG animados: avatares de agentes, iconos de estado, conectores de timeline |
| `elevated-design` | Estética premium y elevada — base del design system V2 |
| `apple-ui-skills` | UX refinada estilo Apple: physics-based transitions, gestures, micro-interacciones |
| `dramatic-2000ms-plus` | Animaciones de entrada largas y de alto impacto (hero, estados críticos) |

Se agregan a la sección de stack técnico y se asignan por tarea en este plan v2.1.

### ✅ Correcciones menores mantenidas del v1

- `/pixel` separado, no se integra en V2 ✓
- V2-UI-06 independiente de V2-UI-05 ✓
- Estructura en fases ✓
- Skills de agentes hermanos como referencia ✓

---

## Stack técnico recomendado y comandos de instalación

### Decisión de migración (resuelta antes de V2-UI-01)

Se adopta **Option A: React + Vite + TypeScript**. Fundamentación:

- El plan V2 requiere Chart, Dialog, Tabs, Toast, Sheet — componentes shadcn/ui que en vanilla JS implicarían reimplementar todo desde cero.
- TypeScript elimina errores de runtime en el manejo de eventos MCP (payloads tipados).
- Vite tiene HMR instantáneo y build optimizado para producción.
- La deuda técnica de mantener el vanilla JS crecería con cada feature nueva.

**Condición de rollback a Option B:** Si en V2-UI-01 se descubre que el build del monorepo no soporta Vite o hay incompatibilidad con el MCP Server, se replantea. El Orchestrator debe ser notificado con `TASK_BLOCKED` antes de descartar Option A.

---

### Librerías y comandos por categoría

#### Base (instalar en V2-UI-01)

```bash
# Scaffold React + Vite + TypeScript
npm create vite@latest agentmonitor-v2 -- --template react-ts

# Dependencias base
npm install

# Tailwind CSS (requerido por shadcn)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui — inicialización (configura Tailwind, CSS variables, utils)
npx shadcn@latest init
```

#### Componentes shadcn/ui (instalar por tarea según necesidad)

```bash
# V2-UI-02 Dashboard / Hero / Summary
npx shadcn@latest add card badge button tooltip skeleton

# V2-UI-03 Agent Stage
npx shadcn@latest add avatar progress badge

# V2-UI-04 Timeline
npx shadcn@latest add scroll-area separator tooltip

# V2-UI-05 Metrics / Charts
npx shadcn@latest add chart card tabs
# Chart de shadcn wrappea Recharts — no instalar Recharts por separado, viene incluido

# V2-UI-06 Critical Panel
npx shadcn@latest add alert badge button sheet

# V2-UI-07 Filters
npx shadcn@latest add input select checkbox dropdown-menu popover command

# V2-UI-08 Task Groups
npx shadcn@latest add collapsible table badge tooltip
```

#### Animaciones y motion — Skills Frontend + librerías

```bash
# framer-motion — animaciones declarativas en React (requerido por motion-designer y dramatic-2000ms-plus)
npm install framer-motion

# @svgdotjs/svg.js — manipulación y animación de SVG programática (requerido por svg-animation-engineer)
npm install @svgdotjs/svg.js

# react-spring — física-based animations estilo Apple (requerido por apple-ui-skills)
npm install @react-spring/web

# lottie-react — reproducción de animaciones Lottie/After Effects (svg-animation-engineer)
npm install lottie-react
```

**Mapa de skills → librerías → tareas:**

| Skill Frontend | Librería principal | Tareas donde aplica |
|---|---|---|
| `motion-designer` | `framer-motion` | V2-UI-01, V2-UI-02, V2-UI-03, V2-UI-04 |
| `svg-animation-engineer` | `@svgdotjs/svg.js`, `lottie-react` | V2-UI-03 (AgentAvatar), V2-UI-04 (timeline connectors), V2-UI-06 (alert icons) |
| `elevated-design` | sin lib extra — aplica al design system | V2-UI-01 (tokens), V2-UI-02 (Hero) |
| `apple-ui-skills` | `@react-spring/web` | V2-UI-02 (metrics reveal), V2-UI-03 (state transitions), V2-UI-07 (filter drawer) |
| `dramatic-2000ms-plus` | `framer-motion` (durations 2000ms+) | V2-UI-02 (Hero entry), V2-UI-03 (INCIDENT_OPENED transition) |

> **Nota importante para `dramatic-2000ms-plus`:** animaciones >2s se aplican SOLO en entradas de pantalla (montaje inicial del Hero) y transiciones de estados críticos (`INCIDENT_OPENED`). No aplican en actualizaciones frecuentes de datos (timeline, WebSocket) donde debe usarse <300ms para no bloquear la lectura operativa.

#### Estado global y datos

```bash
# TanStack Query — cache, polling, WebSocket state management
npm install @tanstack/react-query @tanstack/react-query-devtools

# Zustand — estado global liviano (filtros activos, agente en foco, etc.)
npm install zustand
```

#### Timeline y visualizaciones avanzadas

```bash
# date-fns — formateo y manipulación de fechas en el timeline
npm install date-fns

# react-window — virtualización de listas largas (timeline, task groups)
npm install react-window react-window-infinite-loader
npm install -D @types/react-window

# D3 — si se necesita timeline con zoom/pan personalizado
npm install d3
npm install -D @types/d3
```

#### Utilidades

```bash
# clsx + tailwind-merge — manejo de clases CSS condicionales (ya incluidos por shadcn init)
npm install clsx tailwind-merge

# class-variance-authority — variants de componentes (ya incluido por shadcn init)
npm install class-variance-authority
```

#### Testing

```bash
# Playwright — E2E y tests visuales
npm install -D @playwright/test
npx playwright install

# Playwright con soporte de componentes React (opcional, para component testing)
npm install -D @playwright/experimental-ct-react

# Vitest — unit testing (integrado con Vite, más rápido que Jest para este stack)
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

#### TypeScript / tipos

```bash
# Tipos para librerías sin @types incluidos
npm install -D @types/react @types/react-dom @types/node
```

---

## Tipos MCP compartidos (sugerencia nueva)

Crear `src/types/mcp.ts` en V2-UI-01 con los tipos de eventos del contrato MCP. Esto elimina strings mágicos y da autocompletado en toda la app:

```typescript
// src/types/mcp.ts — generado en V2-UI-01, usado por todas las tareas

export type McpStatus =
  | 'TASK_ASSIGNED'
  | 'TASK_ACCEPTED'
  | 'TASK_IN_PROGRESS'
  | 'TASK_COMPLETED'
  | 'TASK_BLOCKED'
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'INCIDENT_OPENED'
  | 'INCIDENT_RESOLVED'
  | 'DOC_UPDATED'
  | 'ARTIFACT_PUBLISHED'
  | 'PLAN_PROPOSED';

export type AgentName =
  | 'Orchestrator'
  | 'Planner'
  | 'Observer'
  | 'Frontend'
  | 'Backend'
  | 'Tester'
  | 'Documenter'
  | 'AI_Workspace_Optimizer';

export interface McpEvent {
  taskId: string;
  correlationId: string;
  assignedTo: AgentName;
  status: McpStatus;
  timestamp: string;
  message?: string;
  artifactPaths?: string[];
  rootCause?: string;
  parentTaskId?: string;
}
```

---

## Agentes y sus roles en esta EPIC (clarificado)

| Agente | Rol en V2 |
|---|---|
| **Observer** | UI/UX operativa: paneles de alertas, timeline UX, agent stage, patrones de observabilidad |
| **Frontend** | Implementación de componentes React: Dashboard, Filters, Task Groups, Charts, layout |
| **AI_Workspace_Optimizer** | Performance baseline, render budget, build setup, auditoría de bundler |
| **Backend** | Validación de endpoints para cliente React, schema de WebSocket, CORS si aplica |
| **Tester** | E2E con Playwright, tests de regresión visual, gates de calidad por fase |
| **Documenter** | Docs de arquitectura, API reference, runbook operativo |
| **Orchestrator** | Coordinación, dependencias, gates entre fases |

---

## Tareas — Plan Completo V2

---

### FASE 0 — Decisión técnica y setup (nueva, bloqueante)

#### V2-SETUP-01: Auditoría de entorno y decisión de migración
- **taskId:** `aiw-optimizer-agentmonitor-v2-setup-20260330-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** `[]`
- **description:** Auditar el entorno actual (estructura de carpetas, scripts de build, servidor de desarrollo, cómo se sirve `/monitor`) y confirmar que Option A (React+Vite) es viable sin romper el flujo de desarrollo existente. Publicar decisión formal.
- **pasos:**
  1. Inspeccionar estructura actual del proyecto y cómo se sirven `/monitor` y `/pixel`
  2. Confirmar si hay un bundler/server existente que necesite coexistir con Vite
  3. Validar que el MCP Server (`/api/events`, `/ws`) puede recibir requests desde `localhost:5173` (CORS)
  4. Si todo OK → publicar ARTIFACT_PUBLISHED con decisión "Option A confirmada"
  5. Si hay bloqueante → publicar TASK_BLOCKED con causa específica y propuesta de mitigación
- **acceptanceCriteria:**
  - Decisión de migración publicada formalmente (Option A o B con justificación)
  - CORS del MCP Server validado o plan de fix documentado
  - Estructura de carpetas objetivo definida (ej: `/agentmonitor-v2/` o en root)
- **librerías relevantes:** ninguna aún — solo auditoría
- **skillsAgente:** `task-coordination-strategies`, `distributed-tracing` (para entender el flujo de datos actual)

#### V2-SETUP-02: Scaffold React + Vite + TypeScript + shadcn
- **taskId:** `aiw-frontend-agentmonitor-v2-scaffold-20260330-01`
- **assignedTo:** `Frontend`
- **dependsOn:** [`V2-SETUP-01`]
- **description:** Crear el proyecto React+Vite+TypeScript base, instalar y configurar shadcn/ui, Tailwind, TanStack Query, Zustand y tipos MCP. Este es el punto de partida de todas las tareas de UI.
- **comandos de instalación:**
  ```bash
  npm create vite@latest agentmonitor-v2 -- --template react-ts
  cd agentmonitor-v2
  npm install
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  npx shadcn@latest init
  npm install @tanstack/react-query @tanstack/react-query-devtools
  npm install zustand
  npm install framer-motion
  npm install @react-spring/web
  npm install @svgdotjs/svg.js
  npm install lottie-react
  npm install date-fns
  npm install clsx tailwind-merge
  npm install -D vitest @testing-library/react @testing-library/user-event jsdom
  ```
- **artefactos esperados:**
  - `src/types/mcp.ts` — tipos del contrato MCP (ver sección anterior)
  - `src/lib/queryClient.ts` — configuración de TanStack Query
  - `src/lib/wsClient.ts` — cliente WebSocket para `/ws`
  - `src/store/monitorStore.ts` — store Zustand (agente en foco, filtros activos)
  - `src/hooks/useMcpEvents.ts` — hook que combina WebSocket + polling `/api/events`
  - Estructura de carpetas documentada
- **acceptanceCriteria:**
  - `npm run dev` levanta en localhost sin errores
  - shadcn init completado (componente Button importable y funcional)
  - WebSocket hook conecta a `/ws` y recibe eventos MCP
  - Tipos MCP creados y sin errores TypeScript
- **skillsAgente:** `shadcn`, `design-guide`, `motion-designer`, `elevated-design`, `apple-ui-skills`, `svg-animation-engineer`, `dramatic-2000ms-plus`

---

### FASE 1 — Foundation Visual

#### V2-UI-01: Design System + Layout Base
- **taskId:** `aiw-observer-agentmonitor-v2-ui01-20260330-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`V2-SETUP-02`]
- **description:** Definir y documentar el design system de V2: tokens de color, tipografía, espaciado, estados visuales de agentes (idle/active/blocked/error). Implementar el layout base responsive (sidebar + main + panel de detalle). Este archivo de tokens es la referencia de todas las tareas siguientes.
- **comandos de instalación:**
  ```bash
  # No hay libs nuevas en esta tarea — usa lo instalado en V2-SETUP-02
  # Si se quiere fuente custom:
  npm install @fontsource/[nombre-fuente]
  # Alternativa via Google Fonts en index.html
  ```
- **artefactos esperados:**
  - `src/styles/tokens.css` — CSS variables: colores semánticos, espaciado, radios, sombras
  - `src/components/layout/AppShell.tsx` — layout base (sidebar + content + detail panel)
  - `src/components/layout/AppShell.module.css` o Tailwind classes
  - `docs/design-system-v2.md` — referencia visual del sistema de diseño
- **acceptanceCriteria:**
  - Tokens semánticos definidos para todos los estados MCP (assigned/in-progress/blocked/completed/failed)
  - Layout responsive: funciona en 1280px, 1440px y 1920px de ancho
  - Sin overflow horizontal en ningún breakpoint
  - Dark theme por defecto, variables CSS override-ables
- **skillsAgente:** `observability-design-patterns`, `layout-overflow-guardrails`
- **skills hermanos:** `elevated-design` (Frontend — define el tono visual premium del sistema), `motion-designer` (Frontend — definir durations y easing globals en tokens), `design-guide` (Frontend — referencia estética), `playwright-testing` (Tester — smoke test del layout)

---

### FASE 2 — Dashboard Core

#### V2-UI-02: Hero & Summary Grid
- **taskId:** `aiw-frontend-agentmonitor-v2-ui02-20260330-01`
- **assignedTo:** `Frontend`
- **dependsOn:** [`V2-UI-01`]
- **description:** Implementar hero rediseñado y summaryGrid con 4+ métricas en tiempo real. Usar Chart de shadcn (wrappea Recharts) para sparklines de métricas. Animaciones de entrada con framer-motion.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add card badge button tooltip skeleton
  npx shadcn@latest add chart
  # Recharts viene incluido con shadcn chart — no instalar por separado
  ```
- **artefactos esperados:**
  - `src/components/dashboard/Hero.tsx`
  - `src/components/dashboard/SummaryGrid.tsx`
  - `src/components/dashboard/MetricCard.tsx` — card reutilizable con sparkline
- **acceptanceCriteria:**
  - Métricas se actualizan en tiempo real via WebSocket (sin reload)
  - Skeleton loader visible durante carga inicial
  - Animación de entrada con framer-motion (`initial → animate`)
  - Responsive: grid colapsa a 2 columnas en <1280px, 1 columna en <768px
  - Sin overflow en ningún breakpoint
- **skillsAgente:** `shadcn`, `design-guide`, `motion-designer`, `dramatic-2000ms-plus`, `apple-ui-skills`, `elevated-design`
- **skills hermanos:** `observability-design-patterns` (Observer — qué métricas priorizar), `playwright-testing` (Tester)

> **Nota de animación:** El Hero usa `dramatic-2000ms-plus` en la entrada inicial (staggered reveal de métricas, 2200ms total). Las actualizaciones en tiempo real por WebSocket usan transiciones cortas (<200ms) para no interferir con lectura operativa.

#### V2-UI-03: Agent Stage
- **taskId:** `aiw-observer-agentmonitor-v2-ui03-20260330-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`V2-UI-01`]
- **description:** Rediseñar el agente en foco con health indicators, mini equipo, historial de actividad reciente y quick actions. El agente en foco se selecciona del store Zustand.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add avatar progress badge button tooltip
  ```
- **artefactos esperados:**
  - `src/components/agentStage/AgentStage.tsx`
  - `src/components/agentStage/AgentAvatar.tsx` — avatar con indicador de estado animado
  - `src/components/agentStage/MiniTeam.tsx` — lista compacta del equipo
  - `src/components/agentStage/QuickActions.tsx`
- **acceptanceCriteria:**
  - Estado del agente (idle/in_progress/blocked/completed) visible en <1s de lectura
  - Health indicator cambia de color según estado MCP (`TASK_BLOCKED` → rojo, `TASK_IN_PROGRESS` → azul, etc.)
  - Quick actions: al menos "Ver detalle" y "Copiar taskId" funcionales
  - Animación de transición de estado con framer-motion (no salto abrupto)
  - AgentAvatar implementado como SVG animado (no imagen estática)
  - Transición `INCIDENT_OPENED` usa animación dramática >2000ms (pulso de alerta)
- **skillsAgente:** `observability-design-patterns`, `layout-overflow-guardrails`
- **skills hermanos:** `svg-animation-engineer` (Frontend — AgentAvatar como SVG animado), `apple-ui-skills` (Frontend — physics-based state transition), `dramatic-2000ms-plus` (Frontend — transición INCIDENT_OPENED), `shadcn` (Frontend), `playwright-testing` (Tester)

#### V2-UI-04: Timeline
- **taskId:** `aiw-observer-agentmonitor-v2-ui04-20260330-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`V2-UI-01`]
- **description:** Mejorar el timeline con clustering de eventos por tiempo, filtros por tipo de evento MCP, indicadores de delta (nuevo vs leído), y scroll virtual para datasets grandes.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add scroll-area separator tooltip badge
  npm install react-window
  npm install -D @types/react-window
  # Opcional si se quiere zoom/pan en el timeline:
  npm install d3
  npm install -D @types/d3
  ```
- **artefactos esperados:**
  - `src/components/timeline/Timeline.tsx` — contenedor principal con scroll virtual
  - `src/components/timeline/TimelineEvent.tsx` — evento individual
  - `src/components/timeline/TimelineCluster.tsx` — grupo de eventos colapsados
  - `src/components/timeline/TimelineFilters.tsx` — filtros rápidos por tipo MCP
- **acceptanceCriteria:**
  - Scroll fluido con 500+ eventos (react-window activo)
  - Clustering automático: eventos <5s de diferencia agrupados en un cluster expandible
  - Indicador visual de eventos nuevos vs ya leídos
  - Filtros por tipo de evento (TASK_*, TEST_*, INCIDENT_*, DOC_*) sin reload
  - Sin overflow en panel de timeline
- **skillsAgente:** `observability-design-patterns`, `layout-overflow-guardrails`
- **skills hermanos:** `svg-animation-engineer` (Frontend — conectores SVG animados entre eventos del timeline), `motion-designer` (Frontend — reveal animation de nuevos eventos), `distributed-tracing` (AI_Workspace_Optimizer — patrones de clustering temporal), `playwright-testing` (Tester)

---

### FASE 3 — Metrics & Alertas

#### V2-UI-05: Metrics Panel — Advanced Analytics
- **taskId:** `aiw-frontend-agentmonitor-v2-ui05-20260330-01`
- **assignedTo:** `Frontend`
- **dependsOn:** [`V2-UI-01`]
- **description:** Implementar panel de métricas avanzadas con Chart de shadcn/Recharts. Incluye: throughput por agente, cycle time de tareas, distribución de estados MCP, trend de últimas N horas. Datos vienen del hook `useMcpEvents` con agregaciones en cliente.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add chart card tabs
  # Recharts ya incluido con shadcn chart
  npm install date-fns  # si no instalado en SETUP-02
  ```
- **artefactos esperados:**
  - `src/components/metrics/MetricsPanel.tsx`
  - `src/components/metrics/ThroughputChart.tsx` — line chart por agente
  - `src/components/metrics/CycleTimeChart.tsx` — bar chart de duración de tareas
  - `src/components/metrics/StatusDistribution.tsx` — pie/donut chart de estados
  - `src/hooks/useMetricsAggregations.ts` — lógica de agregación sobre eventos MCP
- **acceptanceCriteria:**
  - Charts se renderizan correctamente con datos reales del WebSocket
  - Tabs para cambiar entre vistas (Throughput / Cycle Time / Distribución)
  - Rango de tiempo configurable: última hora, últimas 6h, últimas 24h
  - Sin errores TypeScript en props de Chart (usar tipos de Recharts correctamente)
  - Responsive: charts mantienen proportions en diferentes anchos
- **skillsAgente:** `shadcn`, `design-guide`, `motion-designer`, `elevated-design`
- **skills hermanos:** `sql-optimization-patterns` (Backend — si las agregaciones migran al server), `observability-design-patterns` (Observer — qué métricas son accionables), `distributed-tracing` (AI_Workspace_Optimizer — patrones de métricas de sistema)

#### V2-UI-06: Critical Panel Redesign
- **taskId:** `aiw-observer-agentmonitor-v2-ui06-20260330-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`V2-UI-01`]
- **description:** Rediseñar el panel de alertas críticas con priorización por severidad, grouping de alertas del mismo tipo, y acciones rápidas de resolución. Independiente de V2-UI-05.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add alert badge button sheet scroll-area
  ```
- **artefactos esperados:**
  - `src/components/criticalPanel/CriticalPanel.tsx`
  - `src/components/criticalPanel/AlertItem.tsx` — alerta individual con severidad
  - `src/components/criticalPanel/AlertGroup.tsx` — grupo de alertas del mismo tipo
  - `src/components/criticalPanel/QuickResolve.tsx` — sheet lateral con detalle y acciones
- **acceptanceCriteria:**
  - `TASK_BLOCKED` e `INCIDENT_OPENED` aparecen en el panel en <500ms de recibido el evento
  - Alertas ordenadas por severidad (INCIDENT > TASK_BLOCKED > TEST_FAILED)
  - Grouping: múltiples TASK_BLOCKED del mismo agente se agrupan con contador
  - Quick resolve: click en alerta abre Sheet con taskId, causa (rootCause del payload) y botón "Copiar taskId"
  - Panel tiene scroll propio, no afecta al layout general
- **skillsAgente:** `observability-design-patterns`, `layout-overflow-guardrails`
- **skills hermanos:** `svg-animation-engineer` (Frontend — iconos de alerta como SVG animados), `dramatic-2000ms-plus` (Frontend — animación de entrada de INCIDENT_OPENED al panel), `shadcn` (Frontend), `playwright-testing` (Tester)

---

### FASE 4 — Filters & Task Groups

#### V2-UI-07: Filter System
- **taskId:** `aiw-frontend-agentmonitor-v2-ui07-20260330-01`
- **assignedTo:** `Frontend`
- **dependsOn:** [`V2-UI-01`]
- **description:** Implementar sistema de filtros avanzado con búsqueda por taskId/correlationId/agente, quick filters para estados comunes, y save/load de presets en localStorage.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add input select checkbox dropdown-menu popover command badge button
  ```
- **artefactos esperados:**
  - `src/components/filters/FilterPanel.tsx`
  - `src/components/filters/QuickFilters.tsx` — chips de filtro rápido
  - `src/components/filters/FilterPresets.tsx` — save/load presets
  - `src/components/filters/SearchBar.tsx` — búsqueda por taskId/correlationId
  - `src/store/filtersStore.ts` — estado de filtros activos en Zustand (slice separado)
- **acceptanceCriteria:**
  - Filtro por: agente, estado MCP, rango de tiempo, texto libre (taskId/correlationId)
  - Quick filters: "Solo bloqueados", "En progreso", "Completados hoy"
  - Save preset guarda en localStorage, carga al iniciar la sesión
  - Filtros activos visibles como chips removibles
  - Sin overflow horizontal en el panel de filtros en ningún breakpoint
- **skillsAgente:** `shadcn`, `design-guide`, `apple-ui-skills`
- **skills hermanos:** `layout-overflow-guardrails` (Observer — validar que los chips no rompan el layout), `playwright-testing` (Tester)

#### V2-UI-08: Task Groups
- **taskId:** `aiw-frontend-agentmonitor-v2-ui08-20260330-01`
- **assignedTo:** `Frontend`
- **dependsOn:** [`V2-UI-07`]
- **description:** Mejorar visualización de task groups con dependency indicators, swimlanes por agente/correlationId, y expand/collapse por grupo. Los filtros activos de V2-UI-07 se aplican sobre los grupos.
- **comandos de instalación:**
  ```bash
  npx shadcn@latest add collapsible table badge tooltip separator
  npm install react-window  # si no instalado en V2-UI-04
  npm install -D @types/react-window
  ```
- **artefactos esperados:**
  - `src/components/taskGroups/TaskGroups.tsx`
  - `src/components/taskGroups/TaskGroup.tsx` — grupo colapsable por correlationId
  - `src/components/taskGroups/TaskRow.tsx` — fila de tarea individual
  - `src/components/taskGroups/DependencyBadge.tsx` — indicador de dependencias
  - `src/components/taskGroups/Swimlane.tsx` — vista alternativa por agente
- **acceptanceCriteria:**
  - Grupos colapsables con estado persistido en sessionStorage
  - Dependency indicator: badge que muestra cuántas tareas dependen de esta
  - Swimlane view: toggle entre vista agrupada por correlationId y vista por agente
  - Filtros de V2-UI-07 se aplican correctamente sobre los grupos
  - Scroll virtual activo con 200+ tareas (react-window)
- **skillsAgente:** `shadcn`, `design-guide`, `motion-designer`
- **skills hermanos:** `task-coordination-strategies` (AI_Workspace_Optimizer — patrones de grouping), `sql-optimization-patterns` (Backend — si grouping migra al server), `playwright-testing` (Tester)

---

### FASE 5 — Backend Validation (nueva)

#### V2-BE-01: Validación de APIs para cliente React
- **taskId:** `aiw-backend-agentmonitor-v2-be01-20260330-01`
- **assignedTo:** `Backend`
- **dependsOn:** [`V2-SETUP-01`]
- **description:** Validar que `/api/events` y `/ws` soporten correctamente el cliente React en desarrollo (Vite en `localhost:5173`). Ajustar CORS, headers, y formato de respuesta si es necesario. Documentar schema de WebSocket message para el tipo `McpEvent` de TypeScript.
- **acceptanceCriteria:**
  - CORS configurado para `localhost:5173` en desarrollo
  - `/api/events` devuelve JSON array de `McpEvent` con todos los campos requeridos
  - WebSocket en `/ws` envía mensajes en formato JSON válido compatible con `McpEvent`
  - Schema documentado en `docs/api/mcp-events-schema.md`
  - Sin breaking changes para el cliente vanilla JS existente (backward-compatible)
- **skillsAgente:** `api-reference-documentation`, `sql-optimization-patterns`

---

### FASE 6 — Performance Budget

#### V2-PERF-01: Baseline y render budget
- **taskId:** `aiw-optimizer-agentmonitor-v2-perf-20260330-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`V2-UI-02`, `V2-UI-04`, `V2-UI-05`]
- **description:** Medir performance del dashboard V2 bajo carga real: FPS del timeline, tiempo de render del dashboard con 200+ eventos, latencia visual de actualización WebSocket. Definir budgets y publicar recomendaciones.
- **herramientas:**
  ```bash
  # Chrome DevTools Performance tab (sin instalación)
  # React DevTools Profiler (extensión Chrome)
  # Lighthouse CLI
  npm install -D lighthouse
  npx lighthouse http://localhost:5173 --view
  # Bundle size analysis
  npm install -D rollup-plugin-visualizer
  # Agregar en vite.config.ts para generar stats.html
  ```
- **artefactos esperados:**
  - `docs/internal/reports/aiw-optimizer-agentmonitor-v2-perf-report.md`
  - Métricas: FCP, LCP, CLS, FPS del timeline, latencia WebSocket → visual (p50/p95)
  - Budget definido por componente
  - Recomendaciones priorizadas P1/P2/P3
- **acceptanceCriteria:**
  - FPS del canvas/timeline >= 30fps con 500 eventos en viewport
  - Latencia evento WebSocket → cambio visual p95 <= 300ms
  - Bundle size inicial < 500KB gzipped
  - Recomendaciones documentadas con evidencia cuantitativa
- **skillsAgente:** `task-coordination-strategies`, `distributed-tracing`

---

### FASE 7 — Testing & Documentación

#### V2-TEST-01: E2E y Tests Visuales
- **taskId:** `aiw-tester-agentmonitor-v2-test-20260330-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`V2-UI-02`, `V2-UI-03`, `V2-UI-04`, `V2-UI-06`, `V2-UI-07`, `V2-UI-08`]
- **description:** Implementar suite completa de tests E2E con Playwright para todos los componentes V2. Incluye tests funcionales, de regresión visual (screenshots) y de accesibilidad básica.
- **comandos de instalación:**
  ```bash
  npm install -D @playwright/test
  npx playwright install
  # Para component testing (opcional):
  npm install -D @playwright/experimental-ct-react
  ```
- **estructura de tests esperada:**
  ```
  tests/
    e2e/
      dashboard.spec.ts       — Hero, SummaryGrid
      agentStage.spec.ts      — Avatar, health indicators, quick actions
      timeline.spec.ts        — Eventos, clustering, filtros de timeline
      metrics.spec.ts         — Charts, tabs, rango de tiempo
      criticalPanel.spec.ts   — Alertas, grouping, quick resolve
      filters.spec.ts         — Filtros, presets, búsqueda
      taskGroups.spec.ts      — Groups, swimlanes, collapse
    visual/
      *.spec.ts               — Snapshots de cada componente
  playwright.config.ts
  ```
- **acceptanceCriteria:**
  - Tests pasan en Chromium, Firefox y WebKit
  - Cobertura E2E de todos los componentes V2 (no solo Dashboard)
  - Tests de regresión visual con screenshots de referencia
  - Test de accesibilidad básica: navegación por teclado en cada panel
  - `TEST_PASSED` publicado con evidencia, o `TEST_FAILED` con causa específica por test
- **skillsAgente:** `playwright-testing`, `systematic-debugging`, `test-driven-development`

#### V2-DOC-01: Documentación y Runbook
- **taskId:** `aiw-documenter-agentmonitor-v2-doc-20260330-01`
- **assignedTo:** `Documenter`
- **dependsOn:** [`V2-UI-04`, `V2-UI-08`, `V2-BE-01`, `V2-PERF-01`]
- **description:** Documentar la arquitectura V2, APIs, guía de componentes, runbook operativo y guía de contribución.
- **artefactos esperados:**
  - `docs/agentmonitor-v2-architecture.md`
  - `docs/api/mcp-events-schema.md` (complementar lo de Backend)
  - `docs/components/README.md` — guía de uso de componentes principales
  - `docs/runbook-v2.md` — operación, troubleshooting, logs
  - `docs/contributing.md` — cómo agregar componentes, convenciones
  - Registry actualizado: `docs/internal/registry/docs_registry.jsonl`
- **acceptanceCriteria:**
  - Arquitectura documentada con diagrama de componentes y flujo de datos
  - Runbook cubre: levantar en dev, build, deploy, debugging de WebSocket, errores comunes
  - Registry actualizado con todos los documentos publicados
  - `DOC_UPDATED` emitido con artifactPaths de todos los archivos creados
- **skillsAgente:** `api-reference-documentation`

---

## Dependencias — Grafo completo corregido

```
V2-SETUP-01 (Auditoría entorno)
  └─> V2-SETUP-02 (Scaffold React+Vite+TS)   V2-BE-01 (Backend validation)
        └─> V2-UI-01 (Design System + Layout)
              ├─> V2-UI-02 (Hero & Summary) ─────────────────────┐
              ├─> V2-UI-03 (Agent Stage)                          │
              ├─> V2-UI-04 (Timeline) ──────────────────────────┐ │
              ├─> V2-UI-05 (Metrics) ───────────────────────────┤ │
              ├─> V2-UI-06 (Critical Panel) ─────────────────────┤ │
              ├─> V2-UI-07 (Filters) ─────────────────────────┐  │ │
              │     └─> V2-UI-08 (Task Groups) ──────────────┐ │  │ │
              │                                               │ │  │ │
              └──────────────────────────────────────────────-┘ │  │ │
                                                                 │  │ │
                                            V2-TEST-01 ─────────┘  │ │
                                            (depende de: 02,03,04,  │ │
                                             05,06,07,08)            │ │
                                                                      │ │
                                            V2-PERF-01 ──────────────┘ │
                                            (depende de: 02,04,05)      │
                                                                          │
                                            V2-DOC-01 ───────────────────┘
                                            (depende de: 04,08,BE-01,PERF-01)
```

---

## Asignación por agente — Resumen

| Agente | Tareas asignadas |
|---|---|
| **AI_Workspace_Optimizer** | V2-SETUP-01, V2-PERF-01 |
| **Frontend** | V2-SETUP-02, V2-UI-02, V2-UI-05, V2-UI-07, V2-UI-08 |
| **Observer** | V2-UI-01, V2-UI-03, V2-UI-04, V2-UI-06 |
| **Backend** | V2-BE-01 |
| **Tester** | V2-TEST-01 |
| **Documenter** | V2-DOC-01 |
| **Orchestrator** | coordinación de gates entre fases |

---

## Gates por fase

| Gate | Condición de paso | Responsable |
|---|---|---|
| Gate F0 | V2-SETUP-01 + V2-SETUP-02 + V2-BE-01 completados | Tester valida scaffold funcional |
| Gate F1 | V2-UI-01 completado | Observer confirma design system documentado |
| Gate F2 | V2-UI-02, 03, 04 completados | Tester: smoke funcional de componentes core |
| Gate F3 | V2-UI-05, 06, 07, 08 completados | Tester: smoke de metrics/filters/groups |
| Gate F4 | V2-PERF-01: budget dentro de targets | AI_Workspace_Optimizer confirma |
| Gate F5 | V2-TEST-01 TEST_PASSED en todos los componentes | Bloquea V2-DOC-01 si hay fallos |
| Gate Final | V2-DOC-01 DOC_UPDATED + registry actualizado | Cierre de EPIC |

---

## Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | CORS bloqueado entre Vite (5173) y MCP Server | Media | Alto | V2-SETUP-01 lo audita antes de empezar; fix en V2-BE-01 |
| 2 | Recharts se comporta distinto en SSR o con datos vacíos | Media | Bajo | V2-UI-05 debe manejar estados: loading, empty, error en Charts |
| 3 | react-window incompatible con altura dinámica de items (timeline) | Media | Medio | Usar `VariableSizeList` en vez de `FixedSizeList`; documentado en V2-UI-04 |
| 4 | Zustand store se desincroniza con WebSocket en reconexión | Baja | Alto | `useMcpEvents` hook debe limpiar store y re-fetch historial al reconectar |
| 5 | framer-motion + @react-spring/web causan jank en listas largas | Media | Medio | Limitar animaciones a elementos fuera del scroll virtual; `will-change: transform` solo en elementos animados; no animar `react-window` internals |
| 6 | Bundle size supera 500KB: Recharts + framer-motion + @react-spring/web + @svgdotjs/svg.js + lottie-react + D3 | Alta | Medio | V2-PERF-01 analiza con `rollup-plugin-visualizer`; lazy load de D3, lottie-react y @svgdotjs/svg.js; tree-shake Recharts importando solo los componentes usados |
| 7 | `dramatic-2000ms-plus` aplicado en actualizaciones frecuentes de WebSocket bloquea la lectura operativa | Media | Alto | Regla explícita: animaciones >2s SOLO en montaje inicial y `INCIDENT_OPENED`; todas las actualizaciones de datos en tiempo real usan <200ms |
| 8 | SVGs animados con @svgdotjs/svg.js no accesibles (falta aria) | Baja | Medio | Todo SVG animado debe tener `role="img"`, `aria-label` y `aria-live` cuando cambia de estado |

---

## Criterios de aceptación del plan v2.1

- [x] Corrección de asignaciones: tareas de UI reasignadas a Observer/Frontend
- [x] AI_Workspace_Optimizer con rol correcto: auditoría y performance, no UI
- [x] Backend tiene tarea explícita (V2-BE-01)
- [x] Decisión de migración resuelta (Option A) con criterios de rollback
- [x] Skills listadas con nombre completo y comandos `npm install` / `npx`
- [x] Tipos MCP como contrato compartido (`src/types/mcp.ts`)
- [x] V2-TEST-01 depende de los componentes reales, no solo de Foundation
- [x] Grafo de dependencias corregido y completo
- [x] Gates formales por fase con responsable
- [x] `/pixel` separado, no integrado en V2
- [x] Riesgos técnicos específicos con mitigaciones concretas
- [x] **5 skills de Frontend recuperadas:** `motion-designer`, `svg-animation-engineer`, `elevated-design`, `apple-ui-skills`, `dramatic-2000ms-plus`
- [x] Skills asignadas por tarea con criterio (no aplicadas en todas, sino donde aportan)
- [x] Regla de `dramatic-2000ms-plus` documentada: solo en montaje inicial e INCIDENT_OPENED
- [x] Libs de animación con comandos de instalación y mapa skill→librería→tarea
- [x] Riesgos de bundle size y accesibilidad de SVGs agregados