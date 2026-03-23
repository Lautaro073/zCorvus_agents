import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { createRollbackRuntime } from "./lib/rollback-runtime.js";

async function createWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zcorvus-rollback-"));
  await fs.mkdir(path.join(root, "Backend", "src"), { recursive: true });
  await fs.mkdir(path.join(root, "Frontend", "app"), { recursive: true });
  return root;
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf-8");
}

test("init snapshots existing file", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);
  const target = path.join(workspace, "Backend", "src", "auth.js");
  await fs.writeFile(target, "export const ok = true;\n", "utf-8");

  const result = await runtime.init({
    taskId: "auth-backend-01",
    agent: "Backend",
    correlationId: "auth-login",
    files: ["Backend/src/auth.js"],
  });

  assert.equal(result.ok, true);
  const manifest = JSON.parse(await readText(path.join(workspace, ".runtime", "rollback", "auth-backend-01", "manifest.json")));
  assert.equal(manifest.files[0].existedBefore, true);
  assert.equal(manifest.files[0].backupPath, "files/Backend/src/auth.js");
});

test("sync tracks new file and updates lastAgentHash", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);

  await runtime.init({
    taskId: "auth-frontend-01",
    agent: "Frontend",
    correlationId: "auth-login",
    files: ["Frontend/app/login.tsx"],
  });

  const target = path.join(workspace, "Frontend", "app", "login.tsx");
  await fs.writeFile(target, "export default function Login() { return null }\n", "utf-8");

  const result = await runtime.sync({
    taskId: "auth-frontend-01",
    files: ["Frontend/app/login.tsx"],
  });

  assert.equal(result.ok, true);
  const manifest = JSON.parse(await readText(path.join(workspace, ".runtime", "rollback", "auth-frontend-01", "manifest.json")));
  assert.match(manifest.files[0].lastAgentHash, /^sha256:/);
});

test("restore recovers previous file content", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);
  const target = path.join(workspace, "Backend", "src", "auth.js");
  await fs.writeFile(target, "v1\n", "utf-8");

  await runtime.init({
    taskId: "restore-backend-01",
    agent: "Backend",
    correlationId: "demo",
    files: ["Backend/src/auth.js"],
  });

  await fs.writeFile(target, "v2\n", "utf-8");
  await runtime.sync({
    taskId: "restore-backend-01",
    files: ["Backend/src/auth.js"],
  });

  const restoreResult = await runtime.restore({ taskId: "restore-backend-01" });
  assert.equal(restoreResult.rolledBack, true);
  assert.equal(await readText(target), "v1\n");
});

test("restore removes new file created by task", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);
  const target = path.join(workspace, "Frontend", "app", "login.tsx");

  await runtime.init({
    taskId: "restore-frontend-01",
    agent: "Frontend",
    correlationId: "demo",
    files: ["Frontend/app/login.tsx"],
  });

  await fs.writeFile(target, "demo\n", "utf-8");
  await runtime.sync({
    taskId: "restore-frontend-01",
    files: ["Frontend/app/login.tsx"],
  });

  const restoreResult = await runtime.restore({ taskId: "restore-frontend-01" });
  assert.equal(restoreResult.rolledBack, true);
  await assert.rejects(() => fs.access(target));
});

test("init detects collisions with other active task", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);
  const target = path.join(workspace, "Backend", "src", "auth.js");
  await fs.writeFile(target, "v1\n", "utf-8");

  await runtime.init({
    taskId: "task-a",
    agent: "Backend",
    correlationId: "demo",
    files: ["Backend/src/auth.js"],
  });

  const result = await runtime.init({
    taskId: "task-b",
    agent: "Backend",
    correlationId: "demo",
    files: ["Backend/src/auth.js"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "FILE_COLLISION");
});

test("cleanup removes runtime directory after restore", async () => {
  const workspace = await createWorkspace();
  const runtime = createRollbackRuntime(workspace);
  const target = path.join(workspace, "Backend", "src", "auth.js");
  await fs.writeFile(target, "v1\n", "utf-8");

  await runtime.init({
    taskId: "cleanup-backend-01",
    agent: "Backend",
    correlationId: "demo",
    files: ["Backend/src/auth.js"],
  });
  await fs.writeFile(target, "v2\n", "utf-8");
  await runtime.sync({
    taskId: "cleanup-backend-01",
    files: ["Backend/src/auth.js"],
  });
  await runtime.restore({ taskId: "cleanup-backend-01" });

  const cleanupResult = await runtime.cleanup({ taskId: "cleanup-backend-01" });
  assert.equal(cleanupResult.ok, true);
  await assert.rejects(() => fs.access(path.join(workspace, ".runtime", "rollback", "cleanup-backend-01")));
});
