import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const backendEntry = path.join(workspaceRoot, "Backend", "src", "server.js");

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

test("backend bootstrap exposes health and ping", async () => {
  const port = 4512;
  const child = spawn(process.execPath, [backendEntry], {
    cwd: path.join(workspaceRoot, "Backend"),
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    const healthResponse = await waitFor(`http://127.0.0.1:${port}/health`);
    const healthPayload = await healthResponse.json();
    assert.equal(healthPayload.ok, true);

    const pingResponse = await waitFor(`http://127.0.0.1:${port}/api/v1/ping`);
    const pingPayload = await pingResponse.json();
    assert.equal(pingPayload.message, "pong");
  } finally {
    child.kill();
  }
});
