# Token & Context Optimization - Plan de EPIC

**correlationId:** aiw-token-context-optimization-20260331  
**taskId:** aiw-planner-token-context-plan-20260331-01  
**revisionTaskId:** aiw-planner-token-context-review-20260331-02  
**latestRevisionTaskId:** aiw-planner-token-context-review-20260331-07  
**Creado:** 2026-03-31  
**Estado:** PLAN_PROPOSED
**ApprovalState:** Baseline aprobado para ejecucion; el polish restante es no bloqueante.

## Objetivo real del EPIC

Este EPIC no debe limitarse a "bajar tokens". El objetivo real es doble:

1. **Reducir costo de contexto** para el equipo multi-agente.
2. **Mejorar claridad operativa** para que cada agente entienda rapido que pasa sin leer ventanas grandes de eventos.

La optimizacion correcta no es solo compresion. Es pasar de un modelo de consumo basado en
`leer eventos recientes por tiempo` a uno basado en `pedir snapshots compactos y relevantes`.

---

## Evidencia inspeccionada

### Artefactos revisados
- `AI_Workspace/docs/internal/reports/aiw-optimizer-token-context-research-20260331.md`
- `AI_Workspace/scripts/context-token-baseline.mjs`
- `AI_Workspace/docs/internal/plans/aiw-token-context-optimization-plan-20260331.md` (version anterior)
- `recomendacion.jsonl`
- `AI_Workspace/Agents/Orchestrator/profile.md`
- `AI_Workspace/Agents/Planner/profile.md`
- `AI_Workspace/Agents/Backend/profile.md`
- `AI_Workspace/Agents/Frontend/profile.md`
- `AI_Workspace/Agents/Tester/profile.md`
- `AI_Workspace/Agents/Observer/profile.md`
- `AI_Workspace/Agents/Documenter/profile.md`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/profile.md`

### Hallazgos medidos
- `shared_context.jsonl`: **626,266 bytes**, ~**156,567 tokens**, **726** eventos.
- `get_events` estilo `limit=50`: ~**13,340 tokens**.
- `/api/events?limit=50`: ~**27,611 tokens**.
- Amplificacion de `/api/events` vs eventos solos: **2.07x**.
- Dedupe de campos canonicos: ahorro potencial **22.99%**.
- Compactacion latest-per-task: ahorro potencial **76.57%**.

### Hallazgos adicionales no cubiertos suficientemente por el plan anterior
- Los perfiles base de varios agentes arrancan con `get_events(... limit: 20)` como intake por defecto.
- Eso significa que el equipo sigue consultando por **ventana temporal** antes de consultar por **relevancia**.
- El bus MCP se esta usando a veces como canal de reporte largo. Hay mensajes de hasta **972 chars** en `shared_context.jsonl`, lo cual consume contexto y empeora legibilidad.
- El plan anterior estaba demasiado cargado hacia `Backend`, pero esta iniciativa afecta principalmente al **AI Workspace interno**; por reglas del sistema, debe priorizarse `AI_Workspace_Optimizer` como ejecutor principal.
- Faltaba un workstream explicito para **cambiar reglas en los perfiles de agentes**, que es una de las palancas mas fuertes para bajar consumo real.

---

## Diagnostico del plan anterior

El plan anterior tenia una base correcta, pero le faltaban cinco piezas criticas:

1. **Ownership incorrecto:** demasiadas tareas en `Backend` para un cambio interno del workspace.
2. **Sin profile governance:** no incluia actualizacion coordinada de `profile.md` en todos los agentes.
3. **Sin event hygiene:** no atacaba mensajes largos ni la idea de usar eventos como reportes extensos.
4. **Sin agent-friendly retrieval views:** reducia bytes, pero no resolvia del todo "como sabe rapido un agente que esta pasando".
5. **KPIs incompletos:** media costo, pero no calidad del contexto ni facilidad de intake.

---

## Principios de diseno

1. **Source of truth vs working views**
   - `shared_context.jsonl` sigue siendo historial canonico.
   - Los agentes no deben leerlo completo ni simularlo con ventanas amplias.

2. **Summary-first, expansion-on-demand**
   - Primero snapshot compacto.
   - Despues expansion por `taskId`, `correlationId` o modo debug.

3. **Eventos cortos, artefactos ricos**
   - El evento debe responder: que paso, estado, siguiente paso.
   - Si hace falta detalle largo, va a reporte/artefacto y se referencia en `artifactPaths`.

4. **Relevancia antes que recencia**
   - Un agente debe preguntar primero por su inbox, su tarea o su correlacion.
   - La lectura por "ultimos N eventos" queda como fallback, no como rutina.

5. **Compatibilidad progresiva**
   - Todo cambio debe tener rollout gradual y fallback claro para lectores legacy.

---

## KPIs del EPIC

### Cost KPIs

| KPI | Baseline | Objetivo |
|-----|----------|----------|
| `/api/events` tokens (`limit=50`) | ~27,611 | <15,000 (-45%) |
| `get_events` tokens (`limit=50`) | ~13,340 | <10,000 (-25%) |
| `shared_context.jsonl` token mass | ~156,567 | <120,000 (-23%) |
| Mensaje MCP promedio | TBD (medir en Fase 0) | <160 chars |

### Context Quality KPIs

| KPI | Baseline | Objetivo |
|-----|----------|----------|
| Query de intake por agente | hoy broad `limit:20` | snapshot-first en >90% de casos |
| Eventos leidos para empezar tarea | TBD | <=8 eventos equivalentes |
| Snapshot de tarea | no existe como contrato | disponible en 100% de tareas activas |
| Snapshot de correlacion | no existe como contrato | disponible en 100% de epics activas |
| Snapshots suficientes sin expansion | TBD | >=80% |
| Handoffs que permiten continuar sin leer eventos | TBD | >=85% |
| Tareas que requieren fallback a broad scan | TBD | <10% |
| Snapshot stale rate | TBD | <2% |
| Legacy mode hit rate | TBD | 0% antes del cierre final |
| Profile conformance rate | TBD | 100% |
| Snapshot rebuild success rate | TBD | >=99% |
| Snapshot conflict rate | TBD | <0.5% |
| Sidecar partial write incidents | TBD | 0 |
| Wave rollout incidents | TBD | 0 criticos por wave |
| Alert ack time | TBD | <15m |
| Handoff corto por tarea cerrada | inconsistente | 100% |
| Latencia promedio de lectura compacta | TBD | <500ms |

---

## Skills actuales relevantes

### Instaladas localmente en el workspace

**AI_Workspace_Optimizer**
- `prompt-engineering-patterns`
- `cost-optimization`
- `distributed-tracing`
- `task-coordination-strategies`

**Backend**
- `nodejs-best-practices`
- `nodejs-backend-patterns`

**Tester**
- `playwright-testing`
- `systematic-debugging`
- `test-driven-development`

**Observer**
- `observability-design-patterns`
- `layout-overflow-guardrails`

**Documenter**
- `api-reference-documentation`

---

## Skills externas candidatas a validar

Estas skills son **candidatas**. Los installs, stars o popularidad sirven como señal inicial, pero **no equivalen a aprobación técnica** para este workspace. Antes de adoptarlas, se debe validar calidad real sobre snapshots, handoffs y seguridad semántica.

**Nota operativa del workspace:** no instalar globalmente por defecto. Primero definir qué agente la usaría y luego instalar/copiar en `AI_Workspace/Agents/{AgentName}/skills/`.

### Prioridad alta para piloto controlado

1. **Memory compaction / merge de contexto**
   - Skill: `github/awesome-copilot@memory-merger`
   - **Agente asignado para piloto:** `AI_Workspace_Optimizer`
   - **Agente secundario (consumo):** `Documenter`
   - **Ruta de instalación objetivo:** `AI_Workspace/Agents/AI_Workspace_Optimizer/skills/` (y opcionalmente `AI_Workspace/Agents/Documenter/skills/`)
   - Senales externas: **9.4K installs**, repo `github/awesome-copilot` con **27.9k stars**.
   - Uso esperado: consolidar memoria, snapshots y handoffs sin perder señal.
   - Comando candidato:

```bash
npx skills add github/awesome-copilot@memory-merger
```

2. **Memory safety / reglas para no contaminar contexto**
   - Skill: `wshobson/agents@memory-safety-patterns`
   - **Agente asignado para piloto:** `AI_Workspace_Optimizer`
   - **Agente secundario (gobernanza):** `Orchestrator`
   - **Ruta de instalación objetivo:** `AI_Workspace/Agents/AI_Workspace_Optimizer/skills/` (y opcionalmente `AI_Workspace/Agents/Orchestrator/skills/`)
   - Senales externas: **4.2K installs**, repo `wshobson/agents` con **32.6k stars**.
   - Uso esperado: definir que resumir, que no resumir, y como evitar snapshots engañosos.
   - Comando candidato:

```bash
npx skills add wshobson/agents@memory-safety-patterns
```

### Opcionales / piloto controlado

3. **Context engineering collection**
   - Skill: `muratcankoylan/agent-skills-for-context-engineering@context-engineering-collection`
   - **Agente asignado para piloto:** `AI_Workspace_Optimizer`
   - **Agente secundario (validación):** `Planner`
   - **Ruta de instalación objetivo:** `AI_Workspace/Agents/AI_Workspace_Optimizer/skills/`
   - Senales externas: **727 installs**.
   - Uso esperado: patrones de diseño de contexto y retrieval discipline.
   - Recomendacion: instalar solo en piloto.

```bash
npx skills add muratcankoylan/agent-skills-for-context-engineering@context-engineering-collection
```

4. **Context compression**
   - Skill: `sickn33/antigravity-awesome-skills@context-compression`
   - **Agente asignado para piloto:** `AI_Workspace_Optimizer`
   - **Agente secundario (QA de riesgo):** `Tester`
   - **Ruta de instalación objetivo:** `AI_Workspace/Agents/AI_Workspace_Optimizer/skills/`
   - Senales externas: **410 installs**.
   - Uso esperado: compresion segura de sesiones extensas.
   - Recomendacion: instalar solo en piloto y validar calidad antes de generalizar.

```bash
npx skills add sickn33/antigravity-awesome-skills@context-compression
```

5. **Summarization**
   - Skill: `jwynia/agent-skills@summarization`
   - **Agente asignado para piloto:** `Documenter`
   - **Agente secundario (aplicación técnica):** `AI_Workspace_Optimizer`
   - **Ruta de instalación objetivo:** `AI_Workspace/Agents/Documenter/skills/` (y opcionalmente `AI_Workspace/Agents/AI_Workspace_Optimizer/skills/`)
   - Senales externas: **333 installs**, repo con **42 stars**.
   - Uso esperado: resumir handoffs y snapshots en formato corto y consistente.
   - Recomendacion: opcional; util para `TCO-10` y `TCO-14`, pero validar calidad antes de estandarizar.

```bash
npx skills add jwynia/agent-skills@summarization
```

### Politica de adopcion de skills externas

**Asignación operativa para esta EPIC (obligatoria):**
- `AI_Workspace_Optimizer`: owner de evaluación técnica e instalación piloto de `memory-merger`, `memory-safety-patterns`, `context-engineering-collection`, `context-compression`.
- `Documenter`: owner de `summarization` y validación de calidad de handoffs/documentación.
- `Tester`: gate de calidad para todas las skills externas (debe emitir `TEST_PASSED` antes de adopción general).
- `Orchestrator`: decide adopción final o rollback por skill según evidencia de piloto.

- Ninguna tarea critica del EPIC puede depender de una skill externa no validada.
- Toda skill externa se trata como piloto optativo, no como prerequisito de exito.
- Cada piloto debe tener owner, checklist de validacion y criterio de rollback.
- Si una skill externa falla o no aporta valor, el plan debe seguir siendo ejecutable solo con capacidades locales.

---

## Canonical values minimos

| Campo | Valores canonicos | Nota |
|-------|-------------------|------|
| `status` | `pending`, `accepted`, `in_progress`, `blocked`, `completed`, `failed`, `cancelled` | para tareas, snapshots y handoffs |
| `priority` | `low`, `medium`, `high`, `critical` | usar `critical` solo cuando afecta rollout o incidentes severos |
| `decisionSafety` | `safe_for_triage`, `read_only`, `requires_expansion` | evita interpretaciones distintas de `stale`/`degradedMode` |
| `operationalSeverity` | `info`, `warning`, `medium`, `high`, `critical` | usar en alertas, incidentes y abort thresholds |
| `latestEventType` | valor valido del contrato MCP | referenciar `AI_Workspace/docs/api/mcp-events-schema.md` |

### Incident severity taxonomy

| Severidad | Uso esperado | Impacto de rollout |
|-----------|--------------|--------------------|
| `info` | señal informativa sin accion inmediata | no bloquea wave |
| `warning` | degradacion menor o tendencia a desvio | monitorear |
| `medium` | issue operativo con workaround claro | cuenta para incident threshold |
| `high` | degradacion seria, riesgo de drift o fallback frecuente | evaluar rollback de wave |
| `critical` | corrupcion, conflicto severo o riesgo de decisiones incorrectas | abort/freeze inmediato |

---

## Reglas globales propuestas para todos los perfiles de agentes

Estas reglas deben agregarse a todos los `profile.md` principales:

1. **Orden obligatorio de consulta de contexto**
   - `agent inbox` -> `task snapshot` -> `correlation snapshot` -> expansion puntual.

2. **Limites por defecto**
   - Intake: `limit 5`
   - Triage/debug normal: `limit 10`
   - `limit 20+` solo con justificacion explicita de debugging profundo.

3. **No usar broad reads por defecto**
   - No consultar `/api/events` ni `get_events` amplios sin `taskId`, `correlationId`, `assignedTo` o un intent claro.

4. **Message budget**
   - `message` ideal <= 160 chars.
   - Si el detalle excede ese tamaño, escribir reporte/artefacto y publicar evento corto con `artifactPaths`.

5. **Stop when decision-ready**
   - El agente debe detener lecturas adicionales cuando ya puede aceptar, bloquear o ejecutar la tarea.

6. **Handoff corto estandar**
   - En cierres y fallos, resumir en una linea: resultado, bloqueo o siguiente paso.

7. **No usar shared_context como reporte humano**
   - El JSONL es un bus de estado, no una bitacora narrativa extensa.

---

## Snapshot Schemas minimos (v1)

Estos schemas minimos deben quedar formalizados por `TCO-01`. El objetivo es evitar que cada consumidor interprete un snapshot distinto.

### `get_agent_inbox`

```json
{
  "view": "agent_inbox",
  "schemaVersion": "v1",
  "generatedAt": "2026-03-31T17:00:00.000Z",
  "buildVersion": "snapshot-generator@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "223d6384-4bf4-4f5f-aa05-de6026f23edf",
  "sourceWatermark": "jsonl:742",
  "integrityHash": "sha256:abc123",
  "rebuiltAt": "2026-03-31T17:00:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "agent": "Planner",
  "openTaskCount": 2,
  "blockedTaskCount": 0,
  "needsAttentionCount": 1,
  "tasks": [
    {
      "taskId": "aiw-planner-token-context-plan-20260331-01",
      "correlationId": "aiw-token-context-optimization-20260331",
      "status": "in_progress",
      "priority": "high",
      "latestEventType": "TASK_IN_PROGRESS",
      "latestSummary": "Actualizando plan con schema explicito de snapshots",
      "updatedAt": "2026-03-31T17:00:00.000Z",
      "nextAction": "Modificar plan",
      "artifactPaths": []
    }
  ],
  "truncated": false
}
```

### `get_task_snapshot`

```json
{
  "view": "task_snapshot",
  "schemaVersion": "v1",
  "generatedAt": "2026-03-31T17:00:00.000Z",
  "buildVersion": "snapshot-generator@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "223d6384-4bf4-4f5f-aa05-de6026f23edf",
  "sourceWatermark": "jsonl:742",
  "integrityHash": "sha256:def456",
  "rebuiltAt": "2026-03-31T17:00:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "task": {
    "taskId": "aiw-planner-token-context-plan-20260331-01",
    "correlationId": "aiw-token-context-optimization-20260331",
    "assignedTo": "Planner",
    "status": "in_progress",
    "priority": "high",
    "parentTaskId": null,
    "dependsOn": ["aiw-opt-token-context-research-20260331-01"],
    "description": "Planificar EPIC de optimizacion de tokens/contexto",
    "acceptanceCriteria": ["Plan versionado", "KPIs definidos"],
    "latestEventType": "TASK_IN_PROGRESS",
    "latestSummary": "Actualizando contrato de snapshots",
    "updatedAt": "2026-03-31T17:00:00.000Z",
    "blockers": [],
    "nextAction": "Publicar revision del plan",
    "artifactPaths": ["AI_Workspace/docs/internal/plans/aiw-token-context-optimization-plan-20260331.md"]
  },
  "truncated": false
}
```

### `get_correlation_snapshot`

```json
{
  "view": "correlation_snapshot",
  "schemaVersion": "v1",
  "generatedAt": "2026-03-31T17:00:00.000Z",
  "buildVersion": "snapshot-generator@1.0.0",
  "maxAgeMs": 5000,
  "sourceEventId": "223d6384-4bf4-4f5f-aa05-de6026f23edf",
  "sourceWatermark": "jsonl:742",
  "integrityHash": "sha256:ghi789",
  "rebuiltAt": "2026-03-31T17:00:00.000Z",
  "stale": false,
  "degradedMode": false,
  "decisionSafety": "safe_for_triage",
  "correlationId": "aiw-token-context-optimization-20260331",
  "overallStatus": "in_progress",
  "activeTaskCount": 3,
  "blockedTaskCount": 0,
  "lastUpdatedAt": "2026-03-31T17:00:00.000Z",
  "criticalUpdates": [
    {
      "taskId": "aiw-planner-token-context-plan-20260331-01",
      "status": "in_progress",
      "summary": "Contrato de snapshots en revision"
    }
  ],
  "tasks": [
    {
      "taskId": "TCO-01",
      "assignedTo": "AI_Workspace_Optimizer",
      "status": "pending",
      "latestSummary": "Definir snapshot contract",
      "updatedAt": "2026-03-31T17:00:00.000Z"
    }
  ],
  "truncated": false
}
```

### Reglas del contrato

- `schemaVersion` es obligatorio en todas las vistas.
- `latestSummary` debe ser corto y operativo; no reemplaza artefactos largos.
- `truncated=true` obliga a ofrecer expansion on-demand.
- `maxAgeMs`, `sourceEventId`, `sourceWatermark`, `rebuiltAt` y `stale` son obligatorios en snapshots sidecar-driven.
- `buildVersion`, `integrityHash` y `degradedMode` son obligatorios para trazabilidad operativa.
- `decisionSafety` debe indicar si el snapshot sirve para triage, solo lectura o si requiere expansion.
- `sourceEventId` o un offset equivalente debe permitir rastrear el ultimo evento incluido en el snapshot.
- `sourceWatermark` debe ser monotono y servir para detectar drift o lecturas atrasadas.
- `integrityHash` permite detectar truncado, corrupcion o escritura parcial del snapshot.
- `degradedMode=true` indica que el snapshot fue construido con fallback parcial y no debe tratarse como equivalente a modo normal.
- Si `stale=true`, el consumidor debe considerar expansion o rebuild antes de tomar decisiones sensibles.
- Ningun snapshot debe depender de arrays de eventos completos para ser util.

### Guardrails minimos de redaccion

- No incluir secretos, credenciales, tokens, keys ni rutas sensibles no necesarias.
- No incrustar prompts largos, instrucciones completas de agentes ni tool outputs extensos.
- No copiar excepciones o logs completos si basta un resumen operativo + `artifactPaths`.
- No propagar texto no sanitizado que pueda contaminar handoffs posteriores.
- Cuando un dato sea sensible pero operativo, usar resumen/redaccion en vez de copia literal.

### Conflict Resolution Rules

- Si snapshot y `shared_context.jsonl` discrepan, `shared_context.jsonl` prevalece.
- Si `stale=true` y la accion es sensible, forzar expansion o rebuild antes de continuar.
- Si `stale=true` y la accion no es sensible, se permite lectura con aviso explicito.
- Todo mismatch confirmado entre snapshot y source of truth debe emitirse como evento o metrica operativa.

### Degraded Mode Decision Matrix

| Estado | `decisionSafety` sugerido | allow_read_only | allow_triage | allow_writeback | force_rebuild | force_jsonl_expansion |
|--------|---------------------------|-----------------|--------------|-----------------|---------------|-----------------------|
| `normal` | `safe_for_triage` | si | si | si, si no hay otros bloqueos | no | no |
| `stale` | `read_only` | si | si, con aviso | no | solo si cruza `maxAgeMs` critico o la accion es sensible | si la accion es sensible |
| `degraded` | `read_only` | si | limitado | no | si | si |
| `stale+degraded` | `requires_expansion` | si, solo informativo | no | no | si | si |

---

## Feature flags / kill switches requeridos

El proyecto ya usa flags operativos en otras areas; este EPIC debe seguir el mismo patron.

| Flag | Default esperado | Apaga / controla |
|------|------------------|------------------|
| `MCP_CONTEXT_SIDECARS_ENABLED` | `true` | sidecars `latest_by_task`, `latest_by_correlation`, `open_by_agent` |
| `MCP_CONTEXT_RELEVANCE_READS_ENABLED` | `true` | vistas `get_agent_inbox`, `get_task_snapshot`, `get_correlation_snapshot` |
| `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED` | `true` | truncado y budgets de respuestas compactas |
| `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED` | `false` al inicio | enforcement duro sobre mensajes largos |
| `MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED` | `true` | resumenes automaticos por tarea/correlacion |
| `MCP_CONTEXT_LEGACY_PAYLOAD_MODE` | `false` | compatibilidad temporal con payloads legacy duplicados |

### Rollout recomendado por olas

- **Wave 1:** `Planner` + `AI_Workspace_Optimizer`
- **Wave 2:** `Observer` + `Documenter`
- **Wave 3:** `Backend` + `Tester` + `Frontend` + `Orchestrator`

### Wave Exit Criteria

| Wave | Exit when |
|------|-----------|
| 1 | `profile conformance rate = 100%` en Planner y Optimizer, `snapshot stale rate` dentro de objetivo y `0` incidentes criticos durante la ventana definida |
| 2 | Observer y Documenter operan snapshot-first sin broad reads rutinarios y `AgentMonitor` consume vistas compactas establemente |
| 3 | `legacy mode hit rate = 0%` en staging y `fallback a broad scan` por debajo del target |

### Wave Canary Policy & Abort Thresholds

| Wave | Alcance inicial | Observacion minima | Incident threshold | Rollback threshold | Owner de avance |
|------|-----------------|--------------------|--------------------|--------------------|-----------------|
| 1 | Planner + Optimizer en tareas internas no criticas | 1 dia operativo | 1 incidente medio | 1 incidente critico | AI_Workspace_Optimizer |
| 2 | Observer + Documenter + AgentMonitor compacto | 2 dias operativos | 2 incidentes medios | 1 incidente critico o stale spike sostenido | Observer |
| 3 | Backend + Tester + Frontend + Orchestrator en staging | 2 dias operativos + ventana estable | 2 incidentes medios | `legacy mode hit rate > 0` sostenido o cualquier corrupcion de sidecar | Orchestrator |

### Per-View Budget Table (v1 inicial)

Estos valores se congelan y validan formalmente en `TCO-11A`.

| Vista / output | `targetBudget` | `hardBudget` | Al exceder `targetBudget` | Al exceder `hardBudget` |
|----------------|----------------|--------------|---------------------------|-------------------------|
| `get_agent_inbox` | 1200 tokens | 1800 tokens | compactar `tasks[]` y priorizar `needsAttention` | truncar + `truncated=true` |
| `get_task_snapshot` | 1600 tokens | 2400 tokens | compactar `acceptanceCriteria` y block details | truncar + forzar expansion on-demand |
| `get_correlation_snapshot` | 2200 tokens | 3200 tokens | reducir `tasks[]` a criticos/activos | truncar + fallback a expansion por task |
| `get_recent_failures` | 1000 tokens | 1500 tokens | limitar a eventos criticos recientes | truncar + pedir filtros mas especificos |
| `handoff summary` | 250 tokens | 400 tokens | resumir a resultado/bloqueo/siguiente paso | rechazar writeback largo y mover detalle a artefacto |

### SLO / Alerting thresholds iniciales

| Signal | Warning | Critical |
|--------|---------|----------|
| `snapshot_stale_rate` | >1% | >2% |
| `snapshot_rebuild_success_rate` | <99.5% | <99% |
| `legacy_mode_hit_rate` | >0 en staging tras ventana estable | >0 sostenido durante una ventana completa |
| `alert_ack_time` | >10m | >15m |

### Default temporal windows

| Control | Default inicial |
|---------|------------------|
| Ventana estable para salida de legacy en staging | 3 dias operativos |
| Chequeo de salud / watermark de sidecars | cada 5 minutos |
| Ventana minima de observacion por wave | la definida en `Wave Canary Policy & Abort Thresholds` |
| Reevaluacion tras sidecar corrupto o mismatch confirmado | inmediata + monitoreo reforzado durante 1 hora |

### CI fixture layout recomendado

```text
AI_Workspace/tests/fixtures/context/
  snapshots/v1/
  handoffs/
  corruptions/
  stale-cases/
  degraded-cases/
