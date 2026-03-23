import { createHash, randomUUID } from "crypto";
import { watch } from "fs";
import { createServer } from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, "shared_context.jsonl");
const MONITOR_DIR = path.resolve(__dirname, "..", "AgentMonitor");
const HTTP_HOST = process.env.MCP_MONITOR_HOST || "127.0.0.1";
const HTTP_PORT = Number.parseInt(process.env.MCP_MONITOR_PORT || "4311", 10);
const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const TASK_STATUSES = new Set(["assigned", "accepted", "in_progress", "blocked", "completed", "failed", "cancelled"]);
const TASK_EVENT_TYPES = new Set(["TASK_ASSIGNED", "TASK_ACCEPTED", "TASK_IN_PROGRESS", "TASK_BLOCKED", "TASK_COMPLETED", "TASK_FAILED", "TASK_CANCELLED"]);
const KNOWN_EVENT_TYPES = new Set([
  "TASK_ASSIGNED",
  "TASK_ACCEPTED",
  "TASK_IN_PROGRESS",
  "TASK_BLOCKED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "TASK_CANCELLED",
  "SUBTASK_REQUESTED",
  "PLAN_PROPOSED",
  "SKILL_CREATED",
  "LEARNING_RECORDED",
  "ENDPOINT_CREATED",
  "UI_COMPONENT_BUILT",
  "SCHEMA_UPDATED",
  "ARTIFACT_PUBLISHED",
  "TEST_PASSED",
  "TEST_FAILED",
  "INCIDENT_OPENED",
  "INCIDENT_RESOLVED",
  "DOC_UPDATED",
]);

const tools = [
  {
    name: "append_event",
    description: "Append a new event or state update to the shared JSONL context. Canonical payload fields such as taskId, assignedTo, status, correlationId, priority, dependsOn, and artifactPaths are strongly recommended.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "Name of the agent (e.g., 'Orchestrator', 'Backend', 'Frontend', 'Tester', 'Documenter')" },
        type: { type: "string", description: "Type of event (e.g., 'TASK_ASSIGNED', 'ENDPOINT_CREATED', 'UI_COMPONENT_BUILT', 'TEST_PASSED', 'DOC_UPDATED', 'ERROR')" },
        payload: { type: "object", description: "The core data (e.g., endpoint schema, UI props, test results, task instructions)" },
      },
      required: ["agent", "type", "payload"],
    },
  },
  {
    name: "get_events",
    description: "Read the shared JSONL context. Supports agent, type, task, status, and time filters.",
    inputSchema: {
      type: "object",
      properties: {
        agentFilter: { type: "string", description: "Optional: Only return events from this agent" },
        typeFilter: { type: "string", description: "Optional: Only return events of this type" },
        assignedTo: { type: "string", description: "Optional: Only return events assigned to this agent" },
        taskId: { type: "string", description: "Optional: Only return events for this task id" },
        parentTaskId: { type: "string", description: "Optional: Only return events for this parent task id" },
        status: { type: "string", description: "Optional: Only return events with this status" },
        correlationId: { type: "string", description: "Optional: Only return events with this correlation id" },
        since: { type: "string", description: "Optional: Only return events since this ISO timestamp" },
        limit: { type: "number", description: "Optional: Return only the last N events (default 50)" },
      },
    },
  },
];

const websocketClients = new Set();
let contextWatcher;
let contextBroadcastTimer;

function normalizeString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry))
    .filter((entry) => entry !== undefined);
}

function assertNonEmptyString(value, fieldName) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw new Error(`'${fieldName}' must be a non-empty string.`);
  }

  return normalized;
}

function assertPlainObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`'${fieldName}' must be a plain JSON object.`);
  }

  return value;
}

function assertStatus(value, fieldName = "payload.status") {
  const normalized = assertNonEmptyString(value, fieldName);
  if (!TASK_STATUSES.has(normalized)) {
    throw new Error(`'${fieldName}' must be one of: ${Array.from(TASK_STATUSES).join(", ")}.`);
  }

  return normalized;
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`'${fieldName}' must be an array.`);
  }

  return value;
}

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : undefined;
}

function validatePlannedTask(task, index) {
  const label = `payload.proposedTasks[${index}]`;
  assertPlainObject(task, label);
  assertNonEmptyString(task.taskId, `${label}.taskId`);
  assertNonEmptyString(task.assignedTo, `${label}.assignedTo`);
  assertArray(task.dependsOn ?? [], `${label}.dependsOn`);
  assertNonEmptyString(task.description, `${label}.description`);
  assertArray(task.acceptanceCriteria ?? [], `${label}.acceptanceCriteria`);
}

