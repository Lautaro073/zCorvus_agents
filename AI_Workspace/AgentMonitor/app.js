const LOCALE = "es-MX";
const STORAGE_KEY = "zcorvus-agent-monitor-preferences";
const STALE_WARNING_MS = 15 * 60 * 1000;
const STALE_DANGER_MS = 45 * 60 * 1000;

const STATUS_LABELS = {
  assigned: "Asignada",
  accepted: "Aceptada",
  in_progress: "En progreso",
  blocked: "Bloqueada",
  completed: "Completada",
  failed: "Fallida",
  cancelled: "Cancelada",
};

const PRIORITY_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const EVENT_LABELS = {
  TASK_ASSIGNED: "Tarea asignada",
  TASK_ACCEPTED: "Tarea aceptada",
  TASK_IN_PROGRESS: "Tarea en progreso",
  TASK_BLOCKED: "Tarea bloqueada",
  TASK_COMPLETED: "Tarea completada",
  TASK_FAILED: "Tarea fallida",
  TASK_CANCELLED: "Tarea cancelada",
  SUBTASK_REQUESTED: "Subtarea solicitada",
  PLAN_PROPOSED: "Plan propuesto",
  SKILL_CREATED: "Skill creada",
  LEARNING_RECORDED: "Aprendizaje registrado",
  ENDPOINT_CREATED: "Endpoint creado",
  UI_COMPONENT_BUILT: "Componente UI construido",
  SCHEMA_UPDATED: "Esquema actualizado",
  ARTIFACT_PUBLISHED: "Artefacto publicado",
  TEST_PASSED: "Prueba aprobada",
  TEST_FAILED: "Prueba fallida",
  INCIDENT_OPENED: "Incidente abierto",
  INCIDENT_RESOLVED: "Incidente resuelto",
  DOC_UPDATED: "Documentacion actualizada",
  GITHUB_ISSUE_CREATED: "Issue de GitHub creada",
  GITHUB_BRANCH_CREATED: "Branch de GitHub creada",
  GITHUB_PR_OPENED: "Pull request abierta",
  ERROR: "Error operativo",
};

const AGENT_VISUALS = {
  Orchestrator: { iconClass: "ti ti-compass", role: "Coordina arquitectura y flujo", primary: "#7c92ff", secondary: "#33d1ff" },
  Planner: { iconClass: "ti ti-route-square-2", role: "Descompone epics y arma el plan tecnico", primary: "#fbbf24", secondary: "#fb7185" },
  AI_Workspace_Optimizer: { iconClass: "ti ti-rocket", role: "Optimiza rendimiento y ejecuta cambios internos", primary: "#22d3ee", secondary: "#a78bfa" },
  Backend: { iconClass: "ti ti-server-cog", role: "API, persistencia y contratos", primary: "#34d399", secondary: "#22d3ee" },
  Frontend: { iconClass: "ti ti-sparkles", role: "UI, experiencia y consumo de contratos", primary: "#f472b6", secondary: "#8b5cf6" },
  Tester: { iconClass: "ti ti-test-pipe", role: "QA, validacion y regresiones", primary: "#f59e0b", secondary: "#fb7185" },
  Documenter: { iconClass: "ti ti-notebook", role: "Documentacion y contexto humano", primary: "#cbd5e1", secondary: "#33d1ff" },
  Observer: { iconClass: "ti ti-radar-2", role: "Monitor, tiempo real y observabilidad", primary: "#2dd4bf", secondary: "#818cf8" },
};

const AGENT_SHORT_NAMES = {
  AI_Workspace_Optimizer: "Optimizer",
};

const FIELD_LABELS = {
  taskId: "ID tarea",
  parentTaskId: "Tarea padre",
  assignedTo: "Asignado a",
  priority: "Prioridad",
  correlationId: "Correlacion",
  featureSlug: "Feature",
  docType: "Tipo doc",
  branchName: "Branch",
  issueNumber: "Issue",
  prNumber: "PR",
  rollbackPath: "Rollback",
};

const SOCKET_STATE_LABELS = {
  pending: { text: "Conectando", className: "socket-pending" },
  open: { text: "En vivo", className: "socket-open" },
  closed: { text: "Reconectando", className: "socket-closed" },
  error: { text: "Sin enlace", className: "socket-error" },
};

const EMPTY_SUMMARY = {
  total: 0,
  byAgent: {},
  byType: {},
  byStatus: {},
  taskCount: 0,
};

const state = {
  filters: {
    limit: 200,
  },
  filtersOpen: false,
  fetchTimer: null,
  liveRefreshTimer: null,
  reconnectTimer: null,
  socket: null,
  audioEnabled: true,
  audioContext: null,
  seenNotifications: new Set(),
  activeDetailTab: "overview",
  currentDetail: null,
  selectedAgentName: null,
  lastFeaturedAgentName: null,
  collapsedTaskIds: new Set(),
  currentData: {
    events: [],
    tasks: [],
    summary: EMPTY_SUMMARY,
    generatedAt: null,
  },
  livePreview: null,
};

const elements = {
  filterForm: document.getElementById("filterForm"),
  agentFilter: document.getElementById("agentFilter"),
  typeFilter: document.getElementById("typeFilter"),
  statusFilter: document.getElementById("statusFilter"),
  assignedToFilter: document.getElementById("assignedToFilter"),
  taskIdFilter: document.getElementById("taskIdFilter"),
  parentTaskIdFilter: document.getElementById("parentTaskIdFilter"),
  correlationIdFilter: document.getElementById("correlationIdFilter"),
  sinceFilter: document.getElementById("sinceFilter"),
  limitFilter: document.getElementById("limitFilter"),
  refreshButton: document.getElementById("refreshButton"),
  toggleFiltersButton: document.getElementById("toggleFiltersButton"),
  exportSnapshotButton: document.getElementById("exportSnapshotButton"),
  exportReportButton: document.getElementById("exportReportButton"),
  muteButton: document.getElementById("muteButton"),
  resetButton: document.getElementById("resetButton"),
  filtersSection: document.getElementById("filtersSection"),
  activeFiltersBar: document.getElementById("activeFiltersBar"),
  socketBadge: document.getElementById("socketBadge"),
  lastUpdatedLabel: document.getElementById("lastUpdatedLabel"),
  liveEventTitle: document.getElementById("liveEventTitle"),
  liveEventMeta: document.getElementById("liveEventMeta"),
  liveEventType: document.getElementById("liveEventType"),
  liveEventStatus: document.getElementById("liveEventStatus"),
  stageEmpty: document.getElementById("stageEmpty"),
  stageLead: document.getElementById("stageLead"),
  stageLeadAvatar: document.getElementById("stageLeadAvatar"),
  stageLeadName: document.getElementById("stageLeadName"),
  stageLeadRole: document.getElementById("stageLeadRole"),
  stageLeadHealth: document.getElementById("stageLeadHealth"),
  stageLeadCurrent: document.getElementById("stageLeadCurrent"),
  stageLeadMeta: document.getElementById("stageLeadMeta"),
  stageLeadSpark: document.getElementById("stageLeadSpark"),
  stageLeadTags: document.getElementById("stageLeadTags"),
  stageOpenAgentButton: document.getElementById("stageOpenAgentButton"),
  stageFilterAgentButton: document.getElementById("stageFilterAgentButton"),
  stageStripCount: document.getElementById("stageStripCount"),
  stageAgentMiniList: document.getElementById("stageAgentMiniList"),
  summaryGrid: document.getElementById("summaryGrid"),
  criticalCount: document.getElementById("criticalCount"),
  criticalList: document.getElementById("criticalList"),
  criticalEmpty: document.getElementById("criticalEmpty"),
  agentCount: document.getElementById("agentCount"),
  agentGrid: document.getElementById("agentGrid"),
  agentsEmpty: document.getElementById("agentsEmpty"),
  timelineCount: document.getElementById("timelineCount"),
  timelineList: document.getElementById("timelineList"),
  timelineEmpty: document.getElementById("timelineEmpty"),
  taskCount: document.getElementById("taskCount"),
  taskGroups: document.getElementById("taskGroups"),
  tasksEmpty: document.getElementById("tasksEmpty"),
  toastStack: document.getElementById("toastStack"),
  detailShell: document.getElementById("detailShell"),
  detailBackdrop: document.getElementById("detailBackdrop"),
  detailDrawer: document.querySelector(".detail-drawer"),
  detailCloseButton: document.getElementById("detailCloseButton"),
  detailTabs: document.getElementById("detailTabs"),
  detailOverviewTab: document.getElementById("detailOverviewTab"),
  detailHistoryTab: document.getElementById("detailHistoryTab"),
  detailJsonTab: document.getElementById("detailJsonTab"),
  detailKicker: document.getElementById("detailKicker"),
  detailTitle: document.getElementById("detailTitle"),
  detailSubtitle: document.getElementById("detailSubtitle"),
  detailOverviewPanel: document.getElementById("detailOverviewPanel"),
  detailHistoryPanel: document.getElementById("detailHistoryPanel"),
  detailJsonPanel: document.getElementById("detailJsonPanel"),
  detailSummaryLead: document.getElementById("detailSummaryLead"),
  detailHighlights: document.getElementById("detailHighlights"),
  detailRichNotes: document.getElementById("detailRichNotes"),
  detailMeta: document.getElementById("detailMeta"),
  detailActions: document.getElementById("detailActions"),
  detailHistoryEmpty: document.getElementById("detailHistoryEmpty"),
  detailHistoryList: document.getElementById("detailHistoryList"),
  detailPayload: document.getElementById("detailPayload"),
  summaryCardTemplate: document.getElementById("summaryCardTemplate"),
  criticalItemTemplate: document.getElementById("criticalItemTemplate"),
  agentCardTemplate: document.getElementById("agentCardTemplate"),
  stageAgentMiniTemplate: document.getElementById("stageAgentMiniTemplate"),
  timelineItemTemplate: document.getElementById("timelineItemTemplate"),
  taskGroupTemplate: document.getElementById("taskGroupTemplate"),
  toastTemplate: document.getElementById("toastTemplate"),
  distributionBarTemplate: document.getElementById("distributionBarTemplate"),
  typeDistributionChart: document.getElementById("typeDistributionChart"),
};

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.filters && typeof parsed.filters === "object") {
        state.filters = {
          ...state.filters,
          ...parsed.filters,
        };
      }
      if (typeof parsed.filtersOpen === "boolean") {
        state.filtersOpen = parsed.filtersOpen;
      }
      if (typeof parsed.selectedAgentName === "string") {
        state.selectedAgentName = parsed.selectedAgentName;
      }
      if (typeof parsed.audioEnabled === "boolean") {
        state.audioEnabled = parsed.audioEnabled;
      }
    }
  } catch {
  }
}

function persistPreferences() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      filters: state.filters,
      filtersOpen: state.filtersOpen,
      selectedAgentName: state.selectedAgentName,
      audioEnabled: state.audioEnabled,
    }));
  } catch {
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Hora desconocida";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) {
    return "nunca";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const ranges = [
    [60, "second", 1],
    [3600, "minute", 60],
    [86400, "hour", 3600],
    [604800, "day", 86400],
  ];
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  for (const [threshold, unit, divisor] of ranges) {
    if (Math.abs(deltaSeconds) < threshold) {
      return formatter.format(Math.round(deltaSeconds / divisor), unit);
    }
  }

  return formatter.format(Math.round(deltaSeconds / 604800), "week");
}

