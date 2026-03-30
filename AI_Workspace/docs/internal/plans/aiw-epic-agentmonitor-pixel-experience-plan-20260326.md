# EPIC Plan — AgentMonitor "Pixel Experience" adaptado a zCorvus (2026-03-26)

## Metadata
- **PlanId:** `aiw-epic-agentmonitor-pixel-experience-plan-20260326`
- **Fecha:** 2026-03-26
- **Planner:** `Planner`
- **CorrelationId propuesto:** `aiw-agentmonitor-pixel-experience-20260326`
- **Estado:** `proposed`
- **Alcance:** Solo planificación (sin implementación de producto en esta tarea)

---

## 0) Metodología aplicada (explícita)

Este plan se construyó aplicando explícitamente:

1. **Learnings de `Agents/Planner/learnings.md`**
   - Regla aplicada: *no planear a ciegas*.
   - Acción ejecutada: inspección real previa de arquitectura, monitor actual, reportes previos y contrato MCP.

2. **Skill `planning-workflow` (`Agents/Planner/skills/planning-workflow/SKILL.md`)**
   - Enfoque usado: plan grande, granular, dependency-aware, con criterios de aceptación por tarea.
   - Principio usado: priorizar calidad de planeación antes de ejecución para reducir retrabajo.

---

## 1) Contexto actual y diagnóstico técnico

## 1.1 Evidencia inspeccionada (estado real)
- `AgentMonitor/index.html`
- `AgentMonitor/styles.css`
- `AgentMonitor/app.js`
- `docs/internal/plans/aiw-agentmonitor-tech-strategy-20260326.md`
- `docs/internal/plans/aiw-agentmonitor-uiux-plan-20260326.md`
- `docs/internal/reports/aiw-observer-agentmonitor-uiux-20260326-01.md`
- `docs/internal/reports/aiw-observer-agentmonitor-overflow-20260326-02.md`
- `architecture.md`
- `MCP_Server/lib/event-contract.js`

## 1.2 Diagnóstico técnico actual

### Fortalezas actuales
- El monitor ya tiene base operativa sólida: timeline, agrupación por tareas, panel de detalle, filtros, shortcuts y WebSocket.
- El flujo MCP y el contrato de estados están definidos y validados.
- Ya hubo mejoras de UX recientes (quick filters, shortcuts, hardening de overflow).

### Límites detectados del enfoque vanilla actual
1. **Monolito de UI en un solo archivo JS**
   - `AgentMonitor/app.js` concentra estado global, fetch, WebSocket, rendering y handlers en una sola unidad grande.
   - Impacto: mantenibilidad baja, alto costo de cambio, acoplamiento transversal.

2. **Render completo por refresco**
   - Ante cada actualización se re-renderizan múltiples secciones completas (`summary`, `critical`, `stage`, `agent boards`, `timeline`, `tasks`).
   - Impacto: costo de render creciente con volumen de eventos/tareas.

3. **Uso intensivo de `innerHTML` + manipulación manual del DOM**
   - Rápido para iterar, pero difícil de testear y de evolucionar con consistencia visual a gran escala.

4. **Debt de diseño sistemático**
   - Hay buen look-and-feel, pero faltan tokens semánticos y modelo componible formal para una experiencia de producto “viva” y extensible.

5. **Riesgo de deriva UX en evolución rápida**
   - Sin un sistema de slices/fases y gates, mejoras visuales pueden romper consistencia operativa o accesibilidad.

### Problemas UX relevantes aún presentes
- Densidad alta y carga cognitiva al escalar volumen de eventos.
- Priorización visual de incidentes aún mejorable para triage inmediato.
- Falta una narrativa visual “estado del sistema” (modo misión) consistente entre paneles.
- Persistencia y continuidad de contexto del operador (sesión de triage) todavía básica.

---

## 2) Objetivo de la EPIC y visión UX/operativa

## 2.1 Objetivo EPIC
Transformar AgentMonitor hacia una experiencia tipo **“pixel-agents command center”** adaptada a zCorvus: más legible, más accionable y más robusta bajo carga, **sin romper el flujo MCP ni el contrato actual**.

## 2.2 Visión UX/operativa
- **Pixel-agents adaptado** = identidad visual táctica (energía “arcade/control room”), pero enfocada en productividad real de operación.
- **Triage first**: lo crítico aparece primero y con rutas de acción en 1-2 clics/teclas.
- **MCP-native**: toda interacción debe respetar lifecycle de tareas (`assigned -> accepted -> in_progress -> terminal`) y trazabilidad por `taskId/correlationId`.
- **Operator flow continuo**: detectar → aislar → inspeccionar → decidir → exportar evidencia.

