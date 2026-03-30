# Plan Planner — AgentMonitor UI/UX (2026-03-26)

## taskId
- `aiw-planner-agentmonitor-ux-plan-20260326-01`

## correlationId
- `aiw-agentmonitor-uiux-20260326`

## Objetivo
Elevar la capacidad operativa del AgentMonitor para triage rápido, menor carga cognitiva y mejor navegación por teclado, manteniendo stack vanilla (HTML/CSS/JS).

## Skills de diseño recomendadas (repositorio)
1. `Agents/Frontend/skills/design-guide/SKILL.md`
   - Tokens visuales, consistencia de patrones, jerarquía de información.
2. `Agents/Frontend/skills/shadcn/SKILL.md`
   - Patrones de interacción y componentes (aplicados de forma conceptual, sin migrar framework).
3. `Agents/Frontend/skills/pr-report/references/style-guide.md`
   - Claridad visual, legibilidad y decisiones de UX orientadas a uso real.

## Propuesta por fases

### Fase 1 — Quick wins operativos (completada en esta iteración)
- Exponer panel superior (`hero`) con estado en vivo y acciones principales.
- Añadir saltos rápidos de navegación entre paneles críticos.
- Añadir presets de filtros frecuentes (bloqueadas, en progreso, última hora).
- Añadir shortcuts globales para operadores (`/`, `R`, `F`, `M`, `1/2/3`).
- Reforzar accesibilidad de foco y navegación.

### Fase 2 — Eficiencia de triage (siguiente)
- Presets adicionales: `failed`, por `agent`, por `correlationId`.
- Vista compacta opcional para timeline y tareas.
- Indicadores de “tiempo desde último bloqueo” y “edad de alerta”.

### Fase 3 — Calidad operativa medible
- Métricas UX:
  - tiempo hasta abrir primera alerta crítica,
  - clics hasta aislar una tarea bloqueada,
  - adopción de atajos de teclado.
- Exporte de reporte con resumen de KPI de sesión.

## Criterios de aceptación
- Reducir acciones manuales para triage frecuente mediante presets y atajos.
- Mejorar navegabilidad con teclado sin romper interacción existente.
- Mantener compatibilidad total con flujo MCP y contrato de eventos.
- Documentar cambios y recomendaciones para runbook operativo.