function eventField(event, fieldName) {
  if (!event || typeof event !== "object") {
    return null;
  }

  return event[fieldName] ?? event.payload?.[fieldName] ?? null;
}

function humanizeStatus(value) {
  return STATUS_LABELS[value] || value || "Sin estado";
}

function humanizePriority(value) {
  return PRIORITY_LABELS[value] || value || "No definida";
}

function humanizeEventType(value) {
  return EVENT_LABELS[value] || value || "Sin tipo";
}

function humanizeAgentName(value, fallback = "Sin agente") {
  if (!value) {
    return fallback;
  }

  return AGENT_SHORT_NAMES[value] || value;
}

function humanizeFieldValue(key, value) {
  if (key === "priority") {
    return humanizePriority(value);
  }
  if (key === "assignedTo") {
    return humanizeAgentName(value, "Sin asignacion");
  }
  if (key === "issueNumber" || key === "prNumber") {
    return `#${value}`;
  }

  return value;
}

function agentVisual(agentName) {
  return AGENT_VISUALS[agentName] || { iconClass: "ti ti-robot", role: "Agente operativo", primary: "#33d1ff", secondary: "#818cf8" };
}

function iconMarkup(className) {
  return `<i class="${className}" aria-hidden="true"></i>`;
}

function applyAgentThemeVars(element, agentName) {
  if (!element) {
    return;
  }

  const visual = agentVisual(agentName);
  element.style.setProperty("--agent-primary", visual.primary);
  element.style.setProperty("--agent-secondary", visual.secondary);
  if (agentName) {
    element.dataset.agent = slugify(agentName);
  }
}

function pulseElement(element, className = "is-animating") {
  if (!element) {
    return;
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => {
    element.classList.remove(className);
  }, 480);
}

function avatarMarkup(agentName) {
  const visual = agentVisual(agentName);

  const wrappers = {
    Orchestrator: `
      <circle cx="32" cy="32" r="19" fill="none" stroke="${visual.secondary}" stroke-width="3" opacity="0.65" />
      <path d="M32 15L39 32L32 49L25 32Z" fill="${visual.primary}" />
      <circle cx="32" cy="32" r="5" fill="${visual.secondary}" />
      <path d="M32 18L45 32" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
    `,
    Planner: `
      <path d="M15 20H33L41 25H49V45H15Z" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M21 27C27 27 28 34 35 34C40 34 42 30 45 30" stroke="${visual.secondary}" stroke-width="3" stroke-linecap="round" />
      <circle cx="21" cy="27" r="3.5" fill="${visual.primary}" />
      <circle cx="35" cy="34" r="3.5" fill="${visual.secondary}" />
      <circle cx="45" cy="30" r="3.5" fill="#ffffff" />
    `,
    AI_Workspace_Optimizer: `
      <circle cx="32" cy="32" r="18" fill="none" stroke="${visual.secondary}" stroke-width="2.5" opacity="0.35" />
      <path d="M32 14L36 26L48 32L36 38L32 50L28 38L16 32L28 26Z" fill="rgba(255,255,255,0.06)" stroke="${visual.primary}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M32 20V38" stroke="${visual.secondary}" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
      <path d="M26 26H38" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
      <circle cx="32" cy="32" r="4" fill="${visual.primary}" opacity="0.9" />
      <path d="M32 50L30 44M32 50L34 44" stroke="${visual.secondary}" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
      <circle cx="20" cy="32" r="2" fill="${visual.secondary}" opacity="0.6" />
      <circle cx="44" cy="32" r="2" fill="${visual.secondary}" opacity="0.6" />
    `,
    Backend: `
      <rect x="17" y="16" width="30" height="10" rx="5" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" />
      <rect x="17" y="28" width="30" height="10" rx="5" fill="rgba(255,255,255,0.04)" stroke="${visual.secondary}" stroke-width="2.5" />
      <rect x="17" y="40" width="30" height="10" rx="5" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" opacity="0.85" />
      <circle cx="24" cy="21" r="2.5" fill="${visual.primary}" />
      <circle cx="24" cy="33" r="2.5" fill="${visual.secondary}" />
      <circle cx="24" cy="45" r="2.5" fill="${visual.primary}" />
    `,
    Frontend: `
      <rect x="15" y="18" width="34" height="26" rx="8" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" />
      <path d="M15 25H49" stroke="${visual.secondary}" stroke-width="2.5" />
      <path d="M22 32H33" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      <path d="M22 38H28" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
      <path d="M40 16L42 21L47 23L42 25L40 30L38 25L33 23L38 21Z" fill="${visual.secondary}" />
    `,
    Tester: `
      <path d="M25 16H39" stroke="${visual.secondary}" stroke-width="2.5" stroke-linecap="round" />
      <path d="M28 16V27L20 41C17 46 20 51 26 51H38C44 51 47 46 44 41L36 27V16" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M23 40H41" stroke="${visual.secondary}" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="28" cy="36" r="2.5" fill="${visual.secondary}" />
      <circle cx="35" cy="33" r="2" fill="#ffffff" />
    `,
    Documenter: `
      <path d="M20 15H37L46 24V49H20Z" fill="rgba(255,255,255,0.04)" stroke="${visual.primary}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M37 15V24H46" stroke="${visual.secondary}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M26 31H40" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      <path d="M26 37H40" stroke="${visual.secondary}" stroke-width="2.5" stroke-linecap="round" opacity="0.9" />
      <path d="M26 43H36" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
    `,
    Observer: `
      <circle cx="32" cy="32" r="18" fill="none" stroke="${visual.secondary}" stroke-width="2.5" opacity="0.5" />
      <circle cx="32" cy="32" r="12" fill="none" stroke="${visual.primary}" stroke-width="2.5" opacity="0.8" />
      <circle cx="32" cy="32" r="5" fill="${visual.primary}" />
      <path d="M32 32L44 24" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="44" cy="24" r="3" fill="${visual.secondary}" />
    `,
  };

  return `
    <svg viewBox="0 0 64 64" class="avatar-svg" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${wrappers[agentName] || wrappers.Observer}
    </svg>
  `;
}

