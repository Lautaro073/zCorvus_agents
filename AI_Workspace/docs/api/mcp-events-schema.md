# MCP Events API Schema

**Base URL:** `http://127.0.0.1:4311` (configurable via `MCP_MONITOR_PORT`)  
**WebSocket URL:** `ws://127.0.0.1:4311/ws`

---

## Endpoints

### GET /api/events

Retorna todos los eventos MCP del contexto compartido con soporte para filtros.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentFilter` | string | Filter by agent name |
| `typeFilter` | string | Filter by event type |
| `assignedTo` | string | Filter by assigned agent |
| `taskId` | string | Filter by task ID |
| `parentTaskId` | string | Filter by parent task ID |
| `status` | string | Filter by status (assigned/accepted/in_progress/blocked/completed/failed/cancelled) |
| `correlationId` | string | Filter by correlation ID |
| `since` | string | ISO timestamp - return events since this time |
| `limit` | number | Return last N events (default: 50) |

**Response:**

```json
{
  "events": [
    {
      "eventId": "uuid",
      "timestamp": "2026-03-26T07:17:30.646Z",
      "agent": "Backend",
      "type": "TASK_ACCEPTED",
      "taskId": "fix-backend-tests-01",
      "assignedTo": "Backend",
      "status": "accepted",
      "priority": "high",
      "correlationId": "fix-ci-errors-20260326",
      "parentTaskId": "",
      "payloadVersion": "1.0",
      "payload": {
        "taskId": "fix-backend-tests-01",
        "assignedTo": "Backend",
        "status": "accepted",
        "message": "Backend toma la tarea"
      }
    }
  ],
  "summary": {
    "total": 143,
    "byAgent": { "Backend": 5, "Frontend": 12 },
    "byType": { "TASK_ASSIGNED": 20, "TASK_COMPLETED": 18 },
    "byStatus": { "completed": 45, "in_progress": 8 },
    "taskCount": 25
  },
  "tasks": [
    {
      "taskId": "fix-backend-tests-01",
      "assignedTo": "Backend",
      "latestStatus": "completed",
      "priority": "high",
      "parentTaskId": "",
      "dependsOn": [],
      "updatedAt": "2026-03-26T07:17:30.646Z",
      "events": [...]
    }
  ],
  "filters": {
    "agentFilter": null,
    "typeFilter": null,
    "assignedTo": null,
    "taskId": null,
    "parentTaskId": null,
    "status": null,
    "correlationId": null,
    "since": null,
    "limit": 50
  },
  "generatedAt": "2026-03-30T04:45:00.000Z"
}
```

---

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "ok": true,
  "contextFile": "/path/to/shared_context.jsonl",
  "monitorDir": "/path/to/AgentMonitor",
  "websocketPath": "/ws"
}
```

---

### WebSocket /ws

Conexión bidireccional para eventos en tiempo real.

**Handshake:**

```
GET /ws HTTP/1.1
Host: 127.0.0.1:4311
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <client-key>
```

**Server Response (Connection):**

```json
{
  "type": "connected",
  "generatedAt": "2026-03-30T04:45:00.000Z",
  "latestEvent": {
    "eventId": "uuid",
    "agent": "Backend",
    "type": "TASK_ACCEPTED",
    "taskId": "fix-backend-tests-01",
    "assignedTo": "Backend",
    "status": "accepted",
    "priority": "high",
    "summary": "Backend toma la tarea",
    "timestamp": "2026-03-26T07:17:30.646Z"
  }
}
```

**Server Message (Event Update):**

```json
{
  "type": "events_updated",
  "reason": "event_appended",
  "latestEvent": { ... },
  "generatedAt": "2026-03-30T04:45:01.000Z"
}
```

---

## Event Schema

### McpEvent

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string (UUID) | Unique identifier |
| `timestamp` | string (ISO 8601) | Event timestamp |
| `agent` | string | Source agent name |
| `type` | string | Event type |
| `taskId` | string? | Associated task ID |
| `assignedTo` | string? | Agent assigned to task |
| `status` | string? | Task status |
| `priority` | string? | Priority level |
| `correlationId` | string? | Correlation ID for grouping |
| `parentTaskId` | string? | Parent task ID |
| `payloadVersion` | string | Schema version (default: "1.0") |
| `payload` | object | Event-specific data |

### Known Event Types

