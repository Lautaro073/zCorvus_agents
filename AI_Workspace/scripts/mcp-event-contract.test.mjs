import { test } from "node:test";
import assert from "node:assert/strict";

import { validateEventPayload } from "../MCP_Server/lib/event-contract.js";

test("valid TASK_ASSIGNED payload passes validation", () => {
  assert.doesNotThrow(() => {
    validateEventPayload("TASK_ASSIGNED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "assigned",
      description: "Crear endpoint login",
      acceptanceCriteria: ["Publica ENDPOINT_CREATED"],
    });
  });
});

test("invalid TASK_ASSIGNED without description fails", () => {
  assert.throws(() => {
    validateEventPayload("TASK_ASSIGNED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "assigned",
    });
  });
});

test("invalid TASK_ASSIGNED without acceptanceCriteria fails", () => {
  assert.throws(() => {
    validateEventPayload("TASK_ASSIGNED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "assigned",
      description: "Crear endpoint login",
    });
  });
});

test("PLAN_PROPOSED requires well formed proposedTasks", () => {
  assert.throws(() => {
    validateEventPayload("PLAN_PROPOSED", {
      taskId: "epic-plan-01",
      assignedTo: "Planner",
      status: "in_progress",
      correlationId: "epic-auth",
      proposedTasks: [{ taskId: "child-01" }],
    });
  });
});

test("DOC_UPDATED with required metadata passes validation", () => {
  assert.doesNotThrow(() => {
    validateEventPayload("DOC_UPDATED", {
      taskId: "docs-01",
      assignedTo: "Documenter",
      status: "completed",
      docType: "spec",
      featureSlug: "auth-login",
      path: "docs/internal/specs/auth-login.md",
    });
  });
});

test("DOC_UPDATED requires path or artifactPaths", () => {
  assert.throws(() => {
    validateEventPayload("DOC_UPDATED", {
      taskId: "docs-01",
      assignedTo: "Documenter",
      status: "completed",
    });
  });
});

test("TEST_FAILED requires message or rootCause", () => {
  assert.throws(() => {
    validateEventPayload("TEST_FAILED", {
      taskId: "qa-01",
    });
  });
});
