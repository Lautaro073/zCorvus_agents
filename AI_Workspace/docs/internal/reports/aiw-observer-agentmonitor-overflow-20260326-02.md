# Observer Report — AgentMonitor Layout/Overflow Guardrails (2026-03-26)

## Objetivo
Resolver problemas reales de layout/overflow en `AgentMonitor` con cambios pequeños/medianos de alto impacto, manteniendo comportamiento MCP/eventos intacto.

## Hallazgos principales
1. **Riesgo de overflow en columnas secundarias** por uso de mínimos rígidos (`320px/340px`) en grids internos.
2. **Riesgo de desborde en cabeceras flex** sin `min-width: 0` para hijos con contenido dinámico.
3. **Indentación recursiva de tareas** sin límite superior (`margin-left` por profundidad), capaz de sacar tarjetas del contenedor.
4. **Tokens/IDs largos** (taskId/correlationId/textos dinámicos) sin guardrails universales de wrapping.
5. **Media embebida sin regla global** de escalado defensivo.

## Cambios aplicados
### 1) Guardrails estructurales de grid/flex
- `workspace-grid`: segunda columna pasó a `minmax(280px, var(--layout-sidebar-width))`.
- `hero`, `agent-stage`, `overview-grid`, `main-grid`: columnas secundarias cambiadas de mínimos rígidos a `minmax(0, ...)`.
- Se añadió `min-width: 0` en hijos de cabeceras flex críticas (`panel-head`, `task-group-head`, `signal-head`, etc.).

### 2) Contención de overflow por contenido dinámico
- Reglas de `overflow-wrap: anywhere` para títulos, badges, metadatos y textos de cards/detalle.
- `task-summary` y `detail-rich-notes` reforzados para wrapping en textos largos.

### 3) Guardrail en jerarquía de tareas anidadas
- `task-group` ahora limita indentación con:
  - `margin-left: min(calc(var(--task-depth) * var(--task-indent-step)), var(--task-indent-max));`
- Ajustes responsive:
  - en `<=1180px`, se reduce paso/tope de indentación;
  - en `<=760px`, se elimina margen izquierdo para evitar overflow horizontal.

### 4) Hardening responsive adicional
- `workspace-main`/`workspace-side` con `min-width: 0`.
- `hero-actions` con `min-width: 0`.
- `task-group-badges` en móvil se alinea a inicio para evitar choques de ancho.

### 5) Librerías CSS añadidas por CDN (bajo riesgo)
1. **modern-normalize@2.0.0**
   - Motivo: base consistente entre navegadores sin imponer componentes ni tema.
2. **open-props@1.7.9**
   - Motivo: tokens CSS reutilizables para reducir mantenimiento manual futuro.

> Decisión de riesgo: ambas librerías son de alcance bajo (reset/tokens) y no alteran la lógica de `app.js` ni contratos MCP.

## Archivos modificados
- `AgentMonitor/index.html`
- `AgentMonitor/styles.css`
- `Agents/Observer/skills/observability-design-patterns/SKILL.md`
- `Agents/Observer/skills/layout-overflow-guardrails/SKILL.md`
- `docs/internal/reports/aiw-observer-agentmonitor-overflow-20260326-02.md`

## Validación funcional
- No se tocaron handlers de eventos, fetch, WebSocket ni estructuras de payload en `app.js`.
- Cambios limitados a capa de presentación y documentación/skills.

## Riesgos pendientes
1. Dependencia de CDN externa (si cae, se pierde normalize/tokens; fallback sigue siendo CSS local).
2. Textos extremadamente largos no semánticos aún pueden degradar legibilidad aunque ya no rompan layout.
3. Profundidad de tareas muy alta sigue compactándose visualmente en móvil (tradeoff para evitar overflow).

## Siguientes pasos recomendados
1. Añadir prueba visual (capturas por breakpoint) en CI para detectar regressions de overflow.
2. Definir presupuesto de densidad por card (máx. líneas visibles antes de truncar).
3. Evaluar tokenización progresiva (`open-props`) para radios/espaciados y reducir valores hardcoded.