function eventTitle(event) {
  return event.payload?.message
    || event.payload?.title
    || event.payload?.description
    || event.summary
    || `${humanizeEventType(event.type)} desde ${humanizeAgentName(event.agent, "un agente")}`;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRichJson(value) {
  const json = safeStringify(value);

  try {
    if (window.hljs?.highlight) {
      return window.hljs.highlight(json, { language: "json" }).value;
    }
  } catch {
  }

  return escapeHtml(json);
}

function renderMarkdown(markdown) {
  const input = typeof markdown === "string" ? markdown.trim() : "";
  if (!input) {
    return "";
  }

  try {
    if (window.marked?.parse) {
      const html = window.marked.parse(input);
      if (window.DOMPurify?.sanitize) {
        return window.DOMPurify.sanitize(html);
      }
      return html;
    }
  } catch {
  }

  return `<p>${escapeHtml(input)}</p>`;
}

function taskField(task, fieldName) {
  if (!task || !Array.isArray(task.events)) {
    return null;
  }

  for (let index = task.events.length - 1; index >= 0; index -= 1) {
    const value = eventField(task.events[index], fieldName);
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function firstTaskEventByType(task, eventType) {
  return task?.events?.find((event) => event.type === eventType) || null;
}

function lastTaskEventByType(task, eventType) {
  return task?.events?.slice().reverse().find((event) => event.type === eventType) || null;
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(durationMs < 10000 ? 1 : 0)} s`;
  }

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.round((durationMs % 60000) / 1000);
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function taskDurationMs(task) {
  const startEvent = firstTaskEventByType(task, "TASK_ACCEPTED")
    || firstTaskEventByType(task, "TASK_IN_PROGRESS")
    || firstTaskEventByType(task, "TASK_ASSIGNED");
  const endEvent = lastTaskEventByType(task, "TASK_COMPLETED")
    || lastTaskEventByType(task, "TASK_FAILED")
    || lastTaskEventByType(task, "TASK_CANCELLED");

  const start = Date.parse(startEvent?.timestamp || "");
  const end = Date.parse(endEvent?.timestamp || "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return end - start;
}

function buildTaskNotes(task) {
  const latestEvent = task?.events?.[task.events.length - 1] || null;
  const lines = [];

  if (latestEvent?.payload?.description) {
    lines.push(`### Descripcion\n${latestEvent.payload.description}`);
  }
  if (latestEvent?.payload?.message) {
    lines.push(`### Mensaje\n${latestEvent.payload.message}`);
  }
  if (Array.isArray(latestEvent?.payload?.acceptanceCriteria) && latestEvent.payload.acceptanceCriteria.length > 0) {
    lines.push(`### Criterios de aceptacion\n${latestEvent.payload.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`);
  }
  if (Array.isArray(task?.dependsOn) && task.dependsOn.length > 0) {
    lines.push(`### Dependencias\n${task.dependsOn.map((item) => `- ${item}`).join("\n")}`);
  }
  if (latestEvent?.payload?.featureSlug) {
    lines.push(`### Feature\n- ${latestEvent.payload.featureSlug}`);
  }
  if (Array.isArray(latestEvent?.payload?.specRefs) && latestEvent.payload.specRefs.length > 0) {
    lines.push(`### Specs relacionadas\n${latestEvent.payload.specRefs.map((item) => `- ${item}`).join("\n")}`);
  }
  if (latestEvent?.payload?.rolledBack || latestEvent?.payload?.rollbackBlocked) {
    lines.push(`### Estado de rollback\n- rolledBack: ${String(Boolean(latestEvent.payload.rolledBack))}\n- rollbackBlocked: ${String(Boolean(latestEvent.payload.rollbackBlocked))}${Array.isArray(latestEvent.payload.rollbackConflicts) && latestEvent.payload.rollbackConflicts.length > 0 ? `\n- Conflictos:\n${latestEvent.payload.rollbackConflicts.map((item) => `  - ${item}`).join("\n")}` : ""}`);
  }
  if (latestEvent?.payload?.branchName || latestEvent?.payload?.issueUrl || latestEvent?.payload?.prUrl) {
    lines.push(`### GitHub\n${[
      latestEvent.payload.branchName ? `- Branch: ${latestEvent.payload.branchName}` : null,
      latestEvent.payload.issueUrl ? `- Issue: ${latestEvent.payload.issueUrl}` : null,
      latestEvent.payload.prUrl ? `- PR: ${latestEvent.payload.prUrl}` : null,
    ].filter(Boolean).join("\n")}`);
  }

  return lines.join("\n\n");
}

function buildEventNotes(event) {
  const sections = [];

  if (event?.payload?.description) {
    sections.push(`### Descripcion\n${event.payload.description}`);
  }
  if (event?.payload?.message) {
    sections.push(`### Mensaje\n${event.payload.message}`);
  }
  if (Array.isArray(event?.payload?.acceptanceCriteria) && event.payload.acceptanceCriteria.length > 0) {
    sections.push(`### Criterios de aceptacion\n${event.payload.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`);
  }
  if (event?.payload?.featureSlug || event?.payload?.docType) {
    sections.push(`### Contexto documental\n${[
      event.payload.featureSlug ? `- Feature: ${event.payload.featureSlug}` : null,
      event.payload.docType ? `- Tipo doc: ${event.payload.docType}` : null,
      event.payload.path ? `- Ruta: ${event.payload.path}` : null,
    ].filter(Boolean).join("\n")}`);
  }
  if (event?.payload?.issueUrl || event?.payload?.prUrl || event?.payload?.branchName) {
    sections.push(`### GitHub\n${[
      event.payload.issueUrl ? `- Issue: ${event.payload.issueUrl}` : null,
      event.payload.prUrl ? `- PR: ${event.payload.prUrl}` : null,
      event.payload.branchName ? `- Branch: ${event.payload.branchName}` : null,
    ].filter(Boolean).join("\n")}`);
  }
  if (event?.payload?.rolledBack || event?.payload?.rollbackBlocked) {
    sections.push(`### Rollback\n- rolledBack: ${String(Boolean(event.payload.rolledBack))}\n- rollbackBlocked: ${String(Boolean(event.payload.rollbackBlocked))}${Array.isArray(event.payload.rollbackConflicts) && event.payload.rollbackConflicts.length > 0 ? `\n- Conflictos:\n${event.payload.rollbackConflicts.map((item) => `  - ${item}`).join("\n")}` : ""}`);
  }

  return sections.join("\n\n");
}

function compactPayloadPreview(event) {
  const payload = event?.payload;
  if (!payload || typeof payload !== "object") {
    return "Abre el detalle para ver el contexto completo del evento.";
  }

  const preferred = [
    payload.message,
    payload.description,
    payload.rootCause,
  ].filter(Boolean);

  if (preferred.length > 0) {
    return preferred[0];
  }

  if (event?.type === "DOC_UPDATED") {
    return [
      payload.docType ? `Documento ${payload.docType}` : null,
      payload.featureSlug ? `feature ${payload.featureSlug}` : null,
      payload.path || null,
    ].filter(Boolean).join(" | ") || "Documento actualizado.";
  }

  if (event?.type === "PLAN_PROPOSED") {
    return `Plan propuesto con ${Array.isArray(payload.proposedTasks) ? payload.proposedTasks.length : 0} tarea(s) para ejecutar.`;
  }

  if (event?.type === "SKILL_CREATED") {
    return `Skill ${payload.skillName || payload.path || "nueva"} publicada para reutilizacion.`;
  }

  if (event?.type === "LEARNING_RECORDED") {
    return payload.message || "Nuevo aprendizaje registrado para el agente.";
  }

  if (event?.type === "GITHUB_ISSUE_CREATED") {
    return `Issue #${payload.issueNumber || "?"} creada para la tarea en GitHub.`;
  }

  if (event?.type === "GITHUB_BRANCH_CREATED") {
    return `Branch ${payload.branchName || "sin-branch"} creada sobre ${payload.baseBranch || "main"}.`;
  }

  if (event?.type === "GITHUB_PR_OPENED") {
    return `PR #${payload.prNumber || "?"} abierta desde ${payload.branchName || "sin-branch"}.`;
  }

  if (payload.rollbackBlocked) {
    return `Rollback bloqueado${Array.isArray(payload.rollbackConflicts) && payload.rollbackConflicts.length > 0 ? ` en ${payload.rollbackConflicts.length} archivo(s)` : ""}.`;
  }

  if (payload.rolledBack) {
    return `Rollback completado${payload.rollbackPath ? ` desde ${payload.rollbackPath}` : ""}.`;
  }

  const fieldEntries = [
    ["taskId", eventField(event, "taskId")],
    ["parentTaskId", eventField(event, "parentTaskId")],
    ["assignedTo", eventField(event, "assignedTo")],
    ["status", humanizeStatus(eventField(event, "status"))],
    ["priority", humanizePriority(eventField(event, "priority"))],
    ["featureSlug", eventField(event, "featureSlug")],
  ].filter(([, value]) => value && value !== "Sin estado" && value !== "No definida");

  if (fieldEntries.length > 0) {
    return fieldEntries.map(([key, value]) => `${FIELD_LABELS[key] || key}: ${value}`).join(" | ");
  }

  const keys = Object.keys(payload).slice(0, 4);
  if (keys.length === 0) {
    return "Evento sin datos enriquecidos; usa el detalle para ver el JSON completo.";
  }

  return keys.map((key) => `${key}: ${String(payload[key])}`).join(" | ");
}

function pluralize(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildSparklineSeries(events, buckets = 10) {
  const validEvents = (events || []).filter((event) => Number.isFinite(Date.parse(event.timestamp || "")));
  if (validEvents.length === 0) {
    return Array.from({ length: buckets }, () => 0);
  }

  if (validEvents.length === 1) {
    return Array.from({ length: buckets }, (_, index) => (index === buckets - 1 ? 1 : 0));
  }

  const timestamps = validEvents.map((event) => Date.parse(event.timestamp));
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const span = Math.max(1, max - min);
  const series = Array.from({ length: buckets }, () => 0);

  timestamps.forEach((timestamp) => {
    const ratio = (timestamp - min) / span;
    const index = Math.min(buckets - 1, Math.max(0, Math.floor(ratio * buckets)));
    series[index] += 1;
  });

  return series;
}

function sparklineMarkup(series, color = "#33d1ff") {
  const width = 180;
  const height = 48;
  const values = series.length > 0 ? series : [0];
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / max) * (height - 8) - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="sparkline-svg" aria-hidden="true">
      <defs>
        <linearGradient id="sparkGradient-${color.replace(/[^a-z0-9]/gi, "")}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.15"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.7"></stop>
        </linearGradient>
      </defs>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>
  `;
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "monitor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "monitor";
}

function currentTimestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function serializeFilters() {
  const params = new URLSearchParams();

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return params.toString();
}

function normalizeDateTimeLocal(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toDateTimeLocalInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readFiltersFromForm() {
  const formData = new FormData(elements.filterForm);
  state.filters = {
    agentFilter: formData.get("agentFilter") || "",
    typeFilter: formData.get("typeFilter") || "",
    status: formData.get("status") || "",
    assignedTo: formData.get("assignedTo") || "",
    taskId: formData.get("taskId") || "",
    parentTaskId: formData.get("parentTaskId") || "",
    correlationId: formData.get("correlationId") || "",
    since: normalizeDateTimeLocal(formData.get("since")),
    limit: formData.get("limit") || 200,
  };

  persistPreferences();
}

function syncFormWithFilters() {
  elements.agentFilter.value = state.filters.agentFilter || "";
  elements.typeFilter.value = state.filters.typeFilter || "";
  elements.statusFilter.value = state.filters.status || "";
  elements.assignedToFilter.value = state.filters.assignedTo || "";
  elements.taskIdFilter.value = state.filters.taskId || "";
  elements.parentTaskIdFilter.value = state.filters.parentTaskId || "";
  elements.correlationIdFilter.value = state.filters.correlationId || "";
  elements.sinceFilter.value = toDateTimeLocalInput(state.filters.since);
  elements.limitFilter.value = state.filters.limit || 200;
}

function renderFiltersVisibility() {
  elements.filtersSection.classList.toggle("hidden", !state.filtersOpen);
  elements.toggleFiltersButton.innerHTML = `${iconMarkup(state.filtersOpen ? "ti ti-adjustments-off" : "ti ti-adjustments-horizontal")}<span>${state.filtersOpen ? "Ocultar Filtros" : "Mostrar Filtros"}</span>`;
  elements.toggleFiltersButton.setAttribute("aria-expanded", String(state.filtersOpen));
}

function activeFilterEntries() {
  return [
    state.filters.agentFilter ? { label: "Agente", value: state.filters.agentFilter } : null,
    state.filters.typeFilter ? { label: "Tipo", value: state.filters.typeFilter } : null,
    state.filters.status ? { label: "Estado", value: humanizeStatus(state.filters.status) } : null,
    state.filters.assignedTo ? { label: "Responsable", value: state.filters.assignedTo } : null,
    state.filters.taskId ? { label: "Tarea", value: state.filters.taskId } : null,
    state.filters.parentTaskId ? { label: "Tarea padre", value: state.filters.parentTaskId } : null,
    state.filters.correlationId ? { label: "Correlacion", value: state.filters.correlationId } : null,
    state.filters.since ? { label: "Desde", value: formatDateTime(state.filters.since) } : null,
  ].filter(Boolean);
}

function openExternalLink(url) {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function eventExternalActions(event) {
  const actions = [];
  const issueUrl = eventField(event, "issueUrl");
  const prUrl = eventField(event, "prUrl");
  const branchName = eventField(event, "branchName");
  const pathValue = eventField(event, "path");

  if (issueUrl) {
    actions.push({ label: "Abrir issue", onClick: () => openExternalLink(issueUrl) });
  }
  if (prUrl) {
    actions.push({ label: "Abrir PR", onClick: () => openExternalLink(prUrl) });
  }
  if (branchName) {
    actions.push({ label: "Filtrar branch", onClick: () => applyFilterPatch({ typeFilter: "GITHUB_BRANCH_CREATED", taskId: eventField(event, "taskId") || "" }) });
  }
  if (pathValue && typeof pathValue === "string") {
    actions.push({ label: "Filtrar doc", onClick: () => applyFilterPatch({ typeFilter: event.type || "DOC_UPDATED" }) });
  }

  return actions;
}

function renderActiveFilters() {
  const filters = activeFilterEntries();
  elements.activeFiltersBar.innerHTML = "";
  elements.activeFiltersBar.classList.toggle("hidden", filters.length === 0);

  filters.forEach((entry) => {
    const node = document.createElement("div");
    node.className = "active-filter-chip";

    const label = document.createElement("span");
    label.className = "active-filter-label";
    label.textContent = entry.label;

    const value = document.createElement("strong");
    value.className = "active-filter-value";
    value.textContent = entry.value;

    node.append(label, value);
    elements.activeFiltersBar.append(node);
  });
}

function buildSnapshotPayload() {
  return {
    exportedAt: new Date().toISOString(),
    filters: state.filters,
    generatedAt: state.currentData.generatedAt,
    summary: state.currentData.summary,
    taskCount: state.currentData.tasks.length,
    eventCount: state.currentData.events.length,
    tasks: state.currentData.tasks,
    events: state.currentData.events,
  };
}

function buildMarkdownReport() {
  const summary = state.currentData.summary || EMPTY_SUMMARY;
  const topAgents = Object.entries(summary.byAgent || {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([agent, count]) => `- ${humanizeAgentName(agent)}: ${count} eventos`)
    .join("\n") || "- Sin actividad";
  const topStatuses = Object.entries(summary.byStatus || {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([status, count]) => `- ${humanizeStatus(status)}: ${count}`)
    .join("\n") || "- Sin estados";
  const criticalLines = extractCriticalEvents(state.currentData.events || [])
    .slice(0, 8)
    .map((event) => `- ${formatDateTime(event.timestamp)} | ${humanizeAgentName(event.agent)} | ${humanizeEventType(event.type)} | ${eventTitle(event)}`)
    .join("\n") || "- Sin alertas criticas";
  const taskLines = (state.currentData.tasks || [])
    .slice(0, 10)
    .map((task) => `- ${task.taskId} | ${humanizeStatus(task.latestStatus)} | ${task.assignedTo || "Sin asignacion"} | ${task.events.length} eventos`)
    .join("\n") || "- Sin tareas agrupadas";

  return [
    "# Reporte del Monitor de Agentes",
    "",
    `- Exportado: ${new Date().toISOString()}`,
    `- Ultima generacion del monitor: ${state.currentData.generatedAt || "sin datos"}`,
    `- Filtros: ${safeStringify(state.filters)}`,
    "",
    "## Resumen",
    `- Eventos visibles: ${summary.total || 0}`,
    `- Tareas agrupadas: ${summary.taskCount || 0}`,
    `- Agentes activos: ${Object.keys(summary.byAgent || {}).length}`,
    `- Estados detectados: ${Object.keys(summary.byStatus || {}).length}`,
    "",
    "## Agentes mas activos",
    topAgents,
    "",
    "## Estados visibles",
    topStatuses,
    "",
    "## Alertas criticas",
    criticalLines,
    "",
    "## Tareas destacadas",
    taskLines,
    "",
  ].join("\n");
}

function exportSnapshot() {
  const fileName = `agent-monitor-snapshot-${currentTimestampSlug()}.json`;
  downloadTextFile(fileName, safeStringify(buildSnapshotPayload()), "application/json;charset=utf-8");
  showToast({
    level: "info",
    title: "Snapshot exportado",
    body: `Se descargo ${fileName}.`,
  });
}

function exportReport() {
  const fileName = `agent-monitor-report-${currentTimestampSlug()}.md`;
  downloadTextFile(fileName, buildMarkdownReport(), "text/markdown;charset=utf-8");
  showToast({
    level: "info",
    title: "Reporte exportado",
    body: `Se descargo ${fileName}.`,
  });
}

function hydrateSelect(select, values) {
  const currentValue = select.value;
  const placeholder = select.dataset.placeholder || "Todos";
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));

  if (currentValue && !uniqueValues.includes(currentValue)) {
    uniqueValues.unshift(currentValue);
  }

  select.innerHTML = "";

  const baseOption = document.createElement("option");
  baseOption.value = "";
  baseOption.textContent = placeholder;
  select.append(baseOption);

  uniqueValues.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = currentValue;
}

function statusLevel(status) {
  if (status === "failed" || status === "cancelled") {
    return "danger";
  }
  if (status === "blocked") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  return "info";
}

function eventLevel(event) {
  const status = eventField(event, "status");

  if (event.type === "TEST_FAILED" || event.type === "INCIDENT_OPENED" || event.type === "ERROR" || status === "failed" || status === "cancelled") {
    return "danger";
  }
  if (event.type === "TASK_BLOCKED" || status === "blocked") {
    return "warning";
  }
  if (event.type === "TEST_PASSED" || status === "completed") {
    return "success";
  }
  return "info";
}

function criticalEventInfo(event) {
  const status = eventField(event, "status");

  if (eventField(event, "rollbackBlocked")) {
    return { level: "danger", label: "Rollback bloqueado" };
  }

  if (eventField(event, "rolledBack")) {
    return { level: "warning", label: "Rollback ejecutado" };
  }

  if (event.type === "TEST_FAILED") {
    return { level: "danger", label: "Prueba fallida" };
  }
  if (event.type === "TASK_BLOCKED") {
    return { level: "warning", label: "Tarea bloqueada" };
  }
  if (event.type === "INCIDENT_OPENED") {
    return { level: "danger", label: "Incidente abierto" };
  }
  if (event.type === "ERROR") {
    return { level: "danger", label: "Error operativo" };
  }
  if (status === "failed" || status === "cancelled") {
    return { level: "danger", label: "Estado critico" };
  }
  if (status === "blocked") {
    return { level: "warning", label: "Requiere desbloqueo" };
  }

  return null;
}

function isCriticalEvent(event) {
  return Boolean(criticalEventInfo(event));
}

function extractCriticalEvents(events) {
  return events
    .slice()
    .reverse()
    .filter((event) => isCriticalEvent(event));
}

function ageInMs(timestamp) {
  const value = Date.parse(timestamp || "");
  if (!Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Date.now() - value);
}

function buildAgentSummaries(events) {
  const groups = new Map();

  events.forEach((event) => {
    const agentName = event.agent || "Sin agente";

    if (!groups.has(agentName)) {
      groups.set(agentName, {
        name: agentName,
        total: 0,
        completed: 0,
        inProgress: 0,
        risks: 0,
        taskIds: new Set(),
        updatedAt: null,
        latestEvent: null,
        recentEvents: [],
      });
    }

    const group = groups.get(agentName);
    const status = eventField(event, "status");
    const taskId = eventField(event, "taskId");
    const eventTime = Date.parse(event.timestamp || "") || 0;
    const latestTime = Date.parse(group.updatedAt || "") || 0;

    group.total += 1;

    if (taskId) {
      group.taskIds.add(taskId);
    }
    if (status === "completed" || event.type === "TEST_PASSED") {
      group.completed += 1;
    }
    if (status === "assigned" || status === "accepted" || status === "in_progress") {
      group.inProgress += 1;
    }
    if (isCriticalEvent(event)) {
      group.risks += 1;
    }
    if (eventTime >= latestTime) {
      group.updatedAt = event.timestamp || null;
      group.latestEvent = event;
    }

    group.recentEvents.push(event);
  });

  return Array.from(groups.values())
    .map((group) => {
      const age = ageInMs(group.updatedAt);
      let health = { level: "info", label: "Activo" };

      if (group.risks > 0) {
        health = { level: "danger", label: "En riesgo" };
      } else if (age > STALE_DANGER_MS && group.total > 0) {
        health = { level: "warning", label: "Sin actividad reciente" };
      } else if (age > STALE_WARNING_MS && group.total > 0) {
        health = { level: "warning", label: "Actividad baja" };
      } else if (group.inProgress > 0) {
        health = { level: "info", label: "Trabajando" };
      } else if (group.completed > 0) {
        health = { level: "success", label: "Estable" };
      }

      return {
        ...group,
        taskCount: group.taskIds.size,
        health,
        sparklineSeries: buildSparklineSeries(group.recentEvents),
        recentEvents: group.recentEvents
          .slice()
          .sort((left, right) => (Date.parse(right.timestamp || "") || 0) - (Date.parse(left.timestamp || "") || 0))
          .slice(0, 3),
      };
    })
    .sort((left, right) => {
      if (right.risks !== left.risks) {
        return right.risks - left.risks;
      }

      const rightTime = Date.parse(right.updatedAt || "") || 0;
      const leftTime = Date.parse(left.updatedAt || "") || 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return right.total - left.total;
    });
}

function fingerprintForEvent(event) {
  return event.eventId || `${event.timestamp || "sin-fecha"}:${event.type || "sin-tipo"}:${event.taskId || eventField(event, "taskId") || "sin-task"}:${event.agent || "sin-agente"}`;
}

function rememberNotification(fingerprint) {
  state.seenNotifications.add(fingerprint);

  while (state.seenNotifications.size > 60) {
    const oldest = state.seenNotifications.values().next().value;
    state.seenNotifications.delete(oldest);
  }
}

function applySocketState(nextState) {
  const config = SOCKET_STATE_LABELS[nextState] || SOCKET_STATE_LABELS.error;
  elements.socketBadge.innerHTML = `${iconMarkup("ti ti-plug-connected")}<span>${config.text}</span>`;
  elements.socketBadge.className = `socket-badge ${config.className}`;
}

function updateMuteButton() {
  elements.muteButton.innerHTML = `${iconMarkup(state.audioEnabled ? "ti ti-volume" : "ti ti-volume-off")}<span>${state.audioEnabled ? "Sonido: activo" : "Sonido: silenciado"}</span>`;
  elements.muteButton.setAttribute("aria-pressed", String(!state.audioEnabled));
}

async function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    try {
      await state.audioContext.resume();
    } catch {
    }
  }

  return state.audioContext;
}

async function playAlertTone(level) {
  if (!state.audioEnabled) {
    return;
  }

  const audioContext = await ensureAudioContext();
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const sequence = level === "danger"
    ? [700, 560, 700]
    : [540, 470];

  sequence.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + 0.02 + index * 0.14;
    const end = start + 0.12;

    oscillator.type = level === "danger" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level === "danger" ? 0.06 : 0.04, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(start);
    oscillator.stop(end);
  });
}

function showToast({ level = "info", title, body }) {
  const node = elements.toastTemplate.content.firstElementChild.cloneNode(true);
  const closeButton = node.querySelector(".toast-close");
  let removeTimer;

  node.dataset.level = level;
  node.querySelector(".toast-title").textContent = title;
  node.querySelector(".toast-body").textContent = body;

  const removeToast = () => {
    window.clearTimeout(removeTimer);
    node.classList.add("toast-exit");
    window.setTimeout(() => {
      node.remove();
    }, 180);
  };

  closeButton.addEventListener("click", removeToast);
  removeTimer = window.setTimeout(removeToast, 5200);

  elements.toastStack.prepend(node);

  while (elements.toastStack.childElementCount > 4) {
    elements.toastStack.lastElementChild.remove();
  }
}

function notifyCriticalEvent(event) {
  const critical = criticalEventInfo(event);
  if (!critical) {
    return;
  }

  const fingerprint = fingerprintForEvent(event);
  if (state.seenNotifications.has(fingerprint)) {
    return;
  }

  rememberNotification(fingerprint);

  const taskId = event.taskId || eventField(event, "taskId");
  const assignedTo = event.assignedTo || eventField(event, "assignedTo");
  const body = [
    eventTitle(event),
    event.agent ? `Agente: ${humanizeAgentName(event.agent)}` : null,
    taskId ? `Tarea: ${taskId}` : null,
    assignedTo ? `Asignado a: ${humanizeAgentName(assignedTo, "Sin asignacion")}` : null,
  ].filter(Boolean).join(" | ");

  showToast({
    level: critical.level,
    title: critical.label,
    body,
  });

  playAlertTone(critical.level);
}

function lastEventFromList(events) {
  return events.length > 0 ? events[events.length - 1] : null;
}

function renderLiveRibbon() {
  const event = state.livePreview || lastEventFromList(state.currentData.events || []);

  if (!event) {
    elements.liveEventTitle.textContent = "Sin actividad reciente";
    elements.liveEventMeta.textContent = "El canal en vivo mostrara aqui el ultimo evento del contexto compartido.";
    elements.liveEventType.textContent = "Sin tipo";
    elements.liveEventStatus.classList.add("hidden");
    return;
  }

  elements.liveEventTitle.textContent = eventTitle(event);
  elements.liveEventMeta.textContent = [
    event.agent ? `Agente ${humanizeAgentName(event.agent)}` : null,
    event.taskId || eventField(event, "taskId") ? `Tarea ${event.taskId || eventField(event, "taskId")}` : null,
    event.timestamp ? `Hace ${formatRelativeTime(event.timestamp)}` : null,
  ].filter(Boolean).join(" | ");
  elements.liveEventType.textContent = humanizeEventType(event.type);

  const status = event.status || eventField(event, "status");
  if (status) {
    elements.liveEventStatus.textContent = humanizeStatus(status);
    elements.liveEventStatus.className = "badge badge-status";
    elements.liveEventStatus.dataset.level = statusLevel(status);
    elements.liveEventStatus.classList.remove("hidden");
  } else {
    delete elements.liveEventStatus.dataset.level;
    elements.liveEventStatus.classList.add("hidden");
  }
}

function renderSummary(data) {
  const criticalEvents = extractCriticalEvents(data.events || []);
  const topAgent = Object.entries(data.summary.byAgent || {}).sort((left, right) => right[1] - left[1])[0]?.[0] || "Sin actividad";

  const cards = [
    {
      label: "Eventos visibles",
      value: String(data.summary.total),
      meta: `${Object.keys(data.summary.byType || {}).length} tipos en pantalla`,
    },
    {
      label: "Alertas criticas",
      value: String(criticalEvents.length),
      meta: criticalEvents[0] ? `${criticalEventInfo(criticalEvents[0]).label} ${formatRelativeTime(criticalEvents[0].timestamp)}` : "Sin riesgo visible",
    },
    {
      label: "Agentes activos",
      value: String(Object.keys(data.summary.byAgent || {}).length),
      meta: `Mayor actividad: ${topAgent}`,
    },
    {
      label: "Tareas agrupadas",
      value: String(data.summary.taskCount),
      meta: data.tasks.length > 0 ? `${data.tasks[0].taskId} actualizada ${formatRelativeTime(data.tasks[0].updatedAt)}` : "Sin grupos por taskId",
    },
  ];

  elements.summaryGrid.innerHTML = "";

  cards.forEach((card) => {
    const node = elements.summaryCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".stat-label").textContent = card.label;
    node.querySelector(".stat-value").textContent = card.value;
    node.querySelector(".stat-meta").textContent = card.meta;
    elements.summaryGrid.append(node);
  });

  renderTypeDistribution(data.summary.byType || {});
}

function renderTypeDistribution(typeCounts) {
  const entries = Object.entries(typeCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  elements.typeDistributionChart.innerHTML = "";

  if (entries.length === 0) {
    elements.typeDistributionChart.innerHTML = '<div class="empty-state" style="width:100%;margin:0;"><strong>Sin eventos</strong><p>Los tipos de eventos apareceran aqui.</p></div>';
    return;
  }

  const typeColors = {
    TASK_ASSIGNED: "#7c92ff",
    TASK_ACCEPTED: "#8b5cf6",
    TASK_IN_PROGRESS: "#33d1ff",
    TASK_BLOCKED: "#f59e0b",
    TASK_COMPLETED: "#34d399",
    TASK_FAILED: "#fb7185",
    TASK_CANCELLED: "#94a3c6",
    TEST_PASSED: "#34d399",
    TEST_FAILED: "#fb7185",
    ERROR: "#fb7185",
    INCIDENT_OPENED: "#fb7185",
    INCIDENT_RESOLVED: "#34d399",
    ENDPOINT_CREATED: "#22d3ee",
    UI_COMPONENT_BUILT: "#f472b6",
    SCHEMA_UPDATED: "#a78bfa",
    ARTIFACT_PUBLISHED: "#34d399",
    DOC_UPDATED: "#cbd5e1",
    GITHUB_ISSUE_CREATED: "#7c92ff",
    GITHUB_BRANCH_CREATED: "#33d1ff",
    GITHUB_PR_OPENED: "#34d399",
    PLAN_PROPOSED: "#fbbf24",
    SKILL_CREATED: "#a78bfa",
    LEARNING_RECORDED: "#2dd4bf",
  };

  const typeIcons = {
    TASK_ASSIGNED: "ti ti-user-plus",
    TASK_ACCEPTED: "ti ti-check",
    TASK_IN_PROGRESS: "ti ti-progress",
    TASK_BLOCKED: "ti ti-lock",
    TASK_COMPLETED: "ti ti-check-circle",
    TASK_CANCELLED: "ti ti-x-circle",
    TEST_PASSED: "ti ti-check",
    TEST_FAILED: "ti ti-x",
    ERROR: "ti ti-alert-triangle",
    INCIDENT_OPENED: "ti ti-alarm",
    INCIDENT_RESOLVED: "ti ti-shield-check",
    ENDPOINT_CREATED: "ti ti-api",
    UI_COMPONENT_BUILT: "ti ti-sparkles",
    SCHEMA_UPDATED: "ti ti-database",
    ARTIFACT_PUBLISHED: "ti ti-package",
    DOC_UPDATED: "ti ti-file-text",
    GITHUB_ISSUE_CREATED: "ti ti-brand-github",
    GITHUB_BRANCH_CREATED: "ti ti-git-branch",
    GITHUB_PR_OPENED: "ti ti-git-pull-request",
    PLAN_PROPOSED: "ti ti-list-details",
    SKILL_CREATED: "ti ti-book",
    LEARNING_RECORDED: "ti ti-brain",
  };

  entries.forEach(([type, count]) => {
    const node = elements.distributionBarTemplate.content.firstElementChild.cloneNode(true);
    const color = typeColors[type] || "#94a3c6";
    const iconClass = typeIcons[type] || "ti ti-dots";

    node.querySelector(".distribution-bar-icon").innerHTML = `<i class="${iconClass}" style="color:${color}"></i>`;
    node.querySelector(".distribution-bar-label").textContent = humanizeEventType(type);
    node.querySelector(".distribution-bar-value").textContent = String(count);

    node.addEventListener("click", () => applyFilterPatch({ typeFilter: type }));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applyFilterPatch({ typeFilter: type });
      }
    });

    elements.typeDistributionChart.append(node);
  });
}

function attachOpenHandler(node, callback) {
  node.addEventListener("click", callback);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  });
}

function renderDetailMeta(items) {
  elements.detailMeta.innerHTML = "";

  items.filter(Boolean).forEach((item) => {
    const node = document.createElement("div");
    node.className = "detail-meta-item";

    const label = document.createElement("span");
    label.className = "detail-meta-label";
    label.textContent = item.label;

    const value = document.createElement("strong");
    value.className = "detail-meta-value";
    value.textContent = item.value;

    node.append(label, value);
    elements.detailMeta.append(node);
  });
}

function renderDetailSummary(summaryLead, highlights) {
  elements.detailSummaryLead.textContent = summaryLead || "Sin lectura sintetica disponible.";
  elements.detailHighlights.innerHTML = "";

  (highlights || []).filter(Boolean).forEach((highlight) => {
    const node = document.createElement("div");
    node.className = "detail-highlight";

    const label = document.createElement("span");
    label.className = "detail-highlight-label";
    label.textContent = highlight.label;

    const value = document.createElement("strong");
    value.className = "detail-highlight-value";
    value.textContent = highlight.value;

    node.append(label, value);
    elements.detailHighlights.append(node);
  });
}

function renderDetailNotes(markdown) {
  const content = renderMarkdown(markdown);
  if (!content) {
    elements.detailRichNotes.innerHTML = '<div class="detail-empty-note">Sin notas enriquecidas para este elemento.</div>';
    return;
  }

  elements.detailRichNotes.innerHTML = content;
}

function renderDetailActions(actions) {
  elements.detailActions.innerHTML = "";

  actions.filter(Boolean).forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.variant === "primary" ? "detail-action" : "detail-action ghost";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    elements.detailActions.append(button);
  });
}

function renderDetailHistory(items) {
  elements.detailHistoryList.innerHTML = "";
  elements.detailHistoryEmpty.classList.toggle("hidden", items.length > 0);

  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "detail-history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-history-button ghost";

    const title = document.createElement("strong");
    title.textContent = item.title;

    const meta = document.createElement("span");
    meta.className = "detail-subtle";
    meta.textContent = item.meta;

    button.append(title, meta);
    button.addEventListener("click", item.onOpen);
    row.append(button);
    elements.detailHistoryList.append(row);
  });
}

function setDetailTab(tabName) {
  state.activeDetailTab = tabName;

  const tabs = [
    [elements.detailOverviewTab, elements.detailOverviewPanel, "overview"],
    [elements.detailHistoryTab, elements.detailHistoryPanel, "history"],
    [elements.detailJsonTab, elements.detailJsonPanel, "json"],
  ];

  tabs.forEach(([tab, panel, key]) => {
    const isActive = key === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    panel.classList.toggle("hidden", !isActive);
  });
}

function exportSelection(fileBase, data) {
  const fileName = `${slugify(fileBase)}-${currentTimestampSlug()}.json`;
  downloadTextFile(fileName, safeStringify(data), "application/json;charset=utf-8");
  showToast({
    level: "info",
    title: "Bloque exportado",
    body: `Se descargo ${fileName}.`,
  });
}

function clearFiltersPatch() {
  return {
    agentFilter: "",
    typeFilter: "",
    status: "",
    assignedTo: "",
    taskId: "",
    parentTaskId: "",
    correlationId: "",
    since: "",
    limit: state.filters.limit || 200,
  };
}

function buildHistoryItems(events) {
  return events.map((event) => ({
    title: eventTitle(event),
    meta: [
      humanizeAgentName(event.agent),
      humanizeEventType(event.type),
      humanizeStatus(eventField(event, "status")),
      formatDateTime(event.timestamp),
    ].join(" | "),
    onOpen: () => openEventDetail(event),
  }));
}

function openDetailDrawer({ kicker, title, subtitle, summaryLead, highlights, notesMarkdown, meta, actions, historyItems, payload, descriptor, preserveTab = false }) {
  state.currentDetail = descriptor || null;
  elements.detailKicker.textContent = kicker;
  elements.detailTitle.textContent = title;
  elements.detailSubtitle.textContent = subtitle;
  renderDetailSummary(summaryLead, highlights);
  renderDetailNotes(notesMarkdown);
  renderDetailMeta(meta);
  renderDetailActions(actions);
  renderDetailHistory(historyItems || []);
  elements.detailPayload.innerHTML = renderRichJson(payload);

  elements.detailShell.classList.remove("hidden");
  elements.detailShell.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
  pulseElement(elements.detailDrawer, "is-animating");

  setDetailTab(preserveTab ? state.activeDetailTab : "overview");
}

function closeDetailDrawer() {
  state.currentDetail = null;
  elements.detailShell.classList.add("hidden");
  elements.detailShell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
}

function applyFilterPatch(patch) {
  state.filters = {
    ...state.filters,
    ...patch,
  };
  persistPreferences();
  syncFormWithFilters();
  closeDetailDrawer();
  refreshWithHandling();
}

function openEventDetail(event, options = {}) {
  const taskId = eventField(event, "taskId");
  const correlationId = eventField(event, "correlationId");
  const relatedEvents = (state.currentData.events || []).filter((candidate) => {
    if (taskId) {
      return eventField(candidate, "taskId") === taskId;
    }
    if (correlationId) {
      return eventField(candidate, "correlationId") === correlationId;
    }
    return fingerprintForEvent(candidate) === fingerprintForEvent(event);
  }).slice().reverse();

  openDetailDrawer({
    kicker: "Detalle de evento",
    title: eventTitle(event),
    subtitle: `${humanizeEventType(event.type)} desde ${humanizeAgentName(event.agent)}`,
    summaryLead: compactPayloadPreview(event),
    notesMarkdown: buildEventNotes(event),
    highlights: [
      { label: "Agente", value: humanizeAgentName(event.agent) },
      { label: "Tipo", value: humanizeEventType(event.type) },
      { label: "Estado", value: humanizeStatus(eventField(event, "status")) },
      { label: "Momento", value: formatRelativeTime(event.timestamp) },
    ],
    meta: [
      { label: "Agente", value: humanizeAgentName(event.agent) },
      { label: "Tipo", value: humanizeEventType(event.type) },
      { label: "Estado", value: humanizeStatus(eventField(event, "status")) },
      { label: "ID tarea", value: eventField(event, "taskId") || "Sin tarea" },
      { label: "Tarea padre", value: eventField(event, "parentTaskId") || "Sin tarea padre" },
      { label: "Asignado a", value: humanizeAgentName(eventField(event, "assignedTo"), "Sin asignacion") },
      { label: "Prioridad", value: humanizePriority(eventField(event, "priority")) },
      { label: "Correlacion", value: eventField(event, "correlationId") || "Sin correlacion" },
      { label: "Feature", value: eventField(event, "featureSlug") || "Sin feature" },
      { label: "Tipo doc", value: eventField(event, "docType") || "Sin tipo doc" },
      { label: "Timestamp", value: formatDateTime(event.timestamp) },
    ],
    actions: [
      eventField(event, "taskId") ? { label: "Filtrar tarea", onClick: () => applyFilterPatch({ taskId: eventField(event, "taskId") }) } : null,
      eventField(event, "parentTaskId") ? { label: "Filtrar padre", onClick: () => applyFilterPatch({ parentTaskId: eventField(event, "parentTaskId") }) } : null,
      event.agent ? { label: "Filtrar agente", onClick: () => applyFilterPatch({ agentFilter: event.agent }) } : null,
      eventField(event, "status") ? { label: "Filtrar estado", onClick: () => applyFilterPatch({ status: eventField(event, "status") }) } : null,
      ...eventExternalActions(event),
      { label: "Exportar bloque", onClick: () => exportSelection(`evento-${event.type || "detalle"}`, event) },
      { label: "Limpiar filtros", onClick: () => applyFilterPatch(clearFiltersPatch()) },
    ],
    historyItems: buildHistoryItems(relatedEvents),
    payload: event,
    descriptor: {
      kind: "event",
      id: fingerprintForEvent(event),
    },
    preserveTab: options.preserveTab,
  });

  applyAgentThemeVars(elements.detailDrawer, event.agent);
}

function openTaskDetail(task, options = {}) {
  const lastEvent = task.events?.length ? task.events[task.events.length - 1] : null;
  const firstEvent = task.events?.length ? task.events[0] : null;
  const themeAgent = task.assignedTo || lastEvent?.agent || firstEvent?.agent || null;
  const durationLabel = formatDuration(taskDurationMs(task));

  openDetailDrawer({
    kicker: "Detalle de tarea",
    title: task.taskId,
    subtitle: `Estado actual ${humanizeStatus(task.latestStatus)} | ${task.events.length} eventos vinculados`,
    summaryLead: lastEvent
      ? `${eventTitle(lastEvent)}. La tarea ${task.taskId} esta ${humanizeStatus(task.latestStatus).toLowerCase()} y depende de ${task.dependsOn?.length ? task.dependsOn.join(", ") : "ninguna otra tarea"}.`
      : `La tarea ${task.taskId} no tiene eventos enriquecidos todavia, pero ya aparece en el monitor como unidad trazable.`,
    notesMarkdown: buildTaskNotes(task),
    highlights: [
      { label: "Estado", value: humanizeStatus(task.latestStatus) },
      { label: "Responsable", value: humanizeAgentName(task.assignedTo, "Sin asignacion") },
      { label: "Eventos", value: pluralize(task.events.length, "evento", "eventos") },
      durationLabel ? { label: "Duracion", value: durationLabel } : null,
      task.parentTaskId ? { label: "Tarea padre", value: task.parentTaskId } : null,
      { label: "Dependencias", value: task.dependsOn?.length ? pluralize(task.dependsOn.length, "dependencia", "dependencias") : "Sin dependencias" },
    ],
    meta: [
      { label: "Prioridad", value: humanizePriority(task.priority) },
      { label: "Feature", value: taskField(task, "featureSlug") || "Sin feature" },
      { label: "Tipo doc", value: taskField(task, "docType") || "Sin tipo doc" },
      { label: "Arranco con", value: firstEvent ? humanizeEventType(firstEvent.type) : "Sin evento inicial" },
      { label: "Ultimo movimiento", value: lastEvent ? humanizeEventType(lastEvent.type) : "Sin movimiento" },
      { label: "Ultimo actor", value: humanizeAgentName(lastEvent?.agent) },
      { label: "Actualizada", value: formatDateTime(task.updatedAt) },
    ],
    actions: [
      { label: "Filtrar tarea", onClick: () => applyFilterPatch({ taskId: task.taskId }) },
      task.parentTaskId ? { label: "Filtrar padre", onClick: () => applyFilterPatch({ parentTaskId: task.parentTaskId }) } : null,
      task.assignedTo ? { label: "Filtrar responsable", onClick: () => applyFilterPatch({ assignedTo: task.assignedTo }) } : null,
      task.latestStatus ? { label: "Filtrar estado", onClick: () => applyFilterPatch({ status: task.latestStatus }) } : null,
      ...eventExternalActions(lastEvent || firstEvent || {}),
      { label: "Exportar bloque", onClick: () => exportSelection(`tarea-${task.taskId}`, task) },
    ],
    historyItems: buildHistoryItems(task.events.slice().reverse()),
    payload: {
      taskId: task.taskId,
      parentTaskId: task.parentTaskId,
      assignedTo: task.assignedTo,
      latestStatus: task.latestStatus,
      priority: task.priority,
      featureSlug: taskField(task, "featureSlug"),
      docType: taskField(task, "docType"),
      dependsOn: task.dependsOn,
      updatedAt: task.updatedAt,
      events: task.events.slice().reverse(),
    },
    descriptor: {
      kind: "task",
      id: task.taskId,
    },
    preserveTab: options.preserveTab,
  });

  applyAgentThemeVars(elements.detailDrawer, themeAgent);
}

function openAgentDetail(summary, options = {}) {
  const recentEvents = (state.currentData.events || []).filter((event) => event.agent === summary.name).slice().reverse().slice(0, 8);
  const visual = agentVisual(summary.name);

  openDetailDrawer({
    kicker: "Detalle de agente",
    title: humanizeAgentName(summary.name),
    subtitle: `${summary.health.label} | Ultima actividad ${formatRelativeTime(summary.updatedAt)}`,
    summaryLead: `${visual.role}. ${summary.latestEvent ? `Ahora mismo: ${eventTitle(summary.latestEvent)}.` : "Sin actividad reciente."}`,
    notesMarkdown: recentEvents.length > 0
      ? `### Ultimos movimientos\n${recentEvents.slice(0, 5).map((event) => `- ${humanizeEventType(event.type)} | ${eventTitle(event)}`).join("\n")}`
      : "",
    highlights: [
      { label: "Salud", value: summary.health.label },
      { label: "Eventos", value: String(summary.total) },
      { label: "Tareas", value: String(summary.taskCount) },
      { label: "Riesgos", value: String(summary.risks) },
    ],
    meta: [
      { label: "Eventos", value: String(summary.total) },
      { label: "Tareas", value: String(summary.taskCount) },
      { label: "Riesgos", value: String(summary.risks) },
      { label: "Completadas", value: String(summary.completed) },
      { label: "En progreso", value: String(summary.inProgress) },
      { label: "Salud", value: summary.health.label },
    ],
    actions: [
      { label: "Ver solo este agente", onClick: () => applyFilterPatch({ agentFilter: summary.name }) },
      summary.risks > 0 ? { label: "Ver solo riesgos", onClick: () => applyFilterPatch({ agentFilter: summary.name, status: "blocked" }) } : null,
      {
        label: "Exportar bloque", onClick: () => exportSelection(`agente-${summary.name}`, {
          agent: summary.name,
          summary,
          recentEvents,
        })
      },
    ],
    historyItems: buildHistoryItems(recentEvents),
    payload: {
      agent: summary.name,
      totals: {
        events: summary.total,
        tasks: summary.taskCount,
        completed: summary.completed,
        inProgress: summary.inProgress,
        risks: summary.risks,
      },
      latestEvent: summary.latestEvent,
      recentEvents,
    },
    descriptor: {
      kind: "agent",
      id: summary.name,
    },
    preserveTab: options.preserveTab,
  });

  applyAgentThemeVars(elements.detailDrawer, summary.name);
}

