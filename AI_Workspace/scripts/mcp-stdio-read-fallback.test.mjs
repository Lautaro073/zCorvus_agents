import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "../MCP_Server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../MCP_Server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const mcpStdioEntry = path.join(workspaceRoot, "MCP_Server", "mcp-stdio.js");

async function runToolCall(serverEnv, name, args) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpStdioEntry],
    cwd: path.join(workspaceRoot, "MCP_Server"),
    env: {
      ...process.env,
      ...serverEnv,
    },
    stderr: "pipe",
  });

  const client = new Client(
    {
      name: "mcp-stdio-fallback-test",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  try {
    const response = await client.callTool({
      name,
      arguments: args,
    });
    return response;
  } finally {
    await client.close();
  }
}

function parseTextResult(response) {
  assert.ok(Array.isArray(response.content));
  const firstChunk = response.content[0];
  assert.equal(firstChunk?.type, "text");
  return JSON.parse(firstChunk.text);
}

test("mcp-stdio read tools fallback when sidecar writes fail", async () => {
  const response = await runToolCall(
    {
      MCP_CONTEXT_SIDECARS_ENABLED: "true",
      MCP_CONTEXT_RELEVANCE_READS_ENABLED: "true",
      MCP_CONTEXT_TOKEN_BUDGETS_ENABLED: "true",
      MCP_CONTEXT_REDACTION_ENABLED: "true",
      MCP_CONTEXT_MEMORY_SAFETY_GUARDRAILS_ENABLED: "true",
      // Force sidecar write failure by pointing to a file path
      // while the server expects a writable directory.
      MCP_CONTEXT_SIDECARS_DIR: "shared_context.jsonl",
    },
    "get_agent_inbox",
    { assignedTo: "AI_Workspace_Optimizer", limit: 3 }
  );

  const payload = parseTextResult(response);
  assert.equal(payload.view, "agent_inbox");
  assert.ok(Array.isArray(payload.tasks));
  assert.ok(payload.readAudit);
  assert.equal(payload.degradedMode, false);
});
