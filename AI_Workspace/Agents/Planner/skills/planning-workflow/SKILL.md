---
name: planning-workflow
description: "Proceso completo de planificación para el agente Planner de zCorvus. Cubre inspección real, estructura de fases, grafo de dependencias, criterios de aceptación y publicación. Usar en cada plan sin excepción."
---

# Planning Workflow — zCorvus

> "Planning tokens are a lot fewer and cheaper than implementation tokens."
> Un plan sólido de 3 horas evita 30 horas de retrabajo.

---

## Fase 0 — Inspección real (OBLIGATORIA antes de escribir una sola tarea)

**Nunca planificar a ciegas.** Si no hay evidencia del estado real, publicar `TASK_BLOCKED`.

### Qué inspeccionar siempre

```bash
# Estructura general del proyecto
ls -la AI_Workspace/
ls -la Frontend/src/
ls -la Backend/src/

# Contratos y arquitectura
cat AI_Workspace/architecture.md
cat AI_Workspace/MCP_Server/lib/event-contract.js

# Planes y specs previas
ls AI_Workspace/docs/internal/plans/
ls AI_Workspace/docs/internal/specs/

# Learnings del Planner
cat AI_Workspace/Agents/Planner/learnings.md
```

### Qué inspeccionar según el tipo de plan

| Tipo de plan | Archivos adicionales a leer |
|---|---|
| Frontend / UX | `Frontend/package.json`, `Frontend/src/app/`, componentes relevantes, rutas existentes |
| Backend / API | Endpoints existentes, schemas de DB, contratos de cookies/auth |
| Integración externa | README del repo externo (buscar en web si no hay acceso), estructura de la extensión |
| Performance | `docs/internal/specs/frontend-performance-baseline.md`, bundle config |
| Multi-agente / MCP | `shared_context.jsonl` (últimas 20 líneas), perfiles de agentes involucrados |

### Preguntas que la inspección debe responder

1. ¿Qué existe hoy que puede reutilizarse?
2. ¿Qué existe hoy que hay que modificar?
3. ¿Qué no existe y hay que crear desde cero?
4. ¿Qué agente puede hacer qué cosa según sus límites de rol?
5. ¿Hay endpoints que Frontend va a necesitar que hoy no existen?
6. ¿Hay repos externos referenciados? ¿Qué son realmente?

---

## Fase 1 — Estructura del plan

### Header obligatorio de todo plan

```markdown
# [Título del Plan]

**taskId:** `aiw-planner-<slug>-<YYYYMMDD>-01`
**correlationId:** `aiw-<epic-slug>-<YYYYMMDD>`
**branch:** `feature/<slug>`
**estado:** `PLAN_PROPOSED`
**reemplaza:** (si aplica)

---
```

### Secciones obligatorias

1. **Contexto inspeccionado** — archivos leídos y hallazgos relevantes. Sin esta sección no hay evidencia de inspección.
2. **Objetivo** — qué problema resuelve el plan en 2-3 líneas.
3. **Agentes y sus roles en esta EPIC** — tabla con qué hace cada agente involucrado.
4. **Skills recomendadas por tarea** — mapeadas por tarea, con fit verificado.
5. **Tareas por fase** — ver Fase 2.
6. **Grafo de dependencias** — diagrama textual ASCII.
7. **Asignación por agente** — tabla resumen.
8. **Orden recomendado de implementación** — con paralelismo explícito.
9. **Riesgos y mitigaciones** — tabla con probabilidad, impacto y mitigación concreta.
10. **Criterios de aprobación del plan** — checklist verificable.

---

## Fase 2 — Estructura de cada tarea

Cada tarea propuesta en el plan usa este formato exacto (ver también skill `zcorvus-task-template`):

```markdown
#### `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>`
- **assignedTo:** `<Agente>`
- **correlationId:** `aiw-<epic-slug>-<YYYYMMDD>`
- **dependsOn:** [`aiw-<otra-tarea>`, ...] o `[]`
- **description:** Qué hace esta tarea. Una sola responsabilidad. Sin ambigüedad.
- **skillsRecommended:** Lista de skills del agente relevantes para esta tarea
- **artefactos esperados:**
  - `ruta/al/archivo.ext` — descripción
- **acceptanceCriteria:**
  - AC concreto y verificable (nombra el mecanismo, no solo el resultado)
  - AC concreto y verificable
  - AC concreto y verificable
```

### Reglas de acceptanceCriteria

**AC válido** — nombra el mecanismo y es verificable sin ambigüedad:
- ✅ `POST /api/preferences setea cookie user_prefs con SameSite:Lax, Secure:true`
- ✅ `El valor theme:"light" hardcodeado en view.initial.ts es eliminado`
- ✅ `Las redirect URLs de Stripe incluyen el locale: /<locale>/premium/success`

**AC inválido** — vago, no verificable:
- ❌ `Bootstrap mejorado`
- ❌ `El retorno no depende del estado en memoria`
- ❌ `UI más consistente`