function syncOpenDetail() {
  if (elements.detailShell.classList.contains("hidden") || !state.currentDetail) {
    return;
  }

  if (state.currentDetail.kind === "task") {
    const task = (state.currentData.tasks || []).find((candidate) => candidate.taskId === state.currentDetail.id);
    if (task) {
      openTaskDetail(task, { preserveTab: true });
      return;
    }
    closeDetailDrawer();
    return;
  }

  if (state.currentDetail.kind === "agent") {
    const summary = buildAgentSummaries(state.currentData.events || []).find((candidate) => candidate.name === state.currentDetail.id);
    if (summary) {
      openAgentDetail(summary, { preserveTab: true });
      return;
    }
    closeDetailDrawer();
    return;
  }

  if (state.currentDetail.kind === "event") {
    const event = (state.currentData.events || []).find((candidate) => fingerprintForEvent(candidate) === state.currentDetail.id);
    if (event) {
      openEventDetail(event, { preserveTab: true });
      return;
    }
    closeDetailDrawer();
  }
}

function findAgentSummary(agentName) {
  return buildAgentSummaries(state.currentData.events || []).find((candidate) => candidate.name === agentName) || null;
}

function selectAgent(agentName, options = {}) {
  state.selectedAgentName = agentName;
  persistPreferences();
  renderAgentStage(state.currentData.events || []);
  renderAgentBoards(state.currentData.events || []);

  if (options.openInspector === false) {
    return;
  }

  const summary = findAgentSummary(agentName);
  if (summary) {
    openAgentDetail(summary, { preserveTab: true });
  }
}

