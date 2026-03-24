import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDotEnv(content) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export async function loadWorkspaceEnv(workspaceRoot) {
  const envPath = path.join(workspaceRoot, ".env");
  try {
    const raw = await readFile(envPath, "utf-8");
    parseDotEnv(raw);
  } catch {
  }
}

export function getGitHubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

export function parseRemote() {
  const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" }).trim();
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error(`No pude parsear el remote origin: ${remoteUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2],
    remoteUrl,
  };
}

export async function githubRequest(url, token, method = "GET", body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return response.status === 204 ? null : response.json();
}

export async function ensureLabel(remote, token, name, color = "0e8a16") {
  const encoded = encodeURIComponent(name);
  const getUrl = `https://api.github.com/repos/${remote.owner}/${remote.repo}/labels/${encoded}`;

  try {
    await githubRequest(getUrl, token, "GET");
    return;
  } catch (error) {
    if (!String(error.message).includes("404")) {
      throw error;
    }
  }

  await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/labels`, token, "POST", {
    name,
    color,
  });
}

export function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf-8",
    ...options,
  }).trim();
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "task";
}

export function currentBranch() {
  return git(["branch", "--show-current"]);
}

export function isWorktreeDirty() {
  return git(["status", "--porcelain"]).length > 0;
}

export function branchExists(branchName) {
  try {
    git(["rev-parse", "--verify", branchName]);
    return true;
  } catch {
    return false;
  }
}

export async function readTaskEvents(workspaceRoot, taskId) {
  const contextPath = path.join(workspaceRoot, "MCP_Server", "shared_context.jsonl");
  let raw = "";
  try {
    raw = await readFile(contextPath, "utf-8");
  } catch {
    return [];
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((event) => {
      return event.taskId === taskId || event.payload?.taskId === taskId;
    });
}

function eventField(event, fieldName) {
  return event?.[fieldName] ?? event?.payload?.[fieldName] ?? null;
}

export async function buildTaskContext(workspaceRoot, taskId) {
  const events = await readTaskEvents(workspaceRoot, taskId);
  const latest = events[events.length - 1] || null;
  const assignment = events.find((event) => event.type === "TASK_ASSIGNED") || latest;

  return {
    taskId,
    exists: events.length > 0,
    assignedTo: eventField(assignment, "assignedTo"),
    correlationId: eventField(assignment, "correlationId") || eventField(latest, "correlationId"),
    parentTaskId: eventField(assignment, "parentTaskId") || eventField(latest, "parentTaskId"),
    priority: eventField(assignment, "priority") || eventField(latest, "priority"),
    description: eventField(assignment, "description") || eventField(assignment, "message") || eventField(latest, "description") || eventField(latest, "message"),
    acceptanceCriteria: Array.isArray(eventField(assignment, "acceptanceCriteria")) ? eventField(assignment, "acceptanceCriteria") : [],
    artifactPaths: Array.from(new Set(events.flatMap((event) => eventField(event, "artifactPaths") || []))),
    latestStatus: eventField(latest, "status"),
    events,
  };
}

export function buildBranchName({ agent, taskId }) {
  return `agents/${slugify(agent)}/${slugify(taskId)}`;
}

export function buildIssueTitle(taskContext, agent) {
  const prefix = agent ? `[${agent}]` : "[Task]";
  return `${prefix} ${taskContext.taskId} - ${taskContext.description || "Seguimiento de tarea"}`;
}

export function buildIssueBody(taskContext) {
  const code = (value) => `\`${value}\``;
  return [
    "## Contexto",
    `- Task ID: ${code(taskContext.taskId)}`,
    taskContext.assignedTo ? `- Assigned to: ${code(taskContext.assignedTo)}` : null,
    taskContext.correlationId ? `- Correlation ID: ${code(taskContext.correlationId)}` : null,
    taskContext.parentTaskId ? `- Parent task: ${code(taskContext.parentTaskId)}` : null,
    taskContext.priority ? `- Priority: ${code(taskContext.priority)}` : null,
    "",
    "## Objetivo",
    taskContext.description || "Sin descripcion disponible.",
    "",
    "## Acceptance Criteria",
    taskContext.acceptanceCriteria.length > 0
      ? taskContext.acceptanceCriteria.map((item) => `- ${item}`).join("\n")
      : "- Sin criterios registrados.",
    "",
    "## Artifact Paths",
    taskContext.artifactPaths.length > 0
      ? taskContext.artifactPaths.map((item) => `- ${code(item)}`).join("\n")
      : "- Sin artifact paths aun.",
  ].filter(Boolean).join("\n");
}

export function buildPrTitle(taskContext, agent) {
  const prefix = agent ? `[${agent}]` : "[Task]";
  return `${prefix} ${taskContext.taskId}: ${taskContext.description || "actualizacion"}`;
}

export function buildPrBody(taskContext, branchName) {
  const code = (value) => `\`${value}\``;
  const recentEvents = taskContext.events.slice(-5).map((event) => `- ${event.type} | ${eventField(event, "status") || "sin-status"} | ${event.payload?.message || event.payload?.description || "sin detalle"}`);

  return [
    "## Task",
    `- Task ID: ${code(taskContext.taskId)}`,
    taskContext.assignedTo ? `- Assigned to: ${code(taskContext.assignedTo)}` : null,
    taskContext.correlationId ? `- Correlation ID: ${code(taskContext.correlationId)}` : null,
    `- Branch: ${code(branchName)}`,
    "",
    "## Why",
    taskContext.description || "Sin descripcion disponible.",
    "",
    "## Acceptance Criteria",
    taskContext.acceptanceCriteria.length > 0
      ? taskContext.acceptanceCriteria.map((item) => `- ${item}`).join("\n")
      : "- Sin criterios registrados.",
    "",
    "## Recent MCP Context",
    recentEvents.length > 0 ? recentEvents.join("\n") : "- Sin eventos recientes.",
  ].filter(Boolean).join("\n");
}

export async function appendGithubEvent(workspaceRoot, { agent, type, payload }) {
  const contextPath = path.join(workspaceRoot, "MCP_Server", "shared_context.jsonl");
  const line = JSON.stringify({
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    agent,
    type,
    taskId: payload.taskId ?? null,
    assignedTo: payload.assignedTo ?? null,
    status: payload.status ?? null,
    correlationId: payload.correlationId ?? payload.taskId ?? null,
    parentTaskId: payload.parentTaskId ?? null,
    payloadVersion: "1.0",
    payload,
  });
  await appendFile(contextPath, `${line}\n`, "utf-8");
}
