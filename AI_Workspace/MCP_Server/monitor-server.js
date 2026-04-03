import { createHash } from "crypto";
import { watch } from "fs";
import { createServer } from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  annotateSnapshotCacheMeta,
  createCompactQueryCache,
  resolveCompactCachedPayload,
} from "./lib/compact-query-cache.js";
import {
  buildAgentInboxSnapshot,
  buildCorrelationSnapshot,
  buildTaskSnapshot,
} from "./lib/context-read-modes.js";
import {
  SIDECAR_FILE_NAMES,
  buildSidecarPayloads,
  readValidatedSidecars,
  selectTaskGroupsFromSidecars,
  writeSidecarsAtomically,
} from "./lib/context-sidecars.js";
import { evaluateWaveCanaryPolicy } from "./lib/context-canary-policy.js";
import { sanitizeSnapshotSummary } from "./lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, "shared_context.jsonl");
const SIDECAR_DIR = path.join(__dirname, "sidecars");
const LEGACY_MONITOR_DIR = path.resolve(__dirname, "..", "AgentMonitor");
const MONITOR_V2_DIR = path.resolve(__dirname, "..", "agentmonitor-v2", "dist");
const PIXEL_WEBVIEW_DIR = path.resolve(__dirname, "..", "pixel-agents-zcorvus", "dist", "webview");
const HTTP_HOST = process.env.MCP_MONITOR_HOST || "127.0.0.1";
const HTTP_PORT = Number.parseInt(process.env.MCP_MONITOR_PORT || "4311", 10);
const MONITOR_UI_VARIANT = (process.env.MCP_MONITOR_UI_VARIANT || "v2").toLowerCase();
const MONITOR_FALLBACK_TO_LEGACY =
  (process.env.MCP_MONITOR_FALLBACK_TO_LEGACY || "true").toLowerCase() !== "false";