---

## 3) Principios de arquitectura y decisión tecnológica por fases

## 3.1 Principios
1. **Contrato primero:** no romper `/api/events`, `/ws`, ni semántica de eventos MCP.
2. **Separación por slices UI:** desacoplar visual, estado de vista y pipeline de datos.
3. **Entrega incremental con feature flags:** sin big-bang.
4. **Performance presupuestada:** cada fase define budget y métricas.
5. **A11y y keyboard-first:** cualquier mejora visual debe conservar operación por teclado.
6. **Observabilidad de la observabilidad:** medir render, latencia visual y salud de stream.

## 3.2 Decisión tecnológica por fases
- **Fase A (inmediata):** consolidar hardening sobre base actual para estabilizar operación.
- **Fase B (transición):** construir capa “Pixel Experience” por slices, con aislamiento progresivo de rendering.
- **Fase C (convergencia):** decidir cutover final según KPIs y riesgo.

> Nota de decisión: este plan prepara tanto evolución incremental sobre monitor actual como un camino limpio para futura convergencia de stack, sin bloquear operación presente.

---

## 4) Backlog detallado por fases (tareas atómicas)

## Fase 0 — Program kickoff, baseline y guardrails

### Tarea 1
- **taskId:** `aiw-orch-agentmonitor-pixel-program-20260326-01`
- **assignedTo:** `Orchestrator`
- **dependsOn:** `[]`
- **Descripción:** Abrir programa EPIC, validar alcance, prioridades, constraints y secuencia oficial de ejecución.
- **Acceptance criteria:**
  - Se publica kickoff oficial con `correlationId` único.
  - Se emiten tareas iniciales a Optimizer/Observer/Documenter/Tester con dependencias explícitas.
  - Se define política de rollback por fase.

### Tarea 2
- **taskId:** `aiw-opt-agentmonitor-pixel-baseline-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-orch-agentmonitor-pixel-program-20260326-01`]
- **Descripción:** Levantar baseline técnico-operativo (render, refresh, carga de eventos, tiempos de triage y puntos de saturación).
- **Acceptance criteria:**
  - Baseline cuantificado (p50/p95) y documentado.
  - Lista de hotspots de costo de render con evidencia.
  - Recomendaciones priorizadas P1/P2/P3 para Observer.

### Tarea 3
- **taskId:** `aiw-documenter-agentmonitor-pixel-spec-20260326-01`
- **assignedTo:** `Documenter`
- **dependsOn:** [`aiw-opt-agentmonitor-pixel-baseline-20260326-01`]
- **Descripción:** Crear spec de experiencia “pixel-agents zCorvus” (principios visuales, interacción, semántica de estados, anti-patterns).
- **Acceptance criteria:**
  - Spec publicada en `docs/internal/specs/`.
  - Registro actualizado en `docs/internal/registry/docs_registry.jsonl`.
  - `DOC_UPDATED` + `TASK_COMPLETED` emitidos.

## Fase 1 — Pixel foundation (visual + IA de triage)

### Tarea 4
- **taskId:** `aiw-observer-agentmonitor-pixel-shell-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-documenter-agentmonitor-pixel-spec-20260326-01`]
- **Descripción:** Implementar shell visual Pixel Experience (layout, jerarquía y estados primarios) sin alterar contratos MCP.
- **Acceptance criteria:**
  - No regresiones en navegación actual.
  - Estados críticos/activos/estables visualmente distinguibles en <1s de lectura.
  - Sin overflow en breakpoints definidos.

### Tarea 5
- **taskId:** `aiw-observer-agentmonitor-pixel-priority-lane-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-observer-agentmonitor-pixel-shell-20260326-01`]
- **Descripción:** Crear “Priority Lane” para incidentes/bloqueos con prioridad operacional.
- **Acceptance criteria:**
  - `TASK_BLOCKED`, `TEST_FAILED`, `INCIDENT_OPENED` aparecen en carril prioritario.
  - Atajos de salto directo desde carril a detalle.
  - Regla de deduplicación visual para evitar ruido.

### Tarea 6
- **taskId:** `aiw-observer-agentmonitor-pixel-agent-cards-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-observer-agentmonitor-pixel-shell-20260326-01`]
- **Descripción:** Evolucionar tarjetas de agentes a modo “operational avatar cards” con estado, carga y riesgo.
- **Acceptance criteria:**
  - Cada card muestra estado actual + tendencia reciente.
  - Se mantiene accesibilidad y operación por teclado.
  - Render estable bajo burst de eventos.