| Type | Description | Required Payload Fields |
|------|-------------|------------------------|
| `TASK_ASSIGNED` | New task assigned | taskId, assignedTo, status, acceptanceCriteria, description |
| `TASK_ACCEPTED` | Task accepted by agent | taskId, assignedTo, status |
| `TASK_IN_PROGRESS` | Task started | taskId, assignedTo, status |
| `TASK_BLOCKED` | Task blocked | taskId, status, message |
| `TASK_COMPLETED` | Task completed | taskId, status |
| `TASK_FAILED` | Task failed | taskId, status, message or rootCause |
| `TASK_CANCELLED` | Task cancelled | taskId, status |
| `SUBTASK_REQUESTED` | Subtask requested | taskId, status, message |
| `PLAN_PROPOSED` | Plan proposed | taskId, assignedTo, status, correlationId, proposedTasks |
| `TEST_PASSED` | Tests passed | taskId |
| `TEST_FAILED` | Tests failed | taskId, message or rootCause |
| `INCIDENT_OPENED` | Incident opened | taskId, message or rootCause |
| `INCIDENT_RESOLVED` | Incident resolved | taskId |
| `ARTIFACT_PUBLISHED` | Artifact published | taskId, artifactPaths |
| `DOC_UPDATED` | Document updated | taskId, status, docType, featureSlug, path or artifactPaths |
| `ENDPOINT_CREATED` | Endpoint created | taskId, path, method |
| `UI_COMPONENT_BUILT` | UI component built | taskId, path |
| `GITHUB_ISSUE_CREATED` | GitHub issue created | taskId, issueUrl |
| `GITHUB_BRANCH_CREATED` | Git branch created | taskId, branchName, baseBranch |
| `GITHUB_PR_OPENED` | Pull request opened | taskId, branchName, baseBranch, prUrl |
| `LEARNING_RECORDED` | Learning recorded | taskId, message |
| `SKILL_CREATED` | Skill created | taskId, path or skillName |

### Task Status Values

- `assigned`
- `accepted`
- `in_progress`
- `blocked`
- `completed`
- `failed`
- `cancelled`

---

## CORS Configuration

El servidor MCP configura CORS con los siguientes headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Esto permite conexiones desde cualquier origen, incluyendo:
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:4311` (MCP Server)
- cualquier otro origen

---

## Usage with React/Vite

```typescript
// hooks/useMcpEvents.ts
import { useEffect, useState } from 'react';

interface McpEvent {
  eventId: string;
  timestamp: string;
  agent: string;
  type: string;
  taskId?: string;
  assignedTo?: string;
  status?: string;
  correlationId?: string;
  payload: Record<string, unknown>;
}

export function useMcpEvents() {
  const [events, setEvents] = useState<McpEvent[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Fetch initial events
    fetch('http://127.0.0.1:4311/api/events?limit=50')
      .then(res => res.json())
      .then(data => setEvents(data.events));

    // Connect WebSocket
    const socket = new WebSocket('ws://127.0.0.1:4311/ws');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'events_updated' && data.latestEvent) {
        setEvents(prev => [...prev, data.latestEvent]);
      }
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  return { events, ws };
}
```

## AgentMonitor V2 integration profile

For `AI_Workspace/agentmonitor-v2`, endpoint resolution is same-origin by default.

- API base comes from `agentmonitor-v2/src/lib/mcpEndpoints.ts`:
  - default: `/api`
  - optional override: `VITE_MCP_HTTP_BASE`
- WebSocket URL also comes from `mcpEndpoints.ts`:
  - default in browser: `ws(s)://<current-host>/ws`
  - optional override: `VITE_MCP_WS_URL`

This aligns V2 with `/monitor` runtime without requiring hardcoded cross-origin ports.

### Runtime verification for `/monitor`

```bash
curl http://127.0.0.1:4311/api/health
curl -I http://127.0.0.1:4311/monitor
curl -I http://127.0.0.1:4311/pixel/
```

Expected:
- `/monitor` returns 200 and serves current monitor variant.
- `/pixel/` remains available independently.

### QA command reference for V2

Run in `AI_Workspace/agentmonitor-v2`:

```bash
npm run test:e2e:smoke
npm run test:e2e:regression
npm run test:e2e:visual
npx playwright test tests/e2e/clickable-gaps.spec.ts tests/e2e/notifications-toast.spec.ts
npx vitest run src/hooks/useDashboardMetrics.test.tsx
```

Evidence paths:
- `docs/internal/reports/aiw-tester-v2-test-01-final-report-20260330.md`
- `docs/internal/reports/aiw-tester-v2-ux-clickable-notifications-recheck-report-20260331.md`
- `docs/internal/reports/aiw-tester-v2-metrics-desync-recheck-report-20260331.md`
- `agentmonitor-v2/playwright-report/index.html`
- `agentmonitor-v2/tests/e2e/visual.spec.ts-snapshots/`

---

## Backward Compatibility

Esta API es backward-compatible con el cliente vanilla JS existente. No se han introducido breaking changes en la versión 2.1.0.

- El endpoint `/api/events` retorna el mismo formato de siempre
- El WebSocket envía mensajes en el mismo formato JSON
- CORS permite conexiones de cualquier cliente
