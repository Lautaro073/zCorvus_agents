import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annotateSnapshotCacheMeta,
  createCompactQueryCache,
  resolveCompactCachedPayload,
} from "../MCP_Server/lib/compact-query-cache.js";

test("compact cache returns cache hit for repeated key and watermark", () => {
  const cache = createCompactQueryCache({ enabled: true, maxEntries: 10 });
  const builder = () => ({ view: "task_snapshot", task: { taskId: "task-1" } });

  const first = resolveCompactCachedPayload(cache, {
    watermark: "jsonl:10",
    keyParts: { view: "task_snapshot", taskId: "task-1" },
    builder,
  });

  const second = resolveCompactCachedPayload(cache, {
    watermark: "jsonl:10",
    keyParts: { view: "task_snapshot", taskId: "task-1" },
    builder,
  });

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.snapshotFingerprint, first.snapshotFingerprint);
});

test("compact cache invalidates entries when watermark changes", () => {
  const cache = createCompactQueryCache({ enabled: true, maxEntries: 10 });
  const builder = () => ({ view: "agent_inbox", tasks: [] });

  resolveCompactCachedPayload(cache, {
    watermark: "jsonl:10",
    keyParts: { view: "agent_inbox", assignedTo: "AI_Workspace_Optimizer" },
    builder,
  });

  const afterWatermarkChange = resolveCompactCachedPayload(cache, {
    watermark: "jsonl:11",
    keyParts: { view: "agent_inbox", assignedTo: "AI_Workspace_Optimizer" },
    builder,
  });

  assert.equal(afterWatermarkChange.cacheHit, false);
  assert.equal(afterWatermarkChange.invalidated, true);
  assert.equal(cache.stats.invalidations >= 1, true);
});

test("annotateSnapshotCacheMeta injects cache audit fields", () => {
  const snapshot = { view: "correlation_snapshot", readAudit: { readMode: "snapshot_first" } };
  const cacheResult = {
    cacheEnabled: true,
    cacheHit: true,
    cacheKey: "sha256:key",
    keyFingerprint: "sha256:key-fp",
    snapshotFingerprint: "sha256:snapshot-fp",
    watermark: "jsonl:42",
    invalidated: false,
  };

  const annotated = annotateSnapshotCacheMeta(snapshot, cacheResult);
  assert.equal(annotated.snapshotFingerprint, "sha256:snapshot-fp");
  assert.equal(annotated.readAudit.cacheEnabled, true);
  assert.equal(annotated.readAudit.cacheHit, true);
  assert.equal(annotated.readAudit.cacheWatermark, "jsonl:42");
});