### Tarea 7 (gate)
- **taskId:** `aiw-tester-agentmonitor-pixel-gate-f1-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-observer-agentmonitor-pixel-priority-lane-20260326-01`, `aiw-observer-agentmonitor-pixel-agent-cards-20260326-01`]
- **Descripción:** Validar gate de Fase 1 (funcional, visual, accesibilidad, regresión operativa).
- **Acceptance criteria:**
  - Suite de smoke funcional pasa.
  - Reporte de no-regresión en filtros, shortcuts y detalle.
  - Emite `TEST_PASSED` o `TEST_FAILED` con evidencia reproducible.

## Fase 2 — Timeline y TaskTree de alta escala

### Tarea 8
- **taskId:** `aiw-observer-agentmonitor-pixel-timeline-scale-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-agentmonitor-pixel-gate-f1-20260326-01`]
- **Descripción:** Optimizar timeline para alto volumen (windowing, agrupación temporal, prioridad visual).
- **Acceptance criteria:**
  - Scroll y navegación fluidos en datasets grandes.
  - Agrupación por relevancia sin perder trazabilidad original.
  - Delta visual claro entre eventos nuevos y leídos.

### Tarea 9
- **taskId:** `aiw-observer-agentmonitor-pixel-tasktree-ops-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-agentmonitor-pixel-gate-f1-20260326-01`]
- **Descripción:** Reforzar TaskTree para operación (profundidad controlada, foco en terminales, dependencias legibles).
- **Acceptance criteria:**
  - Árvore no desborda en mobile/tablet/desktop.
  - Dependencias y bloqueos visibles sin expandir todo.
  - Persistencia de colapsado por sesión.

### Tarea 10
- **taskId:** `aiw-opt-agentmonitor-pixel-render-budget-20260326-01`
- **assignedTo:** `AI_Workspace_Optimizer`
- **dependsOn:** [`aiw-observer-agentmonitor-pixel-timeline-scale-20260326-01`, `aiw-observer-agentmonitor-pixel-tasktree-ops-20260326-01`]
- **Descripción:** Definir y validar budgets de render/actualización; instrumentar métricas de eficiencia.
- **Acceptance criteria:**
  - Budget de render definido y medido.
  - Alertas de degradación documentadas.
  - Recomendaciones de tuning para fase siguiente.

### Tarea 11 (gate)
- **taskId:** `aiw-tester-agentmonitor-pixel-gate-f2-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-opt-agentmonitor-pixel-render-budget-20260326-01`]
- **Descripción:** Gate Fase 2 (escala + resiliencia + UX crítica).
- **Acceptance criteria:**
  - Pruebas de carga visual sin degradación crítica.
  - Pruebas de reconexión WS y refresh validadas.
  - Resultado formal publicado.

## Fase 3 — Inspector táctico, exportes y runbooks

### Tarea 12
- **taskId:** `aiw-observer-agentmonitor-pixel-inspector-20260326-01`
- **assignedTo:** `Observer`
- **dependsOn:** [`aiw-tester-agentmonitor-pixel-gate-f2-20260326-01`]
- **Descripción:** Evolucionar inspector (resumen táctico, historial contextual, JSON operativo accionable).
- **Acceptance criteria:**
  - Inspector resume “qué pasó / qué hacer ahora”.
  - Navegación entre evento↔tarea↔agente consistente.
  - Exportes coherentes con estado filtrado.

### Tarea 13
- **taskId:** `aiw-documenter-agentmonitor-pixel-runbook-20260326-01`
- **assignedTo:** `Documenter`
- **dependsOn:** [`aiw-observer-agentmonitor-pixel-inspector-20260326-01`]
- **Descripción:** Publicar runbook operativo y guía visual de uso de Pixel Experience.
- **Acceptance criteria:**
  - Runbook con escenarios de triage y respuesta.
  - Checklist de operación por incidente.
  - Registry documental actualizado.

### Tarea 14 (gate)
- **taskId:** `aiw-tester-agentmonitor-pixel-gate-f3-20260326-01`
- **assignedTo:** `Tester`
- **dependsOn:** [`aiw-documenter-agentmonitor-pixel-runbook-20260326-01`]
- **Descripción:** Gate final de paridad operativa + regresión.
- **Acceptance criteria:**
  - Flujo completo detect→isolate→inspect→report validado.
  - No regresión de contratos MCP ni semántica de estados.
  - Informe final de QA emitido.

## Fase 4 — Rollout y cierre de EPIC