function validateEventPayload(type, payload) {
  if (TASK_EVENT_TYPES.has(type)) {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.assignedTo, "payload.assignedTo");
    assertStatus(payload.status, "payload.status");
  }

  if (type === "TASK_ASSIGNED") {
    if (!normalizeString(payload.description) && !normalizeString(payload.message)) {
      throw new Error("'payload.description' or 'payload.message' is required for TASK_ASSIGNED.");
    }
  }

  if (type === "PLAN_PROPOSED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.assignedTo, "payload.assignedTo");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.correlationId, "payload.correlationId");
    const proposedTasks = assertArray(payload.proposedTasks, "payload.proposedTasks");
    proposedTasks.forEach((task, index) => validatePlannedTask(task, index));
  }

  if (type === "SUBTASK_REQUESTED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertStatus(payload.status, "payload.status");
    assertNonEmptyString(payload.message, "payload.message");
    assertArray(payload.suggestedSubtasks ?? [], "payload.suggestedSubtasks");
  }

  if (type === "DOC_UPDATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertStatus(payload.status, "payload.status");
    if (!normalizeString(payload.path) && normalizeStringList(payload.artifactPaths).length === 0) {
      throw new Error("DOC_UPDATED requires 'payload.path' or 'payload.artifactPaths'.");
    }
  }

  if (type === "ENDPOINT_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.path, "payload.path");
    assertNonEmptyString(payload.method, "payload.method");
  }

  if (type === "UI_COMPONENT_BUILT") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.path, "payload.path");
  }

  if (type === "SKILL_CREATED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    if (!normalizeString(payload.path) && !normalizeString(payload.skillName)) {
      throw new Error("SKILL_CREATED requires 'payload.path' or 'payload.skillName'.");
    }
  }

  if (type === "LEARNING_RECORDED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
    assertNonEmptyString(payload.message, "payload.message");
  }

  if (type === "TEST_PASSED" || type === "TEST_FAILED" || type === "INCIDENT_OPENED" || type === "INCIDENT_RESOLVED") {
    assertNonEmptyString(payload.taskId, "payload.taskId");
  }
}

function getEventField(event, fieldName) {
  const payload = event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};
  return event[fieldName] ?? payload[fieldName];
}

function normalizeFilters(filters = {}) {
  const parsedLimit = Number.parseInt(filters.limit, 10);
  const since = normalizeString(filters.since);

  return {
    agentFilter: normalizeString(filters.agentFilter),
    typeFilter: normalizeString(filters.typeFilter),
    assignedTo: normalizeString(filters.assignedTo),
    taskId: normalizeString(filters.taskId),
    parentTaskId: normalizeString(filters.parentTaskId),
    status: normalizeString(filters.status),
    correlationId: normalizeString(filters.correlationId),
    since,
    sinceTimestamp: since ? Date.parse(since) : Number.NaN,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
  };
}

async function ensureContextFile() {
  try {
    await fs.access(CONTEXT_FILE);
  } catch {
    await fs.writeFile(CONTEXT_FILE, "", "utf-8");
  }
}

function createWebSocketAcceptValue(key) {
  return createHash("sha1").update(`${key}${WEBSOCKET_GUID}`).digest("base64");
}

function encodeWebSocketFrame(message) {
  const payload = Buffer.from(typeof message === "string" ? message : JSON.stringify(message), "utf-8");
  const payloadLength = payload.length;
  let headerLength = 2;

  if (payloadLength >= 126 && payloadLength < 65536) {
    headerLength += 2;
  } else if (payloadLength >= 65536) {
    headerLength += 8;
  }

  const frame = Buffer.alloc(headerLength + payloadLength);
  frame[0] = 0x81;

  if (payloadLength < 126) {
    frame[1] = payloadLength;
    payload.copy(frame, 2);
    return frame;
  }

  if (payloadLength < 65536) {
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
    payload.copy(frame, 4);
    return frame;
  }

  frame[1] = 127;
  frame.writeBigUInt64BE(BigInt(payloadLength), 2);
  payload.copy(frame, 10);
  return frame;
}

