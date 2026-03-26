# MCP Traceability Guardrails (Draft)

## Context
Task: `aiw-opt-mcp-traceability-plan-01`  
Correlation: `aiw-traceability-20260326`

## Problem
Se detectaron huecos de trazabilidad en tareas (faltan estados intermedios), además de secuencias inconsistentes como `cancelled` seguido de `completed`.

## Objective
Garantizar una secuencia consistente y visible en AgentMonitor para todas las tareas operativas.

## Proposed Guardrails
1. **Secuencia mínima obligatoria**
   - `TASK_ASSIGNED` → `TASK_ACCEPTED` → `TASK_IN_PROGRESS` → terminal (`TASK_COMPLETED` | `TASK_BLOCKED` | `TASK_CANCELLED`).
2. **Eventos terminales mutuamente excluyentes**
   - Si existe estado terminal, bloquear otro terminal para el mismo `taskId` salvo evento `REOPENED` explícito.
3. **Campos obligatorios para TASK_***
   - `taskId`, `assignedTo`, `status`, `correlationId`.
4. **Reglas de ownership**
   - Solo el `assignedTo` o `Orchestrator` puede emitir eventos de progreso para la tarea.
5. **Normalización y consistencia**
   - Forzar valores canónicos de `status`: `assigned|accepted|in_progress|blocked|completed|cancelled|failed`.
6. **Checklist operativo**
   - Antes de cerrar tarea: validar que hubo al menos un `TASK_IN_PROGRESS`.

## Implementation Targets
- `AI_Workspace/scripts/mcp-publish-event.mjs`
- `AI_Workspace/MCP_Server/lib/event-contract.js`
- `AI_Workspace/AgentMonitor/app.js`

## Acceptance Criteria
- No hay tareas con secuencias inválidas nuevas.
- AgentMonitor muestra inicio y progreso de cada tarea sin ambigüedad.
- Se emite guía operativa para handoff Tester → Orchestrator → Backend.

## Approval Gate (obligatorio)
1. `Planner` y `Documenter` publican borradores (`PLAN_PROPOSED` / `DOC_UPDATED`).
2. `Orchestrator` revisa y emite visto bueno inicial (aprobado o devolución).
3. `AI_Workspace_Optimizer` revisa sobre ese visto bueno:
   - Si **aprueba**: se habilita implementación (`TASK_ASSIGNED` + `TASK_ACCEPTED` + `TASK_IN_PROGRESS`).
   - Si **no aprueba**: emite devolución y retorna a `Planner` y/o `Documenter` para ajuste.

### Resultado esperado del gate
- Nunca se inicia implementación sin doble visto bueno (`Orchestrator` + `Optimizer`).
- Toda devolución queda trazada en MCP con `correlationId` y `parentTaskId`.