```

---

## Plan Propuesto

### Fase 0: Contrato de contexto y baseline real

#### TCO-00: Baseline Expansion & Message Audit
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** []
- **description:** Extender la medicion actual para incluir longitud de mensajes, costo de intake por agente, volumen por tipo de evento y tasa de lecturas amplias.
- **acceptanceCriteria:**
  - Script baseline expandido con metricas de message length y retrieval patterns.
  - Reporte con baseline de context quality y cost KPIs.
  - Todos los KPIs marcados como `TBD` en este plan quedan numericos (sin placeholders) al cerrar TCO-00.
  - Latencia definida con metodologia explicita: p50/p95, endpoint medido, tamano de muestra y entorno.
  - Se publica artefacto de baseline reproducible con comando exacto y timestamp.
  - Evidencia reproducible documentada.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`, `task-coordination-strategies`
  - **Backend (referencia):** `nodejs-best-practices`

#### TCO-01: Context Contract Spec
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-00]
- **collaborators:** [Documenter]
- **reviewRequiredBy:** [Planner]
- **description:** Especificar el contrato operativo de consumo de contexto para agentes: schemas minimos de `get_agent_inbox`, `get_task_snapshot`, `get_correlation_snapshot`, event message budget, fallback debug, compatibilidad legacy y criterios de suficiencia de snapshot.
- **acceptanceCriteria:**
  - Spec versionada en `docs/internal/specs/`.
  - Incluye schema minimo formal para `get_agent_inbox`, `get_task_snapshot` y `get_correlation_snapshot`.
  - Incluye ejemplos de payload compactos.
  - Define reglas de rollout, fallback, campos obligatorios y `schemaVersion`.
  - Review y sign-off de Planner registrados.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `prompt-engineering-patterns`
  - **Documenter:** `api-reference-documentation`
  - **Planner (referencia):** `planning-workflow`

