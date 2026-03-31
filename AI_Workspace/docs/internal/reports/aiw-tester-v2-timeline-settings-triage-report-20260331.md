# AgentMonitor V2 Triage Report - Timeline Filters + Settings Regression

- Task ID: `aiw-tester-v2-timeline-settings-triage-20260331-01`
- Correlation ID: `aiw-agentmonitor-v2-20260330`
- Runtime: `http://127.0.0.1:4311/monitor`
- Date: 2026-03-31

## Scope

1. Reproducir bug: filtros de "Linea de tiempo" no aplican.
2. Reproducir bug: sección "Ajustes" desactualizada (sin ocultar por agente/correlación/status).
3. Entregar causa raíz y recomendaciones de fix + regresión.

## Reproduction evidence

### Automated triage run

Command:

```bash
node scripts/timeline-settings-triage.mjs
```

Artifact JSON:
- `AI_Workspace/agentmonitor-v2/test-results/timeline-settings-triage/triage-results.json`

Screenshots:
- `AI_Workspace/agentmonitor-v2/test-results/timeline-settings-triage/01-dashboard-initial.png`
- `AI_Workspace/agentmonitor-v2/test-results/timeline-settings-triage/02-timeline-filtered-in-progress.png`
- `AI_Workspace/agentmonitor-v2/test-results/timeline-settings-triage/03-settings-section.png`

## Bug 1 - Timeline filters do not apply correctly

### Expected
Al activar filtro `TASK_IN_PROGRESS`, la lista debe mostrar eventos en progreso existentes.

### Actual
Con datos reales de API:
- `lowercaseInProgress = 13`
- `taskInProgress = 12`

UI antes del filtro:
- `Linea de tiempo / 51 eventos`

UI después de activar `timeline-filter-TASK_IN_PROGRESS`:
- `Linea de tiempo / 0 eventos`
- mensaje: `Ningun evento coincide con los filtros`

### Root cause
En `Timeline.tsx` se compara el filtro contra `event.status || event.type` sin normalizar:

- `AI_Workspace/agentmonitor-v2/src/components/timeline/Timeline.tsx:31`

Los botones de filtro usan IDs `TASK_*`:

- `AI_Workspace/agentmonitor-v2/src/components/timeline/TimelineFilters.tsx:15`

Como `event.status` suele venir en minúsculas (`in_progress`) y tiene prioridad sobre `event.type`, la comparación falla y filtra todo.

## Bug 2 - Settings section outdated (missing controls)

### Expected
En `#settings` deben existir controles para ocultar/filtrar por agente, estado, correlación y quick filters/presets.

### Actual
Dentro de la sección settings:
- `hasFilterPanelTitle = false`
- `hasQuickFilters = false`
- `hasAgentSelect = false`
- `hasStatusSelect = false`
- `hasPresetButton = false`
- `hasTaskGroupsPanel = true`

Solo se renderiza texto + TaskGroups, sin panel de filtros.

### Root cause
`App.tsx` pasa filtros constantes y no monta `FilterPanel` en settings:

- `AI_Workspace/agentmonitor-v2/src/App.tsx:40` (`DEFAULT_GROUP_FILTERS` fijo)
- `AI_Workspace/agentmonitor-v2/src/App.tsx:285` (`filters={DEFAULT_GROUP_FILTERS}`)

El componente `FilterPanel` existe, pero no se usa en `App.tsx`:

- `AI_Workspace/agentmonitor-v2/src/components/filters/FilterPanel.tsx`

## Additional gap in current test coverage

`timeline.spec.ts` valida solo interacción visual de controles, no efectividad del filtrado por estado:

- `AI_Workspace/agentmonitor-v2/tests/e2e/timeline.spec.ts:3`

## Recommended fixes (Frontend)

1. **Timeline status matching**
   - Usar `getNormalizedEventStatus(event)` en `Timeline.tsx` para comparar con filtros `TASK_*`.
   - No comparar con `event.status || event.type` crudo.

2. **Settings restoration**
   - Montar `FilterPanel` dentro de `section-settings`.
   - Mantener estado de filtros en `App.tsx` (no constante) y pasarlo a `TaskGroups`.
   - Soportar búsqueda por `correlationId` y filtros por agente/estado/quickFilters.

3. **Regression tests**
   - E2E: al activar `TASK_IN_PROGRESS`, assert que el conteo no cae a 0 cuando hay eventos `in_progress` en dataset.
   - E2E: en `#settings`, assert visibilidad de controles (`Todos los agentes`, `Todos los estados`, `Filtros rapidos`, `Presets`) y que modifican `TaskGroups`.

## QA verdict

`TEST_FAILED` - ambos bugs reproducidos y confirmados con causa raíz.
