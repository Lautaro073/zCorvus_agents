# OpenCode Autonomous Task Dispatch (MCP -> Agent)

## Objective

Run agent intake automatically when `TASK_ASSIGNED` is appended to `AI_Workspace/MCP_Server/shared_context.jsonl`, without waiting for a manual user message.

## How it works

- Watch new JSONL bytes from `shared_context.jsonl`.
- Detect fresh `TASK_ASSIGNED` events.
- Resolve target runner by `assignedTo`:
  - preferred: existing session via `sessions[assignedTo]`
  - fallback: `opencode run --prompt <agentPrompt>`
- Send a deterministic intake prompt so the assigned agent starts immediately.
- Persist cursor state (`offset` + processed event IDs) to avoid duplicate dispatches.

Script:

- `AI_Workspace/scripts/opencode-task-dispatcher.mjs`

## Setup

1) Create config from template:

```bash
copy AI_Workspace\scripts\opencode-dispatch.config.example.json AI_Workspace\scripts\opencode-dispatch.config.json
```

2) Fill `sessions` with your active OpenCode session IDs for each agent (recommended).

3) Optional fallback: adjust `agentMap` if you use custom OpenCode agents.

## Run modes

Dry-run (logs dispatch decisions, does not call OpenCode):

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --config AI_Workspace/scripts/opencode-dispatch.config.json
```

Live mode (actually triggers `opencode run`):

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --live --config AI_Workspace/scripts/opencode-dispatch.config.json
```

Useful options:

- `--poll-ms 1200` polling interval.
- `--state AI_Workspace/.runtime/opencode-task-dispatcher.state.json`
- `--log AI_Workspace/.runtime/opencode-task-dispatcher.log`

## Operational notes

- Uses incremental read by byte offset; safe to keep running continuously.
- Keeps a bounded dedupe memory (`processedEventIds`) in state file.
- Ignores unrelated event types.
- Requires `opencode` available in PATH.
- If config is missing, defaults are loaded but no session mapping means dispatch may skip or use generic fallback.

## Recommended production pattern

- Start MCP server.
- Start one OpenCode session per agent (or define robust `agentMap`).
- Start dispatcher in `--live` mode as a background process.
- Keep `.runtime/` logs for audit and incident triage.

## Limitations

- No strict queue locking between multiple dispatcher instances; run a single instance.
- If agent session dies, dispatch falls back only if `agentMap` is defined.
- Prompt-based kickoff is best-effort; agent still enforces its own profile rules.
