# EPIC Plan — AgentMonitor "Pixel Experience" v3 — zCorvus + pixel-agents + OpenCode (2026-03-26)

## Metadata
- **PlanId:** `aiw-epic-agentmonitor-pixel-experience-plan-v3-20260326`
- **Versión:** `3.0` — OpenCode como herramienta de trabajo; JSONL watcher eliminado del fork
- **Fecha:** 2026-03-26
- **Planner:** `Planner`
- **CorrelationId:** `aiw-agentmonitor-pixel-experience-20260326`
- **Estado:** `proposed`
- **Repo base:** `https://github.com/pablodelucca/pixel-agents` (MIT, público)
- **Herramienta de desarrollo:** OpenCode (no Claude Code — esa integración ya existe en el repo original y no aplica)
- **Reemplaza:** `aiw-epic-agentmonitor-pixel-experience-plan-20260326` (v1), `aiw-epic-agentmonitor-pixel-experience-plan-v2-20260326` (v2)

---

## 0) Por qué se descarta el plan v1 y por qué se actualiza v2

### El error de v1
v1 trataba `pixel-agents` como un *design system* o *librería de estilos* a importar dentro del AgentMonitor HTML/JS existente. Planificó slices visuales, tokens de CSS y refactoring de `app.js` como si pixel-agents fuera una capa de theming.

### Lo que pixel-agents realmente es
`pixel-agents` es una **extensión VS Code completa** con su propio motor de rendering, construida originalmente para Claude Code:

| Capa | Tecnología | Función original |
|---|---|---|
| Extension host | TypeScript + VS Code API | Lee archivos JSONL de sesiones Claude Code |
| Webview UI | Vite + Canvas 2D | Renderiza oficina pixel con personajes animados |
| Motor visual | BFS pathfinding + state machine | `idle → walk → type/read` por tool use |
| Fuente de datos | Polling de archivos JSONL | Transcripciones de sesiones de Claude Code |

### La corrección de v2 (mantenida en v3)
La integración correcta es reemplazar la **capa de datos** por un adaptador que consuma el MCP server de zCorvus. El motor visual se reutiliza íntegro.

### La corrección adicional de v3: OpenCode como herramienta de desarrollo
El repo original de pixel-agents tiene sentido para quien usa **Claude Code** como herramienta de desarrollo. En este caso, la herramienta es **OpenCode**, que usa **SQLite** para persistir sesiones (no archivos JSONL). Usar el repo original as-is implicaría tener una integración Claude Code inútil encima.

Por eso el fork elimina el JSONL watcher **completamente** en lugar de coexistir con él. El resultado es un fork más limpio, sin código muerto, donde la única fuente de datos es el MCP de zCorvus. La pregunta "¿mantenemos Claude Code JSONL en paralelo?" queda respondida desde el inicio: **no**.

---

## 1) Arquitectura de integración zCorvus ↔ pixel-agents

### 1.1 Arquitectura original de pixel-agents (Claude Code)

```
Claude Code sessions
      ↓ (archivos .jsonl)
Extension Host (TypeScript)
  └─ JSONL Watcher/Poller    ← SE ELIMINA del fork
  └─ AgentRegistry           ← se reescribe para agentes zCorvus fijos
  └─ MessageBridge → postMessage API
      ↓
Webview (Canvas)             ← sin cambios
  └─ CharacterStateManager
  └─ PixelOfficeRenderer (BFS + game loop)
  └─ UI (agent cards, layout editor)
```

### 1.2 Arquitectura del fork zCorvus (sin JSONL watcher)

```
zCorvus MCP Server
  ├─ WebSocket (/ws)           ← stream de eventos en tiempo real
  └─ HTTP GET /api/events      ← histórico / polling fallback
      ↓
[NUEVO] MCP Adapter (TypeScript)   ← reemplaza al JSONL watcher eliminado
  └─ McpWebSocketClient
  └─ AgentStateMapper          ← eventos MCP → estados pixel-agents
  └─ AgentRegistry (reescrito) ← 5 agentes zCorvus fijos, sin terminales
      ↓
Extension Host (refactorizado)
  └─ MessageBridge → postMessage API
      ↓
Webview (Canvas) — sin cambios
  └─ CharacterStateManager
  └─ PixelOfficeRenderer
```

