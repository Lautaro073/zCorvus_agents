import { createHash } from "crypto";
import { watch } from "fs";
import { createServer } from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, "shared_context.jsonl");
const MONITOR_DIR = path.resolve(__dirname, "..", "AgentMonitor");
const PIXEL_WEBVIEW_DIR = path.resolve(__dirname, "..", "pixel-agents-zcorvus", "dist", "webview");
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

function getEventField(event, fieldName) {
  const payload =
    event && typeof event.payload === "object" && event.payload !== null
      ? event.payload
      : {};

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
        // ignorar líneas rotas
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
  if (
    filters.parentTaskId &&
    getEventField(event, "parentTaskId") !== filters.parentTaskId
  ) {
    return false;
  }
  if (filters.status && getEventField(event, "status") !== filters.status) {
    return false;
  }
  if (
    filters.correlationId &&
    getEventField(event, "correlationId") !== filters.correlationId
  ) {
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

async function getEvents(filters = {}) {
  const normalizedFilters = normalizeFilters(filters);
  let events = await readEventsFromFile();

  events = events.filter((event) => matchesFilters(event, normalizedFilters));

  if (normalizedFilters.limit && events.length > normalizedFilters.limit) {
    events = events.slice(events.length - normalizedFilters.limit);
  }

  return events;
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
    group.dependsOn =
      normalizeStringList(getEventField(event, "dependsOn")).length > 0
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
    summary:
      latestEvent.payload?.message ||
      latestEvent.payload?.title ||
      latestEvent.payload?.description ||
      null,
    timestamp: latestEvent.timestamp || null,
  };
}

function createWebSocketAcceptValue(key) {
  return createHash("sha1")
    .update(`${key}${WEBSOCKET_GUID}`)
    .digest("base64");
}

function encodeWebSocketFrame(message) {
  const payload = Buffer.from(
    typeof message === "string" ? message : JSON.stringify(message),
    "utf-8"
  );

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
  const rawPath =
    requestPath === "/" || requestPath === "/monitor"
      ? "/index.html"
      : requestPath.replace(/^\/monitor/, "") || "/index.html";

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

async function servePixelWebview(requestPath, response) {
  const rawPath =
    requestPath === "/pixel" || requestPath === "/pixel/"
      ? "/index.html"
      : requestPath.replace(/^\/pixel/, "") || "/index.html";

  const safeRelativePath = rawPath.replace(/^\/+/, "");
  const filePath = path.resolve(PIXEL_WEBVIEW_DIR, safeRelativePath);

  if (!filePath.startsWith(PIXEL_WEBVIEW_DIR)) {
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

    sendJson(response, 500, { error: "Failed to serve pixel webview asset" });
  }
}

function rejectWebSocketConnection(socket, statusLine) {
  socket.write(`${statusLine}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

async function handleWebSocketUpgrade(request, socket) {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || `${HTTP_HOST}:${HTTP_PORT}`}`
  );

  if (url.pathname !== "/ws") {
    rejectWebSocketConnection(socket, "HTTP/1.1 404 Not Found");
    return;
  }

  const websocketKey = request.headers["sec-websocket-key"];
  const upgradeHeader = request.headers.upgrade;

  if (
    request.method !== "GET" ||
    typeof websocketKey !== "string" ||
    typeof upgradeHeader !== "string" ||
    upgradeHeader.toLowerCase() !== "websocket"
  ) {
    rejectWebSocketConnection(socket, "HTTP/1.1 400 Bad Request");
    return;
  }

  const acceptValue = createWebSocketAcceptValue(websocketKey);

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptValue}`,
      "\r\n",
    ].join("\r\n")
  );

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
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || `${HTTP_HOST}:${HTTP_PORT}`}`
  );

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      contextFile: CONTEXT_FILE,
      monitorDir: MONITOR_DIR,
      pixelWebviewDir: PIXEL_WEBVIEW_DIR,
      websocketPath: "/ws",
    });
    return;
  }

  if (url.pathname === "/api/events") {
    const payload = await buildMonitorResponse(
      Object.fromEntries(url.searchParams.entries())
    );
    sendJson(response, 200, payload);
    return;
  }

  if (
    url.pathname === "/" ||
    url.pathname === "/monitor" ||
    url.pathname.startsWith("/monitor/") ||
    url.pathname === "/app.js" ||
    url.pathname === "/styles.css"
  ) {
    await serveStaticFile(url.pathname, response);
    return;
  }

  if (url.pathname === "/pixel" || url.pathname === "/pixel/" || url.pathname.startsWith("/pixel/") ||url.pathname.startsWith("/pixel")) {
    await servePixelWebview(url.pathname, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function startHttpServer() {
  await ensureContextFile();
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

async function main() {
  await startHttpServer();
}

main().catch((error) => {
  console.error("Fatal error starting monitor server:", error);
  process.exit(1);
});