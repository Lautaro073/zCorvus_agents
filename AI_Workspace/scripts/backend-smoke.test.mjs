import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(workspaceRoot, "..");
const backendRoot = path.join(repositoryRoot, "Backend");
const backendEntry = path.join(backendRoot, "server.js");

async function waitFor(url, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

test("backend bootstrap exposes health and root endpoints", async () => {
  const port = 4512;
  const child = spawn(process.execPath, [backendEntry], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    const healthResponse = await waitFor(`http://127.0.0.1:${port}/api/health`);
    const healthPayload = await healthResponse.json();
    assert.equal(healthPayload.status, "OK");

    const rootResponse = await waitFor(`http://127.0.0.1:${port}/`);
    const rootPayload = await rootResponse.json();
    assert.equal(rootPayload.message, "Welcome to zCorvus API");
  } finally {
    child.kill();
  }
});