El JSONL watcher se elimina por completo del fork. No hay coexistencia con Claude Code: la única fuente de verdad es el MCP de zCorvus. El fork queda sin código muerto.

### 1.3 Mapping de estados: MCP → pixel-agents

| Estado MCP (zCorvus) | Animación pixel-agents | Notas |
|---|---|---|
| `TASK_ASSIGNED` | `idle` | Agente recibió tarea, aún no empieza |
| `TASK_ACCEPTED` | `walk` (hacia escritorio) | Moviéndose a posición de trabajo |
| `TASK_IN_PROGRESS` | `type` | Ejecutando (tool use activo) |
| `TASK_BLOCKED` | `idle` + indicador visual rojo | Bloqueado, necesita atención |
| `TEST_FAILED` | `idle` + indicador rojo parpadeante | Fallo activo |
| `TASK_COMPLETED` | `idle` (pose de descanso) | Tarea terminada |
| `INCIDENT_OPENED` | animación especial (alerta) | P1: requiere atención inmediata |
| `INCIDENT_RESOLVED` | `idle` (normalizado) | Incidente cerrado |
| `DOC_UPDATED` | `read` | Consultando/generando documentación |
| `ARTIFACT_PUBLISHED` | `type` → `idle` | Publicando artefacto |

### 1.4 Agentes zCorvus como personajes

| Agente zCorvus | Personaje pixel | Asiento |
|---|---|---|
| `Orchestrator` | Director de oficina | Mesa central |
| `AI_Workspace_Optimizer` | Técnico / Optimizer | Zona de análisis |
| `Observer` | Monitor / Watcher | Panel lateral |
| `Documenter` | Redactor | Zona de documentación |
| `Tester` | QA | Zona de testing |

El layout de la oficina pixel refleja la topología operativa real de zCorvus.

---

## 2) Diagnóstico técnico honesto

### 2.1 Lo que pixel-agents da gratis (motor visual completo)
- Motor de canvas con game loop optimizado (requestAnimationFrame).
- BFS pathfinding para movimiento de personajes.
- State machine de caracteres ya funcional (`idle / walk / type / read`).
- Sprites y assets pixel completos (MIT, en `webview-ui/public/assets/`).
- VS Code Webview API ya integrada.
- Editor de layout de oficina (drag & drop tiles).
- Debug view integrado (estado de conexión, timestamps).
- Build toolchain (esbuild + Vite) ya configurado.

**Lo que NO se hereda** (se elimina en el fork): el JSONL watcher, el poller de archivos de sesión, y toda la lógica de detección de terminales VS Code como "agentes".

### 2.2 Limitaciones del repo original que el fork resuelve por diseño
1. **Agent-terminal sync frágil**: el original se desincroniza cuando hay terminales abiertas/cerradas rápidamente. En el fork no hay terminales — los agentes son entidades fijas registradas al iniciar. Problema eliminado por diseño.
2. **Detección de estado heurística**: el original infiere estados leyendo JSONL. Con eventos MCP explícitos los estados son exactos, no heurísticos. Mejora directa.
3. **Señales ambiguas de "waiting" vs "finished"**: el original no puede distinguirlos con certeza en el JSONL. Con el ciclo de vida MCP (`TASK_IN_PROGRESS` → `TASK_COMPLETED`) esto queda resuelto sin ambigüedad.

### 2.3 Lo que hay que construir (delta real)
1. **Eliminar JSONL watcher**: identificar y remover limpiamente `JonlWatcher`, `JonlPoller` y lógica de detección de terminales del fork.
2. **MCP Adapter**: cliente WebSocket + HTTP que consume `/ws` y `/api/events` de zCorvus.
3. **AgentStateMapper**: convierte eventos MCP en estados del state machine de pixel-agents.
4. **AgentRegistry reescrito**: inicializa los 5 agentes de zCorvus como personajes fijos al arrancar la extensión.
5. **Configuración de layout**: preset de oficina con los 5 agentes en sus posiciones, cargado desde JSON.
6. **Indicadores visuales de estado crítico** (Fase 3): `TASK_BLOCKED` / `INCIDENT_OPENED` con alertas visuales.