### Tarea 15
- **taskId:** `aiw-orch-agentmonitor-pixel-rollout-20260326-01`
- **assignedTo:** `Orchestrator`
- **dependsOn:** [`aiw-tester-agentmonitor-pixel-gate-f3-20260326-01`]
- **Descripción:** Ejecutar rollout progresivo (10%→50%→100%) con criterio de stop/continue.
- **Acceptance criteria:**
  - Plan de despliegue por etapas aprobado.
  - Monitoreo de incidentes activo durante ventana de rollout.
  - Decisión de corte final documentada.

### Tarea 16
- **taskId:** `aiw-orch-agentmonitor-pixel-rollback-drill-20260326-01`
- **assignedTo:** `Orchestrator`
- **dependsOn:** [`aiw-orch-agentmonitor-pixel-rollout-20260326-01`]
- **Descripción:** Ejecutar simulacro de rollback y registrar tiempos/impacto.
- **Acceptance criteria:**
  - Drill documentado con tiempo real de reversión.
  - Condiciones de activación de rollback validadas.
  - Cierre formal de EPIC publicado.

---

## 5) Dependencias entre tareas (grafo textual)

- `aiw-orch-agentmonitor-pixel-program-20260326-01`
  - -> `aiw-opt-agentmonitor-pixel-baseline-20260326-01`
    - -> `aiw-documenter-agentmonitor-pixel-spec-20260326-01`
      - -> `aiw-observer-agentmonitor-pixel-shell-20260326-01`
        - -> `aiw-observer-agentmonitor-pixel-priority-lane-20260326-01`
        - -> `aiw-observer-agentmonitor-pixel-agent-cards-20260326-01`
          - -> `aiw-tester-agentmonitor-pixel-gate-f1-20260326-01`
            - -> `aiw-observer-agentmonitor-pixel-timeline-scale-20260326-01`
            - -> `aiw-observer-agentmonitor-pixel-tasktree-ops-20260326-01`
              - -> `aiw-opt-agentmonitor-pixel-render-budget-20260326-01`
                - -> `aiw-tester-agentmonitor-pixel-gate-f2-20260326-01`
                  - -> `aiw-observer-agentmonitor-pixel-inspector-20260326-01`
                    - -> `aiw-documenter-agentmonitor-pixel-runbook-20260326-01`
                      - -> `aiw-tester-agentmonitor-pixel-gate-f3-20260326-01`
                        - -> `aiw-orch-agentmonitor-pixel-rollout-20260326-01`
                          - -> `aiw-orch-agentmonitor-pixel-rollback-drill-20260326-01`

---

## 6) Criterios de aceptación por tarea

Se definen en cada tarea del backlog (sección 4). Reglas globales adicionales:
- Toda tarea debe emitir lifecycle MCP completo según contrato.
- Cualquier `TASK_BLOCKED`, `TEST_FAILED` o `INCIDENT_OPENED` debe incluir causa raíz y siguiente acción.
- Ninguna tarea de Observer/Optimizer puede romper endpoints o eventos MCP vigentes.

---

## 7) Riesgos y mitigaciones

1. **Riesgo:** sobrecarga visual por “estilo pixel” que reduzca legibilidad.
   - **Mitigación:** priorizar semántica operacional sobre estética; gate UX con Tester.

2. **Riesgo:** regresión funcional en filtros/shortcuts/detalle.
   - **Mitigación:** gates por fase + smoke suite + checklist de paridad.

3. **Riesgo:** degradación de performance por animaciones o rendering no acotado.
   - **Mitigación:** budgets definidos por Optimizer + pruebas de carga visual.

4. **Riesgo:** ruptura de trazabilidad MCP.
   - **Mitigación:** validación contractual obligatoria; no introducir eventos fuera de catálogo oficial.

5. **Riesgo:** coordinación multiagente incompleta.
   - **Mitigación:** tareas atómicas con `dependsOn`, owner claro y criterios verificables.

---

## 8) Gates de calidad (Tester) y documentación (Documenter)

## 8.1 Quality gates (Tester)
- **Gate F1:** shell + priority lane + agent cards (funcional + a11y + no-regresión).
- **Gate F2:** escala timeline/tasktree + resiliencia websocket.
- **Gate F3:** flujo operacional end-to-end + paridad MCP.

Regla de salida por gate:
- `TEST_PASSED` permite continuar.
- `TEST_FAILED` bloquea fase siguiente y gatilla corrección con `TASK_BLOCKED`/replan.

## 8.2 Documentation gates (Documenter)
- **Doc Gate 1:** spec formal de Pixel Experience antes de construir slices.
- **Doc Gate 2:** runbook operativo final antes de rollout total.
- Ambos gates deben actualizar `docs/internal/registry/docs_registry.jsonl`.

