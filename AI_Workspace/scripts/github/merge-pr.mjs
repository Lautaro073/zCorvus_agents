#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, "..", "..", ".env");
    const raw = fs.readFileSync(envPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch { }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { prNumber: null, mergeMethod: "squash", scope: "auto" };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pr" && args[i + 1]) {
      result.prNumber = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--method" && args[i + 1]) {
      result.mergeMethod = args[i + 1];
      i++;
    } else if (args[i] === "--scope" && args[i + 1]) {
      result.scope = args[i + 1];
      i++;
    }
  }

  if (!result.prNumber) {
    throw new Error("--pr <number> is required");
  }

  return result;
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

async function getPRFiles(owner, repo, token, prNumber) {
  const files = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const pageFiles = await response.json();
    files.push(...pageFiles.map((item) => normalizePath(item.filename)));

    if (pageFiles.length < 100) {
      break;
    }
    page += 1;
  }

  return files;
}

function inferScope(files, overrideScope) {
  if (overrideScope && overrideScope !== "auto") {
    return {
      workspace: overrideScope === "workspace",
      backend: overrideScope === "backend",
      frontend: overrideScope === "frontend",
    };
  }

  const scope = { workspace: false, backend: false, frontend: false };

  for (const file of files) {
    if (file.startsWith("AI_Workspace/")) {
      scope.workspace = true;
      continue;
    }

    if (file.startsWith("Backend/")) {
      scope.backend = true;
      continue;
    }

    if (file.startsWith("Frontend/")) {
      scope.frontend = true;
    }
  }

  return scope;
}

function isCheckRelevant(name, scope) {
  const value = String(name || "").toLowerCase();

  if (!scope.backend && value.includes("backend")) {
    return false;
  }

  if (!scope.frontend && value.includes("frontend")) {
    return false;
  }

  if (scope.workspace && !scope.backend && !scope.frontend) {
    if (value.includes("backend") || value.includes("frontend")) {
      return false;
    }
  }

  return true;
}

async function getCheckRuns(owner, repo, token, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function mergePR(owner, repo, token, prNumber, mergeMethod) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      merge_method: mergeMethod,
      commit_title: "Merge PR via Orchestrator"
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function checkPRStatus(owner, repo, token, prNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function getCommitStatus(owner, repo, token, sha) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function main() {
  loadEnv();
  const { prNumber, mergeMethod, scope: scopeArg } = parseArgs();

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not found in .env");
  }

  const owner = "Lautaro073";
  const repo = "zCorvus_agents";

  // First, check PR state
  console.log(`Checking PR #${prNumber}...`);
  const pr = await checkPRStatus(owner, repo, token, prNumber);

  if (pr.merged) {
    console.log(`⚠️ PR #${prNumber} is already merged!`);
    return;
  }

  if (pr.state === "closed") {
    console.log(`⚠️ PR #${prNumber} is closed and cannot be merged.`);
    return;
  }

  // Check CI status
  console.log(`Checking CI status for ${pr.head.sha}...`);
  const status = await getCommitStatus(owner, repo, token, pr.head.sha);
  const checkRunsResult = await getCheckRuns(owner, repo, token, pr.head.sha);
  const files = await getPRFiles(owner, repo, token, prNumber);
  const scope = inferScope(files, scopeArg);

  const checkRuns = Array.isArray(checkRunsResult.check_runs) ? checkRunsResult.check_runs : [];
  const relevantChecks = checkRuns.filter((run) => isCheckRelevant(run.name, scope));

  const hasRelevantPending = relevantChecks.some((run) => run.status !== "completed");
  const hasRelevantFailed = relevantChecks.some((run) => {
    const conclusion = String(run.conclusion || "").toLowerCase();
    return run.status === "completed" && !["success", "neutral", "skipped"].includes(conclusion);
  });

  let ciState = status.state;
  if (relevantChecks.length > 0) {
    if (hasRelevantFailed) {
      ciState = "failure";
    } else if (hasRelevantPending) {
      ciState = "pending";
    } else {
      ciState = "success";
    }
  }

  console.log(`   CI State (scope-aware): ${ciState}`);
  console.log(`   Scope: workspace=${scope.workspace}, backend=${scope.backend}, frontend=${scope.frontend}`);
  console.log(`   Relevant checks: ${relevantChecks.length}/${checkRuns.length}`);

  if (ciState !== "success") {
    console.log(`❌ CI not passed yet (${ciState}). Waiting for checks...`);
    console.log(`   Run this script again after CI passes.`);
    return;
  }

  console.log(`✅ CI passed! Merging PR #${prNumber}...`);

  const result = await mergePR(owner, repo, token, prNumber, mergeMethod);

  console.log(`✅ PR #${prNumber} merged!`);
  console.log(`   SHA: ${result.sha}`);
  console.log(`   Merged at: ${result.merged_at}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
