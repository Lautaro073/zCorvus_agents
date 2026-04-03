import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildSidecarPayloads,
  readValidatedSidecars,
  validateSidecarPayload,
  writeSidecarsAtomically,
} from "../MCP_Server/lib/context-sidecars.js";

const SAMPLE_EVENTS = [
  {
    eventId: "event-1",
    timestamp: "2026-04-02T07:00:00.000Z",
    agent: "Orchestrator",
    type: "TASK_ASSIGNED",
    taskId: "task-1",
    assignedTo: "AI_Workspace_Optimizer",
    status: "assigned",
    priority: "high",
    correlationId: "corr-1",
    payload: {
      message: "Task assigned",
      description: "Implement sidecars",
      acceptanceCriteria: ["Build sidecars"],
    },
  },
  {
    eventId: "event-2",
    timestamp: "2026-04-02T07:01:00.000Z",
    agent: "AI_Workspace_Optimizer",
    type: "TASK_IN_PROGRESS",
    taskId: "task-1",
    assignedTo: "AI_Workspace_Optimizer",
    status: "in_progress",
    priority: "high",
    correlationId: "corr-1",
    payload: {
      message: "Task in progress",
      nextAction: "Continue execution",
    },
  },
];

test("sidecar content fingerprint is idempotent for same events", async () => {
  const first = buildSidecarPayloads(SAMPLE_EVENTS);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = buildSidecarPayloads(SAMPLE_EVENTS);

  assert.equal(
    first.latestByTask.contentFingerprint,
    second.latestByTask.contentFingerprint
  );
  assert.equal(
    first.latestByCorrelation.contentFingerprint,
    second.latestByCorrelation.contentFingerprint
  );
  assert.equal(
    first.openByAgent.contentFingerprint,
    second.openByAgent.contentFingerprint
  );
});

test("sidecar validator detects integrity tampering", () => {
  const payloads = buildSidecarPayloads(SAMPLE_EVENTS);
  const tampered = {
    ...payloads.latestByTask,
    integrityHash: "sha256:tampered",
  };

  const validation = validateSidecarPayload(tampered, "latest_by_task");
  assert.equal(validation.ok, false);
  assert.equal(validation.reason, "integrity_hash_mismatch");
});

test("sidecar validator detects invalid sourceWatermark", () => {
  const payloads = buildSidecarPayloads(SAMPLE_EVENTS);
  const tampered = {
    ...payloads.latestByTask,
    sourceWatermark: "broken-watermark",
  };

  const validation = validateSidecarPayload(tampered, "latest_by_task");
  assert.equal(validation.ok, false);
  assert.equal(validation.reason, "invalid_source_watermark");
});

test("readValidatedSidecars rejects watermark mismatch across sidecars", async () => {
  const payloads = buildSidecarPayloads(SAMPLE_EVENTS);
  const sidecarDir = await fs.mkdtemp(path.join(os.tmpdir(), "zcorvus-sidecars-"));

  try {
    await writeSidecarsAtomically(sidecarDir, payloads);

    const latestByCorrelationPath = path.join(sidecarDir, "latest_by_correlation.json");
    const latestByCorrelation = JSON.parse(await fs.readFile(latestByCorrelationPath, "utf8"));
    latestByCorrelation.sourceWatermark = "jsonl:999";
    await fs.writeFile(latestByCorrelationPath, `${JSON.stringify(latestByCorrelation, null, 2)}\n`, "utf8");

    const result = await readValidatedSidecars(sidecarDir);
    assert.equal(result.ok, false);
    assert.match(result.error, /content_fingerprint_mismatch|sidecar_watermark_mismatch/);
  } finally {
    await fs.rm(sidecarDir, { recursive: true, force: true });
  }
});

test("readValidatedSidecars rejects incomplete sidecar file", async () => {
  const payloads = buildSidecarPayloads(SAMPLE_EVENTS);
  const sidecarDir = await fs.mkdtemp(path.join(os.tmpdir(), "zcorvus-sidecars-"));

  try {
    await writeSidecarsAtomically(sidecarDir, payloads);

    const latestByTaskPath = path.join(sidecarDir, "latest_by_task.json");
    await fs.writeFile(latestByTaskPath, '{"view":"latest_by_task"\n', "utf8");

    const result = await readValidatedSidecars(sidecarDir);
    assert.equal(result.ok, false);
    assert.match(result.error, /Unexpected end of JSON input|Expected ',' or '\}'|sidecar_read_failed|Invalid sidecar/);
  } finally {
    await fs.rm(sidecarDir, { recursive: true, force: true });
  }
});

test("sidecar payloads include compact handoff summaries", () => {
  const payloads = buildSidecarPayloads(SAMPLE_EVENTS);
  const taskEntry = payloads.latestByTask.tasks.find((task) => task.taskId === "task-1");
  const correlationEntry = payloads.latestByCorrelation.correlations.find(
    (entry) => entry.correlationId === "corr-1"
  );

  assert.ok(taskEntry);
  assert.equal(typeof taskEntry.handoffSummary, "string");
  assert.equal(taskEntry.handoffSummary.length <= 220, true);

  assert.ok(correlationEntry);
  assert.equal(typeof correlationEntry.handoffSummary, "string");
  assert.equal(correlationEntry.handoffSummary.length <= 260, true);
});