### 2.4 Lo que NO hay que hacer
- No reescribir el motor de canvas.
- No migrar pixel-agents a web standalone (a menos que se decida en Fase 4).
- No modificar el contrato MCP de zCorvus.
- No reemplazar el AgentMonitor web existente — pixel-agents es una **vista complementaria**, no un reemplazo.

---

## 3) Principios de integración

1. **Fork limpio, sin código muerto**: el JSONL watcher se elimina en Fase 0 antes de escribir el adapter. El fork no carga lógica de Claude Code.
2. **Adapter-first**: el MCP Adapter es una capa de traducción, no una modificación del motor de canvas.
3. **Estados explícitos > heurísticas**: los eventos MCP de zCorvus dan certeza de estado; no hay inferencias sobre streams de texto.
4. **No romper MCP**: el adapter es un cliente pasivo (read-only) del MCP server; no emite eventos propios.
5. **Build incremental**: cada fase produce una extensión VS Code instalable y funcional.
6. **OpenCode como entorno de desarrollo**: el fork no tiene ni necesita integración con Claude Code. La herramienta de desarrollo del operador es OpenCode.

---

## 4) Backlog detallado por fases

---

## Fase 0 — Setup, baseline y validación de instalación

### Tarea 0.1
- **taskId:** `aiw-orch-pixel-v2-kickoff-20260326-01`
- **assignedTo:** `Orchestrator`
- **dependsOn:** `[]`
- **Descripción:** Kickoff oficial del programa v2. Publicar correlationId, validar alcance corregido, distribuir tareas iniciales.
- **Acceptance criteria:**
  - Plan v2 aceptado y correlationId publicado.
  - Tareas 0.2 y 0.3 emitidas con dependencias.
  - Política de rollback por fase definida.

### Tarea 0.2
- **taskId:** `aiw-opt-pixel-v3-fork-and-clean-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-orch-pixel-v2-kickoff-20260326-01`]
- **Descripción:** Clonar `pixel-agents`, crear el fork zCorvus, ejecutar build inicial y **eliminar limpiamente el JSONL watcher y toda lógica de Claude Code** antes de tocar nada más.
- **Pasos concretos:**
  ```bash
  git clone https://github.com/pablodelucca/pixel-agents.git pixel-agents-zcorvus
  cd pixel-agents-zcorvus
  npm install
  cd webview-ui && npm install && cd ..
  npm run build   # validar que el build base funciona antes de borrar
  # Identificar y eliminar: JSONL watcher, JSONL poller, terminal detection
  # Confirmar que el build sigue verde después de la limpieza
  ```
- **Acceptance criteria:**
  - Build base funciona antes de cualquier cambio.
  - Archivos del JSONL watcher/poller identificados y eliminados del fork.
  - Lógica de detección de terminales VS Code como "agentes" eliminada.
  - Build sigue compilando después de la limpieza (aunque la extensión quede sin fuente de datos aún — eso viene en Fase 1).
  - Mapa de código documentado: qué se eliminó, qué queda, puntos de extensión para el adapter.

### Tarea 0.3
- **taskId:** `aiw-opt-pixel-v2-mcp-audit-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-orch-pixel-v2-kickoff-20260326-01`]
- **Descripción:** Auditar el contrato MCP de zCorvus: WebSocket schema, tipos de eventos, campos del payload, comportamiento de reconexión.
- **Acceptance criteria:**
  - Inventario de todos los tipos de eventos MCP emitidos por zCorvus.
  - Schema de payload por tipo documentado.
  - Comportamiento de `/ws` en reconexión documentado.
  - Lista de agentes activos con sus `assignedTo` values reales.

