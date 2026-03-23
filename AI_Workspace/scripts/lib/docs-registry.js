import fs from "fs/promises";
import path from "path";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(values) {
  return values
    .flatMap((value) => String(value).split(","))
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function createDocsRegistryRuntime(workspaceRoot) {
  const registryPath = path.join(workspaceRoot, "docs", "internal", "registry", "docs_registry.jsonl");

  async function ensureRegistryDir() {
    await fs.mkdir(path.dirname(registryPath), { recursive: true });
  }

  async function readEntries() {
    if (!(await pathExists(registryPath))) {
      return [];
    }

    const raw = await fs.readFile(registryPath, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  async function appendEntry(entry) {
    await ensureRegistryDir();
    await fs.appendFile(registryPath, `${JSON.stringify(entry)}\n`, "utf-8");
  }

  function validateRegisterArgs(args) {
    const docId = normalizeString(args.docId);
    const featureSlug = normalizeString(args.feature);
    const docType = normalizeString(args.type);
    const title = normalizeString(args.title);
    const docPath = normalizeString(args.path);
    const status = normalizeString(args.status);

    if (!docId || !featureSlug || !docType || !title || !docPath || !status) {
      throw new Error("register requires --doc-id, --feature, --type, --title, --path and --status.");
    }

    return {
      docId,
      featureSlug,
      docType,
      title,
      path: docPath,
      status,
      sourceTaskId: normalizeString(args.task) || null,
      correlationId: normalizeString(args.correlation) || null,
      ownedBy: normalizeString(args.owner) || "Documenter",
      supersedesDocId: normalizeString(args.supersedes) || null,
      tags: normalizeStringList(args.tags || []),
      updatedAt: new Date().toISOString(),
    };
  }

  function latestByDocId(entries) {
    const map = new Map();
    for (const entry of entries) {
      map.set(entry.docId, entry);
    }
    return Array.from(map.values());
  }

  function filterEntries(entries, filters) {
    return entries.filter((entry) => {
      if (filters.docId && entry.docId !== filters.docId) {
        return false;
      }
      if (filters.feature && entry.featureSlug !== filters.feature) {
        return false;
      }
      if (filters.type && entry.docType !== filters.type) {
        return false;
      }
      if (filters.status && entry.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  async function register(args) {
    const entry = validateRegisterArgs(args);
    await appendEntry(entry);

    return {
      ok: true,
      command: "register",
      registryPath: path.relative(workspaceRoot, registryPath).split(path.sep).join("/"),
      entry,
    };
  }

  async function resolve(args) {
    const docId = normalizeString(args.docId);
    const feature = normalizeString(args.feature);
    const type = normalizeString(args.type);

    if (!docId && !feature) {
      throw new Error("resolve requires --doc-id or --feature.");
    }

    const entries = latestByDocId(await readEntries());
    const matches = filterEntries(entries, { docId, feature, type, status: normalizeString(args.status) || "approved" });
    const sorted = matches.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
    const entry = sorted[0] || null;

    return {
      ok: Boolean(entry),
      command: "resolve",
      entry,
      registryPath: path.relative(workspaceRoot, registryPath).split(path.sep).join("/"),
    };
  }

  async function list(args) {
    const entries = latestByDocId(await readEntries());
    const matches = filterEntries(entries, {
      docId: normalizeString(args.docId),
      feature: normalizeString(args.feature),
      type: normalizeString(args.type),
      status: normalizeString(args.status),
    }).sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));

    return {
      ok: true,
      command: "list",
      total: matches.length,
      entries: matches,
      registryPath: path.relative(workspaceRoot, registryPath).split(path.sep).join("/"),
    };
  }

  async function status() {
    const entries = latestByDocId(await readEntries());
    const byType = {};
    const byStatus = {};

    for (const entry of entries) {
      byType[entry.docType] = (byType[entry.docType] || 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    }

    return {
      ok: true,
      command: "status",
      registryPath: path.relative(workspaceRoot, registryPath).split(path.sep).join("/"),
      total: entries.length,
      byType,
      byStatus,
    };
  }

  return {
    register,
    resolve,
    list,
    status,
    registryPath,
  };
}
