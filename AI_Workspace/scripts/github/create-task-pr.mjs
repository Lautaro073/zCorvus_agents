import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendGithubEvent,
  buildPrBody,
  buildPrTitle,
  buildTaskContext,
  currentBranch,
  getGitHubToken,
  githubRequest,
  git,
  loadWorkspaceEnv,
  parseRemote,
} from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {
    base: "main",
    draft: false,
    dryRun: false,
    push: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--draft") {
      result.draft = true;
      continue;
    }
    if (token === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (token === "--no-push") {
      result.push = false;
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
    result[key] = nextValue;
  }

  return result;
}

async function findExistingPr(remote, token, branchName) {
  const url = `https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls?state=open&head=${remote.owner}:${encodeURIComponent(branchName)}`;
  const prs = await githubRequest(url, token, "GET");
  return Array.isArray(prs) && prs.length > 0 ? prs[0] : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task) {
    throw new Error("'--task' is required.");
  }

  await loadWorkspaceEnv(workspaceRoot);
  const token = getGitHubToken();
  if (!args.dryRun && !token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para crear el PR.");
  }

  const remote = parseRemote();
  const taskContext = await buildTaskContext(workspaceRoot, args.task);
  const agent = args.agent || taskContext.assignedTo || "agent";
  const branchName = args.branch || currentBranch();
  const title = args.title || buildPrTitle(taskContext, agent);
  const body = args.body || buildPrBody(taskContext, branchName);

  const payload = {
    title,
    head: branchName,
    base: args.base,
    body,
    draft: Boolean(args.draft),
  };

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ owner: remote.owner, repo: remote.repo, payload }, null, 2)}\n`);
    return;
  }

  if (args.push) {
    git(["push", "-u", "origin", branchName]);
  }

  const existing = await findExistingPr(remote, token, branchName);
  if (existing) {
    process.stdout.write(`${JSON.stringify({ ok: true, reused: true, number: existing.number, url: existing.html_url }, null, 2)}\n`);
    return;
  }

  const result = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls`, token, "POST", payload);

  await appendGithubEvent(workspaceRoot, {
    agent,
    type: "GITHUB_PR_OPENED",
    payload: {
      taskId: args.task,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "completed",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      branchName,
      baseBranch: args.base,
      prNumber: result.number,
      prUrl: result.html_url,
      message: `Pull request abierta para ${args.task}`,
    },
  });

  process.stdout.write(`${JSON.stringify({ ok: true, number: result.number, url: result.html_url, title: result.title }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