#### TCO-01A: Schema Evolution & Compatibility Policy
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Definir politica de evolucion de schemas y compatibilidad para snapshots, handoffs y vistas compactas (`v1`, `v2`, futuras), incluyendo ventanas de convivencia y criterios de migracion de consumidores.
- **acceptanceCriteria:**
  - Se define versionado semantico de vistas y handoffs.
  - Se documenta politica de compatibilidad backward y forward.
  - Se define ventana de convivencia de versiones.
  - CI valida fixtures `v1` y migracion a versiones futuras.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `prompt-engineering-patterns`
  - **Documenter (referencia):** `api-reference-documentation`

#### TCO-02: Profile Governance Rollout
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Actualizar `profile.md` de Orchestrator, Planner, Backend, Frontend, Tester, Observer, Documenter y Optimizer para aplicar disciplina de contexto compartida.
- **acceptanceCriteria:**
  - Todos los perfiles principales actualizados.
  - Regla `summary-first` incorporada.
  - Limites de lectura por defecto definidos.
  - Regla de `message budget` incorporada.
- **skillsAvailable:**
  - **Optimizer:** `prompt-engineering-patterns`, `task-coordination-strategies`
  - **External candidata:** `memory-safety-patterns`

#### TCO-02A: Profile & Context Conformance Checker
- **assignedTo:** Tester
- **dependsOn:** [TCO-01, TCO-01A, TCO-02]
- **description:** Crear checker automatizado para CI que valide conformance de profiles, schemas de snapshots, budgets, samples y reglas base del modo snapshot-first.
- **acceptanceCriteria:**
  - CI falla si un `profile.md` reintroduce broad reads por defecto.
  - CI valida presencia de reglas base obligatorias.
  - CI valida schema de snapshots y handoffs.
  - CI valida samples con `truncated` y flags.