function sendWebSocketMessage(socket, message) {
  if (socket.destroyed || socket.writableEnded) {
    websocketClients.delete(socket);
    return;
  }

  socket.write(encodeWebSocketFrame(message));
}

function broadcastWebSocketMessage(message) {
  if (websocketClients.size === 0) {
    return;
  }

  for (const socket of websocketClients) {
    try {
      sendWebSocketMessage(socket, message);
    } catch {
      websocketClients.delete(socket);
      socket.destroy();
    }
  }
}

async function appendEvent(agent, type, payload) {
  const normalizedAgent = assertNonEmptyString(agent, "agent");
  const normalizedType = assertNonEmptyString(type, "type");
  const normalizedPayload = assertPlainObject(payload, "payload");
  if (KNOWN_EVENT_TYPES.has(normalizedType)) {
    validateEventPayload(normalizedType, normalizedPayload);
  }
  const taskId = normalizeString(normalizedPayload.taskId);
  const assignedTo = normalizeString(normalizedPayload.assignedTo);
  const status = normalizeString(normalizedPayload.status);
  const priority = normalizeString(normalizedPayload.priority);
  const correlationId = normalizeString(normalizedPayload.correlationId) || taskId;
  const parentTaskId = normalizeString(normalizedPayload.parentTaskId);
  const retryCount = normalizeInteger(normalizedPayload.retryCount);
  const autoRecovery = normalizeBoolean(normalizedPayload.autoRecovery);
  const triggeredByType = normalizeString(normalizedPayload.triggeredByType);
  const rootCause = normalizeString(normalizedPayload.rootCause);
  const dependsOn = normalizeStringList(normalizedPayload.dependsOn);
  const artifactPaths = normalizeStringList(normalizedPayload.artifactPaths);
  const rolledBack = normalizeBoolean(normalizedPayload.rolledBack);
  const rollbackBlocked = normalizeBoolean(normalizedPayload.rollbackBlocked);
  const rollbackConflicts = normalizeStringList(normalizedPayload.rollbackConflicts);
  const rollbackPath = normalizeString(normalizedPayload.rollbackPath);
  const featureSlug = normalizeString(normalizedPayload.featureSlug);
  const docType = normalizeString(normalizedPayload.docType);
  const specRefs = normalizeStringList(normalizedPayload.specRefs);
  const event = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    agent: normalizedAgent,
    type: normalizedType,
    taskId,
    assignedTo,
    status,
    priority,
    correlationId,
    parentTaskId,
    retryCount,
    autoRecovery,
    triggeredByType,
    rootCause,
    dependsOn,
    artifactPaths,
    rolledBack,
    rollbackBlocked,
    rollbackConflicts,
    rollbackPath,
    featureSlug,
    docType,
    specRefs,
    payloadVersion: normalizeString(normalizedPayload.payloadVersion) || "1.0",
    payload: normalizedPayload,
  };
  const line = `${JSON.stringify(event)}\n`;
  await fs.appendFile(CONTEXT_FILE, line, "utf-8");
  scheduleMonitorBroadcast("event_appended");
  return event;
}

async function readEventsFromFile() {
  await ensureContextFile();
  const data = await fs.readFile(CONTEXT_FILE, "utf-8");
  if (!data.trim()) {
    return [];
  }

  return data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .reduce((events, line) => {
      try {
        events.push(JSON.parse(line));
      } catch {
      }
      return events;
    }, []);
}

function matchesFilters(event, filters) {
  if (filters.agentFilter && event.agent !== filters.agentFilter) {
    return false;
  }
  if (filters.typeFilter && event.type !== filters.typeFilter) {
    return false;
  }
  if (filters.assignedTo && getEventField(event, "assignedTo") !== filters.assignedTo) {
    return false;
  }
  if (filters.taskId && getEventField(event, "taskId") !== filters.taskId) {
    return false;
  }
  if (filters.parentTaskId && getEventField(event, "parentTaskId") !== filters.parentTaskId) {
    return false;
  }
  if (filters.status && getEventField(event, "status") !== filters.status) {
    return false;
  }
  if (filters.correlationId && getEventField(event, "correlationId") !== filters.correlationId) {
    return false;
  }
  if (filters.since) {
    if (!Number.isFinite(filters.sinceTimestamp)) {
      return false;
    }
    const eventTimestamp = Date.parse(event.timestamp || "");
    if (!Number.isFinite(eventTimestamp) || eventTimestamp < filters.sinceTimestamp) {
      return false;
    }
  }
  return true;
}