function renderCriticalSignals(events) {
  const criticalEvents = extractCriticalEvents(events);

  elements.criticalList.innerHTML = "";
  elements.criticalCount.textContent = `${criticalEvents.length} alerta${criticalEvents.length === 1 ? "" : "s"}`;
  elements.criticalEmpty.classList.toggle("hidden", criticalEvents.length > 0);

  criticalEvents.slice(0, 6).forEach((event) => {
    const critical = criticalEventInfo(event);
    const node = elements.criticalItemTemplate.content.firstElementChild.cloneNode(true);
    const taskId = eventField(event, "taskId");
    const parentTaskId = eventField(event, "parentTaskId");
    const assignedTo = eventField(event, "assignedTo");

    node.dataset.level = critical.level;
    node.querySelector(".signal-avatar").innerHTML = avatarMarkup(event.agent);
    node.querySelector(".signal-level").textContent = critical.label;
    node.querySelector(".signal-type").textContent = humanizeEventType(event.type);
    node.querySelector(".signal-time").textContent = formatDateTime(event.timestamp);
    node.querySelector(".signal-title").textContent = eventTitle(event);
    node.querySelector(".signal-body").textContent = `${humanizeAgentName(event.agent)} reporto un evento que requiere atencion.`;
    node.querySelector(".signal-meta").textContent = [
      taskId ? `Tarea ${taskId}` : null,
      parentTaskId ? `Padre ${parentTaskId}` : null,
      assignedTo ? `Asignado a ${humanizeAgentName(assignedTo, "Sin asignacion")}` : null,
      eventField(event, "status") ? `Estado ${humanizeStatus(eventField(event, "status"))}` : null,
    ].filter(Boolean).join(" | ") || "Sin contexto adicional";

    attachOpenHandler(node, () => openEventDetail(event));
    elements.criticalList.append(node);
  });
}

