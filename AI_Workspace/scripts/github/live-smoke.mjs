import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendGithubEvent,
  buildBranchName,
  buildIssueBody,
  buildIssueTitle,
  buildPrBody,
  buildPrTitle,
  buildTaskContext,
  ensureLabel,
  getGitHubToken,
  githubRequest,
  loadWorkspaceEnv,
  parseRemote,
  slugify,
} from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {
    task: "doc-tokens-01",
    agent: "Documenter",
    base: "main",
    draft: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--no-draft") {
      result.draft = false;
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

function makeSmokeBranch(agent, taskId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").toLowerCase();
  return `${buildBranchName({ agent, taskId })}-smoke-${slugify(timestamp)}`;
}

async function getBaseSha(remote, token, branch) {
  const branchData = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/branches/${branch}`, token, "GET");
  return branchData.commit.sha;
}

async function createBranch(remote, token, branchName, sha) {
  return githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/git/refs`, token, "POST", {
    ref: `refs/heads/${branchName}`,
    sha,
  });
}

async function createCommitFile(remote, token, branchName, filePath, content) {
  const encodedPath = filePath.split(path.sep).join("/");
  return githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/contents/${encodedPath}`, token, "PUT", {
    message: `test: add GitHub flow smoke file for ${branchName}`,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: branchName,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadWorkspaceEnv(workspaceRoot);

  const token = getGitHubToken();
  if (!token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para ejecutar el smoke real de GitHub.");
  }

  const remote = parseRemote();
  const taskContext = await buildTaskContext(workspaceRoot, args.task);
  const issueTitle = `[Smoke][${args.agent}] ${buildIssueTitle(taskContext, args.agent)}`;
  const issueBody = `${buildIssueBody(taskContext)}\n\n---\nSmoke test real de la integracion GitHub del AI Workspace.`;
  const labels = ["smoke-test", `agent:${String(args.agent).toLowerCase()}`, `task:${args.task}`];

  for (const label of labels) {
    await ensureLabel(remote, token, label, label === "smoke-test" ? "d73a4a" : label.startsWith("agent:") ? "1d76db" : "5319e7");
  }

  const issue = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/issues`, token, "POST", {
    title: issueTitle,
    body: issueBody,
    labels,
  });

  await appendGithubEvent(workspaceRoot, {
    agent: args.agent,
    type: "GITHUB_ISSUE_CREATED",
    payload: {
      taskId: taskContext.taskId,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "completed",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      message: `Smoke issue creada para ${taskContext.taskId}`,
    },
  });

  const branchName = makeSmokeBranch(args.agent, args.task);
  const baseSha = await getBaseSha(remote, token, args.base);
  await createBranch(remote, token, branchName, baseSha);

  await appendGithubEvent(workspaceRoot, {
    agent: args.agent,
    type: "GITHUB_BRANCH_CREATED",
    payload: {
      taskId: taskContext.taskId,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "completed",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      branchName,
      baseBranch: args.base,
      message: `Smoke branch creada para ${taskContext.taskId}`,
    },
  });

  const smokeFilePath = path.posix.join("report", "github-smoke", `${branchName}.md`);
  const smokeFileContent = [
    `# GitHub smoke test`,
    ``,
    `- Task: ${args.task}`,
    `- Agent: ${args.agent}`,
    `- Issue: ${issue.html_url}`,
    `- Branch: ${branchName}`,
    `- Generated at: ${new Date().toISOString()}`,
  ].join("\n");
  await createCommitFile(remote, token, branchName, smokeFilePath, smokeFileContent);

  const pr = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls`, token, "POST", {
    title: `[Smoke][${args.agent}] ${buildPrTitle(taskContext, args.agent)}`,
    head: branchName,
    base: args.base,
    body: `${buildPrBody(taskContext, branchName)}\n\n---\nSmoke test real del flujo issue -> branch -> commit -> PR.`,
    draft: Boolean(args.draft),
  });

  await appendGithubEvent(workspaceRoot, {
    agent: args.agent,
    type: "GITHUB_PR_OPENED",
    payload: {
      taskId: taskContext.taskId,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "completed",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      branchName,
      baseBranch: args.base,
      prNumber: pr.number,
      prUrl: pr.html_url,
      message: `Smoke PR abierta para ${taskContext.taskId}`,
    },
  });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    issue: { number: issue.number, url: issue.html_url },
    branch: branchName,
    pr: { number: pr.number, url: pr.html_url, draft: pr.draft },
    smokeFilePath,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
