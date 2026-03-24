# Arquitectura Multi-Agente con Monitor Visual - zCorvus

Este workspace contiene la base operativa de zCorvus para coordinar agentes por eventos sobre MCP + JSONL. La planeacion original era buena como idea, pero tenia huecos operativos; este documento ya los corrige y define un flujo mas confiable.

## Estado real del workspace

- `Agents/`: perfiles operativos de cada rol.
- `MCP_Server/`: servidor MCP por stdio y API HTTP para inspeccionar eventos.
- `AgentMonitor/`: frontend visual para ver timeline, tareas y estados del sistema.
- `Backend/` y `Frontend/`: aplicaciones bootstrappeadas de forma minima y listas para evolucionar con features reales. El `Orchestrator` ya no parte de carpeta vacia, sino de una base inicial ejecutable.

## Estructura del equipo

El equipo queda dividido en 7 roles:

1. **`Orchestrator`**: Project Manager. Define arquitectura de muy alto nivel; para epics, cambios transversales o requerimientos ambiguos delega la planeacion detallada al `Planner`, y para trabajo pequeno puede planificar directo. Aprueba tareas, dependencias, prioridad, y asigna tareas atomicas a todo el equipo.
2. **`Planner`**: Subordinado del `Orchestrator`. Analiza requerimientos de alto nivel y disenha el plan de ejecucion detallado (tareas atomicas, dependencias y criterios de aceptacion) para que el `Orchestrator` lo apruebe y lo convierta en tareas oficiales.
3. **`Backend`**: Implementa API, persistencia, validacion y contratos publicados por evento.
4. **`Frontend`**: Implementa la UI de producto y consume contratos del Backend. No inventa APIs ni toca BD por defecto sin autorizacion explicita.
5. **`Tester`**: Valida artefactos, publica resultados y abre incidentes. Recibe tareas formales y reacciona a eventos, no es solo un watcher puro.
6. **`Documenter`**: Mantiene README, OpenAPI y manuales sincronizados. Recibe tareas formales y reacciona a eventos, no es solo un watcher puro.
7. **`Observer`**: Mantiene `AgentMonitor/` y la observabilidad del sistema. No entrega funcionalidad de producto; recibe tareas formales para mejorar la monitorizacion y reacciona a eventos de estado, no es un watcher puro.

## Contrato canonico de eventos

Todos los agentes usan el MCP con argumentos tipo objeto JSON. La forma correcta es esta:

```json
{
  "agent": "Orchestrator",
  "type": "TASK_ASSIGNED",
  "payload": {
    "taskId": "auth-backend-01",
    "assignedTo": "Backend",
    "status": "assigned",
    "priority": "high",
    "dependsOn": [],
    "description": "Crear endpoint POST /api/auth/login",
    "acceptanceCriteria": [
      "Valida email y password",
      "Devuelve 400 con body invalido",
      "Publica contrato ENDPOINT_CREATED"
    ]
  }
}
```

Campos operativos recomendados dentro de `payload`:

- `taskId`: obligatorio para cualquier trabajo asignable o verificable.
- `assignedTo`: agente responsable actual.
- `status`: estado actual de la tarea (ver Ciclo de vida canonico de tareas).
- `priority`: `high`, `medium`, `low`.
- `dependsOn`: lista de `taskId` previos.
- `correlationId`: une subtareas relacionadas cuando una feature genera varias ramas.
- `parentTaskId`: identifica la tarea padre de una subtarea.
- `retryCount`: contador de intentos en caso de fallos (para auto-correccion).
- `autoRecovery`: indica si la ejecucion es un intento automatico tras un fallo.
- `triggeredByType`: tipo de evento que disparo esta accion.
- `rootCause`: analisis breve de la causa raiz de un fallo.
- `artifactPaths`: archivos o rutas impactadas.
- `rolledBack`: booleano que indica si el agente restauro sus cambios locales despues de un fallo definitivo.
- `rollbackBlocked`: booleano que indica si no pudo restaurarse el estado debido a conflictos o cambios externos.
- `rollbackConflicts`: lista de archivos que generaron conflicto de escritura.
- `rollbackPath`: ubicacion del directorio temporal de restauracion `.runtime/rollback/`.
- `message` o `description`: resumen legible para humanos.

## Ciclo de vida canonico de tareas

