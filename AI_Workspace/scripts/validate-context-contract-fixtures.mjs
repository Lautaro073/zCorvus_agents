#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const manifestPath = path.resolve(
  workspaceRoot,
  "docs/internal/specs/fixtures/context-contract/manifest.json"
);

const REQUIRED_ENVELOPE_FIELDS = [
  "view",
  "schemaVersion",
  "generatedAt",
  "buildVersion",
  "maxAgeMs",
  "sourceEventId",
  "sourceWatermark",
  "integrityHash",
  "rebuiltAt",
  "stale",
  "degradedMode",
  "decisionSafety",
  "nextExpansionHint",
  "truncated",
];

const REQUIRED_BY_VIEW = {
  agent_inbox: ["agent", "openTaskCount", "blockedTaskCount", "needsAttentionCount", "tasks"],
  task_snapshot: ["task"],
  correlation_snapshot: [
    "correlationId",
    "overallStatus",
    "activeTaskCount",
    "blockedTaskCount",
    "lastUpdatedAt",
    "criticalUpdates",
    "tasks",
  ],
};

const VALID_DECISION_SAFETY = new Set(["safe_for_triage", "read_only", "requires_expansion"]);
const SCHEMA_VERSION_PATTERN = /^ctx-contract\.v(\d+)$/;

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function parseMajor(version) {
  const match = SCHEMA_VERSION_PATTERN.exec(version);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function evaluateCompatibility(consumerVersion, producerVersion) {
  const consumerMajor = parseMajor(consumerVersion);
  const producerMajor = parseMajor(producerVersion);

  if (consumerMajor === null || producerMajor === null) {
    return "invalid_version";
  }

  if (consumerMajor === producerMajor) {
    return "native";
  }

  if (consumerMajor > producerMajor) {
    return "backward_compatible";
  }

  return "fallback_required";
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function validateFixture(entry, fixture) {
  const errors = [];

  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    assert(field in fixture, `${entry.id}: missing envelope field '${field}'`, errors);
  }

  assert(typeof fixture.view === "string", `${entry.id}: 'view' must be string`, errors);
  assert(
    fixture.schemaVersion === entry.schemaVersion,
    `${entry.id}: schemaVersion mismatch (fixture=${fixture.schemaVersion}, manifest=${entry.schemaVersion})`,
    errors
  );

  assert(
    SCHEMA_VERSION_PATTERN.test(fixture.schemaVersion),
    `${entry.id}: schemaVersion must match ctx-contract.v<major>`,
    errors
  );

  assert(
    VALID_DECISION_SAFETY.has(fixture.decisionSafety),
    `${entry.id}: invalid decisionSafety '${fixture.decisionSafety}'`,
    errors
  );

  const requiredForView = REQUIRED_BY_VIEW[fixture.view] ?? [];
  for (const field of requiredForView) {
    assert(field in fixture, `${entry.id}: missing view field '${field}'`, errors);
  }

  if (fixture.truncated === true) {
    assert(
      fixture.nextExpansionHint && typeof fixture.nextExpansionHint === "object",
      `${entry.id}: truncated=true requires non-null nextExpansionHint object`,
      errors
    );
  }

  if (fixture.nextExpansionHint !== null) {
    assert(
      typeof fixture.nextExpansionHint === "object",
      `${entry.id}: nextExpansionHint must be object or null`,
      errors
    );
  }

  if (parseMajor(fixture.schemaVersion) >= 2) {
    assert(
      fixture.compatibility && typeof fixture.compatibility === "object",
      `${entry.id}: v2+ fixtures must define compatibility block`,
      errors
    );
  }

  return errors;
}

async function main() {
  const manifest = await readJson(manifestPath);
  const fixtureMap = new Map();
  const fixtureErrors = [];

  for (const entry of manifest.fixtures ?? []) {
    const filePath = path.resolve(workspaceRoot, entry.path);
    const fixture = await readJson(filePath);
    fixtureMap.set(entry.id, fixture);

    const errors = validateFixture(entry, fixture);
    if (errors.length > 0) {
      fixtureErrors.push(...errors);
    }
  }

  const compatibilityErrors = [];
  const compatibilityResults = [];

  for (const scenario of manifest.compatibilityScenarios ?? []) {
    const fixture = fixtureMap.get(scenario.fixtureId);
    if (!fixture) {
      compatibilityErrors.push(`Unknown fixtureId '${scenario.fixtureId}' in compatibilityScenarios`);
      continue;
    }

    const actual = evaluateCompatibility(scenario.consumerVersion, fixture.schemaVersion);
    compatibilityResults.push({ ...scenario, actual });
    if (actual !== scenario.expected) {
      compatibilityErrors.push(
        `${scenario.fixtureId}: expected compatibility '${scenario.expected}', got '${actual}' for consumer ${scenario.consumerVersion}`
      );
    }
  }

  const allErrors = [...fixtureErrors, ...compatibilityErrors];

  const output = {
    ok: allErrors.length === 0,
    manifest: path.relative(workspaceRoot, manifestPath).split(path.sep).join("/"),
    validatedFixtures: manifest.fixtures?.length ?? 0,
    compatibilityScenarios: compatibilityResults,
    errors: allErrors,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (allErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