---

## 9) Plan de rollout y rollback

## Rollout propuesto
1. **Canary interno 10%** (operadores clave).
2. **Expansión 50%** tras 24h sin incidentes críticos.
3. **Adopción 100%** tras 72h con KPIs dentro de objetivo.

## Triggers de rollback
- Incremento de incidentes operativos P1/P2 > umbral acordado.
- Tiempos de triage empeoran frente a baseline.
- Fallas recurrentes de reconexión/stream en producción interna.

## Estrategia rollback
- Rollback por feature flag/switch de vista.
- Preservar monitor legado disponible durante toda la ventana de transición.
- Ejecutar rollback drill obligatorio (Tarea 16).

---

## 10) Definición de éxito (KPIs)

## KPIs primarios
- **MTTT (Mean Time To Triage)** de alertas críticas: reducción objetivo >= 30% vs baseline.
- **Clicks/acciones para aislar tarea bloqueada:** reducción objetivo >= 35%.
- **Tiempo de lectura para identificar estado de agente:** <= 2 segundos en prueba operativa.
- **No-regresión de trazabilidad MCP:** 0 rupturas de contrato en gates.

## KPIs secundarios
- Latencia visual de actualización p95 dentro de budget definido por Optimizer.
- Ratio de uso de shortcuts creciente semana a semana.
- Tasa de errores de operación (acciones equivocadas) en descenso.

---

## 11) Propuesta de eventos MCP por fase

> Se usan solo tipos ya oficiales (`architecture.md` + `event-contract.js`).

## Fase 0
- `TASK_ASSIGNED`, `TASK_ACCEPTED`, `TASK_IN_PROGRESS`, `PLAN_PROPOSED`, `DOC_UPDATED`, `TASK_COMPLETED`.

## Fase 1
- `TASK_*` + `UI_COMPONENT_BUILT` para slices visuales y `ARTIFACT_PUBLISHED` para evidencia (capturas/reportes).

## Fase 2
- `TASK_*`, `ARTIFACT_PUBLISHED`, `TEST_PASSED`/`TEST_FAILED`, `INCIDENT_OPENED`/`INCIDENT_RESOLVED`.

## Fase 3
- `TASK_*`, `DOC_UPDATED`, `ARTIFACT_PUBLISHED`, eventos de calidad.

## Fase 4
- `TASK_*`, `ARTIFACT_PUBLISHED` (resultado rollout/rollback drill), `TASK_COMPLETED` de cierre EPIC.

## Reglas de payload recomendadas por fase
- Siempre incluir: `taskId`, `assignedTo`, `status`, `correlationId`.
- Para evidencias: `artifactPaths`.
- Para fallos: `message` + `rootCause` cuando aplique.

---

## 12) Asignación explícita por agente (subtareas concretas)

## AI_Workspace_Optimizer
- `aiw-opt-agentmonitor-pixel-baseline-20260326-01`
- `aiw-opt-agentmonitor-pixel-render-budget-20260326-01`

## Observer
- `aiw-observer-agentmonitor-pixel-shell-20260326-01`
- `aiw-observer-agentmonitor-pixel-priority-lane-20260326-01`
- `aiw-observer-agentmonitor-pixel-agent-cards-20260326-01`
- `aiw-observer-agentmonitor-pixel-timeline-scale-20260326-01`
- `aiw-observer-agentmonitor-pixel-tasktree-ops-20260326-01`
- `aiw-observer-agentmonitor-pixel-inspector-20260326-01`

## Documenter
- `aiw-documenter-agentmonitor-pixel-spec-20260326-01`
- `aiw-documenter-agentmonitor-pixel-runbook-20260326-01`

## Tester
- `aiw-tester-agentmonitor-pixel-gate-f1-20260326-01`
- `aiw-tester-agentmonitor-pixel-gate-f2-20260326-01`
- `aiw-tester-agentmonitor-pixel-gate-f3-20260326-01`

## Orchestrator
- `aiw-orch-agentmonitor-pixel-program-20260326-01`
- `aiw-orch-agentmonitor-pixel-rollout-20260326-01`
- `aiw-orch-agentmonitor-pixel-rollback-drill-20260326-01`

---

## 13) Cierre

Este plan deja la EPIC lista para ejecución por fases, con trazabilidad MCP completa, gates formales de calidad/documentación, y cobertura explícita de los equipos `AI_Workspace_Optimizer`, `Observer`, `Documenter`, `Tester` y `Orchestrator`.