function renderAgentStage(events) {
  const summaries = buildAgentSummaries(events);
  const preferred = state.selectedAgentName
    ? summaries.find((summary) => summary.name === state.selectedAgentName)
    : null;
  const featured = preferred || summaries[0] || null;
  const secondary = summaries.filter((summary) => summary.name !== featured?.name).slice(0, 5);

  elements.stageAgentMiniList.innerHTML = "";
  elements.stageStripCount.textContent = `${secondary.length} visibles`;
  elements.stageEmpty.classList.toggle("hidden", Boolean(featured));
  elements.stageLead.classList.toggle("hidden", !featured);

  if (!featured) {
    state.selectedAgentName = null;
    state.lastFeaturedAgentName = null;
    return;
  }

  if (state.selectedAgentName !== featured.name) {
    state.selectedAgentName = featured.name;
    persistPreferences();
  }

  const featuredVisual = agentVisual(featured.name);
  const featuredTaskId = featured.latestEvent ? eventField(featured.latestEvent, "taskId") : null;

  applyAgentThemeVars(elements.stageLead, featured.name);
  elements.stageLeadAvatar.innerHTML = avatarMarkup(featured.name);
  elements.stageLeadName.textContent = humanizeAgentName(featured.name);
  elements.stageLeadRole.textContent = featuredVisual.role;
  elements.stageLeadHealth.textContent = featured.health.label;
  elements.stageLeadCurrent.textContent = featured.latestEvent ? eventTitle(featured.latestEvent) : "Sin actividad reciente";
  elements.stageLeadMeta.textContent = [
    featuredTaskId ? `Tarea ${featuredTaskId}` : null,
    featured.latestEvent ? humanizeEventType(featured.latestEvent.type) : null,
    featured.latestEvent ? humanizeStatus(eventField(featured.latestEvent, "status")) : null,
    featured.updatedAt ? `Actualizado ${formatRelativeTime(featured.updatedAt)}` : null,
  ].filter(Boolean).join(" | ");
  elements.stageLeadSpark.innerHTML = sparklineMarkup(featured.sparklineSeries, featuredVisual.primary);

  elements.stageLeadTags.innerHTML = "";
  [
    { label: "Eventos", value: String(featured.total) },
    { label: "Tareas", value: String(featured.taskCount) },
    { label: "Riesgos", value: String(featured.risks) },
    { label: "Completadas", value: String(featured.completed) },
  ].forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "stage-tag";
    chip.innerHTML = `<span class="stage-tag-label">${item.label}</span><strong class="stage-tag-value">${item.value}</strong>`;
    elements.stageLeadTags.append(chip);
  });

  if (state.lastFeaturedAgentName !== featured.name) {
    pulseElement(elements.stageLead, "is-animating");
  }
  state.lastFeaturedAgentName = featured.name;

  elements.stageOpenAgentButton.onclick = () => openAgentDetail(featured);
  elements.stageFilterAgentButton.onclick = () => applyFilterPatch({ agentFilter: featured.name });

  secondary.forEach((summary) => {
    const node = elements.stageAgentMiniTemplate.content.firstElementChild.cloneNode(true);
    const visual = agentVisual(summary.name);

    node.dataset.level = summary.health.level;
    applyAgentThemeVars(node, summary.name);
    node.querySelector(".stage-mini-avatar").innerHTML = avatarMarkup(summary.name);
    node.querySelector(".stage-mini-name").textContent = humanizeAgentName(summary.name);
    node.querySelector(".stage-mini-role").textContent = visual.role;
    node.querySelector(".stage-mini-health").textContent = summary.health.label;
    node.querySelector(".stage-mini-now").textContent = summary.latestEvent ? eventTitle(summary.latestEvent) : "Sin actividad reciente";
    node.querySelector(".stage-mini-spark").innerHTML = sparklineMarkup(summary.sparklineSeries, visual.primary);

    attachOpenHandler(node, () => selectAgent(summary.name));
    elements.stageAgentMiniList.append(node);
  });
}

