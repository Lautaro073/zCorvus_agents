import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const mcpEntry = path.join(workspaceRoot, "MCP_Server", "index.js");

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

test("MCP server exposes health, events and websocket", async () => {
  const port = 4421;
  const child = spawn(process.execPath, [mcpEntry], {
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      MCP_MONITOR_PORT: String(port),
      MCP_MONITOR_HOST: "127.0.0.1",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    const healthResponse = await waitFor(`http://127.0.0.1:${port}/api/health`);
    const healthPayload = await healthResponse.json();
    assert.equal(healthPayload.ok, true);

    const eventsResponse = await waitFor(`http://127.0.0.1:${port}/api/events?limit=5`);
    const eventsPayload = await eventsResponse.json();
    assert.ok(Array.isArray(eventsPayload.events));
    assert.ok(eventsPayload.summary);

    await new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error("Timed out waiting for websocket connection."));
      }, 3000);

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "connected") {
            clearTimeout(timer);
            socket.close();
            resolve();
          }
        } catch {
        }
      });

      socket.addEventListener("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  } finally {
    child.kill();
  }
});
