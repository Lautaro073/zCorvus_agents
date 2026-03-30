# zCorvus MCP Contract Audit

**Task:** `aiw-opt-pixel-v2-mcp-audit-20260326-01`  
**Agent:** `AI_Workspace_Optimizer`  
**Date:** 2026-03-27  
**CorrelationId:** `aiw-agentmonitor-pixel-experience-20260326`

---

## 1. Inventario de Eventos MCP

### 1.1 Tipos de Eventos Conocidos (KNOWN_EVENT_TYPES)

| # | Event Type | Descripción | Requiere Payload |
|---|------------|-------------|------------------|
| 1 | `TASK_ASSIGNED` | Nueva tarea asignada a agente | taskId, assignedTo, status, description |
| 2 | `TASK_ACCEPTED` | Agente acepta tarea | taskId, assignedTo, status |
| 3 | `TASK_IN_PROGRESS` | Agente comienza trabajo | taskId, assignedTo, status |
| 4 | `TASK_BLOCKED` | Tarea bloqueada | taskId, status, message |
| 5 | `TASK_COMPLETED` | Tarea finalizada | taskId, status |
| 6 | `TASK_FAILED` | Tarea fallida | taskId, status, message/rootCause |
| 7 | `TASK_CANCELLED` | Tarea cancelada | taskId, status |
| 8 | `SUBTASK_REQUESTED` | Solicitud de subtarea | taskId, status, message |
| 9 | `PLAN_PROPOSED` | Plan propuesto por Planner | taskId, proposedTasks[] |
| 10 | `SKILL_CREATED` | Nueva skill creada | taskId, path o skillName |
| 11 | `LEARNING_RECORDED` | Learning grabado | taskId, message |
| 12 | `ENDPOINT_CREATED` | Endpoint API creado | taskId, path, method |
| 13 | `UI_COMPONENT_BUILT` | Componente UI creado | taskId, path |
| 14 | `SCHEMA_UPDATED` | Schema actualizado | taskId |
| 15 | `ARTIFACT_PUBLISHED` | Artefacto publicado | taskId, artifactPaths[] |
| 16 | `TEST_PASSED` | Tests pasaron | taskId, status |
| 17 | `TEST_FAILED` | Tests fallaron | taskId, status, message |
| 18 | `INCIDENT_OPENED` | Incidente abierto | taskId, status, message |
| 19 | `INCIDENT_RESOLVED` | Incidente resuelto | taskId, status |
| 20 | `DOC_UPDATED` | Documentación actualizada | taskId, docType, featureSlug |
| 21 | `GITHUB_ISSUE_CREATED` | Issue GitHub creada | taskId, issueUrl |
| 22 | `GITHUB_BRANCH_CREATED` | Branch GitHub creada | taskId, branchName, baseBranch |
| 23 | `GITHUB_PR_OPENED` | PR GitHub abierta | taskId, branchName, baseBranch, prUrl |

### 1.2 Estados de Tarea (TASK_STATUSES)

```
assigned, accepted, in_progress, blocked, completed, failed, cancelled
```

### 1.3 Eventos de Secuencia de Tarea

```
TASK_ASSIGNED (0) → TASK_ACCEPTED (1) → TASK_IN_PROGRESS (2)
```

### 1.4 Eventos Terminales

```
TASK_COMPLETED, TASK_CANCELLED, TASK_BLOCKED, TASK_FAILED, TEST_PASSED, TEST_FAILED
```

---

## 2. Schema de Payload por Tipo

### 2.1 Eventos de Tarea (TASK_*)

```typescript
{
  taskId: string,           // ID único de tarea
  assignedTo: string,       // Agente responsable
  status: string,           // Estado canónico
  priority?: string,       // high | medium | low
  correlationId: string,    // ID de correlación para tareas relacionadas
  parentTaskId?: string,   // ID de tarea padre
  dependsOn?: string[],    // Dependencias de otras tareas
  description?: string,    // Descripción de la tarea
  acceptanceCriteria?: string[], // Criterios de aceptación
  message?: string,        // Mensaje legible
  artifactPaths?: string[], // Rutas de artefactos
  // ... campos opcionales
}
```

### 2.2 PLAN_PROPOSED

```typescript
{
  taskId: string,
  assignedTo: string,
  status: string,
  correlationId: string,
  message: string,
  proposedTasks: {
    taskId: string,
    assignedTo: string,
    dependsOn: string[],
    description: string,
    acceptanceCriteria: string[]
  }[]
}
```

