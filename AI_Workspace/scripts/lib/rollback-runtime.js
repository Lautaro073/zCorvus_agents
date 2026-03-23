import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function hashFile(targetPath) {
  const content = await fs.readFile(targetPath);
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

async function copyFileWithParents(sourcePath, targetPath) {
  await ensureDirectory(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function writeJson(targetPath, value) {
  await ensureDirectory(path.dirname(targetPath));
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function readJson(targetPath) {
  const raw = await fs.readFile(targetPath, "utf-8");
  return JSON.parse(raw);
}

function normalizeFileArgs(values) {
  return values
    .flatMap((value) => String(value).split(","))
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

function assertTaskId(taskId) {
  const normalized = normalizeString(taskId);
  if (!normalized) {
    throw new Error("Argument '--task' is required.");
  }

  return normalized;
}

function assertAgent(agent) {
  const normalized = normalizeString(agent);
  if (!normalized) {
    throw new Error("Argument '--agent' is required.");
  }

  return normalized;
}

export function createRollbackRuntime(workspaceRoot) {
  const rollbackRoot = path.join(workspaceRoot, ".runtime", "rollback");

  function manifestDir(taskId) {
    return path.join(rollbackRoot, taskId);
  }

  function manifestPath(taskId) {
    return path.join(manifestDir(taskId), "manifest.json");
  }

  function backupAbsolutePath(taskId, backupPath) {
    return path.join(manifestDir(taskId), backupPath.split("/").join(path.sep));
  }

  function resolveWorkspaceFile(filePath) {
    const trimmed = normalizeString(filePath);
    if (!trimmed) {
      throw new Error("File path cannot be empty.");
    }

    const absolute = path.resolve(workspaceRoot, trimmed);
    const relative = path.relative(workspaceRoot, absolute);
    const relativePosix = toPosixPath(relative);
    const escapedWorkspace = relative.startsWith("..") || path.isAbsolute(relative);

    if (escapedWorkspace) {
      throw new Error(`Path '${filePath}' escapes the workspace.`);
    }

    if (!(relativePosix.startsWith("Backend/") || relativePosix.startsWith("Frontend/"))) {
      throw new Error(`Path '${filePath}' is outside the allowed rollback scope.`);
    }

    return {
      absolute,
      relative: relativePosix,
    };
  }

  async function loadManifest(taskId) {
    return readJson(manifestPath(taskId));
  }

  async function saveManifest(manifest) {
    await writeJson(manifestPath(manifest.taskId), manifest);
  }

  async function listManifests() {
    await ensureDirectory(rollbackRoot);
    const entries = await fs.readdir(rollbackRoot, { withFileTypes: true });
    const manifests = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const candidatePath = manifestPath(entry.name);
      if (!(await pathExists(candidatePath))) {
        continue;
      }

      try {
        manifests.push(await readJson(candidatePath));
      } catch {
      }
    }

    return manifests;
  }

  async function detectCollisions(taskId, relativePaths) {
    const manifests = await listManifests();
    const relevant = manifests.filter((manifest) => manifest.taskId !== taskId && manifest.status === "active");
    const collisions = [];
    const conflictingTaskIds = new Set();

    for (const manifest of relevant) {
      const trackedPaths = new Set((manifest.files || []).map((file) => file.path));
      for (const relativePath of relativePaths) {
        if (trackedPaths.has(relativePath)) {
          collisions.push(relativePath);
          conflictingTaskIds.add(manifest.taskId);
        }
      }
    }

    return {
      conflictingPaths: Array.from(new Set(collisions)),
      conflictingTaskIds: Array.from(conflictingTaskIds),
    };
  }

  async function ensureTrackedFiles(manifest, fileArgs) {
    const taskId = manifest.taskId;
    const targetDir = manifestDir(taskId);
    const normalizedFiles = normalizeFileArgs(fileArgs).map((file) => resolveWorkspaceFile(file));
    const existingByPath = new Map((manifest.files || []).map((file) => [file.path, file]));

    for (const file of normalizedFiles) {
      if (existingByPath.has(file.relative)) {
        continue;
      }

      const existedBefore = await pathExists(file.absolute);
      const backupPath = existedBefore ? `files/${file.relative}` : null;
      const baselineHash = existedBefore ? await hashFile(file.absolute) : null;
      const lastAgentHash = existedBefore ? baselineHash : null;

      if (existedBefore) {
        await copyFileWithParents(file.absolute, backupAbsolutePath(taskId, backupPath));
      }

      const record = {
        path: file.relative,
        existedBefore,
        backupPath,
        baselineHash,
        lastAgentHash,
        deletedByTask: false,
      };

      manifest.files.push(record);
      existingByPath.set(file.relative, record);
    }

    return normalizedFiles.map((file) => file.relative);
  }

  async function init({ taskId, agent, correlationId, files }) {
    const normalizedTaskId = assertTaskId(taskId);
    const normalizedAgent = assertAgent(agent);
    const normalizedFiles = normalizeFileArgs(files);
    if (normalizedFiles.length === 0) {
      throw new Error("At least one '--file' is required for init.");
    }

    const resolvedFiles = normalizedFiles.map((file) => resolveWorkspaceFile(file).relative);
    const collisions = await detectCollisions(normalizedTaskId, resolvedFiles);
    if (collisions.conflictingPaths.length > 0) {
      return {
        ok: false,
        command: "init",
        code: "FILE_COLLISION",
        taskId: normalizedTaskId,
        conflictingPaths: collisions.conflictingPaths,
        conflictingTaskIds: collisions.conflictingTaskIds,
      };
    }

    const manifestFilePath = manifestPath(normalizedTaskId);
    const alreadyExists = await pathExists(manifestFilePath);
    const manifest = alreadyExists
      ? await loadManifest(normalizedTaskId)
      : {
          version: 1,
          taskId: normalizedTaskId,
          agent: normalizedAgent,
          correlationId: normalizeString(correlationId) || null,
          createdAt: new Date().toISOString(),
          status: "active",
          files: [],
        };

    await ensureDirectory(manifestDir(normalizedTaskId));
    const trackedFiles = await ensureTrackedFiles(manifest, normalizedFiles);
    await saveManifest(manifest);

    return {
      ok: true,
      command: "init",
      taskId: normalizedTaskId,
      rollbackPath: `.runtime/rollback/${normalizedTaskId}`,
      trackedFiles,
      alreadyInitialized: alreadyExists,
    };
  }

  async function sync({ taskId, files }) {
    const normalizedTaskId = assertTaskId(taskId);
    const normalizedFiles = normalizeFileArgs(files);
    if (normalizedFiles.length === 0) {
      throw new Error("At least one '--file' is required for sync.");
    }

    if (!(await pathExists(manifestPath(normalizedTaskId)))) {
      return {
        ok: false,
        command: "sync",
        code: "MANIFEST_NOT_FOUND",
        taskId: normalizedTaskId,
      };
    }

    const manifest = await loadManifest(normalizedTaskId);
    const trackedFiles = await ensureTrackedFiles(manifest, normalizedFiles);
    const updated = [];

    for (const trackedFile of trackedFiles) {
      const record = manifest.files.find((file) => file.path === trackedFile);
      const absolutePath = resolveWorkspaceFile(trackedFile).absolute;
      if (await pathExists(absolutePath)) {
        record.lastAgentHash = await hashFile(absolutePath);
        record.deletedByTask = false;
      } else {
        record.lastAgentHash = null;
        record.deletedByTask = true;
      }
      updated.push(trackedFile);
    }

    await saveManifest(manifest);

    return {
      ok: true,
      command: "sync",
      taskId: normalizedTaskId,
      updatedFiles: updated,
    };
  }

  async function restore({ taskId }) {
    const normalizedTaskId = assertTaskId(taskId);

    if (!(await pathExists(manifestPath(normalizedTaskId)))) {
      return {
        ok: false,
        command: "restore",
        code: "MANIFEST_NOT_FOUND",
        taskId: normalizedTaskId,
      };
    }

    const manifest = await loadManifest(normalizedTaskId);
    const restored = [];
    const removed = [];
    const conflicts = [];

    for (const file of manifest.files) {
      const absolutePath = resolveWorkspaceFile(file.path).absolute;
      const existsNow = await pathExists(absolutePath);
      const currentHash = existsNow ? await hashFile(absolutePath) : null;
      const matchesLastAgentHash = currentHash === file.lastAgentHash;

      if (existsNow) {
        if (!matchesLastAgentHash) {
          conflicts.push(file.path);
          continue;
        }

        if (file.existedBefore) {
          await copyFileWithParents(backupAbsolutePath(normalizedTaskId, file.backupPath), absolutePath);
          restored.push(file.path);
        } else {
          await fs.rm(absolutePath, { force: true });
          removed.push(file.path);
        }

        continue;
      }

      if (file.existedBefore) {
        if (file.deletedByTask || file.lastAgentHash === null) {
          await copyFileWithParents(backupAbsolutePath(normalizedTaskId, file.backupPath), absolutePath);
          restored.push(file.path);
        } else {
          conflicts.push(file.path);
        }
        continue;
      }

      if (file.deletedByTask || file.lastAgentHash === null) {
        continue;
      }

      conflicts.push(file.path);
    }

    manifest.status = conflicts.length > 0 ? "failed_conflict" : "restored";
    await saveManifest(manifest);

    return {
      ok: true,
      command: "restore",
      taskId: normalizedTaskId,
      rolledBack: conflicts.length === 0,
      rollbackBlocked: conflicts.length > 0,
      restored,
      removed,
      conflicts,
    };
  }

  async function cleanup({ taskId, force = false }) {
    const normalizedTaskId = assertTaskId(taskId);
    const taskPath = manifestDir(normalizedTaskId);
    const manifestFilePath = manifestPath(normalizedTaskId);

    if (!(await pathExists(manifestFilePath))) {
      return {
        ok: false,
        command: "cleanup",
        code: "MANIFEST_NOT_FOUND",
        taskId: normalizedTaskId,
      };
    }

    const manifest = await loadManifest(normalizedTaskId);
    if (manifest.status === "failed_conflict" && !force) {
      return {
        ok: false,
        command: "cleanup",
        code: "MANIFEST_HAS_CONFLICTS",
        taskId: normalizedTaskId,
      };
    }

    await fs.rm(taskPath, { recursive: true, force: true });
    return {
      ok: true,
      command: "cleanup",
      taskId: normalizedTaskId,
      force: Boolean(force),
      removedPath: `.runtime/rollback/${normalizedTaskId}`,
    };
  }

  async function status({ taskId }) {
    const normalizedTaskId = assertTaskId(taskId);
    const manifestFilePath = manifestPath(normalizedTaskId);
    if (!(await pathExists(manifestFilePath))) {
      return {
        ok: false,
        command: "status",
        code: "MANIFEST_NOT_FOUND",
        taskId: normalizedTaskId,
      };
    }

    const manifest = await loadManifest(normalizedTaskId);
    return {
      ok: true,
      command: "status",
      taskId: normalizedTaskId,
      status: manifest.status,
      rollbackPath: `.runtime/rollback/${normalizedTaskId}`,
      trackedFiles: manifest.files.length,
      manifest,
    };
  }

  return {
    init,
    sync,
    restore,
    cleanup,
    status,
  };
}