Toda tarea rastreada mediante un `taskId` transita por los siguientes estados dentro del campo `status`:

- `assigned`: Tarea recien creada por el Orchestrator y asignada a un agente.
- `accepted`: El agente reconoce la tarea y confirma que puede realizarla.
- `in_progress`: El agente esta ejecutando activamente la tarea.
- `blocked`: El agente no puede continuar (ej. falta de informacion, bloqueo por dependencias externas).
- `completed`: El trabajo esta terminado y cumple con todos los criterios de aceptacion.
- `failed`: La ejecucion de la tarea fallo y requiere la intervencion o replanificacion del Orchestrator.
- `cancelled`: La tarea ha sido descartada o abortada.

## Eventos oficiales

### Trabajo
- `TASK_ASSIGNED`
- `TASK_ACCEPTED`
- `TASK_IN_PROGRESS`
- `TASK_BLOCKED`
- `TASK_COMPLETED`
- `TASK_FAILED`
- `TASK_CANCELLED`
- `SUBTASK_REQUESTED`

### Planificacion
- `PLAN_PROPOSED`

### Evolucion y Aprendizaje
- `SKILL_CREATED`
- `LEARNING_RECORDED`

### Artefactos
- `ENDPOINT_CREATED`
- `UI_COMPONENT_BUILT`
- `SCHEMA_UPDATED`
- `ARTIFACT_PUBLISHED`

### Calidad y documentacion
- `TEST_PASSED`
- `TEST_FAILED`
- `INCIDENT_OPENED`
- `INCIDENT_RESOLVED`
- `DOC_UPDATED`

## Reglas operativas

- Ningun agente empieza trabajo real sin `taskId`.
- El `Orchestrator` no asigna una tarea bloqueada como ejecutable; si una UI depende de un endpoint, debe usar `dependsOn` o crear una subtarea explicita de wireframe/mock.
- **Rollback Automático y Seguro**: `Backend` y `Frontend` mantendrán una snapshot (`.runtime/rollback/<taskId>/`) con un `manifest.json` y el hash de estado de sus archivos antes de tocarlos, usando el CLI local `node scripts/rollback.js`. Si tras exceder la autocorrección deben emitir un `TASK_FAILED`, restaurarán sus propios archivos sin sobreescribir cambios ajenos y reportarán `rolledBack` o `rollbackBlocked`.
- **Autocorreccion acotada**: `Backend` y `Frontend` reaccionan a `TEST_FAILED` o incidentes relacionados con su `taskId` e inician correccion (maximo 3 reintentos antes de marcar `TASK_FAILED` e intentar rollback local). 
- **Auto-expansion**: El equipo creara habilidades (`SKILL_CREATED`) y reglas operativas nuevas (`LEARNING_RECORDED`) tras solucionar retos no triviales, guardandolos en `Agents/<Rol>/skills/` y `Agents/<Rol>/learnings.md` respectivamente.
- **Delegacion**: Tareas demasiado extensas pueden dividirse. Los agentes pueden sugerir `SUBTASK_REQUESTED` y el `Orchestrator` determinara la division duradera con un `correlationId` y multiples `TASK_ASSIGNED`.
- **Spec-Driven Development**: El `Orchestrator` puede asignar al `Documenter` la creacion de Especificaciones previas (Specs). Si una tarea incluye `requiresSpec: true` o un `featureSlug`, el Frontend/Backend deben resolver la Spec correspondiente usando `node scripts/docs-registry.js resolve --feature <featureSlug> --type spec` antes de empezar a programar.
- `Frontend` no usa acceso directo a base de datos por defecto. Solo puede hacerlo si el `Orchestrator` lo pide de forma explicita y lo documenta como excepcion arquitectonica.
- `Tester` valida sobre artefactos terminados (`TASK_COMPLETED`, `ENDPOINT_CREATED`, `UI_COMPONENT_BUILT`) y publica resultados con el mismo `taskId` o `correlationId`.
- `Documenter` actualiza documentacion preferentemente despues de `TEST_PASSED`, salvo que el `Orchestrator` pida documentacion temprana.
- `Observer` no reasigna trabajo ni modifica codigo de producto; solo hace visible el estado del sistema y mejora la observabilidad.
- `Planner` no asigna trabajo al equipo. Solo propone `PLAN_PROPOSED`; la aprobacion del plan queda reflejada cuando el `Orchestrator` emite los `TASK_ASSIGNED` resultantes.
- `Planner` es opcional: debe usarse para epics, trabajo transversal o requerimientos ambiguos; para fixes o tareas pequenas el `Orchestrator` puede saltarselo.
- Todo `PLAN_PROPOSED` debe mantener el `taskId` de la tarea de planeacion y un `correlationId` comun; cada item de `proposedTasks` debe incluir como minimo `taskId`, `assignedTo`, `dependsOn`, `description` y `acceptanceCriteria`.