**Regla de los mecanismos:** Si el AC implica una decisión técnica (qué cookie, qué URL, qué campo), especificar el mecanismo exacto. Si no se especifica, el agente implementará lo que se le ocurra primero.

**Regla de los riesgos:** Si una race condition o caso borde es identificado como riesgo, debe tener un AC en alguna tarea. Riesgo sin AC = riesgo ignorado.

---

## Fase 3 — Grafo de dependencias

Siempre incluir un grafo textual que muestre:
- El orden de ejecución
- Las dependencias bloqueantes
- El paralelismo posible (con nota explícita)

```
aiw-backend-api-20260404-01                  ← desbloquea todo
  └─> aiw-frontend-contract-20260404-01
        └─> aiw-frontend-bootstrap-20260404-02
              ├─> aiw-frontend-task-a-20260404-03   ← paralelo con 04
              └─> aiw-frontend-task-b-20260404-04   ← paralelo con 03
                    └─> aiw-frontend-hardening-20260404-05
                          └─> aiw-optimizer-perf-20260404-06
                                └─> aiw-tester-e2e-20260404-07
                                      └─> aiw-documenter-sync-20260404-08
```

**Nota de coordinación para Orchestrator:** Siempre incluir una nota explícita cuando hay paralelismo, por ejemplo: "Las tareas 03 y 04 son independientes entre sí y pueden ejecutarse simultáneamente una vez completada la tarea 02."

---

## Fase 4 — Detección de tareas faltantes

Antes de dar el plan por terminado, responder estas preguntas:

### ¿Falta algún agente?

| Señal | Tarea faltante probable |
|---|---|
| Frontend necesita endpoint que no existe | Tarea de Backend primero |
| Plan tiene cambios visuales con motion/animaciones | Tarea de Optimizer (performance gate) antes de QA |
| Plan toca componentes compartidos | Tarea de hardening de componentes compartidos |
| Plan modifica flujos con auth o redirects externos | AC explícito verificando parámetros dinámicos (locale, etc.) |
| Plan modifica APIs o cookies | AC explícito con todos los atributos del contrato |
| Plan usa libs nuevas sin verificar stack | Tarea de Optimizer (auditoría de entorno) antes de implementar |

### ¿Falta alguna tarea de cierre?

Todo plan debe tener:
- Tarea de **Tester** (E2E/regresión) como gate de calidad
- Tarea de **Documenter** (docs, registry) dependiendo de QA
- Si hay cambios visuales: tarea de **Optimizer** (performance) antes de Tester

---

## Fase 5 — Iteración y refinamiento

Antes de publicar, revisar el plan al menos una vez desde la perspectiva de cada agente asignado:

1. **Desde el agente más dependiente:** ¿Puede empezar sin bloqueos? ¿Tiene todo lo que necesita?
2. **Desde el agente menos técnico (Documenter):** ¿Entiende qué documentar? ¿Tiene `artifactPaths` explícitos?
3. **Desde el Tester:** ¿Sabe exactamente qué validar? ¿Los ACs son reproducibles?
4. **Desde el Orchestrator:** ¿El grafo de dependencias es correcto? ¿El paralelismo está bien marcado?

Después de esta revisión, ejecutar la skill `plan-audit` antes de publicar.

---

## Fase 6 — Publicación

### Documento .md
- Ruta: `docs/internal/plans/<taskId-del-planner>.md`
- El taskId del archivo es el taskId que el Planner recibió, no uno nuevo.

### Evento PLAN_PROPOSED
```json
{
  "type": "PLAN_PROPOSED",
  "payload": {
    "taskId": "<mismo taskId que recibió el Planner>",
    "correlationId": "<correlationId de la EPIC>",
    "assignedTo": "Planner",
    "status": "in_progress",
    "message": "Plan propuesto. Ver <ruta del .md>",
    "artifactPaths": ["docs/internal/plans/<taskId>.md"]
  }
}
```

### TASK_COMPLETED
Usar el mismo `taskId` recibido. El Planner no crea un taskId nuevo para cerrarse.

---

## Anti-patterns conocidos (evitar siempre)

| Anti-pattern | Consecuencia | Fix |
|---|---|---|
| Planificar sin leer el código | Plan completamente descartado (caso pixel-agents v1) | Leer siempre antes |
| taskIds sin formato canónico | Dispatcher no puede matchear | `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>` |
| Tareas de UI asignadas al Optimizer | Bloqueo: el Optimizer no implementa UI | Observer/Frontend para UI |
| Endpoint faltante sin tarea de Backend | Frontend bloqueada desde el día 1 | Crear tarea Backend primero |
| AC vago sin mecanismo | Implementación ambigua, resultados incorrectos | Nombrar el mecanismo exacto |
| Riesgo real sin AC | El riesgo se materializa sin mitigación | Convertir a AC en la tarea correcta |
| Paralelismo serializado | Plan más lento de lo necesario | Identificar y documentar paralelos |
| Plan visual sin performance gate | Regresión de LCP/CLS sin detectar | Agregar tarea de Optimizer antes de QA |
| Plan aprobado reabierto por polish | Scope creep, retraso de implementación | Solo reabrir con evidencia real |