### Tarea 0.4 (gate de Fase 0)
- **taskId:** `aiw-tester-pixel-v3-gate-f0-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-opt-pixel-v3-fork-and-clean-20260326-01`, `aiw-opt-pixel-v2-mcp-audit-20260326-01`]
- **Descripción:** Verificar que el fork está listo para desarrollo: JSONL watcher eliminado, build limpio, MCP auditado, puntos de extensión identificados.
- **Acceptance criteria:**
  - Checklist de readiness: fork compila, JSONL watcher ausente, no hay referencias a Claude Code en el código activo.
  - Schema de eventos MCP auditado y documentado.
  - `TEST_PASSED` emitido con evidencia, o `TASK_BLOCKED` con causa y acción.

---

## Fase 1 — MCP Adapter (núcleo de integración)

### Tarea 1.1
- **taskId:** `aiw-observer-pixel-v2-adapter-ws-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f0-20260326-01`]
- **Descripción:** Implementar cliente WebSocket del MCP de zCorvus dentro del extension host de pixel-agents. El adapter se conecta a `/ws`, parsea eventos MCP y los pone disponibles en el pipeline interno.
- **Detalles de implementación:**
  - Crear `src/adapters/zcorvus/McpWebSocketClient.ts`
  - Manejar reconexión automática (exponential backoff)
  - Parsear eventos según schema de Tarea 0.3
  - Exponer un `EventEmitter` interno con eventos normalizados
  - Fallback a HTTP `/api/events` si WebSocket no disponible
- **Acceptance criteria:**
  - Adapter se conecta al MCP server y recibe eventos en tiempo real.
  - Reconexión automática funciona ante caída del server.
  - Logs de debug visibles en Debug View de pixel-agents.
  - No modifica el JSONL watcher original (coexistencia, no reemplazo).

### Tarea 1.2
- **taskId:** `aiw-observer-pixel-v2-state-mapper-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-observer-pixel-v2-adapter-ws-20260326-01`]
- **Descripción:** Implementar `AgentStateMapper` que traduce eventos MCP a estados del state machine de pixel-agents (idle/walk/type/read + estados extendidos).
- **Detalles de implementación:**
  - Crear `src/adapters/zcorvus/AgentStateMapper.ts`
  - Implementar el mapping definido en sección 1.3 de este plan
  - Manejar transiciones de estado (e.g.: no ir a `type` si ya está `blocked`)
  - Respetar las transiciones válidas del state machine original de pixel-agents
- **Acceptance criteria:**
  - Cada tipo de evento MCP produce exactamente un estado de personaje.
  - Las transiciones respetan el state machine original.
  - Prueba manual: enviar un `TASK_IN_PROGRESS` y ver al personaje animarse como `type`.
  - Prueba manual: enviar un `TASK_BLOCKED` y ver indicador visual de alerta.

### Tarea 1.3
- **taskId:** `aiw-observer-pixel-v2-agent-registry-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-observer-pixel-v2-state-mapper-20260326-01`]
- **Descripción:** Override del AgentRegistry para inicializar los 5 agentes de zCorvus como personajes fijos, sin depender de terminales VS Code.
- **Detalles de implementación:**
  - Los agentes zCorvus no son procesos de terminal — se registran estáticamente al iniciar la extensión.
  - Cargar configuración de agentes desde `zcorvus-agents.json` (configurable).
  - Cada agente tiene: `id`, `displayName`, `assignedTo` (valor MCP), asiento inicial.
- **Acceptance criteria:**
  - Al iniciar la extensión, los 5 agentes aparecen como personajes en la oficina.
  - No se generan agentes fantasma ni duplicados.
  - La configuración es editable sin recompilar.

### Tarea 1.4 (gate)
- **taskId:** `aiw-tester-pixel-v2-gate-f1-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-observer-pixel-v2-agent-registry-20260326-01`]
- **Descripción:** Validar integración end-to-end: MCP → Adapter → StateMapper → Canvas.
- **Acceptance criteria:**
  - Flujo completo funciona: evento MCP real → personaje cambia de estado visualmente.
  - Los 5 agentes de zCorvus aparecen en la oficina con nombres correctos.
  - No hay regresiones en funcionalidad original de pixel-agents (Claude Code sigue funcionando si está configurado).
  - `TEST_PASSED` con evidencia visual (screenshots/recording) o `TEST_FAILED` bloqueante.

