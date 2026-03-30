import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { KNOWN_EVENT_TYPES, validateEventPayload } from "./lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, "shared_context.jsonl");

const tools = [
  {
    name: "append_event",
    description:
      "Append a new event or state update to the shared JSONL context. Canonical payload fields such as taskId, assignedTo, status, correlationId, priority, dependsOn, and artifactPaths are strongly recommended.",
    inputSchema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          description:
            "Name of the agent (e.g., 'Orchestrator', 'Backend', 'Frontend', 'Tester', 'Documenter')",
        },
        type: {
          type: "string",
          description:
            "Type of event (e.g., 'TASK_ASSIGNED', 'ENDPOINT_CREATED', 'UI_COMPONENT_BUILT', 'TEST_PASSED', 'DOC_UPDATED', 'ERROR')",
        },
        payload: {
          type: "object",
          description:
            "The core data (e.g., endpoint schema, UI props, test results, task instructions)",
        },
      },
      required: ["agent", "type", "payload"],
    },
  },
  {
    name: "get_events",
    description:
      "Read the shared JSONL context. Supports agent, type, task, status, and time filters.",
    inputSchema: {
      type: "object",
      properties: {
        agentFilter: {
          type: "string",
          description: "Optional: Only return events from this agent",
        },
        typeFilter: {
          type: "string",
          description: "Optional: Only return events of this type",
        },
        assignedTo: {
          type: "string",
          description: "Optional: Only return events assigned to this agent",
        },
        taskId: {
          type: "string",
          description: "Optional: Only return events for this task id",
        },
        parentTaskId: {
          type: "string",
          description: "Optional: Only return events for this parent task id",
        },
        status: {
          type: "string",
          description: "Optional: Only return events with this status",
        },
        correlationId: {
          type: "string",
          description: "Optional: Only return events with this correlation id",
        },
        since: {
          type: "string",
          description: "Optional: Only return events since this ISO timestamp",
        },
        limit: {
          type: "number",
          description: "Optional: Return only the last N events (default 50)",
        },
      },
    },
  },
];

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

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : undefined;
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
        content: [
          {
            type: "text",
            text: `Event successfully appended to JSONL:\n${JSON.stringify(savedEvent)}`,
          },
        ],
      };
    }

    if (name === "get_events") {
      const events = await getEvents(args || {});

      return {
        content: [
          {
            type: "text",
            text:
              events.length > 0
                ? events.map((event) => JSON.stringify(event)).join("\n")
                : "No events found.",
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  await ensureContextFile();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("zCorvus Event-Driven MCP Server running on stdio (JSONL)");
}

main().catch((error) => {
  console.error("Fatal error starting MCP Server:", error);
  process.exit(1);
});