- **skillsAvailable:**
  - **Tester:** `systematic-debugging`, `test-driven-development`
  - **Optimizer (referencia):** `task-coordination-strategies`

---

### Fase 1: Quick wins sobre payload y schema

#### TCO-03: Slim `/api/events` by default
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Agregar `includeTaskEvents=false` por defecto y reemplazar arrays anidados por summaries compactos (`eventCount`, `latestStatus`, `updatedAt`).
- **acceptanceCriteria:**
  - `/api/events` deja de incluir `task.events` por default.
  - Reduccion >= 45% en payload comun verificada.
  - Existe modo expandido para debug profundo.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`
  - **Backend (referencia):** `nodejs-backend-patterns`, `nodejs-best-practices`

#### TCO-04: Canonical Payload Normalization
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Normalizar escritura para no duplicar en `payload` los campos canonicos ya presentes top-level.
- **acceptanceCriteria:**
  - Writer actualizado.
  - Ahorro >= 20% validado sobre contexto almacenado.
  - Compatibilidad legacy cubierta con guard o fallback.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`
  - **Backend (referencia):** `nodejs-best-practices`

#### TCO-05: Message Budget + Artifact Offload
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Agregar budget de mensajes al publisher MCP y politica de desviar detalle largo a artefactos/reportes.
- **acceptanceCriteria:**
  - Warning o enforcement para mensajes largos.
  - Politica de handoff corto implementada.
  - Message average baja hacia objetivo <160 chars.
