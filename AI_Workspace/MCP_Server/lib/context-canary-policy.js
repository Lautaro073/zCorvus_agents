export const CANARY_POLICY_VERSION = "ctx-canary.v1";

const VALID_SEVERITIES = new Set(["info", "warning", "medium", "high", "critical"]);

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSeverity(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const lowered = normalized.toLowerCase();
  return VALID_SEVERITIES.has(lowered) ? lowered : null;
}

function getEventField(event, fieldName) {
  const payload =
    event && typeof event.payload === "object" && event.payload !== null ? event.payload : {};

  return event[fieldName] ?? payload[fieldName];
}

function parseTimestampMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractIncidentSeverity(event) {
  const explicit = toSeverity(getEventField(event, "operationalSeverity"));
  if (explicit) {
    return explicit;
  }

  if (event?.type === "INCIDENT_OPENED") {
    return "medium";
  }
  if (event?.type === "TEST_FAILED") {
    return "medium";
  }
  if (event?.type === "TASK_BLOCKED") {
    return "warning";
  }

  return null;
}

function buildWavePolicy(config = {}) {
  const defaultFinalRunbookPath =
    "AI_Workspace/docs/internal/runbooks/token-context-rollout-final-runbook-v1.md";
  const finalRunbookPath =
    normalizeString(config.finalRunbookPath) || defaultFinalRunbookPath;

  return {
    policyVersion: CANARY_POLICY_VERSION,
    finalRunbookPath,
    freezeCriteria: {
      autoFreezeOnCriticalIncident: true,
      autoFreezeOnCriticalObservabilityAlert: true,
      staleSpikeRule: {
        enabled: true,
        signal: "snapshot_stale_rate",
        thresholdReference: "critical",
        durationMinutes: 30,
      },
    },
    waves: [
      {
        waveId: "wave-1",
        stage: "Planner + Optimizer",
        blastRadius: "Planner and AI_Workspace_Optimizer on internal non-critical tasks",
        initialScope: ["Planner", "AI_Workspace_Optimizer"],
        minObservation: {
          hours: 24,
          description: "1 operational day",
        },
        incidentThreshold: {
          medium: 1,
          high: 0,
          critical: 0,
        },
        rollbackThreshold: {
          criticalIncidents: 1,
          staleSpikeSustained: true,
        },
        approvalOwner: "AI_Workspace_Optimizer",
      },
      {
        waveId: "wave-2",
        stage: "Observer + Documenter + AgentMonitor",
        blastRadius: "Observer, Documenter and AgentMonitor compact consumption path",
        initialScope: ["Observer", "Documenter", "AgentMonitorV2"],
        minObservation: {
          hours: 48,
          description: "2 operational days",
        },
        incidentThreshold: {
          medium: 2,
          high: 0,
          critical: 0,
        },
        rollbackThreshold: {
          criticalIncidents: 1,
          staleSpikeSustained: true,
        },
        approvalOwner: "Observer",
      },
      {
        waveId: "wave-3",
        stage: "Backend + Tester + Frontend + Orchestrator",
        blastRadius: "Staging rollout across remaining agents and orchestration",
        initialScope: ["Backend", "Tester", "Frontend", "Orchestrator"],
        minObservation: {
          hours: 48,
          description: "2 operational days and stable window",
        },
        incidentThreshold: {
          medium: 2,
          high: 0,
          critical: 0,
        },
        rollbackThreshold: {
          criticalIncidents: 1,
          legacyModeHitRateSustained: true,
          sidecarCorruptionDetected: true,
        },
        approvalOwner: "Orchestrator",
      },
    ],
  };
}

