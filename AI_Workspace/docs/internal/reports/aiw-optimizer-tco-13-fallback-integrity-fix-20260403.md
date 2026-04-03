# TCO-13 - Fallback Integrity Fix (Tester Blocker)

## Metadata
- taskId: `aiw-opt-tco-13-fallback-integrity-fix-20260403-01`
- correlationId: `aiw-token-context-optimization-20260331`
- owner: `AI_Workspace_Optimizer`
- status: `completed`
- date: `2026-04-03`

## Trigger
Tester reported blocker in `monitor-sidecars.test.mjs`:

- failing test: `monitor server detects corrupted sidecar and rebuilds safely`
- observed failure: corrupted `integrityHash` remained `sha256:corrupted` after expected rebuild path.

Source evidence:
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-regression-benchmark-suite-20260403.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-tco-13-monitor-sidecars-test-20260403.txt`

## Root cause

Fast-path optimization added in monitor sidecar refresh logic skipped sidecar validation when:

1. context fingerprint (`shared_context.jsonl`) was unchanged, and
2. validation interval had not elapsed.

This ignored direct mutation/corruption of persisted sidecar files between reads, so corrupted disk content could survive until the next full validation cycle.

## Fix implemented

Updated `AI_Workspace/MCP_Server/monitor-server.js`:

1. Added sidecar-file fingerprint tracking (`SIDECAR_DIR` + `latest_by_task` mtime/size).
2. Fast-path reuse now requires both:
   - context fingerprint unchanged, and
   - sidecar-file fingerprint unchanged.
3. If sidecar files changed, monitor forces validation/rebuild path even within validation interval.
4. Cached sidecar-file fingerprint now updates on rebuild and valid disk fallback.
5. Cache state resets safely on no-sidecar/failure branches.

This preserves the latency optimization while restoring corruption-detection guarantees.

## Before/after evidence

### Before (tester failure)
- `monitor-sidecars.test.mjs`: **FAIL (1/2)**
- assertion: `integrityHash` remained `sha256:corrupted`.

### After (post-fix)
- `monitor-sidecars.test.mjs`: **PASS (2/2)**
- corrupted sidecar is replaced on next read path.

## Regression validation

Executed in `AI_Workspace/`:

```bash
node --test scripts/monitor-sidecars.test.mjs
node --test scripts/context-read-modes.test.mjs
node --test scripts/context-observability.test.mjs
node --test scripts/relevance-read-modes.test.mjs
node --test scripts/mcp-smoke.test.mjs
```

Result: all pass.

## Learning captured (from Tester fix)

Applied requested rule to prevent recurrence:

1. Added explicit tester-driven learning loop to profile:
   - `AI_Workspace/Agents/AI_Workspace_Optimizer/profile.md`
2. Recorded concrete root-cause guardrail in:
   - `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`

## Artifacts
- `AI_Workspace/MCP_Server/monitor-server.js`
- `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-13-fallback-integrity-fix-20260403.md`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/profile.md`
- `AI_Workspace/Agents/AI_Workspace_Optimizer/learnings.md`