## Flujo recomendado de un requerimiento

Ejemplo: "Quiero login con email y password".

1. **Orchestrator** verifica si la base existente alcanza o si hace falta una tarea de endurecimiento/bootstrap adicional en `Backend/`, `Frontend/`, docs o tests.
2. Si el requerimiento es grande o ambiguo, **Orchestrator** publica `TASK_ASSIGNED` para `Planner` con una tarea de planeacion (por ejemplo `auth-plan-01`).
3. **Planner** analiza el estado del proyecto y publica `PLAN_PROPOSED` con `proposedTasks` y `correlationId` comun.
4. **Orchestrator** (opcionalmente) asigna al `Documenter` la creacion de una Especificación (`Spec`) previa con `TASK_ASSIGNED` indicando `requiresSpec: true`.
5. **Documenter** redacta la Spec en `docs/internal/specs/` y registra su ubicacion publicando `DOC_UPDATED` y haciendo append a `docs/internal/registry/docs_registry.jsonl`.
6. **Orchestrator** aprueba implicitamente el plan al emitir los `TASK_ASSIGNED` oficiales, por ejemplo `auth-backend-01` para Backend.
7. **Backend** responde con `TASK_ACCEPTED`, lee el Docs Registry para consultar la Spec, luego `TASK_IN_PROGRESS`, implementa y publica `ENDPOINT_CREATED` + `TASK_COMPLETED`.
8. **Orchestrator** publica `TASK_ASSIGNED` para Frontend con `dependsOn=["auth-backend-01"]` o la habia creado desde antes en estado bloqueado.
9. **Frontend** lee la Spec del Registry, construye la UI, publica `UI_COMPONENT_BUILT` + `TASK_COMPLETED`.
10. **Tester** ejecuta pruebas y publica `TEST_PASSED` o `TEST_FAILED`/`INCIDENT_OPENED`.
11. **Documenter** sincroniza la documentacion final usando los contratos ya publicados.
12. **Observer** muestra todo el flujo en `AgentMonitor/` para que el usuario lo vea visualmente.

## Herramientas del MCP

### `append_event`
Agrega una linea al event log compartido en `MCP_Server/shared_context.jsonl`.

### `get_events`
Lee el historial y ahora soporta filtros operativos utiles:

- `agentFilter`
- `typeFilter`
- `assignedTo`
- `taskId`
- `parentTaskId`
- `status`
- `correlationId`
- `since`
- `limit`

## Monitor visual

El servidor tambien expone una UI local para observar el sistema:

- URL: `http://127.0.0.1:4311/monitor`
- API: `http://127.0.0.1:4311/api/events`
- Healthcheck: `http://127.0.0.1:4311/api/health`

El monitor muestra:

- timeline de eventos,
- filtros por agente, tipo, estado y tarea,
- resumen agregado,
- grupos de tareas por `taskId`.

## Como iniciar

1. Instala dependencias del MCP:
   ```bash
   npm install
   ```
2. Inicia el servidor desde `MCP_Server/`:
   ```bash
   npm start
   ```
3. Abre el monitor visual:
   ```text
   http://127.0.0.1:4311/monitor
   ```
4. Conecta tu editor IA al MCP por stdio usando:
   ```bash
   node C:/ruta/absoluta/zCorvus/AI_Workspace/MCP_Server/index.js
   ```

## Siguientes pasos recomendados

- Endurecer los bootstraps de `Backend/` y `Frontend/` con la primera feature real del proyecto.
- Sembrar eventos base del proyecto (`PROJECT_BOOTSTRAPPED`, stack, normas y backlog inicial).
- Si el volumen de eventos crece, migrar de polling simple a SSE o WebSocket para el monitor.