export function evaluateWaveCanaryPolicy({
  events,
  observability,
  activeWaveId,
  finalRunbookPath,
  nowMs = Date.now(),
  lookbackHours = 48,
} = {}) {
  const policy = buildWavePolicy({ finalRunbookPath });
  const selectedWaveId = normalizeString(activeWaveId) || "wave-2";
  const lookbackMs = Math.max(60, Number.isFinite(lookbackHours) ? lookbackHours : 48) * 60 * 60 * 1000;
  const windowStartMs = nowMs - lookbackMs;

  const observationEvents = Array.isArray(events)
    ? events.filter((event) => parseTimestampMs(event.timestamp) >= windowStartMs)
    : [];

  const incidents = {
    warning: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const event of observationEvents) {
    const severity = extractIncidentSeverity(event);
    if (!severity) {
      continue;
    }

    if (severity === "info") {
      continue;
    }

    incidents[severity] = (incidents[severity] || 0) + 1;
  }

  const activeAlerts = Array.isArray(observability?.alerts)
    ? observability.alerts.filter((alert) => alert?.status === "active")
    : [];
  const criticalAlertCount = activeAlerts.filter((alert) => alert?.severity === "critical").length;
  const staleSpikeActive = activeAlerts.some((alert) => alert?.id === "snapshot_stale_rate");

  const waves = policy.waves.map((wave) => {
    const mediumExceeded = incidents.medium > wave.incidentThreshold.medium;
    const highExceeded = incidents.high > wave.incidentThreshold.high;
    const criticalExceeded = incidents.critical >= wave.rollbackThreshold.criticalIncidents;

    const rollbackReasons = [];
    if (criticalExceeded) {
      rollbackReasons.push("critical_incident_threshold_reached");
    }
    if (wave.rollbackThreshold.staleSpikeSustained && staleSpikeActive) {
      rollbackReasons.push("stale_spike_sustained");
    }
    if (wave.rollbackThreshold.legacyModeHitRateSustained && observability?.sli?.legacyModeHitRate > 0) {
      rollbackReasons.push("legacy_mode_hit_rate_non_zero");
    }
    if (wave.rollbackThreshold.sidecarCorruptionDetected) {
      const corruptionAlert = activeAlerts.some((alert) => alert?.id === "snapshot_rebuild_success_rate");
      if (corruptionAlert) {
        rollbackReasons.push("sidecar_rebuild_reliability_degraded");
      }
    }

    let rolloutAction = "continue";
    if (rollbackReasons.length > 0) {
      rolloutAction = "rollback";
    } else if (mediumExceeded || highExceeded) {
      rolloutAction = "hold";
    }

    return {
      ...wave,
      incidentWindowHours: lookbackMs / (60 * 60 * 1000),
      observedIncidents: {
        medium: incidents.medium,
        high: incidents.high,
        critical: incidents.critical,
      },
      thresholdBreaches: {
        mediumExceeded,
        highExceeded,
        criticalExceeded,
      },
      rollbackReasons,
      rolloutAction,
      isActiveWave: wave.waveId === selectedWaveId,
    };
  });

  const activeWave = waves.find((wave) => wave.isActiveWave) || waves[1] || waves[0];
  const freezeReasons = [];

  if (policy.freezeCriteria.autoFreezeOnCriticalIncident && incidents.critical > 0) {
    freezeReasons.push("critical_incident_detected");
  }
  if (policy.freezeCriteria.autoFreezeOnCriticalObservabilityAlert && criticalAlertCount > 0) {
    freezeReasons.push("critical_observability_alert_active");
  }
  if (
    policy.freezeCriteria.staleSpikeRule.enabled &&
    activeWave?.rollbackThreshold?.staleSpikeSustained &&
    staleSpikeActive
  ) {
    freezeReasons.push("stale_spike_sustained");
  }
  if (activeWave?.rolloutAction === "rollback") {
    freezeReasons.push("active_wave_requires_rollback");
  }

  return {
    policyVersion: CANARY_POLICY_VERSION,
    evaluatedAt: new Date(nowMs).toISOString(),
    activeWaveId: activeWave?.waveId || selectedWaveId,
    finalRunbookPath: policy.finalRunbookPath,
    freeze: {
      active: freezeReasons.length > 0,
      reasons: freezeReasons,
      criteria: policy.freezeCriteria,
    },
    observedSignals: {
      lookbackHours: lookbackMs / (60 * 60 * 1000),
      incidents,
      activeCriticalObservabilityAlerts: criticalAlertCount,
      staleSpikeActive,
    },
    waves,
  };
}