### 2.3 Eventos GitHub

```typescript
// GITHUB_ISSUE_CREATED
{ taskId: string, issueUrl: string }

// GITHUB_BRANCH_CREATED  
{ taskId: string, branchName: string, baseBranch: string }

// GITHUB_PR_OPENED
{ taskId: string, branchName: string, baseBranch: string, prUrl: string }
```

---

## 3. Comportamiento de WebSocket (/ws)

### 3.1 Endpoint

```
WS Path: /ws
Host: 127.0.0.1:4311 (configurable via MCP_MONITOR_HOST/PORT)
```

### 3.2 Protocolo de Conexión

1. Client envía handshake HTTP con headers:
   - `Sec-WebSocket-Key`: clave válida
   - `Upgrade`: websocket
2. Server responde con `101 Switching Protocols`
3. Conexión WebSocket establecida

### 3.3 Mensajes Entrantes (Client → Server)

No documentado en código - el servidor solo acepta conexiones y envía updates.

### 3.4 Mensajes Salientes (Server → Client)

```typescript
// Conexión inicial
{ type: "connected", generatedAt: string, latestEvent: EventPreview }

// Actualización de eventos
{ type: "events_updated", reason: string, latestEvent: EventPreview, generatedAt: string }
```

### 3.5 Broadcast

- **Trigger**: Cada vez que se appendea un evento al JSONL
- **Debounce**: 120ms fija
- **Broadcast**: Todos los clientes WebSocket conectados reciben el mensaje

### 3.6 Keep-Alive

```javascript
socket.setKeepAlive(true, 30000)  // 30 segundos
```

---

## 4. APIs HTTP Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Health check con contexto |
| `/api/events` | GET | Lista eventos con filtros |
| `/ws` | GET | WebSocket para updates |
| `/` | GET | Serve static index.html |
| `/monitor` | GET | Serve monitor UI |
| `/app.js` | GET | Serve JavaScript |
| `/styles.css` | GET | Serve CSS |

### 4.1 Query Params para /api/events

```
agentFilter, typeFilter, assignedTo, taskId, parentTaskId, status, correlationId, since, limit
```

---

## 5. Estructura del Evento JSONL

```typescript
interface MCPEvent {
  eventId: string;           // UUID
  timestamp: string;        // ISO 8601
  agent: string;            // Nombre del agente
  type: string;             // Tipo de evento
  taskId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  correlationId?: string;
  parentTaskId?: string;
  retryCount?: number;
  autoRecovery?: boolean;
  triggeredByType?: string;
  rootCause?: string;
  dependsOn?: string[];
  artifactPaths?: string[];
  rolledBack?: boolean;
  rollbackBlocked?: boolean;
  rollbackConflicts?: string[];
  rollbackPath?: string;
  featureSlug?: string;
  docType?: string;
  specRefs?: string[];
  payloadVersion: string;
  payload: object;          // Payload canónico
}
```

---

## 6. Hallazgos y Recomendaciones

### 6.1 Hallazgos Positivos

- ✅ Contrato de eventos bien definido con 23 tipos de eventos
- ✅ Validación de payload por tipo usando event-contract.js
- ✅ Secuencia de tareas validada (ASSIGNED → ACCEPTED → IN_PROGRESS)
- ✅ WebSocket funcional para real-time updates
- ✅ Filtros robustos en get_events

### 6.2 Áreas de Mejora

| ID | Finding | Prioridad | Recomendación |
|----|---------|----------|---------------|
| A-01 | No hay schema formal (JSON Schema/Zod externo) | P2 | Exportar schemas a archivo standalone |
| A-02 | WebSocket no tiene ping/pong explícito | P3 | Agregar heartbeat para detect desconexión |
| A-03 | broadcast usa debounce fijo de 120ms | P3 | Considerar batch dinámico |
| A-04 | No hay métricas de latencia de evento | P3 | Instrumentar timers en append/get |
| A-05 | Payload duplica campos top-level | P2 | Normalizar a solo payload |

---

## 7. Acceptance Criteria Verification

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Inventario de eventos MCP documentado | ✅ Completado | Sección 1.1 con 23 tipos |
| Schema de payload por tipo | ✅ Completado | Sección 2 con ejemplos |
| Comportamiento de /ws documentado | ✅ Completado | Sección 3 con protocolo |

---

**Auditor:** AI_Workspace_Optimizer  
**Status:** COMPLETED  
**Artifact:** `docs/internal/reports/aiw-mcp-contract-audit-20260327.md`
