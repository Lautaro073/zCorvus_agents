#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const PROFILE_PATHS = [
  'Agents/Orchestrator/profile.md',
  'Agents/Planner/profile.md',
  'Agents/Backend/profile.md',
  'Agents/Frontend/profile.md',
  'Agents/Tester/profile.md',
  'Agents/Observer/profile.md',
  'Agents/Documenter/profile.md',
  'Agents/AI_Workspace_Optimizer/profile.md',
];

const REQUIRED_PATTERNS = [
  {
    key: 'governanceSection',
    pattern: /Gobernanza de contexto \(TCO-02\)/i,
    message: 'missing TCO-02 governance section',
  },
  {
    key: 'summaryFirstOrder',
    pattern: /get_agent_inbox\s*->\s*get_task_snapshot\s*->\s*get_correlation_snapshot\s*->\s*expansion puntual/i,
    message: 'missing mandatory summary-first consultation order',
  },
  {
    key: 'intakeLimit5',
    pattern: /limit\s*[:=]\s*5|limit=5/i,
    message: 'missing default intake limit=5 guidance',
  },
  {
    key: 'triageLimit10',
    pattern: /limit\s*[:=]\s*10|limit=10/i,
    message: 'missing default triage limit=10 guidance',
  },
  {
    key: 'broadReadsPolicy',
    pattern: /limit\s*>=\s*20.*justific/i,
    message: 'missing broad-read justification rule (limit >= 20)',
  },
  {
    key: 'messageBudget',
    pattern: /message.*160|160.*message/i,
    message: 'missing message budget guidance (<=160 chars)',
  },
  {
    key: 'artifactOffload',
    pattern: /artifactPaths/i,
    message: 'missing artifact offload guidance',
  },
];

const DECISION_SAFETY = new Set(['safe_for_triage', 'read_only', 'requires_expansion']);

function collectLineViolations(content) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];

    const getEventsMatch = /get_events\([^\n]*limit\s*:\s*(\d+)/i.exec(line);
    if (getEventsMatch) {
      const limit = Number.parseInt(getEventsMatch[1], 10);
      if (limit >= 20) {
        violations.push({ line: idx + 1, kind: 'broad-read-default', sample: line.trim() });
      }
    }

    const apiEventsMatch = /\/api\/events[^\n]*limit=(\d+)/i.exec(line);
    if (apiEventsMatch) {
      const limit = Number.parseInt(apiEventsMatch[1], 10);
      if (limit >= 20) {
        violations.push({ line: idx + 1, kind: 'broad-read-default', sample: line.trim() });
      }
    }
  }
  return violations;
}

async function validateProfile(relativePath) {
  const abs = path.resolve(workspaceRoot, relativePath);
  const raw = await fs.readFile(abs, 'utf8');

  const errors = [];
  for (const requirement of REQUIRED_PATTERNS) {
    if (!requirement.pattern.test(raw)) {
      errors.push(requirement.message);
    }
  }

  const lineViolations = collectLineViolations(raw);
  for (const violation of lineViolations) {
    errors.push(
      `${violation.kind} at line ${violation.line}: ${violation.sample}`
    );
  }

  return {
    profile: relativePath,
    ok: errors.length === 0,
    errors,
  };
}

async function readJson(relativePath) {
  const abs = path.resolve(workspaceRoot, relativePath);
  return JSON.parse(await fs.readFile(abs, 'utf8'));
}

async function validateFixtureFlags() {
  const manifest = await readJson('docs/internal/specs/fixtures/context-contract/manifest.json');
  const errors = [];
  const fixtureSummary = [];

  for (const fixtureEntry of manifest.fixtures ?? []) {
    const fixture = await readJson(fixtureEntry.path);

    const hasTruncated = Object.prototype.hasOwnProperty.call(fixture, 'truncated');
    const hasDegradedMode = Object.prototype.hasOwnProperty.call(fixture, 'degradedMode');
    const hasDecisionSafety = Object.prototype.hasOwnProperty.call(fixture, 'decisionSafety');

    if (!hasTruncated) {
      errors.push(`${fixtureEntry.id}: missing truncated flag`);
    }
    if (!hasDegradedMode) {
      errors.push(`${fixtureEntry.id}: missing degradedMode flag`);
    }
    if (!hasDecisionSafety) {
      errors.push(`${fixtureEntry.id}: missing decisionSafety flag`);
    }

    if (hasTruncated && typeof fixture.truncated !== 'boolean') {
      errors.push(`${fixtureEntry.id}: truncated must be boolean`);
    }
    if (hasDegradedMode && typeof fixture.degradedMode !== 'boolean') {
      errors.push(`${fixtureEntry.id}: degradedMode must be boolean`);
    }
    if (hasDecisionSafety && !DECISION_SAFETY.has(fixture.decisionSafety)) {
      errors.push(`${fixtureEntry.id}: invalid decisionSafety '${fixture.decisionSafety}'`);
    }

    fixtureSummary.push({
      id: fixtureEntry.id,
      view: fixture.view,
      schemaVersion: fixture.schemaVersion,
      truncated: fixture.truncated,
      degradedMode: fixture.degradedMode,
      decisionSafety: fixture.decisionSafety,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    fixtures: fixtureSummary,
  };
}

function runFixtureContractValidator() {
  const validatorPath = path.resolve(workspaceRoot, 'scripts/validate-context-contract-fixtures.mjs');
  const run = spawnSync(process.execPath, [validatorPath], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  let parsed = null;
  try {
    parsed = JSON.parse(run.stdout || '{}');
  } catch {
    parsed = {
      ok: false,
      errors: ['validator output is not valid JSON'],
      rawStdout: run.stdout,
      rawStderr: run.stderr,
    };
  }

  return {
    exitCode: run.status ?? 1,
    ok: run.status === 0 && parsed.ok === true,
    result: parsed,
  };
}

async function main() {
  const profileChecks = await Promise.all(PROFILE_PATHS.map((profilePath) => validateProfile(profilePath)));
  const fixtureFlags = await validateFixtureFlags();
  const fixtureContract = runFixtureContractValidator();

  const errors = [];
  for (const profileResult of profileChecks) {
    if (!profileResult.ok) {
      for (const err of profileResult.errors) {
        errors.push(`${profileResult.profile}: ${err}`);
      }
    }
  }

  if (!fixtureFlags.ok) {
    errors.push(...fixtureFlags.errors.map((err) => `fixtures: ${err}`));
  }

  if (!fixtureContract.ok) {
    const fixtureErrors = fixtureContract.result?.errors ?? ['fixture validator failed'];
    errors.push(...fixtureErrors.map((err) => `fixture-contract: ${err}`));
  }

  const output = {
    ok: errors.length === 0,
    checkedProfiles: profileChecks.length,
    profileChecks,
    fixtureFlags,
    fixtureContract,
    errors,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