- **skillsAvailable:**
  - **Optimizer:** `prompt-engineering-patterns`
  - **External candidata:** `memory-merger`, `memory-safety-patterns`

#### TCO-05A: Feature Flags & Kill Switches
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Implementar flags operativos y kill switches para sidecars, relevance-first views, token budgets, message budget hard enforcement, handoff summaries y compatibilidad legacy.
- **acceptanceCriteria:**
  - Existen flags concretos `MCP_CONTEXT_SIDECARS_ENABLED`, `MCP_CONTEXT_RELEVANCE_READS_ENABLED`, `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED`, `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED`, `MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED` y `MCP_CONTEXT_LEGACY_PAYLOAD_MODE`.
  - Defaults documentados y validados.
  - Rollback puede ejecutarse sin redeploy destructivo.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `cost-optimization`
  - **Backend (referencia):** `nodejs-best-practices`

#### TCO-05B: Snapshot Redaction & Memory Safety Guardrails
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-01]
- **description:** Definir y aplicar guardrails de redaccion y memory safety para snapshots, summaries y handoffs, evitando datos sensibles, prompt contamination e instrucciones largas incrustadas.
- **acceptanceCriteria:**
  - Existe lista de campos excluidos o redactados.
  - Existe politica para no incrustar instrucciones largas o prompt contamination en snapshots.
  - Hay tests de redaccion y sanitizacion.
- **skillsAvailable:**
  - **Optimizer:** `prompt-engineering-patterns`
  - **External candidata:** `memory-safety-patterns`

---

### Fase 2: Retrieval relevante y vistas compactas

#### TCO-06: Sidecar Snapshots (`latest_by_task`, `latest_by_correlation`, `open_by_agent`)
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-03, TCO-04, TCO-05A, TCO-05B]
- **description:** Crear indices/snapshots compactos para lecturas calientes sin abandonar `shared_context.jsonl` como source of truth.
- **acceptanceCriteria:**
  - Existen sidecars para task, correlation e inbox por agente.
  - Lecturas comunes usan snapshot-first.
  - Sidecars preservan `sourceWatermark` y `rebuiltAt` para provenance.
  - Reglas de invalidacion documentadas.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `cost-optimization`
  - **Backend (referencia):** `nodejs-backend-patterns`

#### TCO-06A: Atomic Sidecar Writes & Idempotent Rebuilds
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-06]
- **description:** Endurecer sidecars con escrituras atomicas, rebuild deterministico e idempotente y deteccion segura de sidecars parciales o corruptos.
- **acceptanceCriteria:**
  - Los sidecars se escriben con estrategia atomica (`tmp` + rename o equivalente).
  - Rebuild repetido sobre el mismo watermark produce el mismo resultado.
  - Existen checksums o fingerprints del snapshot reconstruido.
  - Los consumidores detectan sidecars parciales o corruptos y hacen fallback seguro.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`, `task-coordination-strategies`
  - **Backend (referencia):** `nodejs-best-practices`

#### TCO-07: Relevance-First MCP Read Modes
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-06, TCO-06A]
- **description:** Exponer modos de lectura compacta para agentes: `get_agent_inbox`, `get_task_snapshot`, `get_correlation_snapshot`, `get_recent_failures`.
- **acceptanceCriteria:**
  - API o tool mode disponible para cada vista.
  - Las vistas cumplen con el schema minimo `v1`.
  - Las vistas exponen freshness/provenance (`maxAgeMs`, `sourceEventId`, `sourceWatermark`, `stale`, `rebuiltAt`).
  - Las vistas exponen `buildVersion`, `integrityHash` y `degradedMode`.
  - Snapshot por tarea y correlacion disponible en caliente.
  - >90% de intakes pueden resolverse sin broad scan.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`
  - **External candidata:** `context-engineering-collection`

