import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendGithubEvent, buildTaskContext, loadWorkspaceEnv } from "./lib/github-agent-flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const result = {};

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task || !args.type) {
    throw new Error("Necesito '--task' y '--type'.");
  }

  await loadWorkspaceEnv(workspaceRoot);
  const taskContext = await buildTaskContext(workspaceRoot, args.task);
  const payload = {
    taskId: taskContext.taskId,
    assignedTo: taskContext.assignedTo,
    status: taskContext.latestStatus || "completed",
    correlationId: taskContext.correlationId,
    parentTaskId: taskContext.parentTaskId,
    issueNumber: args.issueNumber ? Number(args.issueNumber) : undefined,
    issueUrl: args.issueUrl || undefined,
    branchName: args.branchName || undefined,
    baseBranch: args.baseBranch || undefined,
    prNumber: args.prNumber ? Number(args.prNumber) : undefined,
    prUrl: args.prUrl || undefined,
    message: args.message || `Evento ${args.type} sincronizado manualmente en MCP.`,
  };

  await appendGithubEvent(workspaceRoot, {
    agent: args.agent || taskContext.assignedTo || "Orchestrator",
    type: args.type,
    payload,
  });

  process.stdout.write(`${JSON.stringify({ ok: true, type: args.type, taskId: args.task, payload }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