function buildEventSummary(events) {
  const summary = {
    total: events.length,
    byAgent: {},
    byType: {},
    byStatus: {},
    taskCount: 0,
  };

  const taskIds = new Set();

  for (const event of events) {
    const agent = event.agent || "unknown";
    const type = event.type || "unknown";
    const status = getEventField(event, "status") || "unknown";
    const taskId = getEventField(event, "taskId");

    summary.byAgent[agent] = (summary.byAgent[agent] || 0) + 1;
    summary.byType[type] = (summary.byType[type] || 0) + 1;
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    if (taskId) {
      taskIds.add(taskId);
    }
  }

  summary.taskCount = taskIds.size;
  return summary;
}

function buildTaskGroups(events) {
  const groups = new Map();

  for (const event of events) {
    const taskId = getEventField(event, "taskId");
    if (!taskId) {
      continue;
    }

    if (!groups.has(taskId)) {
      groups.set(taskId, {
        taskId,
        assignedTo: getEventField(event, "assignedTo") || null,
        latestStatus: getEventField(event, "status") || "unknown",
        priority: getEventField(event, "priority") || null,
        parentTaskId: getEventField(event, "parentTaskId") || null,
        dependsOn: normalizeStringList(getEventField(event, "dependsOn")),
        updatedAt: event.timestamp || null,
        events: [],
      });
    }

    const group = groups.get(taskId);
    group.events.push(event);
    group.assignedTo = getEventField(event, "assignedTo") || group.assignedTo;
    group.latestStatus = getEventField(event, "status") || group.latestStatus;
    group.priority = getEventField(event, "priority") || group.priority;
    group.parentTaskId = getEventField(event, "parentTaskId") || group.parentTaskId;
    group.dependsOn = normalizeStringList(getEventField(event, "dependsOn")).length > 0
      ? normalizeStringList(getEventField(event, "dependsOn"))
      : group.dependsOn;
    group.updatedAt = event.timestamp || group.updatedAt;
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || "") || 0;
    const rightTime = Date.parse(right.updatedAt || "") || 0;
    return rightTime - leftTime;
  });
}

async function getEvents(filters = {}) {
  const normalizedFilters = normalizeFilters(filters);
  let events = await readEventsFromFile();

  events = events.filter((event) => matchesFilters(event, normalizedFilters));

  if (normalizedFilters.limit && events.length > normalizedFilters.limit) {
    events = events.slice(events.length - normalizedFilters.limit);
  }

  return events;
}