---

## Fase 2 — Layout y configuración de la oficina zCorvus

### Tarea 2.1
- **taskId:** `aiw-observer-pixel-v2-office-layout-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f1-20260326-01`]
- **Descripción:** Diseñar y configurar el layout de la oficina pixel para reflejar la topología de zCorvus.
- **Detalles:**
  - Usar el editor de layout integrado de pixel-agents para armar la oficina.
  - Exportar el layout como JSON y guardarlo en `config/zcorvus-office.json`.
  - Asientos fijos para cada agente según sección 1.4 del plan.
  - Zonas visuales diferenciadas: Orchestrator central, Tester separado, etc.
- **Acceptance criteria:**
  - Layout refleja visualmente la jerarquía de zCorvus.
  - Cada agente tiene asiento fijo reconocible.
  - Layout se carga automáticamente al iniciar la extensión.
  - El editor de layout original sigue funcionando para ajustes futuros.

### Tarea 2.2
- **taskId:** `aiw-observer-pixel-v2-agent-names-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f1-20260326-01`]
- **Descripción:** Mostrar nombres de agentes zCorvus en las tarjetas de personaje y en tooltips.
- **Acceptance criteria:**
  - Nombre del agente (`Orchestrator`, `Observer`, etc.) visible sobre cada personaje.
  - Tooltip al hover muestra: nombre, estado MCP actual, última tarea activa.
  - Nombres configurables desde `zcorvus-agents.json`.

### Tarea 2.3
- **taskId:** `aiw-opt-pixel-v2-render-audit-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-observer-pixel-v2-office-layout-20260326-01`, `aiw-observer-pixel-v2-agent-names-20260326-01`]
- **Descripción:** Auditar performance del canvas bajo burst de eventos MCP. Definir budget de actualización.
- **Acceptance criteria:**
  - Medición de FPS y latencia visual con 50+, 200+, 500+ eventos/minuto.
  - Budget definido: actualización máxima de estado de personaje cada N ms.
  - Throttling recomendado documentado e implementado si necesario.

### Tarea 2.4 (gate)
- **taskId:** `aiw-tester-pixel-v2-gate-f2-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-opt-pixel-v2-render-audit-20260326-01`]
- **Descripción:** Gate de Fase 2: layout, nombres, performance.
- **Acceptance criteria:**
  - Oficina zCorvus se ve correcta y reconocible.
  - Performance dentro del budget definido.
  - `TEST_PASSED` con evidencia.

---

## Fase 3 — Indicadores operativos avanzados

### Tarea 3.1
- **taskId:** `aiw-observer-pixel-v2-priority-indicators-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f2-20260326-01`]
- **Descripción:** Implementar indicadores visuales para estados críticos: `TASK_BLOCKED`, `TEST_FAILED`, `INCIDENT_OPENED`.
- **Detalles:**
  - Burbuja de alerta roja parpadeante sobre el personaje en estado bloqueado.
  - Indicador de "prioridad" en el tile del agente (borde de color por severidad).
  - `INCIDENT_OPENED` → todos los agentes involucrados destacados simultáneamente.
- **Acceptance criteria:**
  - Estado bloqueado visible a <1 segundo de lectura visual.
  - No interfiere con animaciones normales de movimiento.
  - Indicador desaparece al recibir `TASK_COMPLETED` o `INCIDENT_RESOLVED`.

### Tarea 3.2
- **taskId:** `aiw-observer-pixel-v2-task-overlay-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f2-20260326-01`]
- **Descripción:** Panel overlay (click en personaje) que muestra tarea activa, `taskId`, `correlationId`, estado MCP y historial reciente.
- **Detalles:**
  - Click en personaje → panel lateral con info operativa.
  - `taskId` y `correlationId` clickeables para copiar.
  - Historial de los últimos N eventos del agente.
  - Botón "Abrir en AgentMonitor web" con link directo al detalle.
