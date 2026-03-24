import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendGithubEvent,
  buildIssueBody,
  buildIssueTitle,
  buildTaskContext,
  ensureLabel,
  getGitHubToken,
  githubRequest,
  loadWorkspaceEnv,
  parseRemote,
} from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {
    labels: [],
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument '${token}'.`);
    }
    const key = token.slice(2);
    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Argument '--${key}' requires a value.`);
    }
    index += 1;
    if (key === "label") {
      result.labels.push(nextValue);
      continue;
    }
    result[key] = nextValue;
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task) {
    throw new Error("'--task' is required.");
  }

  await loadWorkspaceEnv(workspaceRoot);
  const token = getGitHubToken();
  const remote = parseRemote();
  const taskContext = await buildTaskContext(workspaceRoot, args.task);
  const agent = args.agent || taskContext.assignedTo || "Orchestrator";
  const title = args.title || buildIssueTitle(taskContext, agent);
  const body = args.body || buildIssueBody(taskContext);
  const labels = Array.from(new Set([`agent:${String(agent).toLowerCase()}`, `task:${args.task}`, ...args.labels]));

  const payload = {
    title,
    body,
    labels,
  };

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ owner: remote.owner, repo: remote.repo, payload }, null, 2)}\n`);
    return;
  }

  if (!token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para crear la issue.");
  }

  for (const label of labels) {
    await ensureLabel(remote, token, label, label.startsWith("agent:") ? "1d76db" : "5319e7");
  }

  const result = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/issues`, token, "POST", payload);
  let labelsApplied = true;

  if (labels.length > 0) {
    try {
      await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/issues/${result.number}`, token, "PATCH", {
        labels,
      });
    } catch {
      labelsApplied = false;
    }
  }

  await appendGithubEvent(workspaceRoot, {
    agent,
    type: "GITHUB_ISSUE_CREATED",
    payload: {
      taskId: taskContext.taskId,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "assigned",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      issueNumber: result.number,
      issueUrl: result.html_url,
      message: `GitHub issue creada para ${taskContext.taskId}`,
    },
  });

  process.stdout.write(`${JSON.stringify({ ok: true, number: result.number, url: result.html_url, title: result.title, labelsRequested: labels, labelsApplied }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
