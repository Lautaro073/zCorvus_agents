import path from "path";
import { fileURLToPath } from "url";
import { createRollbackRuntime } from "./lib/rollback-runtime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const runtime = createRollbackRuntime(workspaceRoot);

function parseArgs(argv) {
  const result = {
    files: [],
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument '${token}'.`);
    }

    const key = token.slice(2);
    if (key === "force") {
      result.force = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Argument '--${key}' requires a value.`);
    }

    index += 1;
    if (key === "file") {
      result.files.push(nextValue);
      continue;
    }

    result[key] = nextValue;
  }

  return result;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const command = process.argv[2];
  if (!command) {
    throw new Error("A command is required: init, sync, restore, cleanup, status.");
  }

  const args = parseArgs(process.argv.slice(3));
  let result;

  switch (command) {
    case "init":
      result = await runtime.init({
        taskId: args.task,
        agent: args.agent,
        correlationId: args.correlation,
        files: args.files,
      });
      break;
    case "sync":
      result = await runtime.sync({
        taskId: args.task,
        files: args.files,
      });
      break;
    case "restore":
      result = await runtime.restore({
        taskId: args.task,
      });
      break;
    case "cleanup":
      result = await runtime.cleanup({
        taskId: args.task,
        force: args.force,
      });
      break;
    case "status":
      result = await runtime.status({
        taskId: args.task,
      });
      break;
    default:
      throw new Error(`Unknown command '${command}'.`);
  }

  printJson(result);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