- **Acceptance criteria:**
  - Panel se abre en <200ms.
  - `taskId` y `correlationId` siempre presentes cuando el agente tiene tarea activa.
  - Link al AgentMonitor web funciona.
  - Panel se cierra con Escape (keyboard-first).

### Tarea 3.3
- **taskId:** `aiw-documenter-pixel-v2-spec-config-20260326-01`
- **assignedTo:** `Documenter`
- **dependsOn:** [`aiw-observer-pixel-v2-priority-indicators-20260326-01`, `aiw-observer-pixel-v2-task-overlay-20260326-01`]
- **Descripción:** Documentar la configuración completa del adapter: `zcorvus-agents.json`, `zcorvus-office.json`, variables de entorno (URL del MCP server, credenciales si aplica).
- **Acceptance criteria:**
  - README de integración publicado en `docs/zcorvus-integration.md`.
  - Ejemplo de `zcorvus-agents.json` con los 5 agentes.
  - Instrucciones de cambio de URL del MCP server sin recompilar.
  - Registry documental actualizado.

### Tarea 3.4 (gate)
- **taskId:** `aiw-tester-pixel-v2-gate-f3-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-documenter-pixel-v2-spec-config-20260326-01`]
- **Descripción:** Gate de Fase 3: indicadores operativos + overlay + documentación.
- **Acceptance criteria:**
  - Flujo completo: evento bloqueante → indicador visual → click → overlay con detalles → link a AgentMonitor.
  - No regresiones en fases anteriores.
  - `TEST_PASSED` con evidencia.

---

## Fase 4 — Empaquetado, rollout y cierre

### Tarea 4.1
- **taskId:** `aiw-opt-pixel-v2-package-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f3-20260326-01`]
- **Descripción:** Empaquetar la extensión modificada como `.vsix` para distribución interna en el equipo zCorvus.
- **Pasos:**
  ```bash
  npm install -g @vscode/vsce
  vsce package
  # Genera: pixel-agents-zcorvus-x.y.z.vsix
  ```
- **Acceptance criteria:**
  - `.vsix` generado e instalable desde VS Code sin tener el source.
  - Versión interna claramente diferenciada del pixel-agents original.
  - Instrucciones de instalación documentadas.

### Tarea 4.2
- **taskId:** `aiw-documenter-pixel-v2-runbook-20260326-01`
- **assignedTo:** `Documenter`
- **dependsOn:** [`aiw-tester-pixel-v2-gate-f3-20260326-01`]
- **Descripción:** Publicar runbook operativo: cómo instalar, configurar, debuggear y actualizar la extensión zCorvus-pixel.
- **Acceptance criteria:**
  - Runbook cubre: instalación, configuración de URL MCP, troubleshooting (debug view, logs), actualización.
  - Checklist de "extensión sana" para diagnóstico rápido.
  - Registry documental actualizado.

### Tarea 4.3 (gate final + cierre)
- **taskId:** `aiw-orch-pixel-v2-close-epic-20260326-01`
- **assignedTo:** `Orchestrator`
- **dependsOn:** [`aiw-opt-pixel-v2-package-20260326-01`, `aiw-documenter-pixel-v2-runbook-20260326-01`]
- **Descripción:** Cerrar la EPIC, publicar retrospectiva, registrar decisiones técnicas tomadas durante la ejecución.
- **Acceptance criteria:**
  - Extensión `.vsix` distribuida internamente.
  - Runbook publicado y accesible.
  - Decisiones de diseño (especialmente las no obvias del adapter) documentadas.
  - EPIC cerrada con `TASK_COMPLETED` formal.

---

## 5) Grafo de dependencias