const MCP_CONTEXT_SLIM_API_EVENTS_ENABLED =
  (process.env.MCP_CONTEXT_SLIM_API_EVENTS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_SIDECARS_ENABLED =
  (process.env.MCP_CONTEXT_SIDECARS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_RELEVANCE_READS_ENABLED =
  (process.env.MCP_CONTEXT_RELEVANCE_READS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_TOKEN_BUDGETS_ENABLED =
  (process.env.MCP_CONTEXT_TOKEN_BUDGETS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_REDACTION_ENABLED =
  (process.env.MCP_CONTEXT_REDACTION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED =
  (process.env.MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_LEGACY_PAYLOAD_MODE =
  (process.env.MCP_CONTEXT_LEGACY_PAYLOAD_MODE || "false").toLowerCase() === "true";
const MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED =
  (process.env.MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED =
  (process.env.MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED =
  (process.env.MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED =
  (process.env.MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED || "false").toLowerCase() === "true";
const MCP_CONTEXT_DEDUP_ENABLED =
  (process.env.MCP_CONTEXT_DEDUP_ENABLED || "true").toLowerCase() !== "false";
const MCP_CONTEXT_DEDUP_WINDOW_MS = Number.parseInt(
  process.env.MCP_CONTEXT_DEDUP_WINDOW_MS || "900000",
  10
);
const MCP_CONTEXT_MESSAGE_TARGET_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_TARGET_CHARS || "160",
  10
);
const MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS = Number.parseInt(
  process.env.MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS || "280",
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
const MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS = Number.parseInt(
  process.env.MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS || "2000",
  10
);
const MCP_CONTEXT_SLO_SAMPLE_LIMIT = Number.parseInt(
  process.env.MCP_CONTEXT_SLO_SAMPLE_LIMIT || "240",
  10
);
const MCP_CONTEXT_SLO_STALE_RATE_WARN = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_STALE_RATE_WARN || "0.01"
);
const MCP_CONTEXT_SLO_STALE_RATE_CRITICAL = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_STALE_RATE_CRITICAL || "0.02"
);
const MCP_CONTEXT_SLO_REBUILD_SUCCESS_WARN = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_REBUILD_SUCCESS_WARN || "0.995"
);
const MCP_CONTEXT_SLO_REBUILD_SUCCESS_CRITICAL = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_REBUILD_SUCCESS_CRITICAL || "0.99"
);
const MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_WARN = Number.parseInt(
  process.env.MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_WARN || "5",
  10
);
const MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_CRITICAL = Number.parseInt(
  process.env.MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_CRITICAL || "20",
  10
);
const MCP_CONTEXT_SLO_LEGACY_HIT_RATE_WARN = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_LEGACY_HIT_RATE_WARN || "0"
);
const MCP_CONTEXT_SLO_LEGACY_HIT_RATE_CRITICAL = Number.parseFloat(
  process.env.MCP_CONTEXT_SLO_LEGACY_HIT_RATE_CRITICAL || "0.05"
);
const MCP_CONTEXT_SLO_RUNBOOK_PATH =
  "AI_Workspace/docs/internal/guides/token-context-observability-runbook-20260403.md";
const MCP_CONTEXT_SLO_SPEC_PATH =
  "AI_Workspace/docs/internal/specs/token-context-observability-slo-v1.md";
const MCP_CONTEXT_CANARY_POLICY_RUNBOOK_PATH =
  "AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md";
const MCP_CONTEXT_CANARY_ACTIVE_WAVE =
  (process.env.MCP_CONTEXT_CANARY_ACTIVE_WAVE || "wave-2").trim();
const MCP_CONTEXT_CANARY_LOOKBACK_HOURS = Number.parseInt(
  process.env.MCP_CONTEXT_CANARY_LOOKBACK_HOURS || "48",
  10
);
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
let activeMonitorVariant = MONITOR_UI_VARIANT === "legacy" ? "legacy" : "v2";
let activeMonitorDir =
  activeMonitorVariant === "legacy" ? LEGACY_MONITOR_DIR : MONITOR_V2_DIR;
let cachedContextFingerprint;
let cachedContextEvents;
let cachedSidecars;
let cachedSidecarValidationAtMs = 0;
let cachedSidecarFilesFingerprint;
const compactSnapshotCache = createCompactQueryCache({
  enabled: MCP_CONTEXT_COMPACT_CACHE_ENABLED,
  maxEntries: Number.isInteger(MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES)
    ? MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES
    : 256,
});
const contextSloState = {
  startedAt: new Date().toISOString(),
  snapshotReads: [],
  sidecarCycles: [],
  apiEventsReads: [],
  lastComputedAt: null,
};
let lastAlertSignature = "";

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

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pushBoundedSample(target, sample) {
  target.push(sample);
  const maxSamples = Number.isInteger(MCP_CONTEXT_SLO_SAMPLE_LIMIT)
    ? Math.max(20, MCP_CONTEXT_SLO_SAMPLE_LIMIT)
    : 240;

  if (target.length > maxSamples) {
    target.splice(0, target.length - maxSamples);
  }
}

function parseWatermarkCount(value) {
  if (typeof value !== "string") {
    return 0;
  }

  const match = /^jsonl:(\d+)$/.exec(value.trim());
  if (!match) {
    return 0;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quantile(values, q) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[position];
}

function recordSnapshotRead(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }

  pushBoundedSample(contextSloState.snapshotReads, {
    timestamp: Date.now(),
    view: snapshot.view || "unknown",
    stale: snapshot.stale === true,
    degradedMode: snapshot.degradedMode === true,
    truncated: snapshot.truncated === true,
    decisionSafety: snapshot.decisionSafety || "unknown",
    broadFallbackUsed: snapshot.readAudit?.broadFallbackUsed === true,
    readMode: snapshot.readAudit?.readMode || "unknown",
  });
}

function recordApiEventsRead({ includeTaskEvents }) {
  pushBoundedSample(contextSloState.apiEventsReads, {
    timestamp: Date.now(),
    includeTaskEvents: includeTaskEvents === true,
    legacyMode: MCP_CONTEXT_LEGACY_PAYLOAD_MODE,
  });
}

function recordSidecarCycle(contextSnapshot, { rebuildAttempted, rebuildSuccess }) {
  const eventsCount = Array.isArray(contextSnapshot?.events) ? contextSnapshot.events.length : 0;
  const sourceWatermark =
    contextSnapshot?.sidecars?.latestByTask?.sourceWatermark || `jsonl:${eventsCount}`;
  const watermarkCount = parseWatermarkCount(sourceWatermark);
  const watermarkLagEvents = Math.max(0, eventsCount - watermarkCount);
  const rebuiltAt = contextSnapshot?.sidecars?.latestByTask?.rebuiltAt || null;
  const rebuiltAtMs = rebuiltAt ? Date.parse(rebuiltAt) : Number.NaN;
  const watermarkLagMs = Number.isFinite(rebuiltAtMs) ? Math.max(0, Date.now() - rebuiltAtMs) : null;

  pushBoundedSample(contextSloState.sidecarCycles, {
    timestamp: Date.now(),
    source: contextSnapshot?.source || "unknown",
    degradedMode: contextSnapshot?.degradedMode === true,
    fallbackReason: contextSnapshot?.fallbackReason || null,
    stale: contextSnapshot?.sidecars?.latestByTask?.stale === true,
    sourceWatermark,
    watermarkLagEvents,
    watermarkLagMs,
    rebuildAttempted: rebuildAttempted === true,
    rebuildSuccess: rebuildAttempted ? rebuildSuccess === true : true,
  });
}

function buildContextSloSnapshot() {
  const snapshotReads = contextSloState.snapshotReads;
  const sidecarCycles = contextSloState.sidecarCycles;
  const apiEventsReads = contextSloState.apiEventsReads;

  const staleRate =
    snapshotReads.length > 0
      ? snapshotReads.filter((sample) => sample.stale === true).length / snapshotReads.length
      : 0;
  const degradedRate =
    snapshotReads.length > 0
      ? snapshotReads.filter((sample) => sample.degradedMode === true).length / snapshotReads.length
      : 0;
  const truncatedRate =
    snapshotReads.length > 0
      ? snapshotReads.filter((sample) => sample.truncated === true).length / snapshotReads.length
      : 0;
  const broadFallbackRate =
    snapshotReads.length > 0
      ? snapshotReads.filter((sample) => sample.broadFallbackUsed === true).length / snapshotReads.length
      : 0;

  const rebuildCycles = sidecarCycles.filter((cycle) => cycle.rebuildAttempted === true);
  const rebuildSuccessRate =
    rebuildCycles.length > 0
      ? rebuildCycles.filter((cycle) => cycle.rebuildSuccess === true).length / rebuildCycles.length
      : 1;

  const watermarkLagValues = sidecarCycles.map((cycle) => cycle.watermarkLagEvents || 0);
  const watermarkLagP95 = quantile(watermarkLagValues, 0.95);
  const latestSidecarCycle = sidecarCycles[sidecarCycles.length - 1] || null;

  const legacyHitRate =
    apiEventsReads.length > 0
      ? apiEventsReads.filter(
          (sample) => sample.includeTaskEvents === true || sample.legacyMode === true
        ).length / apiEventsReads.length
      : 0;

  const alerts = [];

  if (staleRate > MCP_CONTEXT_SLO_STALE_RATE_CRITICAL) {
    alerts.push({
      id: "snapshot_stale_rate",
      severity: "critical",
      status: "active",
      message: "Snapshot stale rate above critical threshold",
      value: staleRate,
      threshold: MCP_CONTEXT_SLO_STALE_RATE_CRITICAL,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  } else if (staleRate > MCP_CONTEXT_SLO_STALE_RATE_WARN) {
    alerts.push({
      id: "snapshot_stale_rate",
      severity: "warning",
      status: "active",
      message: "Snapshot stale rate above warning threshold",
      value: staleRate,
      threshold: MCP_CONTEXT_SLO_STALE_RATE_WARN,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  }

  if (rebuildSuccessRate < MCP_CONTEXT_SLO_REBUILD_SUCCESS_CRITICAL) {
    alerts.push({
      id: "snapshot_rebuild_success_rate",
      severity: "critical",
      status: "active",
      message: "Snapshot rebuild success rate below critical threshold",
      value: rebuildSuccessRate,
      threshold: MCP_CONTEXT_SLO_REBUILD_SUCCESS_CRITICAL,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  } else if (rebuildSuccessRate < MCP_CONTEXT_SLO_REBUILD_SUCCESS_WARN) {
    alerts.push({
      id: "snapshot_rebuild_success_rate",
      severity: "warning",
      status: "active",
      message: "Snapshot rebuild success rate below warning threshold",
      value: rebuildSuccessRate,
      threshold: MCP_CONTEXT_SLO_REBUILD_SUCCESS_WARN,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  }

  if (watermarkLagP95 >= MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_CRITICAL) {
    alerts.push({
      id: "watermark_lag_events",
      severity: "critical",
      status: "active",
      message: "Watermark lag p95 above critical threshold",
      value: watermarkLagP95,
      threshold: MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_CRITICAL,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  } else if (watermarkLagP95 >= MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_WARN) {
    alerts.push({
      id: "watermark_lag_events",
      severity: "warning",
      status: "active",
      message: "Watermark lag p95 above warning threshold",
      value: watermarkLagP95,
      threshold: MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_WARN,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  }

  if (legacyHitRate > MCP_CONTEXT_SLO_LEGACY_HIT_RATE_CRITICAL || MCP_CONTEXT_LEGACY_PAYLOAD_MODE) {
    alerts.push({
      id: "legacy_mode_hit_rate",
      severity: "critical",
      status: "active",
      message: MCP_CONTEXT_LEGACY_PAYLOAD_MODE
        ? "Legacy payload mode is enabled"
        : "Legacy mode hit rate above critical threshold",
      value: legacyHitRate,
      threshold: MCP_CONTEXT_SLO_LEGACY_HIT_RATE_CRITICAL,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  } else if (legacyHitRate > MCP_CONTEXT_SLO_LEGACY_HIT_RATE_WARN) {
    alerts.push({
      id: "legacy_mode_hit_rate",
      severity: "warning",
      status: "active",
      message: "Legacy mode hit rate above warning threshold",
      value: legacyHitRate,
      threshold: MCP_CONTEXT_SLO_LEGACY_HIT_RATE_WARN,
      runbookPath: MCP_CONTEXT_SLO_RUNBOOK_PATH,
    });
  }

  const alertSignature = JSON.stringify(alerts.map((alert) => `${alert.id}:${alert.severity}`));
  if (alertSignature !== lastAlertSignature) {
    if (alerts.length > 0) {
      console.warn(`[monitor-server][context-slo] Active alerts: ${alertSignature}`);
    }
    lastAlertSignature = alertSignature;
  }

  const result = {
    generatedAt: new Date().toISOString(),
    policyVersion: "ctx-observability.v1",
    sampleLimit: Number.isInteger(MCP_CONTEXT_SLO_SAMPLE_LIMIT)
      ? Math.max(20, MCP_CONTEXT_SLO_SAMPLE_LIMIT)
      : 240,
    sampleSizes: {
      snapshotReads: snapshotReads.length,
      sidecarCycles: sidecarCycles.length,
      apiEventsReads: apiEventsReads.length,
    },
    sli: {
      staleRate,
      degradedRate,
      truncatedRate,
      broadFallbackRate,
      rebuildSuccessRate,
      watermarkLagEventsP95: watermarkLagP95,
      watermarkLagEventsCurrent: latestSidecarCycle?.watermarkLagEvents || 0,
      watermarkLagMsCurrent: latestSidecarCycle?.watermarkLagMs || null,
      legacyModeHitRate: legacyHitRate,
    },
    thresholds: {
      staleRate: {
        warning: MCP_CONTEXT_SLO_STALE_RATE_WARN,
        critical: MCP_CONTEXT_SLO_STALE_RATE_CRITICAL,
      },
      rebuildSuccessRate: {
        warning: MCP_CONTEXT_SLO_REBUILD_SUCCESS_WARN,
        critical: MCP_CONTEXT_SLO_REBUILD_SUCCESS_CRITICAL,
      },
      watermarkLagEventsP95: {
        warning: MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_WARN,
        critical: MCP_CONTEXT_SLO_WATERMARK_LAG_EVENTS_CRITICAL,
      },
      legacyModeHitRate: {
        warning: MCP_CONTEXT_SLO_LEGACY_HIT_RATE_WARN,
        critical: MCP_CONTEXT_SLO_LEGACY_HIT_RATE_CRITICAL,
      },
    },
    alerts,
    runbooks: {
      primary: MCP_CONTEXT_SLO_RUNBOOK_PATH,
      spec: MCP_CONTEXT_SLO_SPEC_PATH,
    },
  };

  contextSloState.lastComputedAt = result.generatedAt;
  return result;
}

function buildWaveCanarySnapshot(contextSnapshot, observabilitySnapshot) {
  return evaluateWaveCanaryPolicy({
    events: contextSnapshot?.events || [],
    observability: observabilitySnapshot,
    activeWaveId: MCP_CONTEXT_CANARY_ACTIVE_WAVE,
    finalRunbookPath: MCP_CONTEXT_CANARY_POLICY_RUNBOOK_PATH,
    lookbackHours: Number.isInteger(MCP_CONTEXT_CANARY_LOOKBACK_HOURS)
      ? MCP_CONTEXT_CANARY_LOOKBACK_HOURS
      : 48,
  });
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

  const includeTaskEventsDefault = MCP_CONTEXT_LEGACY_PAYLOAD_MODE
    ? true
    : !MCP_CONTEXT_SLIM_API_EVENTS_ENABLED;

  return {
    agentFilter: normalizeString(filters.agentFilter),
    typeFilter: normalizeString(filters.typeFilter),
    assignedTo: normalizeString(filters.assignedTo),
    taskId: normalizeString(filters.taskId),
    parentTaskId: normalizeString(filters.parentTaskId),
    status: normalizeString(filters.status),
    correlationId: normalizeString(filters.correlationId),
    includeTaskEvents: parseBoolean(filters.includeTaskEvents, includeTaskEventsDefault),
    since,
    sinceTimestamp: since ? Date.parse(since) : Number.NaN,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
  };
}

function hasActiveTaskConsistencyFilters(filters) {
  return Boolean(
    filters.agentFilter ||
      filters.typeFilter ||
      filters.assignedTo ||
      filters.taskId ||
      filters.parentTaskId ||
      filters.status ||
      filters.correlationId ||
      filters.since
  );
}

async function ensureContextFile() {
  try {
    await fs.access(CONTEXT_FILE);
  } catch {
    await fs.writeFile(CONTEXT_FILE, "", "utf-8");
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveMonitorDirectory() {
  if (activeMonitorVariant === "v2") {
    const v2IndexFile = path.join(MONITOR_V2_DIR, "index.html");
    const v2Ready = await pathExists(v2IndexFile);

    if (!v2Ready && MONITOR_FALLBACK_TO_LEGACY) {
      activeMonitorVariant = "legacy";
      activeMonitorDir = LEGACY_MONITOR_DIR;
      console.warn(
        `[monitor-server] AgentMonitor V2 dist missing at ${v2IndexFile}. Falling back to legacy UI.`
      );
    }
  }

  if (activeMonitorVariant === "legacy") {
    await fs.mkdir(activeMonitorDir, { recursive: true });
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

async function getSidecarFilesFingerprint() {
  try {
    const sidecarDirStats = await fs.stat(SIDECAR_DIR);
    const latestByTaskStats = await fs.stat(path.join(SIDECAR_DIR, SIDECAR_FILE_NAMES.latestByTask));

    return {
      directory: `${sidecarDirStats.size}:${sidecarDirStats.mtimeMs}`,
      latestByTask: `${latestByTaskStats.size}:${latestByTaskStats.mtimeMs}`,
    };
  } catch {
    return null;
  }
}

function sameSidecarFilesFingerprint(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    left.directory === right.directory &&
    left.latestByTask === right.latestByTask
  );
}

async function ensureSidecarsUpToDate(options = {}) {
  if (!MCP_CONTEXT_SIDECARS_ENABLED) {
    cachedSidecarFilesFingerprint = null;
    const result = {
      events: await readEventsFromFile(),
      sidecars: null,
      fingerprint: null,
      usedCache: false,
      source: "event_scan",
      degradedMode: false,
      fallbackReason: null,
    };
    recordSidecarCycle(result, { rebuildAttempted: false, rebuildSuccess: true });
    return result;
  }

  const contextFingerprint = await getContextFingerprint();
  const forceRebuild = options.forceRebuild === true;
  const fingerprintUnchanged = sameContextFingerprint(cachedContextFingerprint, contextFingerprint);
  const validationIntervalMs = Number.isInteger(MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS)
    ? MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS
    : 2000;

  if (!forceRebuild && fingerprintUnchanged && cachedContextEvents && cachedSidecars) {
    const nowMs = Date.now();
    const currentSidecarFilesFingerprint = await getSidecarFilesFingerprint();
    const sidecarFilesUnchanged = sameSidecarFilesFingerprint(
      cachedSidecarFilesFingerprint,
      currentSidecarFilesFingerprint
    );

    if (nowMs - cachedSidecarValidationAtMs <= validationIntervalMs && sidecarFilesUnchanged) {
      const result = {
        events: cachedContextEvents,
        sidecars: cachedSidecars,
        fingerprint: contextFingerprint,
        usedCache: true,
        source: "cache",
        degradedMode: false,
        fallbackReason: null,
      };
      recordSidecarCycle(result, { rebuildAttempted: false, rebuildSuccess: true });
      return result;
    }

    const diskValidation = await readValidatedSidecars(SIDECAR_DIR);
    if (diskValidation.ok) {
      cachedSidecars = diskValidation.payloads;
      cachedSidecarValidationAtMs = Date.now();
      cachedSidecarFilesFingerprint = currentSidecarFilesFingerprint || (await getSidecarFilesFingerprint());
      const result = {
        events: cachedContextEvents,
        sidecars: cachedSidecars,
        fingerprint: contextFingerprint,
        usedCache: true,
        source: "cache",
        degradedMode: false,
        fallbackReason: null,
      };
      recordSidecarCycle(result, { rebuildAttempted: false, rebuildSuccess: true });
      return result;
    }

    console.warn(`[monitor-server] Sidecar validation failed, rebuilding: ${diskValidation.error}`);
  }

  const events = await readEventsFromFile();
  try {
    const sidecars = buildSidecarPayloads(events, {
      sanitizeSummary: (rawSummary) =>
        sanitizeSnapshotSummary(rawSummary, {
          redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
          memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
        }),
    });

    await writeSidecarsAtomically(SIDECAR_DIR, sidecars);

    cachedContextFingerprint = contextFingerprint;
    cachedContextEvents = events;
    cachedSidecars = sidecars;
    cachedSidecarValidationAtMs = Date.now();
    cachedSidecarFilesFingerprint = await getSidecarFilesFingerprint();

    const result = {
      events,
      sidecars,
      fingerprint: contextFingerprint,
      usedCache: false,
      source: "rebuilt",
      degradedMode: false,
      fallbackReason: null,
    };
    recordSidecarCycle(result, { rebuildAttempted: true, rebuildSuccess: true });
    return result;
  } catch (error) {
    console.error("Failed to rebuild context sidecars:", error);

    const diskFallback = await readValidatedSidecars(SIDECAR_DIR);
    if (diskFallback.ok) {
      cachedContextFingerprint = contextFingerprint;
      cachedContextEvents = events;
      cachedSidecars = diskFallback.payloads;
      cachedSidecarValidationAtMs = Date.now();
      cachedSidecarFilesFingerprint = await getSidecarFilesFingerprint();

      const result = {
        events,
        sidecars: cachedSidecars,
        fingerprint: contextFingerprint,
        usedCache: false,
        source: "disk_fallback",
        degradedMode: true,
        fallbackReason: "rebuild_failed_disk_sidecar_used",
      };
      recordSidecarCycle(result, { rebuildAttempted: true, rebuildSuccess: false });
      return result;
    }

    cachedContextFingerprint = contextFingerprint;
    cachedContextEvents = events;
    cachedSidecars = null;
    cachedSidecarValidationAtMs = Date.now();
    cachedSidecarFilesFingerprint = null;

    const result = {
      events,
      sidecars: null,
      fingerprint: contextFingerprint,
      usedCache: false,
      source: "event_scan_fallback",
      degradedMode: true,
      fallbackReason: "rebuild_failed_no_valid_sidecars",
    };
    recordSidecarCycle(result, { rebuildAttempted: true, rebuildSuccess: false });
    return result;
  }
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

async function getEvents(filters = {}, options = {}) {
  const normalizedFilters = normalizeFilters(filters);
  let events = Array.isArray(options.events) ? options.events : await readEventsFromFile();

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

function buildTaskGroups(events, options = {}) {
  const includeTaskEvents = options.includeTaskEvents === true;
  const groups = new Map();

  for (const event of events) {
    const taskId = getEventField(event, "taskId");
    if (!taskId) {
      continue;
    }

    if (!groups.has(taskId)) {
      const rawSummary =
        event.payload?.message ||
        event.payload?.title ||
        event.payload?.description ||
        null;
      const safeSummary = sanitizeSnapshotSummary(rawSummary, {
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
      });

      groups.set(taskId, {
        taskId,
        assignedTo: getEventField(event, "assignedTo") || null,
        latestStatus: getEventField(event, "status") || "unknown",
        priority: getEventField(event, "priority") || null,
        parentTaskId: getEventField(event, "parentTaskId") || null,
        dependsOn: normalizeStringList(getEventField(event, "dependsOn")),
        updatedAt: event.timestamp || null,
        latestEventType: event.type || "unknown",
        latestSummary: safeSummary.summary,
        latestSummarySafety: {
          redacted: safeSummary.redacted,
          memorySafetyFlag: safeSummary.memorySafetyFlag,
        },
        eventCount: 0,
        ...(includeTaskEvents ? { events: [] } : {}),
      });
    }

    const group = groups.get(taskId);
    group.eventCount += 1;
    if (includeTaskEvents) {
      group.events.push(event);
    }
    group.assignedTo = getEventField(event, "assignedTo") || group.assignedTo;
    group.latestStatus = getEventField(event, "status") || group.latestStatus;
    group.latestEventType = event.type || group.latestEventType;
    const updatedSummary = sanitizeSnapshotSummary(
      event.payload?.message || event.payload?.title || event.payload?.description || null,
      {
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
      }
    );
    group.latestSummary = updatedSummary.summary || group.latestSummary;
    group.latestSummarySafety = {
      redacted: updatedSummary.redacted,
      memorySafetyFlag: updatedSummary.memorySafetyFlag,
    };
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
  recordApiEventsRead({ includeTaskEvents: filters.includeTaskEvents });
  const contextSnapshot = await ensureSidecarsUpToDate();
  const events = await getEvents(filters, { events: contextSnapshot.events });

  let tasks = buildTaskGroups(events, { includeTaskEvents: filters.includeTaskEvents });
  let sidecarProvenance = null;
  let relevanceReadMode = "event_scan";
  const filteredRead = hasActiveTaskConsistencyFilters(filters);

  if (
    MCP_CONTEXT_RELEVANCE_READS_ENABLED &&
    !filters.includeTaskEvents &&
    !filteredRead &&
    contextSnapshot.sidecars
  ) {
    const sidecarSelection = selectTaskGroupsFromSidecars(contextSnapshot.sidecars, filters);
    if (sidecarSelection) {
      tasks = sidecarSelection.tasks;
      sidecarProvenance = sidecarSelection.provenance;
      relevanceReadMode = sidecarSelection.mode;
    }
  }

  return {
    events,
    summary: buildEventSummary(events),
    tasks,
    filters: {
      agentFilter: filters.agentFilter || null,
      typeFilter: filters.typeFilter || null,
      assignedTo: filters.assignedTo || null,
      taskId: filters.taskId || null,
      parentTaskId: filters.parentTaskId || null,
      status: filters.status || null,
      correlationId: filters.correlationId || null,
      includeTaskEvents: filters.includeTaskEvents,
      since: filters.since || null,
      limit: filters.limit,
    },
    contract: {
      payloadMode: filters.includeTaskEvents ? "expanded" : "compact",
      legacyPayloadMode: MCP_CONTEXT_LEGACY_PAYLOAD_MODE,
      relevanceReadMode,
      expansionHint: "Use includeTaskEvents=true for deep debug payloads",
      memorySafety: {
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        guardrailsEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
      },
    },
    sidecar: {
      enabled: MCP_CONTEXT_SIDECARS_ENABLED,
      used: relevanceReadMode === "sidecar_snapshot_first",
      cacheHit: contextSnapshot.usedCache === true,
      source: contextSnapshot.source || null,
      degradedMode: contextSnapshot.degradedMode === true,
      fallbackReason: contextSnapshot.fallbackReason || null,
      provenance: sidecarProvenance,
    },
    generatedAt: new Date().toISOString(),
  };
}

function createSnapshotSanitizer() {
  return (rawSummary) =>
    sanitizeSnapshotSummary(rawSummary, {
      redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
      memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
    });
}

function getContextWatermark(contextSnapshot) {
  return (
    contextSnapshot?.sidecars?.latestByTask?.sourceWatermark ||
    `jsonl:${Array.isArray(contextSnapshot?.events) ? contextSnapshot.events.length : 0}`
  );
}

function finalizeCompactSnapshot(snapshot, contextSnapshot, cacheResult) {
  const mode =
    snapshot.degradedMode || contextSnapshot.sidecars === null
      ? "broad_scan_fallback"
      : "snapshot_first";
  const compactSnapshot = annotateSnapshotCacheMeta(
    {
      ...snapshot,
      readAudit: {
        ...(snapshot.readAudit || {}),
        readMode: mode,
        broadFallbackUsed: mode === "broad_scan_fallback",
      },
    },
    cacheResult
  );

  recordSnapshotRead(compactSnapshot);
  return compactSnapshot;
}

async function buildAgentInboxResponse(searchParams) {
  const assignedTo = normalizeString(searchParams.get("assignedTo") || searchParams.get("agent"));
  if (!assignedTo) {
    throw new Error("Query parameter 'assignedTo' is required for get_agent_inbox.");
  }

  const allowBroadFallback = parseBoolean(searchParams.get("allowBroadFallback"), true);
  const sensitiveAction = parseBoolean(searchParams.get("sensitiveAction"), false);
  const limit = parsePositiveInt(searchParams.get("limit"), 10);
  const contextSnapshot = await ensureSidecarsUpToDate();
  const viewBudgets = getCompactViewBudgets();
  const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
    watermark: getContextWatermark(contextSnapshot),
    keyParts: {
      view: "agent_inbox",
      assignedTo,
      limit,
      allowBroadFallback,
      sensitiveAction,
      sidecarsEnabled: MCP_CONTEXT_SIDECARS_ENABLED,
      relevanceReadsEnabled: MCP_CONTEXT_RELEVANCE_READS_ENABLED,
      degradedMode: contextSnapshot.degradedMode === true,
      fallbackReason: contextSnapshot.fallbackReason || null,
      budgetTable: viewBudgets,
    },
    builder: () =>
      buildAgentInboxSnapshot({
        assignedTo,
        limit,
        sidecars: MCP_CONTEXT_RELEVANCE_READS_ENABLED ? contextSnapshot.sidecars : null,
        events: contextSnapshot.events,
        allowBroadFallback,
        sanitizeSummary: createSnapshotSanitizer(),
        initialDegradedMode: contextSnapshot.degradedMode === true,
        initialFallbackReason: contextSnapshot.fallbackReason || null,
        sensitiveAction,
        viewBudgets,
      }),
  });

  return finalizeCompactSnapshot(cacheResult.payload, contextSnapshot, cacheResult);
}

async function buildTaskSnapshotResponse(searchParams) {
  const taskId = normalizeString(searchParams.get("taskId"));
  if (!taskId) {
    throw new Error("Query parameter 'taskId' is required for get_task_snapshot.");
  }

  const allowBroadFallback = parseBoolean(searchParams.get("allowBroadFallback"), true);
  const sensitiveAction = parseBoolean(searchParams.get("sensitiveAction"), false);
  const contextSnapshot = await ensureSidecarsUpToDate();
  const viewBudgets = getCompactViewBudgets();
  const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
    watermark: getContextWatermark(contextSnapshot),
    keyParts: {
      view: "task_snapshot",
      taskId,
      allowBroadFallback,
      sensitiveAction,
      sidecarsEnabled: MCP_CONTEXT_SIDECARS_ENABLED,
      relevanceReadsEnabled: MCP_CONTEXT_RELEVANCE_READS_ENABLED,
      degradedMode: contextSnapshot.degradedMode === true,
      fallbackReason: contextSnapshot.fallbackReason || null,
      budgetTable: viewBudgets,
    },
    builder: () =>
      buildTaskSnapshot({
        taskId,
        sidecars: MCP_CONTEXT_RELEVANCE_READS_ENABLED ? contextSnapshot.sidecars : null,
        events: contextSnapshot.events,
        allowBroadFallback,
        sanitizeSummary: createSnapshotSanitizer(),
        initialDegradedMode: contextSnapshot.degradedMode === true,
        initialFallbackReason: contextSnapshot.fallbackReason || null,
        sensitiveAction,
        viewBudgets,
      }),
  });

  return finalizeCompactSnapshot(cacheResult.payload, contextSnapshot, cacheResult);
}

async function buildCorrelationSnapshotResponse(searchParams) {
  const correlationId = normalizeString(searchParams.get("correlationId"));
  if (!correlationId) {
    throw new Error("Query parameter 'correlationId' is required for get_correlation_snapshot.");
  }

  const allowBroadFallback = parseBoolean(searchParams.get("allowBroadFallback"), true);
  const sensitiveAction = parseBoolean(searchParams.get("sensitiveAction"), false);
  const limit = parsePositiveInt(searchParams.get("limit"), 20);
  const contextSnapshot = await ensureSidecarsUpToDate();
  const viewBudgets = getCompactViewBudgets();
  const cacheResult = resolveCompactCachedPayload(compactSnapshotCache, {
    watermark: getContextWatermark(contextSnapshot),
    keyParts: {
      view: "correlation_snapshot",
      correlationId,
      limit,
      allowBroadFallback,
      sensitiveAction,
      sidecarsEnabled: MCP_CONTEXT_SIDECARS_ENABLED,
      relevanceReadsEnabled: MCP_CONTEXT_RELEVANCE_READS_ENABLED,
      degradedMode: contextSnapshot.degradedMode === true,
      fallbackReason: contextSnapshot.fallbackReason || null,
      budgetTable: viewBudgets,
    },
    builder: () =>
      buildCorrelationSnapshot({
        correlationId,
        limit,
        sidecars: MCP_CONTEXT_RELEVANCE_READS_ENABLED ? contextSnapshot.sidecars : null,
        events: contextSnapshot.events,
        allowBroadFallback,
        sanitizeSummary: createSnapshotSanitizer(),
        initialDegradedMode: contextSnapshot.degradedMode === true,
        initialFallbackReason: contextSnapshot.fallbackReason || null,
        sensitiveAction,
        viewBudgets,
      }),
  });

  return finalizeCompactSnapshot(cacheResult.payload, contextSnapshot, cacheResult);
}

async function getLatestEventPreview() {
  const contextSnapshot = await ensureSidecarsUpToDate();
  const events = contextSnapshot.events;
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
    summary: sanitizeSnapshotSummary(
      latestEvent.payload?.message || latestEvent.payload?.title || latestEvent.payload?.description || null,
      {
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        memorySafetyEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
      }
    ).summary,
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
      if (MCP_CONTEXT_SIDECARS_ENABLED && reason === "context_file_changed") {
        await ensureSidecarsUpToDate({ forceRebuild: true });
      }

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
    requestPath === "/" || requestPath === "/monitor" || requestPath === "/monitor/"
      ? "/index.html"
      : requestPath.replace(/^\/monitor/, "") || "/index.html";

  const safeRelativePath = rawPath.replace(/^\/+/, "");
  const filePath = path.resolve(activeMonitorDir, safeRelativePath);

  if (!filePath.startsWith(activeMonitorDir)) {
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
      "Access-Control-Allow-Origin: *",
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
    const contextSnapshot = await ensureSidecarsUpToDate();
    const observabilitySnapshot = buildContextSloSnapshot();
    const canarySnapshot = buildWaveCanarySnapshot(contextSnapshot, observabilitySnapshot);

    sendJson(response, 200, {
      ok: true,
      contextFile: CONTEXT_FILE,
      monitorVariant: activeMonitorVariant,
      monitorDir: activeMonitorDir,
      monitorLegacyDir: LEGACY_MONITOR_DIR,
      monitorV2Dir: MONITOR_V2_DIR,
      monitorFallbackToLegacy: MONITOR_FALLBACK_TO_LEGACY,
      contextLegacyPayloadMode: MCP_CONTEXT_LEGACY_PAYLOAD_MODE,
      contextFlags: {
        sidecarsEnabled: MCP_CONTEXT_SIDECARS_ENABLED,
        relevanceReadsEnabled: MCP_CONTEXT_RELEVANCE_READS_ENABLED,
        tokenBudgetsEnabled: MCP_CONTEXT_TOKEN_BUDGETS_ENABLED,
        redactionEnabled: MCP_CONTEXT_REDACTION_ENABLED,
        memorySafetyGuardrailsEnabled: MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED,
        slimApiEventsEnabled: MCP_CONTEXT_SLIM_API_EVENTS_ENABLED,
        canonicalNormalizationEnabled: MCP_CONTEXT_CANONICAL_NORMALIZATION_ENABLED,
        messageBudgetEnabled: MCP_CONTEXT_MESSAGE_BUDGET_ENABLED,
        artifactOffloadEnabled: MCP_CONTEXT_ARTIFACT_OFFLOAD_ENABLED,
        handoffSummariesEnabled: MCP_CONTEXT_HANDOFF_SUMMARIES_ENABLED,
        messageBudgetHardEnabled: MCP_CONTEXT_MESSAGE_BUDGET_HARD_ENABLED,
        dedupEnabled: MCP_CONTEXT_DEDUP_ENABLED,
        compactCacheEnabled: MCP_CONTEXT_COMPACT_CACHE_ENABLED,
      },
      contextSidecars: {
        directory: SIDECAR_DIR,
        files: SIDECAR_FILE_NAMES,
        cachedWatermark: cachedSidecars?.latestByTask?.sourceWatermark || null,
        cachedRebuiltAt: cachedSidecars?.latestByTask?.rebuiltAt || null,
        validationIntervalMs: Number.isInteger(MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS)
          ? MCP_CONTEXT_SIDECARS_VALIDATION_INTERVAL_MS
          : 2000,
        lastValidatedAt: cachedSidecarValidationAtMs
          ? new Date(cachedSidecarValidationAtMs).toISOString()
          : null,
      },
      contextMessageBudget: {
        targetChars: Number.isFinite(MCP_CONTEXT_MESSAGE_TARGET_CHARS)
          ? MCP_CONTEXT_MESSAGE_TARGET_CHARS
          : 160,
        softLimitChars: Number.isFinite(MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS)
          ? MCP_CONTEXT_MESSAGE_SOFT_LIMIT_CHARS
          : 280,
      },
      contextDedup: {
        windowMs: Number.isFinite(MCP_CONTEXT_DEDUP_WINDOW_MS)
          ? MCP_CONTEXT_DEDUP_WINDOW_MS
          : 900000,
      },
      contextCompactViewBudgets: getCompactViewBudgets(),
      contextCompactCache: {
        maxEntries: Number.isInteger(MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES)
          ? MCP_CONTEXT_COMPACT_CACHE_MAX_ENTRIES
          : 256,
        size: compactSnapshotCache.store.size,
        stats: compactSnapshotCache.stats,
        lastInvalidationReason: compactSnapshotCache.lastInvalidationReason,
        lastInvalidatedAt: compactSnapshotCache.lastInvalidatedAt,
      },
      contextObservability: observabilitySnapshot,
      contextCanary: {
        activeWaveId: MCP_CONTEXT_CANARY_ACTIVE_WAVE,
        lookbackHours: Number.isInteger(MCP_CONTEXT_CANARY_LOOKBACK_HOURS)
          ? MCP_CONTEXT_CANARY_LOOKBACK_HOURS
          : 48,
        snapshot: canarySnapshot,
      },
      pixelWebviewDir: PIXEL_WEBVIEW_DIR,
      contextReadModePaths: {
        getAgentInbox: "/api/context/get_agent_inbox",
        getTaskSnapshot: "/api/context/get_task_snapshot",
        getCorrelationSnapshot: "/api/context/get_correlation_snapshot",
        observability: "/api/context/observability",
        waveCanary: "/api/context/wave_canary",
      },
      websocketPath: "/ws",
    });
    return;
  }

  if (url.pathname === "/api/context/observability") {
    sendJson(response, 200, buildContextSloSnapshot());
    return;
  }

  if (url.pathname === "/api/context/wave_canary") {
    const contextSnapshot = await ensureSidecarsUpToDate();
    const observabilitySnapshot = buildContextSloSnapshot();
    sendJson(response, 200, buildWaveCanarySnapshot(contextSnapshot, observabilitySnapshot));
    return;
  }

  if (url.pathname === "/api/events") {
    const payload = await buildMonitorResponse(
      Object.fromEntries(url.searchParams.entries())
    );
    sendJson(response, 200, payload);
    return;
  }

  if (url.pathname === "/api/context/get_agent_inbox") {
    try {
      const payload = await buildAgentInboxResponse(url.searchParams);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 400, { error: error?.message || "Invalid request" });
    }
    return;
  }

  if (url.pathname === "/api/context/get_task_snapshot") {
    try {
      const payload = await buildTaskSnapshotResponse(url.searchParams);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 400, { error: error?.message || "Invalid request" });
    }
    return;
  }

  if (url.pathname === "/api/context/get_correlation_snapshot") {
    try {
      const payload = await buildCorrelationSnapshotResponse(url.searchParams);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 400, { error: error?.message || "Invalid request" });
    }
    return;
  }

  const isMonitorPath =
    url.pathname === "/" ||
    url.pathname === "/monitor" ||
    url.pathname.startsWith("/monitor/") ||
    url.pathname === "/app.js" ||
    url.pathname === "/styles.css" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/icons.svg";

  if (isMonitorPath) {
    await serveStaticFile(url.pathname, response);
    return;
  }

  if (
    url.pathname === "/pixel" ||
    url.pathname === "/pixel/" ||
    url.pathname.startsWith("/pixel/") ||
    url.pathname.startsWith("/pixel")
  ) {
    await servePixelWebview(url.pathname, response);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function startHttpServer() {
  await ensureContextFile();
  await resolveMonitorDirectory();

  if (MCP_CONTEXT_SIDECARS_ENABLED) {
    await fs.mkdir(SIDECAR_DIR, { recursive: true });
    await ensureSidecarsUpToDate({ forceRebuild: true });
  }

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
  console.error(`[monitor-server] UI variant: ${activeMonitorVariant} (${activeMonitorDir})`);
}

async function main() {
  await startHttpServer();
}

main().catch((error) => {
  console.error("Fatal error starting monitor server:", error);
  process.exit(1);
});
