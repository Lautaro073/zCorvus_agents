#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeSnapshotSummary } from "../MCP_Server/lib/event-contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contextPath = path.resolve(__dirname, "..", "MCP_Server", "shared_context.jsonl");

const sensitiveRegex = /(Bearer\s+[A-Za-z0-9\-._~+/]+=*|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,})\b)/i;
const instructionRegex = /(ignore\s+(?:all\s+)?previous\s+instructions|system\s+prompt|developer\s+message|jailbreak|override\s+instructions|act\s+as\s+a?n?\s+)/i;

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function hasSensitive(value) {
  return typeof value === "string" && sensitiveRegex.test(value);
}

function hasInstruction(value) {
  return typeof value === "string" && instructionRegex.test(value);
}

async function main() {
  const raw = await fs.readFile(contextPath, "utf8");
  const events = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeParse)
    .filter(Boolean);

  const summaries = events
    .map((event) => event?.payload?.message || event?.payload?.title || event?.payload?.description || null)
    .filter((value) => typeof value === "string" && value.trim().length > 0);

  let sensitiveBefore = 0;
  let instructionBefore = 0;
  let sensitiveAfter = 0;
  let instructionAfter = 0;
  let redactedCount = 0;
  let memorySafetyFlaggedCount = 0;

  for (const summary of summaries) {
    if (hasSensitive(summary)) sensitiveBefore += 1;
    if (hasInstruction(summary)) instructionBefore += 1;

    const sanitized = sanitizeSnapshotSummary(summary);
    if (sanitized.redacted) redactedCount += 1;
    if (sanitized.memorySafetyFlag) memorySafetyFlaggedCount += 1;

    if (hasSensitive(sanitized.summary)) sensitiveAfter += 1;
    if (hasInstruction(sanitized.summary)) instructionAfter += 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    contextPath,
    summariesAnalyzed: summaries.length,
    before: {
      sensitiveSummaryCount: sensitiveBefore,
      instructionLikeSummaryCount: instructionBefore,
    },
    afterSanitization: {
      sensitiveSummaryCount: sensitiveAfter,
      instructionLikeSummaryCount: instructionAfter,
      redactedCount,
      memorySafetyFlaggedCount,
    },
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