```
aiw-orch-pixel-v2-kickoff
  ├─> aiw-opt-pixel-v2-install-validate
  │     └─> aiw-tester-pixel-v2-gate-f0
  └─> aiw-opt-pixel-v2-mcp-audit
        └─> aiw-tester-pixel-v2-gate-f0
              └─> aiw-observer-pixel-v2-adapter-ws
                    └─> aiw-observer-pixel-v2-state-mapper
                          └─> aiw-observer-pixel-v2-agent-registry
                                └─> aiw-tester-pixel-v2-gate-f1
                                      ├─> aiw-observer-pixel-v2-office-layout
                                      │     └─> aiw-opt-pixel-v2-render-audit
                                      └─> aiw-observer-pixel-v2-agent-names
                                            └─> aiw-opt-pixel-v2-render-audit
                                                  └─> aiw-tester-pixel-v2-gate-f2
                                                        ├─> aiw-observer-pixel-v2-priority-indicators
                                                        │     └─> aiw-documenter-pixel-v2-spec-config
                                                        └─> aiw-observer-pixel-v2-task-overlay
                                                              └─> aiw-documenter-pixel-v2-spec-config
                                                                    └─> aiw-tester-pixel-v2-gate-f3
                                                                          ├─> aiw-opt-pixel-v2-package
                                                                          └─> aiw-documenter-pixel-v2-runbook
                                                                                └─> aiw-orch-pixel-v2-close-epic
```

---

## 6) Riesgos específicos (realineados a arquitectura real)

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | El VS Code Webview API impone restricciones de seguridad (CSP) que bloquean la conexión WebSocket al MCP | Media | Alto | Configurar `webviewOptions.retainContextWhenHidden` y revisar CSP en `package.json` del extension host antes de Fase 1 |
| 2 | La API interna de pixel-agents (AgentRegistry, state machine) cambia en una actualización futura | Baja | Medio | Mantener el fork con upstream clearly separated; el adapter debe depender de interfaces, no de implementación |
| 3 | El event loop del canvas se satura con burst de eventos MCP a alta frecuencia | Media | Medio | Throttling en el AgentStateMapper (budget definido en Tarea 2.3) |
| 4 | Los estados MCP de zCorvus no mapean claramente a los estados de pixel-agents en todos los casos | Media | Bajo | El mapping se valida en Tarea 0.3 antes de implementar; estados sin mapping claro → `idle` por defecto |
| 5 | La extensión se desincroniza si el MCP server reinicia | Media | Medio | Reconexión automática con backoff en el adapter (Tarea 1.1); indicador visual de "desconectado" |
| 6 | pixel-agents asume que los agentes son terminales VS Code; el registry puede tener lógica hardcoded de terminal | Baja | Alto | Validar en Tarea 0.2 si el registro es extensible sin parchear el core; si no, crear fork limpio del registry |

---

## 7) Decisiones técnicas que requieren validación en Fase 0

Estas no están resueltas aún — se deben resolver durante Tarea 0.2:

1. **¿El AgentRegistry de pixel-agents es reemplazable limpiamente, o tiene dependencias cruzadas con el JSONL watcher?**
   - Determina si se puede reescribir el registry de forma aislada o si hay que refactorizar más archivos del extension host.

2. **¿El webview puede abrir conexiones WebSocket salientes a URLs arbitrarias bajo las restricciones de CSP?**
   - Revisar `package.json` → headers de CSP del webview. Si no puede, el WebSocket debe abrirse desde el extension host y puentearse al webview via `postMessage`.

3. **¿El state machine de pixel-agents expone una API pública de transición, o hay que inyectar mensajes simulados?**
   - Determina si el AgentStateMapper puede llamar directamente al state machine o si debe simular el formato de mensajes que antes enviaba el JSONL watcher.

---

## 8) KPIs de éxito (adaptados)

### Indicadores de adopción
- Extensión instalada y activa en 100% de las sesiones de trabajo del equipo en <2 semanas post-rollout.
- Tiempo hasta identificar visualmente el agente bloqueado: <=3 segundos desde apertura del panel.

### Indicadores técnicos
- Latencia evento MCP → cambio visual: p95 <= 500ms.
- 0 desconexiones silenciosas del WebSocket (todas detectadas y mostradas visualmente).
- FPS del canvas estable (>= 30 FPS) bajo burst de 200 eventos/min.

