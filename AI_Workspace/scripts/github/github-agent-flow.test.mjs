import { test } from "node:test";
import assert from "node:assert/strict";

import { buildBranchName, buildIssueTitle, buildPrTitle, slugify } from "./lib/github-agent-flow.mjs";

test("slugify creates safe task slugs", () => {
  assert.equal(slugify("Auth Frontend 01"), "auth-frontend-01");
});

test("buildBranchName uses agent and taskId", () => {
  assert.equal(buildBranchName({ agent: "Frontend", taskId: "auth-frontend-01" }), "agents/frontend/auth-frontend-01");
});

test("issue and PR titles include task context", () => {
  const taskContext = {
    taskId: "auth-frontend-01",
    description: "Construir pantalla de login",
  };

  assert.match(buildIssueTitle(taskContext, "Frontend"), /auth-frontend-01/);
  assert.match(buildPrTitle(taskContext, "Frontend"), /Construir pantalla de login/);
});
