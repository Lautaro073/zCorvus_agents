import path from "node:path";
import { fileURLToPath } from "node:url";

import {
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
    branch: "main",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
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

async function safeRequest(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadWorkspaceEnv(workspaceRoot);

  const token = getGitHubToken();
  if (!token) {
    throw new Error("Necesito GITHUB_TOKEN o GH_TOKEN para ejecutar el preflight de GitHub.");
  }

  const remote = parseRemote();
  const repoResult = await safeRequest(() => githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}`, token, "GET"));
  const protectionResult = await safeRequest(() => githubRequest(`https://api.github.com/repos/${remote.owner}/${remote.repo}/branches/${args.branch}/protection`, token, "GET"));
  const defaultBranch = repoResult.ok ? repoResult.data.default_branch : null;

  process.stdout.write(`${JSON.stringify({
    ok: repoResult.ok,
    owner: remote.owner,
    repo: remote.repo,
    branch: args.branch,
    repository: repoResult.ok
      ? {
          visibility: repoResult.data.visibility,
          defaultBranch,
          hasIssues: repoResult.data.has_issues,
          permissions: repoResult.data.permissions || null,
        }
      : null,
    branchProtection: protectionResult.ok
      ? {
          strict: protectionResult.data.required_status_checks?.strict,
          contexts: protectionResult.data.required_status_checks?.contexts || [],
          requiredApprovals: protectionResult.data.required_pull_request_reviews?.required_approving_review_count || 0,
          requireConversationResolution: protectionResult.data.required_conversation_resolution?.enabled || false,
          requiredLinearHistory: protectionResult.data.required_linear_history?.enabled || false,
          allowForcePushes: protectionResult.data.allow_force_pushes?.enabled || false,
          allowDeletions: protectionResult.data.allow_deletions?.enabled || false,
        }
      : null,
    warnings: [
      repoResult.ok && defaultBranch !== args.branch ? `La rama por defecto es '${defaultBranch}', no '${args.branch}'.` : null,
      protectionResult.ok && !(protectionResult.data.required_status_checks?.contexts || []).includes("Workspace") ? "Workspace no figura como required check." : null,
      repoResult.ok && repoResult.data.permissions && repoResult.data.permissions.push !== true ? "El token no parece tener permiso de push sobre el repo." : null,
      !protectionResult.ok ? `No se pudo leer branch protection: ${protectionResult.error}` : null,
    ].filter(Boolean),
    errors: [repoResult.ok ? null : repoResult.error].filter(Boolean),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