### Indicadores operativos
- Reducción de tiempo hasta abrir el AgentMonitor web para investigar: el overlay de Tarea 3.2 debe resolver el 50% de las inspecciones sin salir del panel pixel.

---

## 9) Asignación por agente

| Agente | Tareas |
|---|---|
| **Orchestrator** | 0.1, 4.3 |
| **AI_Workspace_Optimizer** | 0.2, 0.3, 2.3, 4.1 |
| **Observer** | 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2 |
| **Documenter** | 3.3, 4.2 |
| **Tester** | 0.4, 1.4, 2.4, 3.4, 4.3 (co-validador) |

---

## 10) Decisión sobre el AgentMonitor web existente

**El AgentMonitor web NO se reemplaza ni se depreca.** pixel-agents-zcorvus es una capa visual complementaria, no un sustituto.

| Responsabilidad | Herramienta |
|---|---|
| Triage detallado, filtros, timeline, exportes, taskTree profundo | AgentMonitor web (unchanged) |
| Vista ambiental de "qué está haciendo cada agente ahora" | pixel-agents-zcorvus (nueva) |
| Alertas de bloqueo rápidas, navegación por personaje | pixel-agents-zcorvus (nueva) |
| Trazabilidad MCP completa, auditoría | AgentMonitor web (unchanged) |

El link desde el overlay de pixel-agents al AgentMonitor web (Tarea 3.2) cierra el circuito entre las dos vistas.

---

## 10.1) Integración futura opcional: OpenCode como fuente adicional

> Esta sección es **futura y opcional**, no bloquea ninguna fase del plan actual.

OpenCode expone un sistema de plugins con hooks de sesión y acceso a `sessionID`, `messageID` y `agent`. Si en algún momento se quiere que la actividad del operador en OpenCode también aparezca en la oficina pixel (por ejemplo: ver al operador moverse cuando hace una consulta), se puede escribir un plugin OpenCode que emita eventos al MCP server de zCorvus, que los propaga al canvas.

El flujo sería:
```
OpenCode session (plugin hook)
  └─ emite evento al MCP server de zCorvus
        └─ MCP Adapter del fork lo recibe
              └─ canvas refleja la actividad
```

No requiere tocar el fork ni el adapter — solo agregar un plugin OpenCode separado. Se puede planificar como una EPIC aparte cuando el monitor base esté funcionando.

---

## 11) Eventos MCP del ciclo de vida de esta EPIC

Se usan solo tipos del catálogo oficial:

- **Fase 0:** `TASK_ASSIGNED`, `TASK_ACCEPTED`, `TASK_IN_PROGRESS`, `PLAN_PROPOSED`, `TASK_COMPLETED`
- **Fase 1:** `TASK_*`, `ARTIFACT_PUBLISHED` (evidencia de integración)
- **Fase 2:** `TASK_*`, `TEST_PASSED`/`TEST_FAILED`, `ARTIFACT_PUBLISHED`
- **Fase 3:** `TASK_*`, `DOC_UPDATED`, `ARTIFACT_PUBLISHED`
- **Fase 4:** `TASK_*`, `DOC_UPDATED`, `ARTIFACT_PUBLISHED`, `TASK_COMPLETED` (cierre)

Payload mínimo siempre: `taskId`, `assignedTo`, `status`, `correlationId`.

---

## 12) Cierre

Este plan v3 reemplaza completamente a v1 y v2. La diferencia clave respecto a v2 es que el fork **elimina** el JSONL watcher de Claude Code en lugar de coexistir con él, porque la herramienta de desarrollo es OpenCode (que usa SQLite para sesiones, no JSONL). El resultado es un fork más limpio y coherente: una extensión VS Code donde los agentes de zCorvus son los únicos personajes, animados por eventos MCP explícitos en tiempo real, sin código muerto de Claude Code. Una EPIC futura opcional puede agregar un plugin OpenCode que emita actividad del operador al mismo pipeline.
