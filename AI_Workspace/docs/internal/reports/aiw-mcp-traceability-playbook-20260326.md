# MCP Handoff Playbook (Draft)

## Scope
Task: `aiw-opt-mcp-traceability-doc-01`  
Correlation: `aiw-traceability-20260326`

## Standard Flow (Tester -> Orchestrator -> Backend)
1. Orchestrator emite `TASK_ASSIGNED` a Tester.
2. Tester emite `TASK_ACCEPTED` y `TASK_IN_PROGRESS`.
3. Tester ejecuta validación:
   - Si pasa: `TEST_PASSED` + `TASK_COMPLETED`.
   - Si falla: `TEST_FAILED` + `SUBTASK_REQUESTED` a Orchestrator.
4. Orchestrator asigna corrección a Backend (`TASK_ASSIGNED`).
5. Backend emite `TASK_ACCEPTED` y `TASK_IN_PROGRESS`.
6. Backend corrige y emite `TASK_COMPLETED`.
7. Orchestrator reabre gate de Tester si corresponde.

## Required Event Payload
- `taskId`
- `assignedTo`
- `status`
- `correlationId`
- `message` (acción concreta y verificable)

## Anti-Patterns
- Emitir solo `TASK_COMPLETED` sin `TASK_ACCEPTED`/`TASK_IN_PROGRESS`.
- `TASK_CANCELLED` y luego `TASK_COMPLETED` para el mismo `taskId` sin reapertura.
- Eventos con `assignedTo` vacío en TASK_*.

## AgentMonitor Visibility Tips
- Usar `correlationId` único por incidente.
- Mantener `parentTaskId` para subtareas.
- Publicar mensajes de progreso cortos y orientados a acción.
