# AgentMonitor V2 Clickable UI Audit (Retry)

- Task ID: `aiw-tester-v2-clickable-audit-retry-20260331-01`
- Correlation ID: `aiw-agentmonitor-v2-20260330`
- Runtime audited: `http://127.0.0.1:4311/monitor` (sin slash final)
- Date: 2026-03-31

## Scope audited

- Sidebar navigation + collapse toggle
- Header actions (notifications, search)
- Timeline filters/search/clusters
- Task Groups tabs + rows
- Critical panel + quick resolve
- Agent quick actions

## Method

- Automated exploratory run with Playwright (Chromium) against runtime real `/monitor`.
- Artifacts generated in `agentmonitor-v2/test-results/runtime-clickable-audit/`.

Command executed:

```bash
node scripts/clickable-audit.mjs
```

## Clickable inventory and behavior

| Area | Element | Expected | Actual | Severity |
|---|---|---|---|---|
| Sidebar | `Panel/Agentes/Timeline/Critico/Ajustes` links | Navegar a seccion real | Solo cambia hash (`#dashboard`, etc.) y no existe target DOM | High |
| Sidebar | Collapse toggle | Colapsar/expandir sidebar | Funciona (clase cambia) | Pass |
| Header | Notifications bell | Abrir popover | Funciona (`notifications-popover` visible) | Pass |
| Header | Search input (`Buscar tareas...`) | Filtrar o accionar busqueda global | Input editable, sin efecto funcional conectado | Medium |
| Timeline | Status filter chips | Activar/desactivar filtros | Funciona (`timeline-active-filters` visible) | Pass |
| Timeline | Search input | Filtrar timeline | Funciona (valor aplicado) | Pass |
| Timeline | Event rows (`cursor-pointer`) | Abrir detalle o feedback | Click sin accion observable (handler no conectado) | Medium |
| Timeline | Cluster toggle | Expandir cluster cuando exista | No se renderizo cluster con dataset actual (no verificable en esta corrida) | Info |
| Task Groups | Tab switch correlation/agent | Cambiar vista | Funciona (`data-state=active`) | Pass |
| Task Groups | Task rows (`cursor-pointer`) | Abrir detalle o feedback | 29 elementos cliqueables sin accion observable | High |
| Critical panel | Alert item | Abrir quick resolve | No hubo alertas en dataset actual (no verificable) | Info |
| Agent Stage | `Ver detalle` | Navegar a detalle o feedback explicito | Solo copia `taskId` al portapapeles, sin feedback visible | Medium |
| Quick Resolve | `Copiar taskId` | Copiar + feedback visible | Copia sin feedback visible | Low |

## Root causes (code-level)

1. **Sidebar dead-nav**: links apuntan a hashes sin secciones con `id` correspondiente.
   - `agentmonitor-v2/src/components/layout/Sidebar.tsx`
   - `agentmonitor-v2/src/App.tsx` (no anchors `id=dashboard|agents|timeline|critical|settings`)

2. **Rows marked clickable without connected action**:
   - Timeline rows: `TimelineEvent` usa `onClick?.(...)`, pero `Timeline` no pasa callback.
     - `agentmonitor-v2/src/components/timeline/Timeline.tsx`
     - `agentmonitor-v2/src/components/timeline/TimelineEvent.tsx`
   - Task rows: `TaskRow` recibe callback opcional, pero en flujos principales no se conecta.
     - `agentmonitor-v2/src/components/taskGroups/TaskGroups.tsx`
     - `agentmonitor-v2/src/components/taskGroups/TaskGroup.tsx`
     - `agentmonitor-v2/src/components/taskGroups/TaskRow.tsx`

3. **Actions with no user feedback**:
   - `Ver detalle` ejecuta copy-to-clipboard sin toast/confirmacion.
     - `agentmonitor-v2/src/App.tsx`
     - `agentmonitor-v2/src/components/agentStage/QuickActions.tsx`
   - `Copiar taskId` en quick resolve idem.
     - `agentmonitor-v2/src/components/criticalPanel/QuickResolve.tsx`

4. **Header search no-op**:
   - Input presente pero no conectado a estado de filtros globales.
   - `agentmonitor-v2/src/components/layout/Header.tsx`

## Additional user-reported check to include next cycle

- Verificar explícitamente con Playwright el caso visual: agente en `TASK_IN_PROGRESS` mostrado como `Inactivo`.
- Este check debe añadirse al siguiente ciclo de runtime QA (junto con capturas), ya solicitado al Orchestrator en evento MCP.

## Artifacts

- `agentmonitor-v2/test-results/runtime-clickable-audit/audit-results.json`
- `agentmonitor-v2/test-results/runtime-clickable-audit/01-initial.png`
- `agentmonitor-v2/test-results/runtime-clickable-audit/02-sidebar-collapsed.png`
- `agentmonitor-v2/test-results/runtime-clickable-audit/03-notifications.png`
- `agentmonitor-v2/test-results/runtime-clickable-audit/05-final.png`

## QA verdict

`TEST_FAILED` — la auditoría encontró gaps UX de severidad High/Medium (dead-clicks y navegación incompleta).