#### TCO-07A: Degraded Mode Decision Matrix
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-07]
- **description:** Definir reglas operativas para consumidores cuando `stale=true`, `degradedMode=true` o ambas condiciones aparecen al mismo tiempo.
- **acceptanceCriteria:**
  - Existe matriz `normal/stale/degraded/stale+degraded`.
  - Cada estado define acciones permitidas y bloqueadas.
  - Los consumidores aplican fallback consistente.
  - Los negative tests cubren la matriz completa.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `prompt-engineering-patterns`
  - **Tester (referencia):** `systematic-debugging`

#### TCO-08: AgentMonitor & Consumer Adaptation
- **assignedTo:** Observer
- **dependsOn:** [TCO-07, TCO-07A]
- **description:** Adaptar `AgentMonitor` y consumidores de eventos para usar vistas compactas por defecto y expansion explicita solo cuando haga falta.
- **acceptanceCriteria:**
  - `AgentMonitor` consume summaries compactos.
  - Existe UI o modo para expandir detalle puntualmente.
  - No se rompe el flujo de observabilidad.
- **skillsAvailable:**
  - **Observer:** `observability-design-patterns`, `layout-overflow-guardrails`
  - **Optimizer (referencia):** `distributed-tracing`

---

### Fase 3: Signal quality y contexto entendible

#### TCO-09: Deterministic Dedup + Noise Suppression
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-06]
- **description:** Deduplicar lifecycle events repetidos (`taskId + type + status + agent`) y reducir ruido de replays innecesarios.
- **acceptanceCriteria:**
  - Regla de dedupe implementada.
  - No se pierden transiciones reales.
  - Mejora medible en signal-to-noise.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`
  - **Tester (referencia):** `systematic-debugging`

#### TCO-10: Task and Correlation Handoff Summaries
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-07, TCO-09, TCO-05B]
- **description:** Generar resúmenes compactos de handoff por tarea y correlacion para que un agente nuevo entienda rapido resultado, bloqueo y siguiente paso.
- **acceptanceCriteria:**
  - Cada tarea activa/cerrada tiene resumen corto recuperable.
  - Cada correlacion activa tiene resumen corto recuperable.
  - >=85% de los handoffs permiten continuar sin releer eventos crudos.
  - El snapshot evita leer historiales extensos para entender el estado actual.
- **skillsAvailable:**
  - **Optimizer:** `prompt-engineering-patterns`, `task-coordination-strategies`
  - **External candidata:** `memory-merger`, `summarization`

#### TCO-11: Token Budget Enforcement + `truncated` Metadata
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-07, TCO-10]
- **description:** Aplicar budgets duros a respuestas compactas y exponer metadata de truncado para expansion on-demand.
- **acceptanceCriteria:**
  - Budget configurado por vista.
  - Metadata `truncated=true` disponible cuando aplique.
  - No se silencian eventos criticos por truncado.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`
  - **External candidata opcional:** `context-compression`