function renderAgentBoards(events) {
  const summaries = buildAgentSummaries(events);

  elements.agentGrid.innerHTML = "";
  elements.agentCount.textContent = `${summaries.length} agente${summaries.length === 1 ? "" : "s"}`;
  elements.agentsEmpty.classList.toggle("hidden", summaries.length > 0);

  summaries.forEach((summary) => {
    const node = elements.agentCardTemplate.content.firstElementChild.cloneNode(true);
    const visual = agentVisual(summary.name);
    const latestTaskId = summary.latestEvent ? eventField(summary.latestEvent, "taskId") : null;

    node.dataset.level = summary.health.level;
    applyAgentThemeVars(node, summary.name);
    node.classList.toggle("is-selected", state.selectedAgentName === summary.name);
    node.querySelector(".agent-name").textContent = humanizeAgentName(summary.name);
    node.querySelector(".agent-avatar").innerHTML = avatarMarkup(summary.name);
    node.querySelector(".agent-role").textContent = visual.role;
    node.querySelector(".agent-meta").textContent = `Ultima actividad ${formatRelativeTime(summary.updatedAt)}`;
    node.querySelector(".agent-health").textContent = summary.health.label;
    node.querySelector(".agent-now-title").textContent = summary.latestEvent ? eventTitle(summary.latestEvent) : "Sin actividad reciente";
    node.querySelector(".agent-now-meta").textContent = [
      latestTaskId ? `Tarea ${latestTaskId}` : null,
      summary.latestEvent ? humanizeEventType(summary.latestEvent.type) : null,
      summary.latestEvent ? humanizeStatus(eventField(summary.latestEvent, "status")) : null,
    ].filter(Boolean).join(" | ") || "Esperando nuevos eventos";
    node.querySelector(".agent-now-spark").innerHTML = sparklineMarkup(summary.sparklineSeries, visual.primary);

    const totalOps = summary.total || 1;
    const completionRate = summary.total > 0 ? Math.round((summary.completed / totalOps) * 100) : 0;
    const circumference = 2 * Math.PI * 22;
    const offset = circumference - (completionRate / 100) * circumference;

    const metricsContainer = node.querySelector(".agent-metrics");
    const eventsVal = metricsContainer.querySelector(".agent-events");
    const tasksVal = metricsContainer.querySelector(".agent-tasks");
    const risksVal = metricsContainer.querySelector(".agent-risks");
    const completedVal = metricsContainer.querySelector(".agent-completed");

    eventsVal.textContent = String(summary.total);
    tasksVal.textContent = String(summary.taskCount);
    risksVal.textContent = String(summary.risks);
    completedVal.textContent = String(summary.completed);

    const extraMetrics = node.querySelector(".agent-card-head");
    const healthRing = document.createElement("div");
    healthRing.className = "agent-health-ring";
    healthRing.innerHTML = `
      <svg viewBox="0 0 48 48">
        <circle class="health-bg" cx="24" cy="24" r="22"></circle>
        <circle class="health-fill ${summary.health.level}" cx="24" cy="24" r="22" 
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <span class="agent-health-label" style="color:${visual.primary}">${completionRate}%</span>
    `;
    extraMetrics.insertBefore(healthRing, extraMetrics.lastElementChild);

    const metricBadges = document.createElement("div");
    metricBadges.className = "agent-metric-badges";
    metricBadges.innerHTML = `
      <span class="agent-metric-badge events"><i class="ti ti-activity"></i>${summary.total}</span>
      <span class="agent-metric-badge tasks"><i class="ti ti-list-check"></i>${summary.taskCount}</span>
      ${summary.completed > 0 ? `<span class="agent-metric-badge completed"><i class="ti ti-check"></i>${summary.completed}</span>` : ""}
      ${summary.inProgress > 0 ? `<span class="agent-metric-badge in-progress"><i class="ti ti-loader"></i>${summary.inProgress}</span>` : ""}
      ${summary.risks > 0 ? `<span class="agent-metric-badge risks"><i class="ti ti-alert-triangle"></i>${summary.risks}</span>` : ""}
    `;
    node.querySelector(".agent-metrics").appendChild(metricBadges);

    node.querySelector(".agent-queue-count").textContent = pluralize(summary.recentEvents.length, "registro", "registros");

    const queueList = node.querySelector(".agent-queue-list");
    queueList.innerHTML = "";
    summary.recentEvents.forEach((event) => {
      const item = document.createElement("li");
      item.className = "agent-queue-item";
      item.textContent = [
        humanizeEventType(event.type),
        eventField(event, "taskId") ? `Tarea ${eventField(event, "taskId")}` : null,
        formatRelativeTime(event.timestamp),
      ].filter(Boolean).join(" | ");
      queueList.append(item);
    });

    if (summary.recentEvents.length === 0) {
      const item = document.createElement("li");
      item.className = "agent-queue-item agent-queue-item-empty";
      item.textContent = "Sin registros recientes en la bitacora.";
      queueList.append(item);
    }

    node.querySelector(".agent-last-title").textContent = summary.latestEvent ? eventTitle(summary.latestEvent) : "Sin evento reciente";
    node.querySelector(".agent-last-time").textContent = summary.latestEvent
      ? `${humanizeEventType(summary.latestEvent.type)} | ${formatDateTime(summary.latestEvent.timestamp)}`
      : "Sin actividad";

    attachOpenHandler(node, () => {
      if (state.selectedAgentName === summary.name) {
        openAgentDetail(summary);
        return;
      }

      selectAgent(summary.name);
    });
    elements.agentGrid.append(node);
  });
}

function renderTimeline(events) {
  elements.timelineList.innerHTML = "";
  elements.timelineCount.textContent = `${events.length} evento${events.length === 1 ? "" : "s"}`;
  elements.timelineEmpty.classList.toggle("hidden", events.length > 0);

  events
    .slice()
    .reverse()
    .forEach((event) => {
      const node = elements.timelineItemTemplate.content.firstElementChild.cloneNode(true);
      const status = eventField(event, "status");

      node.dataset.status = status || "unknown";
      node.dataset.level = eventLevel(event);
      node.querySelector(".timeline-dot-icon").innerHTML = iconMarkup(agentVisual(event.agent).iconClass);
      node.querySelector(".badge-agent").textContent = humanizeAgentName(event.agent);
      node.querySelector(".badge-type").textContent = humanizeEventType(event.type);

      const statusBadge = node.querySelector(".badge-status");
      if (status) {
        statusBadge.textContent = humanizeStatus(status);
        statusBadge.classList.remove("hidden");
      }

      node.querySelector("time").textContent = formatDateTime(event.timestamp);
      node.querySelector(".timeline-title").textContent = eventTitle(event);

      const fields = [
        ["taskId", eventField(event, "taskId")],
        ["parentTaskId", eventField(event, "parentTaskId")],
        ["assignedTo", eventField(event, "assignedTo")],
        ["priority", eventField(event, "priority")],
        ["correlationId", eventField(event, "correlationId")],
        ["featureSlug", eventField(event, "featureSlug")],
        ["docType", eventField(event, "docType")],
      ].filter(([, value]) => value);

      const fieldsNode = node.querySelector(".event-fields");
      fields.forEach(([key, value]) => {
        const wrapper = document.createElement("div");
        const title = document.createElement("dt");
        const detail = document.createElement("dd");
        title.textContent = FIELD_LABELS[key] || key;
        detail.textContent = humanizeFieldValue(key, value);
        wrapper.append(title, detail);
        fieldsNode.append(wrapper);
      });

      if (fields.length === 0) {
        fieldsNode.remove();
      }

      node.querySelector(".payload-preview").textContent = compactPayloadPreview(event);
      attachOpenHandler(node, () => openEventDetail(event));
      elements.timelineList.append(node);
    });
}

function enrichTasks(tasks) {
  return tasks.map((task) => {
    const latestEvent = task.events?.[task.events.length - 1] || null;
    const latestDescription = latestEvent?.payload?.description || latestEvent?.payload?.message || null;

    return {
      ...task,
      parentTaskId: taskField(task, "parentTaskId"),
      durationMs: taskDurationMs(task),
      durationLabel: formatDuration(taskDurationMs(task)),
      summary: latestDescription || compactPayloadPreview(latestEvent || { payload: {}, type: task.latestStatus, agent: task.assignedTo }),
      children: [],
    };
  });
}

