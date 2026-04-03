#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyMessageBudgetPolicy } from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contextPath = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index];
}

function summarizeLengths(lengths) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const avg = sorted.length > 0 ? total / sorted.length : 0;
  return {
    count: sorted.length,
    avg: Number(avg.toFixed(2)),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] || 0,
  };
}

async function main() {
  const raw = await fs.readFile(contextPath, "utf8");
  const events = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeParse)
    .filter(Boolean);

  const originalMessages = [];
  const projectedMessages = [];
  let trimmedCount = 0;
  let offloadSuggestedCount = 0;
  let offloadWithArtifactsCount = 0;

  for (const event of events) {
    const payload = event && typeof event.payload === "object" ? event.payload : null;
    if (!payload || typeof payload.message !== "string") {
      continue;
    }

    const originalMessage = payload.message.trim();
    if (!originalMessage) {
      continue;
    }

    originalMessages.push(originalMessage.length);

    const { payload: budgeted, budget } = applyMessageBudgetPolicy(payload, {
      hardLimitEnabled: false,
      targetChars: 160,
      softLimitChars: 280,
    });

    projectedMessages.push((budgeted.message || "").length);

    if (budget && budget.state !== "within_target") {
      trimmedCount += 1;
    }
    if (budget && budget.state === "trimmed_offload_suggested") {
      offloadSuggestedCount += 1;
    }
    if (budget && budget.state === "trimmed_with_artifact_offload") {
      offloadWithArtifactsCount += 1;
    }
  }

  const before = summarizeLengths(originalMessages);
  const after = summarizeLengths(projectedMessages);
  const avgReductionPercent =
    before.avg > 0 ? Number((((before.avg - after.avg) / before.avg) * 100).toFixed(2)) : 0;

  const output = {
    generatedAt: new Date().toISOString(),
    contextPath,
    before,
    projectedAfterWriterPolicy: after,
    impact: {
      avgReductionPercent,
      trimmedCount,
      offloadSuggestedCount,
      offloadWithArtifactsCount,
    },
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
