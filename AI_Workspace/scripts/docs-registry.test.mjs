import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { createDocsRegistryRuntime } from "./lib/docs-registry.js";

async function createWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zcorvus-docs-registry-"));
  await fs.mkdir(path.join(root, "docs", "internal", "registry"), { recursive: true });
  return root;
}

test("register appends entry and resolve finds it", async () => {
  const workspace = await createWorkspace();
  const runtime = createDocsRegistryRuntime(workspace);

  const registerResult = await runtime.register({
    docId: "spec-auth-v1",
    feature: "auth",
    type: "spec",
    title: "Spec auth",
    path: "docs/internal/specs/auth.md",
    status: "approved",
    task: "auth-docs-01",
    correlation: "auth-login",
    owner: "Documenter",
    tags: ["auth", "backend"],
  });

  assert.equal(registerResult.ok, true);

  const resolveResult = await runtime.resolve({
    feature: "auth",
    type: "spec",
  });

  assert.equal(resolveResult.ok, true);
  assert.equal(resolveResult.entry.docId, "spec-auth-v1");
});

test("list returns latest entry per docId", async () => {
  const workspace = await createWorkspace();
  const runtime = createDocsRegistryRuntime(workspace);

  await runtime.register({
    docId: "spec-auth-v1",
    feature: "auth",
    type: "spec",
    title: "Spec auth",
    path: "docs/internal/specs/auth.md",
    status: "approved",
  });
  await runtime.register({
    docId: "spec-auth-v1",
    feature: "auth",
    type: "spec",
    title: "Spec auth updated",
    path: "docs/internal/specs/auth.md",
    status: "superseded",
  });

  const result = await runtime.list({ feature: "auth" });
  assert.equal(result.total, 1);
  assert.equal(result.entries[0].title, "Spec auth updated");
});

test("status aggregates counts", async () => {
  const workspace = await createWorkspace();
  const runtime = createDocsRegistryRuntime(workspace);

  await runtime.register({
    docId: "spec-auth-v1",
    feature: "auth",
    type: "spec",
    title: "Spec auth",
    path: "docs/internal/specs/auth.md",
    status: "approved",
  });
  await runtime.register({
    docId: "adr-auth-v1",
    feature: "auth",
    type: "adr",
    title: "ADR auth",
    path: "docs/internal/adr/auth.md",
    status: "draft",
  });

  const result = await runtime.status();
  assert.equal(result.total, 2);
  assert.equal(result.byType.spec, 1);
  assert.equal(result.byStatus.approved, 1);
  assert.equal(result.byStatus.draft, 1);
});
