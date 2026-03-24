import { test } from "node:test";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

async function runNodeScript(scriptRelativePath, args = []) {
  const scriptPath = path.join(workspaceRoot, scriptRelativePath);
  const { stdout } = await execFile(process.execPath, [scriptPath, ...args], {
    cwd: workspaceRoot,
    env: process.env,
  });

  return JSON.parse(stdout);
}

test("create-task-issue dry run returns GitHub payload", async () => {
  const result = await runNodeScript("scripts/github/create-task-issue.mjs", [
    "--task", "doc-tokens-01",
    "--agent", "Documenter",
    "--dry-run",
  ]);

  assert.equal(result.owner, "Lautaro073");
  assert.equal(result.repo, "zCorvus_agents");
  assert.match(result.payload.title, /doc-tokens-01/);
  assert.ok(Array.isArray(result.payload.labels));
});

test("create-agent-branch dry run returns branch metadata", async () => {
  const result = await runNodeScript("scripts/github/create-agent-branch.mjs", [
    "--task", "doc-tokens-01",
    "--agent", "Documenter",
    "--allow-dirty",
    "--dry-run",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.branchName, "agents/documenter/doc-tokens-01");
  assert.equal(result.base, "main");
});

test("create-task-pr dry run returns PR payload", async () => {
  const result = await runNodeScript("scripts/github/create-task-pr.mjs", [
    "--task", "doc-tokens-01",
    "--agent", "Documenter",
    "--branch", "agents/documenter/doc-tokens-01",
    "--dry-run",
  ]);

  assert.equal(result.owner, "Lautaro073");
  assert.equal(result.repo, "zCorvus_agents");
  assert.equal(result.payload.base, "main");
  assert.match(result.payload.head, /agents\/documenter\/doc-tokens-01/);
});

test("apply-branch-protection dry run exposes required checks", async () => {
  const result = await runNodeScript("scripts/github/apply-branch-protection.mjs", [
    "--branch", "main",
    "--dry-run",
  ]);

  assert.equal(result.owner, "Lautaro073");
  assert.deepEqual(result.payload.required_status_checks.contexts, ["Backend", "Frontend", "Workspace"]);
});