async function buildMonitorResponse(rawFilters = {}) {
  const filters = normalizeFilters(rawFilters);
  const events = await getEvents(filters);

  return {
    events,
    summary: buildEventSummary(events),
    tasks: buildTaskGroups(events),
    filters: {
      agentFilter: filters.agentFilter || null,
      typeFilter: filters.typeFilter || null,
      assignedTo: filters.assignedTo || null,
      taskId: filters.taskId || null,
      parentTaskId: filters.parentTaskId || null,
      status: filters.status || null,
      correlationId: filters.correlationId || null,
      since: filters.since || null,
      limit: filters.limit,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function getLatestEventPreview() {
  const events = await readEventsFromFile();
  const latestEvent = events[events.length - 1];
  if (!latestEvent) {
    return null;
  }

  return {
    eventId: latestEvent.eventId || null,
    agent: latestEvent.agent || null,
    type: latestEvent.type || null,
    taskId: getEventField(latestEvent, "taskId") || null,
    assignedTo: getEventField(latestEvent, "assignedTo") || null,
    status: getEventField(latestEvent, "status") || null,
    priority: getEventField(latestEvent, "priority") || null,
    summary: latestEvent.payload?.message || latestEvent.payload?.title || latestEvent.payload?.description || null,
    timestamp: latestEvent.timestamp || null,
  };
}

function scheduleMonitorBroadcast(reason) {
  clearTimeout(contextBroadcastTimer);

  contextBroadcastTimer = setTimeout(async () => {
    try {
      const latestEvent = await getLatestEventPreview();
      broadcastWebSocketMessage({
        type: "events_updated",
        reason,
        latestEvent,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("WebSocket broadcast failed:", error);
    }
  }, 120);
}

function startContextWatcher() {
  if (contextWatcher) {
    return;
  }

  try {
    contextWatcher = watch(CONTEXT_FILE, { persistent: false }, (eventType) => {
      if (eventType === "change" || eventType === "rename") {
        scheduleMonitorBroadcast("context_file_changed");
      }
    });

    contextWatcher.on("error", (error) => {
      console.error("Context watcher failed:", error);
    });
  } catch (error) {
    console.error("Unable to watch context file:", error);
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function serveStaticFile(requestPath, response) {
  const rawPath = requestPath === "/" || requestPath === "/monitor" ? "/index.html" : requestPath.replace(/^\/monitor/, "") || "/index.html";
  const safeRelativePath = rawPath.replace(/^\/+/, "");
  const filePath = path.resolve(MONITOR_DIR, safeRelativePath);

  if (!filePath.startsWith(MONITOR_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const fileData = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(fileData);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    sendJson(response, 500, { error: "Failed to serve monitor asset" });
  }
}

function rejectWebSocketConnection(socket, statusLine) {
  socket.write(`${statusLine}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

async function handleWebSocketUpgrade(request, socket) {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${HTTP_HOST}:${HTTP_PORT}`}`);
  if (url.pathname !== "/ws") {
    rejectWebSocketConnection(socket, "HTTP/1.1 404 Not Found");
    return;
  }

  const websocketKey = request.headers["sec-websocket-key"];
  const upgradeHeader = request.headers.upgrade;

  if (request.method !== "GET" || typeof websocketKey !== "string" || typeof upgradeHeader !== "string" || upgradeHeader.toLowerCase() !== "websocket") {
    rejectWebSocketConnection(socket, "HTTP/1.1 400 Bad Request");
    return;
  }

  const acceptValue = createWebSocketAcceptValue(websocketKey);
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptValue}`,
    "\r\n",
  ].join("\r\n"));

  websocketClients.add(socket);
  socket.setKeepAlive(true, 30000);

  const cleanup = () => {
    websocketClients.delete(socket);
  };

  socket.on("close", cleanup);
  socket.on("end", cleanup);
  socket.on("error", cleanup);

  try {
    const latestEvent = await getLatestEventPreview();
    sendWebSocketMessage(socket, {
      type: "connected",
      generatedAt: new Date().toISOString(),
      latestEvent,
    });
  } catch (error) {
    console.error("Failed to initialize websocket client:", error);
  }
}

async function handleHttpRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${HTTP_HOST}:${HTTP_PORT}`}`);

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      contextFile: CONTEXT_FILE,
      monitorDir: MONITOR_DIR,
      websocketPath: "/ws",
    });
    return;
  }

  if (url.pathname === "/api/events") {
    const payload = await buildMonitorResponse(Object.fromEntries(url.searchParams.entries()));
    sendJson(response, 200, payload);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/monitor" || url.pathname.startsWith("/monitor/") || url.pathname === "/app.js" || url.pathname === "/styles.css") {
    await serveStaticFile(url.pathname, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function startHttpServer() {
  await fs.mkdir(MONITOR_DIR, { recursive: true });

  const httpServer = createServer((request, response) => {
    handleHttpRequest(request, response).catch((error) => {
      console.error("HTTP request failed:", error);
      sendJson(response, 500, { error: "Internal server error" });
    });
  });

  httpServer.on("upgrade", (request, socket) => {
    handleWebSocketUpgrade(request, socket).catch((error) => {
      console.error("WebSocket upgrade failed:", error);
      socket.destroy();
    });
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(HTTP_PORT, HTTP_HOST, resolve);
  });

  startContextWatcher();
  console.error(`Agent monitor available at http://${HTTP_HOST}:${HTTP_PORT}/monitor`);
}

const server = new Server(
  {
    name: "zCorvus-Event-Driven-MCP",
    version: "2.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "append_event") {
      const { agent, type, payload } = args;
      const savedEvent = await appendEvent(agent, type, payload);
      return {
        content: [{ type: "text", text: `Event successfully appended to JSONL:\n${JSON.stringify(savedEvent)}` }],
      };
    }

    if (name === "get_events") {
      const events = await getEvents(args || {});
      return {
        content: [{ type: "text", text: events.length > 0 ? events.map((event) => JSON.stringify(event)).join("\n") : "No events found." }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  await ensureContextFile();
  await startHttpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("zCorvus Event-Driven MCP Server running on stdio (JSONL)");
}

main().catch((error) => {
  console.error("Fatal error starting MCP Server:", error);
  process.exit(1);
});
