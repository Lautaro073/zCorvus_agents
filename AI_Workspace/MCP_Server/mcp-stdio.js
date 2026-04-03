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
import {
  annotateSnapshotCacheMeta,
  createCompactQueryCache,
  resolveCompactCachedPayload,
} from "./lib/compact-query-cache.js";
import {
  DEDUPE_DEFAULTS,
  applySnapshotSafetyPolicy,
  applyMessageBudgetPolicy,
  evaluateDeterministicDedupe,
  KNOWN_EVENT_TYPES,
  MESSAGE_BUDGET_DEFAULTS,
  sanitizeSnapshotSummary,
  normalizeEventPayloadForStorage,
  validateEventPayload,
} from "./lib/event-contract.js";
import {
  buildSidecarPayloads,
  readValidatedSidecars,
  writeSidecarsAtomically,
} from "./lib/context-sidecars.js";
import {
  buildAgentInboxSnapshot,
  buildCorrelationSnapshot,
  buildTaskSnapshot,
} from "./lib/context-read-modes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, "shared_context.jsonl");
const SIDECAR_DIR = path.resolve(
  __dirname,
  process.env.MCP_CONTEXT_SIDECARS_DIR || "sidecars"
);
const MCP_CONTEXT_LEGACY_PAYLOAD_MODE =
  (process.env.MCP_CONTEXT_LEGACY_PAYLOAD_MODE || "false").toLowerCase() === "true";
const MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED =
  (process.env.MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_TOKEN_BUDGETS_ENABLED =
  (process.env.MCP_CONTEXT_TOKEN_BUDGETS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_REDACTION_ENABLED =
  (process.env.MCP_CONTEXT_REDACTION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED =
  (process.env.MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED =
  (process.env.MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED =
  (process.env.MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED || "false").toLowerCase() === "true";
const MCP_CONTEXT_SIDECARS_ENABLED =
  (process.env.MCP_CONTEXT_SIDECARS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_RELEVANCE_READS_ENABLED =
  (process.env.MCP_CONTEXT_RELEVANCE_READS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_DEDUP_ENABLED =
  (process.env.MCP_CONTEXT_DEDUP_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_DEDUP_WINDOW_MS = Number.parseInt(
  process.env.MCP_CONTEXT_DEDUP_WINDOW_MS || String(DEDUPE_DEFAULTS.windowMs),
  10
);
const MCP_CONTEXT_MESSAGE_TARGET_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_TARGET_CHARS || String(MESSAGE_BUDGET_DEFAULTS.targetChars),
  10
);
const MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS || String(MESSAGE_BUDGET_DEFAULTS.softLimitChars),
  10
);
const MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS || "1200",
  10
);
const MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS || "1800",
  10
);
const MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS || "1600",
  10
);
const MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS || "2400",
  10
);
const MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS || "2200",
  10
);
const MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS = Number.parseInt(
  process.env.MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS || "3200",
  10
);
const MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS || "160",
  10
);
const MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS || "220",
  10
);
const MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS || "200",
  10
);
const MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS || "260",
  10
);
const MCP_CONTEXT_COMPACT_CACHE_ENABLED =
  (process.env.MCP_CONTEXT_COMPACT_CACHE_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES = Number.parseInt(
  process.env.MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES || "256",
  10
);

const compactSnapshotCache = createCompactQueryCache({
  enabled: MCP_CONTEXT_COMPACT_CACHE_ENABLED,
  maxEntries: Number.isInteger(MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES)
    ? MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES
    : 256,
});

let cachedReadContextFingerprint;
let cachedReadContext;

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
  {
    name: "get_agent_inbox",
    description:
      "Return compact relevance-first inbox snapshot for one agent with fallback audit.",
    inputSchema: {
      type: "object",
      properties: {
        assignedTo: {
          type: "string",
          description: "Agent name to read inbox for",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks in snapshot (default 10)",
        },
        allowBroadFallback: {
          type: "boolean",
          description: "Allow broad historical fallback when sidecar path is unavailable",
        },
        sensitiveAction: {
          type: "boolean",
          description: "If true, applies stricter degraded/stale decision policy.",
        },
      },
      required: ["assignedTo"],
    },
  },
  {
    name: "get_task_snapshot",
    description:
      "Return compact relevance-first snapshot for one taskId with fallback audit.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task identifier",
        },
        allowBroadFallback: {
          type: "boolean",
          description: "Allow broad historical fallback when sidecar path is unavailable",
        },
        sensitiveAction: {
          type: "boolean",
          description: "If true, applies stricter degraded/stale decision policy.",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "get_correlation_snapshot",
    description:
      "Return compact relevance-first snapshot for one correlationId with fallback audit.",
    inputSchema: {
      type: "object",
      properties: {
        correlationId: {
          type: "string",
          description: "Correlation identifier",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks in correlation snapshot (default 20)",
        },
        allowBroadFallback: {
          type: "boolean",
          description: "Allow broad historical fallback when sidecar path is unavailable",
        },
        sensitiveAction: {
          type: "boolean",
          description: "If true, applies stricter degraded/stale decision policy.",
        },
      },
      required: ["correlationId"],
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

function getCompactViewBudgets() {
  return {
    policyVersion: "ctx-budget.v1",
    enabled: MCP_CONTEXT_TOKEN_BUDGETS_ENABLED,
    views: {
      agent_inbox: {
        targetTokens: Number.isInteger(MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS)
          ? MCP_CONTEXT_AGENT_INBOX_TARGET_TOKENS
          : 1200,
        hardTokens: Number.isInteger(MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS)
          ? MCP_CONTEXT_AGENT_INBOX_HARD_TOKENS
          : 1800,
      },
      task_snapshot: {
        targetTokens: Number.isInteger(MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS)
          ? MCP_CONTEXT_TASK_SNAPSHOT_TARGET_TOKENS
          : 1600,
        hardTokens: Number.isInteger(MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS)
          ? MCP_CONTEXT_TASK_SNAPSHOT_HARD_TOKENS
          : 2400,
      },
      correlation_snapshot: {
        targetTokens: Number.isInteger(MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS)
          ? MCP_CONTEXT_CORRELATION_SNAPSHOT_TARGET_TOKENS
          : 2200,
        hardTokens: Number.isInteger(MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS)
          ? MCP_CONTEXT_CORRELATION_SNAPSHOT_HARD_TOKENS
          : 3200,
      },
    },
    handoff: {
      task: {
        targetChars: Number.isInteger(MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS)
          ? MCP_CONTEXT_TASK_HANDOFF_TARGET_CHARS
          : 160,
        hardChars: Number.isInteger(MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS)
          ? MCP_CONTEXT_TASK_HANDOFF_HARD_CHARS
          : 220,
      },
      correlation: {
        targetChars: Number.isInteger(MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS)
          ? MCP_CONTEXT_CORRELATION_HANDOFF_TARGET_CHARS
          : 200,
        hardChars: Number.isInteger(MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS)
          ? MCP_CONTEXT_CORRELATION_HANDOFF_HARD_CHARS
          : 260,
      },
    },
  };
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

async function getContextFingerprint() {
  await ensureContextFile();
  const fileStats = await fs.stat(CONTEXT_FILE);
  return {
    size: fileStats.size,
    mtimeMs: fileStats.mtimeMs,
  };
}

function sameContextFingerprint(left, right) {
  if (!left || !right) {
    return false;
  }

  return left.size === right.size && left.mtimeMs === right.mtimeMs;
}

async function appendEvent(agent, type, payload) {
  const normalizedAgent = assertNonEmptyString(agent, "agent");
  const normalizedType = assertNonEmptyString(type, "type");
  const normalizedPayload = assertPlainObject(payload, "payload");

  const { payload: safetyPayload } = applySnapshotSafetyPolicy(normalizedPayload, {
    redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
    memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
  });

  const messageBudgetEnabled = MCP_CONTEXT_TOKEN_BUDGETS_ENABLED && MCP_CONTEXT_MESSAGE_BUDGET_ENABLED;
  const artifactOffloadEnabled = MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED && MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED;

  const { payload: budgetedPayload } = messageBudgetEnabled
    ? applyMessageBudgetPolicy(safetyPayload, {
        targetChars: MCP_CONTEXT_MESSAGE_TARGET_CHARS,
        softLimitChars: MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS,
        hardLimitEnabled: MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED,
      })
    : { payload: { ...safetyPayload } };

  if (!artifactOffloadEnabled) {
    delete budgetedPayload.offloadHint;
    if (budgetedPayload.messageBudget && typeof budgetedPayload.messageBudget === "object") {
      budgetedPayload.messageBudget.offloadRequired = false;
    }
  }

  if (KNOWN_EVENT_TYPES.has(normalizedType)) {
    validateEventPayload(normalizedType, budgetedPayload);
  }

  const taskId = normalizeString(budgetedPayload.taskId);
  const assignedTo = normalizeString(budgetedPayload.assignedTo);
  const status = normalizeString(budgetedPayload.status);
  const priority = normalizeString(budgetedPayload.priority);
  const correlationId = normalizeString(budgetedPayload.correlationId) || taskId;
  const parentTaskId = normalizeString(budgetedPayload.parentTaskId);
  const retryCount = normalizeInteger(budgetedPayload.retryCount);
  const autoRecovery = normalizeBoolean(budgetedPayload.autoRecovery);
  const triggeredByType = normalizeString(budgetedPayload.triggeredByType);
  const rootCause = normalizeString(budgetedPayload.rootCause);
  const dependsOn = normalizeStringList(budgetedPayload.dependsOn);
  const artifactPaths = normalizeStringList(budgetedPayload.artifactPaths);
  const rolledBack = normalizeBoolean(budgetedPayload.rolledBack);
  const rollbackBlocked = normalizeBoolean(budgetedPayload.rollbackBlocked);
  const rollbackConflicts = normalizeStringList(budgetedPayload.rollbackConflicts);
  const rollbackPath = normalizeString(budgetedPayload.rollbackPath);
  const featureSlug = normalizeString(budgetedPayload.featureSlug);
  const docType = normalizeString(budgetedPayload.docType);
  const specRefs = normalizeStringList(budgetedPayload.specRefs);
  const payloadVersion = normalizeString(budgetedPayload.payloadVersion) || "1.0";

  const compactPayload = normalizeEventPayloadForStorage(
    budgetedPayload,
    {
      taskId,
      assignedTo,
      status,
      priority,
      correlationId,
      parentTaskId,
      dependsOn,
      artifactPaths,
      payloadVersion,
    },
    {
      legacyPayloadMode:
        MCP_CONTEXT_LEGACY_PAYLOAD_MODE ||
        !MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED ||
        !MCP_CONTEXT_TOKEN_BUDGETS_ENABLED,
    }
  );

  const history = await readEventsFromFile();
  const dedupeDecision = evaluateDeterministicDedupe(
    normalizedType,
    budgetedPayload,
    history,
    {
      enabled: MCP_CONTEXT_DEDUP_ENABLED,
      windowMs: Number.isFinite(MCP_CONTEXT_DEDUP_WINDOW_MS)
        ? MCP_CONTEXT_DEDUP_WINDOW_MS
        : DEDUPE_DEFAULTS.windowMs,
      agent: normalizedAgent,
    }
  );

  if (dedupeDecision.suppressed) {
    return {
      suppressed: true,
      dedupe: dedupeDecision,
      agent: normalizedAgent,
      type: normalizedType,
      taskId,
      status,
      correlationId,
      payload: compactPayload,
    };
  }

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
    payloadVersion,
    payload: compactPayload,
  };

  const line = `${JSON.stringify(event)}\n`;
  await fs.appendFile(CONTEXT_FILE, line, "utf-8");
  cachedReadContextFingerprint = undefined;
  cachedReadContext = undefined;

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

function summarizeSnapshot(rawSnapshot, mode) {
  return {
    ...rawSnapshot,
    readAudit: {
      ...(rawSnapshot.readAudit || {}),
      readMode: mode,
      broadFallbackUsed: mode === "broad_scan_fallback",
    },
  };
}

function getContextWatermark(context) {
  return (
    context?.sidecars?.latestByTask?.sourceWatermark ||
    `jsonl:${Array.isArray(context?.events) ? context.events.length : 0}`
  );
}

function finalizeCompactSnapshot(snapshot, context, cacheResult) {
  const mode = snapshot.degradedMode || !context.sidecars
    ? "broad_scan_fallback"
    : "snapshot_first";

  return annotateSnapshotCacheMeta(summarizeSnapshot(snapshot, mode), cacheResult);
}

async function buildReadContext() {
  const contextFingerprint = await getContextFingerprint();
  if (cachedReadContext && sameContextFingerprint(cachedReadContextFingerprint, contextFingerprint)) {
    return cachedReadContext;
  }

  const events = await readEventsFromFile();
  if (!MCP_CONTEXT_SIDECARS_ENABLED || !MCP_CONTEXT_RELEVANCE_READS_ENABLED) {
    const context = {
      events,
      sidecars: null,
      degradedMode: true,
      fallbackReason: "sidecar_reads_disabled",
    };

    cachedReadContextFingerprint = contextFingerprint;
    cachedReadContext = context;
    return context;
  }

  const sidecars = buildSidecarPayloads(events, {
    sanitizeSummary: (rawSummary) =>
      sanitizeSnapshotSummary(rawSummary, {
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
      }),
  });

  let context;
  try {
    await writeSidecarsAtomically(SIDECAR_DIR, sidecars);
    context = {
      events,
      sidecars,
      degradedMode: false,
      fallbackReason: null,
    };
  } catch (error) {
    console.error("Failed to persist sidecars for compact read tools:", error);

    const diskFallback = await readValidatedSidecars(SIDECAR_DIR);
    if (diskFallback.ok) {
      context = {
        events,
        sidecars: diskFallback.payloads,
        degradedMode: false,
        fallbackReason: "sidecar_write_failed_disk_sidecar_used",
      };
    } else {
      context = {
        events,
        sidecars,
        degradedMode: false,
        fallbackReason: "sidecar_write_failed_in_memory_sidecar_used",
      };
    }
  }

  cachedReadContextFingerprint = contextFingerprint;
  cachedReadContext = context;
  return context;
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
    const input = args || {};

    if (name === "append_event") {
      const { agent, type, payload } = input;
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
      const events = await getEvents(input);

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

    if (name === "get_agent_inbox") {
      const assignedTo = assertNonEmptyString(input.assignedTo, "assignedTo");
      const context = await buildReadContext();
      const viewBudgets = getCompactViewBudgets();
      const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
        watermark: getContextWatermark(context),
        keyParts: {
          view: "agent_inbox",
          assignedTo,
          limit: Number.isInteger(input.limit) ? input.limit : 10,
          allowBroadFallback: input.allowBroadFallback !== false,
          sensitiveAction: input.sensitiveAction === true,
          degradedMode: context.degradedMode,
          fallbackReason: context.fallbackReason,
          budgetTable: viewBudgets,
        },
        builder: () =>
          buildAgentInboxSnapshot({
            assignedTo,
            limit: Number.isInteger(input.limit) ? input.limit : 10,
            sidecars: context.sidecars,
            events: context.events,
            allowBroadFallback: input.allowBroadFallback !== false,
            sensitiveAction: input.sensitiveAction === true,
            viewBudgets,
            sanitizeSummary: (rawSummary) =>
              sanitizeSnapshotSummary(rawSummary, {
                redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
                memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
              }),
            initialDegradedMode: context.degradedMode,
            initialFallbackReason: context.fallbackReason,
          }),
      });

      const snapshot = finalizeCompactSnapshot(cacheResult.payload, context, cacheResult);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
      };
    }

    if (name === "get_task_snapshot") {
      const taskId = assertNonEmptyString(input.taskId, "taskId");
      const context = await buildReadContext();
      const viewBudgets = getCompactViewBudgets();
      const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
        watermark: getContextWatermark(context),
        keyParts: {
          view: "task_snapshot",
          taskId,
          allowBroadFallback: input.allowBroadFallback !== false,
          sensitiveAction: input.sensitiveAction === true,
          degradedMode: context.degradedMode,
          fallbackReason: context.fallbackReason,
          budgetTable: viewBudgets,
        },
        builder: () =>
          buildTaskSnapshot({
            taskId,
            sidecars: context.sidecars,
            events: context.events,
            allowBroadFallback: input.allowBroadFallback !== false,
            sensitiveAction: input.sensitiveAction === true,
            viewBudgets,
            sanitizeSummary: (rawSummary) =>
              sanitizeSnapshotSummary(rawSummary, {
                redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
                memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
              }),
            initialDegradedMode: context.degradedMode,
            initialFallbackReason: context.fallbackReason,
          }),
      });

      const snapshot = finalizeCompactSnapshot(cacheResult.payload, context, cacheResult);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
      };
    }

    if (name === "get_correlation_snapshot") {
      const correlationId = assertNonEmptyString(input.correlationId, "correlationId");
      const context = await buildReadContext();
      const viewBudgets = getCompactViewBudgets();
      const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
        watermark: getContextWatermark(context),
        keyParts: {
          view: "correlation_snapshot",
          correlationId,
          limit: Number.isInteger(input.limit) ? input.limit : 20,
          allowBroadFallback: input.allowBroadFallback !== false,
          sensitiveAction: input.sensitiveAction === true,
          degradedMode: context.degradedMode,
          fallbackReason: context.fallbackReason,
          budgetTable: viewBudgets,
        },
        builder: () =>
          buildCorrelationSnapshot({
            correlationId,
            limit: Number.isInteger(input.limit) ? input.limit : 20,
            sidecars: context.sidecars,
            events: context.events,
            allowBroadFallback: input.allowBroadFallback !== false,
            sensitiveAction: input.sensitiveAction === true,
            viewBudgets,
            sanitizeSummary: (rawSummary) =>
              sanitizeSnapshotSummary(rawSummary, {
                redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
                memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
              }),
            initialDegradedMode: context.degradedMode,
            initialFallbackReason: context.fallbackReason,
          }),
      });

      const snapshot = finalizeCompactSnapshot(cacheResult.payload, context, cacheResult);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
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
