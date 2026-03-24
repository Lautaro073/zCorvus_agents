import path from "node:path";
import { fileURLToPath } from "node:url";

import { getGitHubToken, githubRequest, loadWorkspaceEnv, parseRemote } from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {
    keepIssue: ["1"],
    keepPr: ["2"],
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
    if (key === "keep-issue") {
      result.keepIssue.push(nextValue);
      continue;
    }
    if (key === "keep-pr") {
      result.keepPr.push(nextValue);
      continue;
    }
    result[key] = nextValue;
  }

  return result;
}

function isSmokeIssue(issue) {
  return typeof issue.title === "string" && issue.title.startsWith("[Smoke");
}

async function listOpen(remote, token) {
  const issues = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/issues?state=open&per_page=50`, token, "GET");
  const pulls = await githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls?state=open&per_page=50`, token, "GET");
  return { issues, pulls };
}

async function closeIssue(remote, token, number) {
  return githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/issues/${number}`, token, "PATCH", {
    state: "closed",
  });
}

async function closePr(remote, token, number) {
  return githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/pulls/${number}`, token, "PATCH", {
    state: "closed",
  });
}

async function deleteBranch(remote, token, refName) {
  const encodedRef = encodeURIComponent(`heads/${refName}`);
  return githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/git/refs/${encodedRef}`, token, "DELETE");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadWorkspaceEnv(workspaceRoot);

  const token = getGitHubToken();
  if (!token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para limpiar artefactos smoke en GitHub.");
  }

  const remote = parseRemote();
  const { issues, pulls } = await listOpen(remote, token);
  const keepIssues = new Set(args.keepIssue.map(String));
  const keepPrs = new Set(args.keepPr.map(String));

  const smokeIssues = issues.filter((issue) => !issue.pull_request && isSmokeIssue(issue));
  const smokePrs = pulls.filter((pr) => isSmokeIssue(pr));

  const toCloseIssues = smokeIssues.filter((issue) => !keepIssues.has(String(issue.number)));
  const toClosePrs = smokePrs.filter((pr) => !keepPrs.has(String(pr.number)));

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({
      issuesToClose: toCloseIssues.map((issue) => ({ number: issue.number, title: issue.title })),
      prsToClose: toClosePrs.map((pr) => ({ number: pr.number, title: pr.title, head: pr.head.ref })),
    }, null, 2)}\n`);
    return;
  }

  const closedIssues = [];
  const closedPrs = [];
  const branchDeletes = [];
  const warnings = [];

  for (const issue of toCloseIssues) {
    try {
      await closeIssue(remote, token, issue.number);
      closedIssues.push(issue.number);
    } catch (error) {
      warnings.push(`Issue #${issue.number}: ${error.message}`);
    }
  }

  for (const pr of toClosePrs) {
    try {
      await closePr(remote, token, pr.number);
      closedPrs.push(pr.number);
    } catch (error) {
      warnings.push(`PR #${pr.number}: ${error.message}`);
    }

    try {
      await deleteBranch(remote, token, pr.head.ref);
      branchDeletes.push(pr.head.ref);
    } catch (error) {
      warnings.push(`Branch ${pr.head.ref}: ${error.message}`);
    }
  }

  process.stdout.write(`${JSON.stringify({ ok: true, closedIssues, closedPrs, branchDeletes, warnings }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