function buildTaskTree(tasks) {
  const enriched = enrichTasks(tasks);
  const byId = new Map(enriched.map((task) => [task.taskId, task]));
  const roots = [];

  enriched.forEach((task) => {
    if (task.parentTaskId && byId.has(task.parentTaskId)) {
      byId.get(task.parentTaskId).children.push(task);
      return;
    }

    roots.push(task);
  });

  const sortTasks = (items) => {
    items.sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0));
    items.forEach((item) => sortTasks(item.children));
  };

  sortTasks(roots);
  return roots;
}

function renderTaskNode(task, parent, depth = 0) {
  const node = elements.taskGroupTemplate.content.firstElementChild.cloneNode(true);
  const childContainer = node.querySelector(".task-children");
  const hasChildren = task.children.length > 0;
  const toggleButton = node.querySelector(".task-toggle");
  const durationBadge = node.querySelector(".task-duration");
  const collapsed = state.collapsedTaskIds.has(task.taskId);

  node.dataset.status = task.latestStatus || "unknown";
  node.dataset.level = statusLevel(task.latestStatus);
  node.style.setProperty("--task-depth", String(depth));
  node.classList.toggle("task-group-child", depth > 0);

  node.querySelector(".task-title").textContent = task.taskId;
  node.querySelector(".task-meta").textContent = [
    task.assignedTo ? `Asignada a ${humanizeAgentName(task.assignedTo, "Sin asignacion")}` : "Sin asignacion",
    task.priority ? `Prioridad ${humanizePriority(task.priority)}` : null,
    task.dependsOn?.length ? `Depende de ${task.dependsOn.join(", ")}` : null,
    `${task.events.length} evento${task.events.length === 1 ? "" : "s"}`,
    `Actualizada ${formatRelativeTime(task.updatedAt)}`,
  ].filter(Boolean).join(" | ");
  node.querySelector(".task-summary").textContent = task.summary;

  const statusEl = node.querySelector(".task-status");
  statusEl.textContent = humanizeStatus(task.latestStatus);
  statusEl.dataset.status = task.latestStatus || "unknown";

  if (task.durationLabel) {
    durationBadge.textContent = task.durationLabel;
    durationBadge.classList.remove("hidden");
  }

  const progressBar = node.querySelector(".task-progress-bar");
  const progressFill = progressBar.querySelector(".task-progress-fill");
  const progressLabel = node.querySelector(".task-progress-label");
  const metricsRow = node.querySelector(".task-metrics-row");

  const totalEvents = task.events.length;
  const completedEvents = task.events.filter(e => e.type === "TASK_COMPLETED" || e.type === "TEST_PASSED").length;
  const inProgressEvents = task.events.filter(e => e.type === "TASK_IN_PROGRESS" || e.type === "TASK_ACCEPTED").length;
  const failedEvents = task.events.filter(e => e.type === "TASK_FAILED" || e.type === "TEST_FAILED").length;
  const progress = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  if (totalEvents > 0 && (task.latestStatus === "in_progress" || task.latestStatus === "completed" || task.latestStatus === "blocked")) {
    progressBar.classList.remove("hidden");
    progressFill.style.width = `${progress}%`;
    progressFill.dataset.status = task.latestStatus;
    progressLabel.textContent = `${progress}%`;
  }

  if (totalEvents > 0) {
    metricsRow.classList.remove("hidden");
    metricsRow.innerHTML = `
      ${completedEvents > 0 ? `<span class="task-metric-chip completed"><i class="ti ti-check"></i>${completedEvents}</span>` : ""}
      ${inProgressEvents > 0 ? `<span class="task-metric-chip in-progress"><i class="ti ti-loader"></i>${inProgressEvents}</span>` : ""}
      ${failedEvents > 0 ? `<span class="task-metric-chip risks"><i class="ti ti-alert-triangle"></i>${failedEvents}</span>` : ""}
      <span class="task-metric-chip">${totalEvents} eventos</span>
    `;
  }

  if (hasChildren) {
    toggleButton.classList.remove("hidden");
    toggleButton.setAttribute("aria-expanded", String(!collapsed));
    toggleButton.innerHTML = iconMarkup(collapsed ? "ti ti-chevron-right" : "ti ti-chevron-down");
    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.collapsedTaskIds.has(task.taskId)) {
        state.collapsedTaskIds.delete(task.taskId);
      } else {
        state.collapsedTaskIds.add(task.taskId);
      }
      renderTasks(state.currentData.tasks || []);
    });
  }

  const eventList = node.querySelector(".task-events");
  task.events
    .slice()
    .reverse()
    .forEach((event) => {
      const item = document.createElement("li");
      const head = document.createElement("div");
      head.className = "task-event-head";

      const title = document.createElement("strong");
      title.textContent = eventTitle(event);

      const time = document.createElement("span");
      time.className = "task-event-meta";
      time.textContent = formatDateTime(event.timestamp);

      const meta = document.createElement("div");
      meta.className = "task-event-meta";
      meta.textContent = `${humanizeAgentName(event.agent)} | ${humanizeEventType(event.type)} | ${humanizeStatus(eventField(event, "status"))}`;

      head.append(title, time);
      item.append(head, meta);
      eventList.append(item);
    });

  if (hasChildren) {
    childContainer.classList.toggle("hidden", collapsed);
    task.children.forEach((childTask) => {
      renderTaskNode(childTask, childContainer, depth + 1);
    });
  } else {
    childContainer.remove();
  }

  attachOpenHandler(node, () => openTaskDetail(task));
  parent.append(node);
}

function renderTasks(tasks) {
  elements.taskGroups.innerHTML = "";
  elements.taskCount.textContent = `${tasks.length} tarea${tasks.length === 1 ? "" : "s"}`;
  elements.tasksEmpty.classList.toggle("hidden", tasks.length > 0);

  buildTaskTree(tasks).forEach((task) => {
    renderTaskNode(task, elements.taskGroups, 0);
  });
}

async function fetchEvents() {
  readFiltersFromForm();
  const query = serializeFilters();
  const response = await fetch(`/api/events${query ? `?${query}` : ""}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`No se pudo cargar eventos (${response.status})`);
  }

  const data = await response.json();
  state.currentData = {
    events: data.events || [],
    tasks: data.tasks || [],
    summary: data.summary || EMPTY_SUMMARY,
    generatedAt: data.generatedAt || null,
  };

  const agentValues = Object.keys(state.currentData.summary.byAgent || {}).sort((left, right) => left.localeCompare(right));
  const typeValues = Object.keys(state.currentData.summary.byType || {}).sort((left, right) => left.localeCompare(right));

  hydrateSelect(elements.agentFilter, agentValues);
  hydrateSelect(elements.typeFilter, typeValues);
  syncFormWithFilters();
  renderFiltersVisibility();
  renderActiveFilters();

  renderSummary(state.currentData);
  renderTypeDistribution(state.currentData.summary.byType || {});
  renderLiveRibbon();
  renderCriticalSignals(state.currentData.events);
  renderAgentStage(state.currentData.events);
  renderAgentBoards(state.currentData.events);
  renderTimeline(state.currentData.events);
  renderTasks(state.currentData.tasks);
  syncOpenDetail();

  elements.lastUpdatedLabel.textContent = `Actualizado ${formatRelativeTime(state.currentData.generatedAt)}`;
}

async function refreshWithHandling() {
  try {
    await fetchEvents();
  } catch (error) {
    state.currentData = {
      events: [],
      tasks: [],
      summary: EMPTY_SUMMARY,
      generatedAt: null,
    };
    elements.lastUpdatedLabel.textContent = error.message;
    renderSummary(state.currentData);
    renderTypeDistribution({});
    renderLiveRibbon();
    renderCriticalSignals([]);
    renderAgentStage([]);
    renderAgentBoards([]);
    renderTimeline([]);
    renderTasks([]);
  }
}

function scheduleRealtimeRefresh() {
  window.clearTimeout(state.liveRefreshTimer);
  state.liveRefreshTimer = window.setTimeout(() => {
    refreshWithHandling();
  }, 120);
}

function websocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function scheduleReconnect() {
  window.clearTimeout(state.reconnectTimer);
  state.reconnectTimer = window.setTimeout(() => {
    connectSocket();
  }, 1800);
}

function handleSocketMessage(rawMessage) {
  let message;

  try {
    message = JSON.parse(rawMessage);
  } catch {
    return;
  }

  if (message.latestEvent) {
    state.livePreview = message.latestEvent;
    renderLiveRibbon();
  }

  if (message.type === "connected") {
    applySocketState("open");
    return;
  }

  if (message.type === "events_updated") {
    if (message.latestEvent && isCriticalEvent(message.latestEvent)) {
      notifyCriticalEvent(message.latestEvent);
    }
    scheduleRealtimeRefresh();
  }
}

function connectSocket() {
  if (state.socket && (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  applySocketState("pending");

  const socket = new WebSocket(websocketUrl());
  state.socket = socket;

  socket.addEventListener("open", () => {
    applySocketState("open");
  });

  socket.addEventListener("message", (event) => {
    handleSocketMessage(event.data);
  });

  socket.addEventListener("close", () => {
    if (state.socket === socket) {
      state.socket = null;
    }
    applySocketState("closed");
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    applySocketState("error");
  });
}

function primeAudio() {
  ensureAudioContext();
}

function toggleAudio() {
  state.audioEnabled = !state.audioEnabled;
  persistPreferences();
  updateMuteButton();

  if (state.audioEnabled) {
    ensureAudioContext();
    showToast({
      level: "info",
      title: "Audio activado",
      body: "Las alertas criticas volveran a emitir sonido.",
    });
    return;
  }

  showToast({
    level: "info",
    title: "Audio silenciado",
    body: "Las alertas seguiran apareciendo visualmente sin sonido.",
  });
}

function clearAllFilters() {
  state.filters = {
    agentFilter: "",
    typeFilter: "",
    status: "",
    assignedTo: "",
    taskId: "",
    parentTaskId: "",
    correlationId: "",
    since: "",
    limit: 200,
  };
  persistPreferences();
  syncFormWithFilters();
  renderActiveFilters();
  refreshWithHandling();
}

function toggleFiltersPanel() {
  state.filtersOpen = !state.filtersOpen;
  persistPreferences();
  renderFiltersVisibility();
}

function bindEvents() {
  elements.filterForm.addEventListener("input", () => {
    window.clearTimeout(state.fetchTimer);
    state.fetchTimer = window.setTimeout(() => {
      refreshWithHandling();
    }, 160);
  });

  elements.refreshButton.addEventListener("click", () => {
    refreshWithHandling();
  });

  elements.toggleFiltersButton.addEventListener("click", toggleFiltersPanel);
  elements.exportSnapshotButton.addEventListener("click", exportSnapshot);
  elements.exportReportButton.addEventListener("click", exportReport);
  elements.muteButton.addEventListener("click", toggleAudio);
  elements.resetButton.addEventListener("click", clearAllFilters);

  elements.detailTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".detail-tab");
    if (!button) {
      return;
    }

    setDetailTab(button.dataset.tab || "overview");
  });

  elements.detailBackdrop.addEventListener("click", closeDetailDrawer);
  elements.detailCloseButton.addEventListener("click", closeDetailDrawer);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.detailShell.classList.contains("hidden")) {
      closeDetailDrawer();
    }
  });

  window.addEventListener("pointerdown", primeAudio, { passive: true });
  window.addEventListener("keydown", primeAudio);

  window.addEventListener("beforeunload", () => {
    if (state.socket) {
      state.socket.close();
    }
  });
}

loadPreferences();
syncFormWithFilters();
renderFiltersVisibility();
renderActiveFilters();
updateMuteButton();
bindEvents();
refreshWithHandling();
connectSocket();
