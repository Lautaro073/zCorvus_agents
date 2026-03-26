import { test } from "node:test";
import assert from "node:assert/strict";

import { validateEventPayload, validateTaskEventSequence } from "../MCP_Server/lib/event-contract.js";

test("valid TASK_ASSIGNED payload passes validation", () => {
  assert.doesNotThrow(() => {
    validateEventPayload("TASK_ASSIGNED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "assigned",
      correlationId: "auth-backend-01",
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
      correlationId: "auth-backend-01",
    });
  });
});

test("invalid TASK_ASSIGNED without acceptanceCriteria fails", () => {
  assert.throws(() => {
    validateEventPayload("TASK_ASSIGNED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "assigned",
      correlationId: "auth-backend-01",
      description: "Crear endpoint login",
    });
  });
});

test("invalid TASK_* without correlationId fails", () => {
  assert.throws(() => {
    validateEventPayload("TASK_IN_PROGRESS", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "in_progress",
    });
  });
});

test("invalid TASK event with mismatched status fails", () => {
  assert.throws(() => {
    validateEventPayload("TASK_ACCEPTED", {
      taskId: "auth-backend-01",
      assignedTo: "Backend",
      status: "in_progress",
      correlationId: "auth-backend-01",
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

test("sequence rejects TASK_COMPLETED without TASK_IN_PROGRESS", () => {
  const history = [
    {
      type: "TASK_ASSIGNED",
      payload: { taskId: "trace-01" },
    },
    {
      type: "TASK_ACCEPTED",
      payload: { taskId: "trace-01" },
    },
  ];

  assert.throws(() => {
    validateTaskEventSequence("TASK_COMPLETED", { taskId: "trace-01" }, history);
  });
});

test("sequence rejects terminal event after terminal already reached", () => {
  const history = [
    {
      type: "TASK_ASSIGNED",
      payload: { taskId: "trace-02" },
    },
    {
      type: "TASK_ACCEPTED",
      payload: { taskId: "trace-02" },
    },
    {
      type: "TASK_IN_PROGRESS",
      payload: { taskId: "trace-02" },
    },
    {
      type: "TASK_COMPLETED",
      payload: { taskId: "trace-02" },
    },
  ];

  assert.throws(() => {
    validateTaskEventSequence("TEST_PASSED", { taskId: "trace-02" }, history);
  });
});

test("sequence override allows controlled completion without in_progress", () => {
  const history = [
    {
      type: "TASK_ASSIGNED",
      payload: { taskId: "trace-03" },
    },
    {
      type: "TASK_ACCEPTED",
      payload: { taskId: "trace-03" },
    },
  ];

  assert.doesNotThrow(() => {
    validateTaskEventSequence(
      "TASK_COMPLETED",
      { taskId: "trace-03" },
      history,
      { allowSequenceOverride: true },
    );
  });
});
