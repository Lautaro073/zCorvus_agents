import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendGithubEvent,
  branchExists,
  buildBranchName,
  buildTaskContext,
  currentBranch,
  git,
  isWorktreeDirty,
  loadWorkspaceEnv,
} from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {
    base: "main",
    dryRun: false,
    allowDirty: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (token === "--allow-dirty") {
      result.allowDirty = true;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task) {
    throw new Error("'--task' is required.");
  }

  await loadWorkspaceEnv(workspaceRoot);
  const taskContext = await buildTaskContext(workspaceRoot, args.task);
  const agent = args.agent || taskContext.assignedTo || "agent";
  const branchName = args.branch || buildBranchName({ agent, taskId: args.task });

  if (isWorktreeDirty() && !args.allowDirty) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      code: "DIRTY_WORKTREE",
      currentBranch: currentBranch(),
      branchName,
    }, null, 2)}\n`);
    return;
  }

  const payload = {
    taskId: args.task,
    agent,
    base: args.base,
    branchName,
    currentBranch: currentBranch(),
  };

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ ok: true, dryRun: true, ...payload }, null, 2)}\n`);
    return;
  }

  if (branchExists(branchName)) {
    git(["switch", branchName]);
  } else {
    git(["switch", args.base]);
    git(["switch", "-c", branchName]);
  }

  await appendGithubEvent(workspaceRoot, {
    agent,
    type: "GITHUB_BRANCH_CREATED",
    payload: {
      taskId: args.task,
      assignedTo: taskContext.assignedTo,
      status: taskContext.latestStatus || "accepted",
      correlationId: taskContext.correlationId,
      parentTaskId: taskContext.parentTaskId,
      branchName,
      baseBranch: args.base,
      message: `Branch ${branchName} preparada para ${args.task}`,
    },
  });

  process.stdout.write(`${JSON.stringify({ ok: true, branchName, base: args.base }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