#### TCO-11A: Per-View Budget Table & Hard Limits
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-11]
- **description:** Congelar budgets maximos por vista y por tipo de handoff, incluyendo target ideal, hard limit y comportamiento al exceder el limite.
- **acceptanceCriteria:**
  - Existe tabla versionada de budgets por vista.
  - Cada vista tiene `targetBudget` y `hardBudget`.
  - Los tests verifican que las respuestas respetan el budget hard.
  - El runbook documenta como ajustar budgets sin romper compatibilidad.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`, `task-coordination-strategies`
  - **Tester (referencia):** `test-driven-development`

#### TCO-12: Cache + Fingerprint Layer
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-11]
- **description:** Implementar cache de consultas compactas y fingerprint/hash para payloads repetidos y artifact paths frecuentes.
- **acceptanceCriteria:**
  - Cache implementado con invalidacion clara.
  - Ahorro runtime medido de 10-30%.
  - Sin incoherencias visibles para consumidores.
- **skillsAvailable:**
  - **Optimizer:** `cost-optimization`, `task-coordination-strategies`

#### TCO-12B: Snapshot SLOs, Drift Detection & Alerting
- **assignedTo:** Observer
- **dependsOn:** [TCO-06, TCO-07, TCO-12]
- **description:** Definir SLOs/SLIs, drift detection y alertas operativas para stale rate, rebuild success, watermark atrasado y uso residual del modo legacy.
- **acceptanceCriteria:**
  - Se define SLO para `snapshot stale rate`.
  - Se define SLO para `snapshot rebuild success rate`.
  - Se definen alertas para watermark atrasado, stale rate alto y `legacy mode hit rate > 0`.
  - Warning/critical thresholds quedan cerrados y documentados.
  - Se documentan runbooks de respuesta por alerta.
- **skillsAvailable:**
  - **Observer:** `observability-design-patterns`
  - **Optimizer (referencia):** `distributed-tracing`, `cost-optimization`

### Fase 4: Validacion, rollout y documentacion operativa

#### TCO-13: Regression + Benchmark Suite
- **assignedTo:** Tester
- **dependsOn:** [TCO-02A, TCO-03, TCO-04, TCO-05, TCO-05A, TCO-05B, TCO-06, TCO-06A, TCO-07, TCO-07A, TCO-08, TCO-09, TCO-10, TCO-11, TCO-11A, TCO-12]
- **description:** Validar compatibilidad, reduccion de tokens, snapshots correctos, fallbacks y lectura de contexto por rol.
- **acceptanceCriteria:**
  - Benchmarks antes/despues comparables.
  - QA de vistas compactas y fallbacks legacy.
  - `% de snapshots suficientes sin expansion`, `% de handoffs continuables sin releer eventos` y `% de fallback a broad scan` medidos.
  - `snapshot conflict rate`, `sidecar partial write incidents`, `wave rollout incidents` y `alert ack time` medidos.
  - KPIs de suficiencia de snapshot validados.
  - KPIs de costo y calidad validados.
- **skillsAvailable:**
  - **Tester:** `systematic-debugging`, `playwright-testing`, `test-driven-development`

#### TCO-13A: Negative Test Matrix & Fault Injection
- **assignedTo:** Tester
- **dependsOn:** [TCO-02A, TCO-06, TCO-07, TCO-07A, TCO-11, TCO-11A]
- **description:** Crear matriz formal de pruebas negativas y fault injection para sidecars stale, watermark regresivo, snapshots corruptos, toggles de flags en caliente y truncado excesivo.
- **acceptanceCriteria:**
  - Existen tests para `stale=true`.
  - Existen tests para `sourceWatermark` no monotono.
  - Existen tests para sidecar corrupto o incompleto.
  - Existen tests para toggling de flags durante operacion.
  - Existen tests para truncado que preserve informacion critica.
- **skillsAvailable:**
  - **Tester:** `systematic-debugging`, `test-driven-development`
  - **Observer (referencia):** `observability-design-patterns`

#### TCO-06B: Cold Start & Sidecar Bootstrap Runbook
- **assignedTo:** Documenter
- **collaborators:** [AI_Workspace_Optimizer, Observer]
- **dependsOn:** [TCO-06A, TCO-12B]
- **description:** Documentar y validar bootstrap desde cero, recuperacion de sidecars perdidos y transicion de `degradedMode` a `normal`.
- **acceptanceCriteria:**
  - Existe procedimiento de arranque limpio.
  - Existe procedimiento de rebuild masivo.
  - El procedimiento define validacion de `integrityHash` y `sourceWatermark`.
  - El runbook incluye tiempos esperados y criterios de exito.
- **skillsAvailable:**
  - **Documenter:** `api-reference-documentation`
  - **Observer (referencia):** `observability-design-patterns`

#### TCO-12C: Wave Canary Policy & Abort Thresholds
- **assignedTo:** Observer
- **collaborators:** [AI_Workspace_Optimizer, Planner]
- **dependsOn:** [TCO-12B]
- **description:** Formalizar blast radius inicial, duracion minima de observacion, thresholds de rollback y owner de aprobacion para cada wave del rollout.
- **acceptanceCriteria:**
  - Cada wave define alcance inicial y duracion minima.
  - Cada wave define incident threshold y rollback threshold.
  - Existe criterio de freeze automatico ante incidentes criticos.
  - La policy queda enlazada al runbook final.
- **skillsAvailable:**
  - **Observer:** `observability-design-patterns`
  - **Planner (referencia):** `planning-workflow`

#### TCO-12A: Legacy Deprecation Plan
- **assignedTo:** AI_Workspace_Optimizer
- **dependsOn:** [TCO-11A, TCO-12B, TCO-12C, TCO-13]
- **description:** Definir y ejecutar la estrategia de salida de `MCP_CONTEXT_LEGACY_PAYLOAD_MODE` y del uso rutinario de broad recency reads una vez que snapshots, sidecars y KPIs esten estables.
- **acceptanceCriteria:**
  - Se define criterio de salida de legacy mode.
  - Uso de broad scan cae por debajo del target durante una ventana estable.
  - Compat mode puede apagarse en staging sin incidentes.
  - Existe fecha o condicion de retiro documentada.
- **skillsAvailable:**
  - **Optimizer:** `task-coordination-strategies`, `cost-optimization`
  - **Documenter (referencia):** `api-reference-documentation`

#### TCO-14: Runbook + Agent Operating Guide
- **assignedTo:** Documenter
- **dependsOn:** [TCO-02, TCO-02A, TCO-06B, TCO-07, TCO-07A, TCO-10, TCO-11A, TCO-12A, TCO-12B, TCO-12C, TCO-13, TCO-13A]
- **description:** Documentar el nuevo modelo operativo: como leer contexto, cuando expandir, budgets, fallbacks, y como escribir eventos cortos.
- **acceptanceCriteria:**
  - Runbook operativo versionado.
  - Guia clara para perfiles y agentes nuevos.
  - Incluye schema examples, policy de `degradedMode`, budgets y flags operativos.
  - Ejemplos de buenas y malas consultas MCP.
- **skillsAvailable:**
  - **Documenter:** `api-reference-documentation`
  - **External candidata opcional:** `summarization`

---

## Dependencias resumidas

```text
TCO-00 -> TCO-01 -> TCO-01A -> TCO-02
TCO-01 -> TCO-03, TCO-04, TCO-05, TCO-05A, TCO-05B
TCO-01A + TCO-02 -> TCO-02A
TCO-03 + TCO-04 + TCO-05A + TCO-05B -> TCO-06 -> TCO-06A
TCO-06A -> TCO-07 -> TCO-07A -> TCO-08
TCO-06 -> TCO-09
TCO-07 + TCO-09 + TCO-05B -> TCO-10
TCO-07 + TCO-10 -> TCO-11 -> TCO-11A -> TCO-12
TCO-06 + TCO-07 + TCO-12 -> TCO-12B
TCO-02A + TCO-03..TCO-12 + TCO-06A + TCO-05A + TCO-05B + TCO-07A + TCO-11A -> TCO-13
TCO-02A + TCO-06 + TCO-07 + TCO-07A + TCO-11 + TCO-11A -> TCO-13A
TCO-06A + TCO-12B -> TCO-06B
TCO-12B -> TCO-12C
TCO-11A + TCO-12B + TCO-12C + TCO-13 -> TCO-12A -> TCO-14
```

---

## Mapeo de tareas para orquestación MCP

> `TCO-*` se mantiene como alias documental. Para ejecución real, Orchestrator debe emitir `taskId` MCP con prefijo `aiw-`.

### Convención obligatoria
- Formato: `aiw-<agente>-tco-<NN>-<slug>-20260331-01`
- Ejemplos:
  - `TCO-00` -> `aiw-opt-tco-00-baseline-expansion-20260331-01`
  - `TCO-01` -> `aiw-opt-tco-01-context-contract-20260331-01`
  - `TCO-13` -> `aiw-tester-tco-13-regression-benchmark-20260331-01`

### Regla de trazabilidad
- Cada task MCP debe incluir en `payload.message` la referencia al alias documental (`TCO-XX`) y ruta del plan.
- Cada cierre debe adjuntar `artifactPaths` y evidence KPI cuando aplique.

---

## Gates de calidad

### Gate A - Antes de implementar cambios de schema
- **Owner gate:** Orchestrator
- **Validación primaria:** Tester
- **Señal de avance:** `TEST_PASSED` sobre TCO-00/TCO-01/TCO-01A/TCO-02/TCO-02A
- Baseline extendido listo.
- Spec de contrato aprobada con schemas minimos `v1`.
- Politica de evolucion/compatibilidad de schemas definida.
- Profiles update definido.
- Campos de freshness/provenance definidos.

### Gate B - Antes de sidecars y retrieval nuevo
- **Owner gate:** Orchestrator
- **Validación primaria:** Tester
- **Señal de avance:** `TEST_PASSED` sobre TCO-03/TCO-04/TCO-05/TCO-05A/TCO-05B
- `/api/events` slim funcionando.
- Normalizacion sin romper lectores legacy.
- Message budget activo.
- Budgets por vista congelados o al menos definidos provisionalmente.
- Flags/kill switches definidos y cableados.
- Guardrails de redaccion definidos.
- Escrituras atomicas y rebuild idempotente definidos.

### Gate C - Antes de rollout general a agentes
- **Owner gate:** Orchestrator
- **Validación primaria:** Tester + Observer
- **Señal de avance:** `TEST_PASSED` sobre TCO-06/TCO-06A/TCO-07/TCO-07A/TCO-08/TCO-10/TCO-11
- Snapshots por task/correlation/agente disponibles.
- AgentMonitor usando vistas compactas.
- Handoff summaries funcionando.
- Policy de `degradedMode` documentada y testeada.
- KPI de suficiencia de snapshot muestreado en escenarios reales.
- Checker de conformance activo en CI.
- Reglas de conflicto snapshot-vs-JSONL documentadas y testeadas.
- Criterios de salida de Wave 1 satisfechos.

### Gate D - Cierre del EPIC
- **Owner gate:** Orchestrator
- **Validación primaria:** Tester + Documenter
- **Señal de cierre:** `TEST_PASSED` final (TCO-13/TCO-13A) + `TASK_COMPLETED` de TCO-14
- KPIs de costo medidos.
- KPIs de contexto medidos.
- SLOs y alertas operativas activas.
- Matriz negativa/fault injection ejecutada.
- Bootstrap/disaster recovery de sidecars validado.
- Guardrails de canary/blast radius publicados.
- Legacy mode con salida definida y validada.
- Ownership operativo publicado.
- Runbook operativo publicado.

---

## Riesgos y rollback

| Riesgo | Mitigacion | Rollback |
|--------|------------|----------|
| Lectores legacy dependen de payload duplicado | Compat mode y rollout gradual | `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=true` |
| Evolucion de schemas rompe consumidores | Politica de compatibilidad + fixtures versionados | Volver a schema anterior soportado y mantener ventana de convivencia |
| Snapshot inconsistente vs JSONL | Source of truth sigue en JSONL + rebuild de sidecar | `MCP_CONTEXT_SIDECARS_ENABLED=false` y `MCP_CONTEXT_RELEVANCE_READS_ENABLED=false` |
| Escritura parcial o sidecar corrupto | Writes atomicos + `integrityHash` + fallback seguro | Ignorar sidecar, forzar rebuild y usar expansion desde JSONL |
| Snapshot stale o sin provenance suficiente | Campos obligatorios de frescura + rebuild/expansion manual | Forzar rebuild de sidecars o desactivar relevance reads |
| `degradedMode` interpretado distinto por consumidores | Decision matrix unica + tests negativos | Forzar `decisionSafety=requires_expansion` y usar expansion desde JSONL |
| Budgets demasiado agresivos ocultan contexto critico | `truncated` + expansion manual | `MCP_CONTEXT_TOKEN_BUDGETS_ENABLED=false` |
| Message hard enforcement corta reportes utiles | Hard mode empieza apagado | `MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED=false` |
| Profile rules nuevas rompen hábitos de agentes | Rollout gradual + runbook + examples | Revertir bloque de reglas en perfiles |
| Handoff summaries compactan mal y pierden señal | Guardrails de memory safety + QA específica | `MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED=false` |
| Cold start o perdida total de sidecars deja al sistema sin vistas compactas | Bootstrap/rebuild runbook + fallback a JSONL | Rebuild completo desde JSONL y operar en `degradedMode` hasta normalizar |
| Alertas insuficientes dejan degradacion silenciosa | SLOs + alerting + ownership claro | Escalar a observabilidad manual y bloquear avance de wave |
| Expansión de wave demasiado amplia aumenta blast radius | Canary policy + abort thresholds por wave | Congelar wave actual y volver a la wave previa o a modo legacy |
| Legacy mode queda encendido indefinidamente | Exit criteria + ventana estable + staging verification | Mantener compat mode solo como excepcion temporal y reabrir `TCO-12A` |

---

## Matriz operativa de ownership

| Area | Owner | Backup |
|------|-------|--------|
| Flags operativos | AI_Workspace_Optimizer | Observer |
| Sidecar rebuild | AI_Workspace_Optimizer | Backend |
| Schema contract | AI_Workspace_Optimizer | Documenter |
| Schema evolution policy | AI_Workspace_Optimizer | Planner |
| Budgets por vista | AI_Workspace_Optimizer | Tester |
| Profile conformance | Tester | Planner |
| Negative tests / fault injection | Tester | AI_Workspace_Optimizer |
| SLOs y alertas | Observer | AI_Workspace_Optimizer |
| Cold start / disaster recovery | Documenter | AI_Workspace_Optimizer |
| Canary / wave approval | Observer | Orchestrator |
| Rollback de relevance reads | AI_Workspace_Optimizer | Observer |
| Runbook y procedimientos | Documenter | Planner |

---

## Checklist de salida del modo legacy

- `Legacy mode hit rate` en 0% durante una ventana estable definida.
- `fallback a broad scan` por debajo del target.
- Staging opera con `MCP_CONTEXT_LEGACY_PAYLOAD_MODE=false` sin incidentes.
- Runbook actualizado con fecha o condicion de retiro.

---

## Recomendacion de ejecucion

Si hay que aprobar solo un slice inicial, el orden recomendado es:

1. **TCO-00 + TCO-01 + TCO-02 + TCO-02A**
   - porque sin contrato, perfiles corregidos y checker anti-drift el ahorro real sera parcial y fragil.

2. **TCO-01A + TCO-03 + TCO-04 + TCO-05 + TCO-05A + TCO-05B**
   - porque cierran compatibilidad de schemas y dejan rollback real y sanitizacion listos.

3. **TCO-06 + TCO-06A + TCO-07 + TCO-07A + TCO-10 + TCO-11 + TCO-11A**
   - porque resuelven el objetivo humano y congelan comportamiento operativo consistente por vista.

4. **TCO-12B + TCO-12C + TCO-13 + TCO-13A + TCO-06B + TCO-12A + TCO-14**
   - porque cierran observabilidad, canary rollout, pruebas negativas, bootstrap/disaster recovery y runbook final.

---

## Criterios de aceptacion del plan revisado

- [x] Corrige ownership hacia `AI_Workspace_Optimizer` para cambios internos.
- [x] Agrega workstream de actualizacion de perfiles de todos los agentes.
- [x] Agrega event hygiene y `message budget`.
- [x] Agrega retrieval compacto orientado a snapshots relevantes.
- [x] Agrega KPIs de costo y de calidad del contexto.
- [x] Propone skills nuevas con comando de instalacion directo.
- [x] Formaliza schema minimo de snapshots para evitar interpretaciones inconsistentes.
- [x] Agrega feature flags / kill switches concretos para rollback operativo.
- [x] Agrega freshness/provenance para snapshots y sidecars.
- [x] Agrega estrategia explicita de salida del modo legacy.
- [x] Agrega conformance automation para evitar drift de profiles y schemas.
- [x] Agrega guardrails de redaccion y ownership operativo por incidente.
- [x] Agrega politica de evolucion de schemas y compatibilidad futura.
- [x] Agrega atomicidad/idempotencia y fallback seguro para sidecars.
- [x] Agrega pruebas negativas/fault injection para snapshots y flags.
- [x] Agrega SLOs, alertas y criterios de salida por wave.
- [x] Agrega reglas formales de conflicto entre snapshot y source of truth.
- [x] Congela budgets por vista y por tipo de handoff.
- [x] Agrega policy explicita para `degradedMode`.
- [x] Agrega bootstrap/disaster recovery para sidecars.
- [x] Formaliza guardrails de canary y blast radius por wave.
- [x] Deja explicito que skills externas son optativas y no bloquean tareas criticas.
- [x] Congela enums, severidades y ventanas temporales por defecto.
- [x] Define layout recomendado de fixtures para CI y fault injection.
