import { execFileSync } from "node:child_process";

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function parseRemote() {
  const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf-8" }).trim();
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/i);
  if (!match) {
    throw new Error(`No pude parsear el remote origin: ${remoteUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

function parseArgs(argv) {
  const result = {
    branch: "main",
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
    result[key] = nextValue;
  }

  return result;
}

async function githubRequest(url, token, method, body) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = getToken();
  const { owner, repo } = parseRemote();

  const payload = {
    required_status_checks: {
      strict: true,
      contexts: ["Backend", "Frontend", "Workspace"],
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      dismissal_restrictions: {},
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 1,
      require_last_push_approval: false,
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: true,
  };

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ owner, repo, branch: args.branch, payload }, null, 2)}\n`);
    return;
  }

  if (!token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para aplicar branch protection.");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/branches/${args.branch}/protection`;
  await githubRequest(url, token, "PUT", payload);

  process.stdout.write(`${JSON.stringify({ ok: true, owner, repo, branch: args.branch }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
