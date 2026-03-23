import path from "path";
import { fileURLToPath } from "url";
import { createDocsRegistryRuntime } from "./lib/docs-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const runtime = createDocsRegistryRuntime(workspaceRoot);

function parseArgs(argv) {
  const result = {
    tags: [],
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
    if (key === "tag") {
      result.tags.push(nextValue);
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
    throw new Error("A command is required: register, resolve, list, status.");
  }

  const args = parseArgs(process.argv.slice(3));
  let result;

  switch (command) {
    case "register":
      result = await runtime.register(args);
      break;
    case "resolve":
      result = await runtime.resolve(args);
      break;
    case "list":
      result = await runtime.list(args);
      break;
    case "status":
      result = await runtime.status();
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
