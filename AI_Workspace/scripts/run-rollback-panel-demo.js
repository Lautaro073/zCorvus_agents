import { randomUUID } from "crypto";
import { promisify } from "util";
import { execFile as execFileCallback } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const execFile = promisify(execFileCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const contextFile = path.join(workspaceRoot, "MCP_Server", "shared_context.jsonl");
const rollbackCli = path.join(workspaceRoot, "scripts", "rollback.js");
const correlationId = "demo-runtime-rollback";
const featureSlug = "runtime-rollback-demo";
const specPath = path.join(workspaceRoot, "docs", "internal", "specs", "runtime-rollback-demo.md");
const registryPath = path.join(workspaceRoot, "docs", "internal", "registry", "docs_registry.jsonl");
const backendDemoDir = path.join(workspaceRoot, "Backend", "demo-runtime");
const frontendDemoDir = path.join(workspaceRoot, "Frontend", "demo-runtime");

function isoAt(baseTime, offsetMinutes) {
  return new Date(baseTime + offsetMinutes * 60_000).toISOString();
}

function makeEvent(agent, type, timestamp, payload) {
  return {
    eventId: randomUUID(),
    timestamp,
    agent,
    type,
    taskId: payload.taskId ?? null,
    assignedTo: payload.assignedTo ?? null,
    status: payload.status ?? null,
    priority: payload.priority ?? null,
    correlationId: payload.correlationId ?? payload.taskId ?? null,
    parentTaskId: payload.parentTaskId ?? null,
    dependsOn: Array.isArray(payload.dependsOn) ? payload.dependsOn : [],
    artifactPaths: Array.isArray(payload.artifactPaths) ? payload.artifactPaths : [],
    payloadVersion: "1.0",
    payload,
  };
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readEvents() {
  try {
    const raw = await fs.readFile(contextFile, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function writeEvents(events) {
  const content = events.map((event) => JSON.stringify(event)).join("\n");
  await fs.writeFile(contextFile, content ? `${content}\n` : "", "utf-8");
}

function isDemoEvent(event) {
  return event?.correlationId === correlationId || event?.payload?.correlationId === correlationId;
}

async function readRegistryEntries() {
  try {
    const raw = await fs.readFile(registryPath, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function writeRegistryEntries(entries) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  const content = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await fs.writeFile(registryPath, content ? `${content}\n` : "", "utf-8");
}

async function removeIfEmpty(targetPath) {
  if (!(await pathExists(targetPath))) {
    return;
  }

  const entries = await fs.readdir(targetPath);
  if (entries.length === 0) {
    await fs.rmdir(targetPath);
  }
}

async function cleanDemoState() {
  const existingEvents = await readEvents();
  await writeEvents(existingEvents.filter((event) => !isDemoEvent(event)));

  const registryEntries = await readRegistryEntries();
  await writeRegistryEntries(registryEntries.filter((entry) => entry?.correlationId !== correlationId && entry?.featureSlug !== featureSlug));

  await fs.rm(path.join(workspaceRoot, ".runtime", "rollback", "demo-rollback-plan-01"), { recursive: true, force: true });
  await fs.rm(path.join(workspaceRoot, ".runtime", "rollback", "demo-rollback-backend-01"), { recursive: true, force: true });
  await fs.rm(path.join(workspaceRoot, ".runtime", "rollback", "demo-rollback-frontend-01"), { recursive: true, force: true });

  await fs.rm(backendDemoDir, { recursive: true, force: true });
  await fs.rm(frontendDemoDir, { recursive: true, force: true });
  await fs.rm(specPath, { force: true });

  await removeIfEmpty(path.join(workspaceRoot, "docs", "internal", "specs"));
  await removeIfEmpty(path.join(workspaceRoot, "docs", "internal", "registry"));
  await removeIfEmpty(path.join(workspaceRoot, "docs", "internal"));
}

async function ensureDemoFiles() {
  await fs.mkdir(backendDemoDir, { recursive: true });
  await fs.mkdir(frontendDemoDir, { recursive: true });
  await fs.mkdir(path.dirname(specPath), { recursive: true });
  await fs.mkdir(path.dirname(registryPath), { recursive: true });

  await fs.writeFile(
    path.join(backendDemoDir, "auth.js"),
    "export async function login(email, password) {\n  return { ok: true, email };\n}\n",
    "utf-8",
  );
  await fs.writeFile(
    path.join(frontendDemoDir, "page.tsx"),
    "export default function DemoLoginPage() {\n  return 'demo-login';\n}\n",
    "utf-8",
  );

  await fs.writeFile(
    specPath,
    [
      "# Runtime Rollback Demo Spec",
      "",
      "## Objetivo",
      "- Demostrar rollback limpio para Backend.",
      "- Demostrar rollback bloqueado para Frontend.",
      "- Mantener trazabilidad completa con Planner, Documenter, Tester y Orchestrator.",
      "",
      "## Flujo",
      "1. Planner divide el trabajo.",
      "2. Documenter registra la spec y el registry.",
      "3. Backend hace rollback limpio tras 3 reintentos.",
      "4. Frontend falla el rollback por cambio externo.",
      "5. Orchestrator resuelve o escala segun corresponda.",
    ].join("\n"),
    "utf-8",
  );

  const registryEntries = await readRegistryEntries();
  registryEntries.push({
    docId: "spec-runtime-rollback-demo-v1",
    featureSlug,
    docType: "spec",
    title: "Spec interna del demo runtime rollback",
    path: "docs/internal/specs/runtime-rollback-demo.md",
    status: "approved",
    sourceTaskId: "demo-rollback-docs-01",
    correlationId,
    ownedBy: "Documenter",
    tags: ["rollback", "backend", "frontend", "qa"],
    updatedAt: new Date().toISOString(),
  });
  await writeRegistryEntries(registryEntries);
}

async function runRollback(command, args) {
  const { stdout } = await execFile(process.execPath, [rollbackCli, command, ...args], {
    cwd: workspaceRoot,
  });

  return JSON.parse(stdout);
}

async function appendDemoEvents(events) {
  const existingEvents = await readEvents();
  const merged = existingEvents.concat(events);
  await writeEvents(merged);
}

async function main() {
  const cleanupOnly = process.argv.includes("--cleanup");
  await fs.mkdir(path.dirname(contextFile), { recursive: true });
  await cleanDemoState();

  if (cleanupOnly) {
    process.stdout.write(JSON.stringify({ ok: true, cleaned: true, correlationId }, null, 2));
    return;
  }

  await ensureDemoFiles();

  const baseTime = Date.now() - 22 * 60_000;
  const events = [];

  events.push(
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 0), {
      taskId: "demo-rollback-plan-01",
      assignedTo: "Planner",
      status: "assigned",
      priority: "high",
      dependsOn: [],
      correlationId,
      description: "Planificar un demo completo de runtime rollback con spec, QA y ramas hijas.",
      acceptanceCriteria: [
        "Incluye Planner, Documenter, Backend, Frontend, Tester y Orchestrator",
        "Incluye rollback limpio y rollback bloqueado",
        "Incluye spec y registry internos",
      ],
    }),
    makeEvent("Planner", "TASK_ACCEPTED", isoAt(baseTime, 1), {
      taskId: "demo-rollback-plan-01",
      assignedTo: "Planner",
      status: "accepted",
      correlationId,
      message: "Tomando la planeacion del demo runtime rollback al 100%.",
    }),
    makeEvent("Planner", "TASK_IN_PROGRESS", isoAt(baseTime, 2), {
      taskId: "demo-rollback-plan-01",
      assignedTo: "Planner",
      status: "in_progress",
      correlationId,
      message: "Definiendo spec previa, ramas hijas y escenarios de rollback.",
    }),
    makeEvent("Planner", "PLAN_PROPOSED", isoAt(baseTime, 3), {
      taskId: "demo-rollback-plan-01",
      assignedTo: "Planner",
      status: "in_progress",
      correlationId,
      message: "Plan completo listo con spec previa y arbol profundo de tareas.",
      proposedTasks: [
        {
          taskId: "demo-rollback-docs-01",
          assignedTo: "Documenter",
          parentTaskId: "demo-rollback-plan-01",
          dependsOn: [],
          description: "Redactar spec interna y registrar la feature de demo.",
          acceptanceCriteria: ["Publica DOC_UPDATED", "Registra docs_registry.jsonl"],
        },
        {
          taskId: "demo-rollback-backend-01",
          assignedTo: "Backend",
          parentTaskId: "demo-rollback-plan-01",
          dependsOn: ["demo-rollback-docs-01"],
          description: "Ejecutar rollback limpio en backend demo.",
          acceptanceCriteria: ["rolledBack true", "cleanup posterior"],
        },
        {
          taskId: "demo-rollback-frontend-01",
          assignedTo: "Frontend",
          parentTaskId: "demo-rollback-plan-01",
          dependsOn: ["demo-rollback-docs-01"],
          description: "Ejecutar rollback bloqueado en frontend demo.",
          acceptanceCriteria: ["rollbackBlocked true", "conflicto visible"],
        },
      ],
    }),
    makeEvent("Planner", "TASK_COMPLETED", isoAt(baseTime, 4), {
      taskId: "demo-rollback-plan-01",
      assignedTo: "Planner",
      status: "completed",
      correlationId,
      message: "Planeacion del demo completada y entregada al Orchestrator.",
    }),
  );

  events.push(
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 5), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "assigned",
      priority: "high",
      dependsOn: [],
      correlationId,
      description: "Crear spec interna del demo de rollback runtime y registrar la feature.",
      acceptanceCriteria: ["Crea spec", "Actualiza registry", "Publica DOC_UPDATED"],
    }),
    makeEvent("Documenter", "TASK_ACCEPTED", isoAt(baseTime, 6), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "accepted",
      correlationId,
      message: "Tomando documentacion del demo runtime rollback.",
    }),
    makeEvent("Documenter", "TASK_IN_PROGRESS", isoAt(baseTime, 7), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "in_progress",
      correlationId,
      artifactPaths: ["docs/internal/specs/runtime-rollback-demo.md", "docs/internal/registry/docs_registry.jsonl"],
      message: "Redactando spec interna y registrando la feature para consumo de implementadores.",
    }),
    makeEvent("Documenter", "DOC_UPDATED", isoAt(baseTime, 8), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "completed",
      correlationId,
      docType: "spec",
      featureSlug,
      path: "docs/internal/specs/runtime-rollback-demo.md",
      registryPath: "docs/internal/registry/docs_registry.jsonl",
      artifactPaths: ["docs/internal/specs/runtime-rollback-demo.md", "docs/internal/registry/docs_registry.jsonl"],
      message: "Spec interna y docs registry listos para el demo de rollback.",
    }),
    makeEvent("Documenter", "TASK_COMPLETED", isoAt(baseTime, 9), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "completed",
      correlationId,
      message: "Documentacion interna publicada y lista para ser consumida.",
    }),
  );

  events.push(
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 10), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Backend",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-rollback-docs-01"],
      correlationId,
      requiresSpec: true,
      featureSlug,
      specRefs: ["docs/internal/specs/runtime-rollback-demo.md"],
      description: "Ejecutar rollback completo y exitoso sobre backend demo.",
      acceptanceCriteria: ["Restaura baseline", "No deja conflictos", "Reporta rollbackPath"],
    }),
    makeEvent("Backend", "TASK_ACCEPTED", isoAt(baseTime, 11), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Backend",
      status: "accepted",
      correlationId,
      message: "Tomando backend demo y leyendo spec previa antes de escribir.",
    }),
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 12), {
      taskId: "demo-rollback-backend-token-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Backend",
      status: "assigned",
      priority: "medium",
      dependsOn: [],
      correlationId,
      description: "Crear y luego revertir la pieza de token del backend demo.",
      acceptanceCriteria: ["Genera archivo nuevo", "El rollback lo elimina"],
    }),
    makeEvent("Backend", "TASK_ACCEPTED", isoAt(baseTime, 13), {
      taskId: "demo-rollback-backend-token-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Backend",
      status: "accepted",
      correlationId,
      message: "Tomando subtarea del token demo.",
    }),
  );

  const backendInit = await runRollback("init", [
    "--task", "demo-rollback-backend-01",
    "--agent", "Backend",
    "--correlation", correlationId,
    "--file", "Backend/demo-runtime/auth.js",
    "--file", "Backend/demo-runtime/token.js",
  ]);

  events.push(
    makeEvent("Backend", "TASK_IN_PROGRESS", isoAt(baseTime, 14), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Backend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Backend/demo-runtime/auth.js", "Backend/demo-runtime/token.js"],
      rollbackPath: backendInit.rollbackPath,
      message: "Baseline capturado; backend demo entra en fase de experimentacion controlada.",
    }),
    makeEvent("Backend", "TASK_IN_PROGRESS", isoAt(baseTime, 15), {
      taskId: "demo-rollback-backend-token-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Backend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Backend/demo-runtime/token.js"],
      message: "Mutando el archivo de token demo para probar rollback de archivo nuevo.",
    }),
  );

  await fs.writeFile(
    path.join(backendDemoDir, "auth.js"),
    "export async function login(email, password) {\n  throw new Error('token expired unexpectedly');\n}\n",
    "utf-8",
  );
  await fs.writeFile(
    path.join(backendDemoDir, "token.js"),
    "export function issueToken() { return 'demo-token'; }\n",
    "utf-8",
  );
  await runRollback("sync", [
    "--task", "demo-rollback-backend-01",
    "--file", "Backend/demo-runtime/auth.js",
    "--file", "Backend/demo-runtime/token.js",
  ]);

  events.push(
    makeEvent("Backend", "TASK_COMPLETED", isoAt(baseTime, 16), {
      taskId: "demo-rollback-backend-token-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Backend",
      status: "completed",
      correlationId,
      message: "La subtarea de token dejo el archivo listo para probar la restauracion.",
    }),
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 17), {
      taskId: "demo-rollback-tests-backend-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Tester",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-rollback-backend-token-01"],
      correlationId,
      description: "Validar el backend demo antes de restaurar.",
      acceptanceCriteria: ["Dispara TEST_FAILED si la mutacion rompe el flujo"],
    }),
    makeEvent("Tester", "TASK_ACCEPTED", isoAt(baseTime, 18), {
      taskId: "demo-rollback-tests-backend-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Tester",
      status: "accepted",
      correlationId,
      message: "Tomando QA del backend demo.",
    }),
    makeEvent("Tester", "TASK_IN_PROGRESS", isoAt(baseTime, 19), {
      taskId: "demo-rollback-tests-backend-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Tester",
      status: "in_progress",
      correlationId,
      message: "Corriendo pruebas funcionales sobre el backend mutado.",
    }),
    makeEvent("Tester", "TEST_FAILED", isoAt(baseTime, 20), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-backend-01",
      assignedTo: "Tester",
      status: "failed",
      correlationId,
      message: "El backend demo falla al autenticar y debe restaurarse.",
      rootCause: "La mutacion rompio la ruta happy-path.",
    }),
  );

  events.push(
    makeEvent("Backend", "TASK_IN_PROGRESS", isoAt(baseTime, 21), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Backend",
      status: "in_progress",
      retryCount: 3,
      autoRecovery: true,
      correlationId,
      rootCause: "La version experimental invalido el flujo de login.",
      message: "Se alcanzaron los reintentos maximos; iniciando restore del backend.",
    }),
  );

  const backendRestore = await runRollback("restore", ["--task", "demo-rollback-backend-01"]);
  events.push(
    makeEvent("Backend", "TASK_FAILED", isoAt(baseTime, 22), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Backend",
      status: "failed",
      correlationId,
      retryCount: 3,
      rolledBack: backendRestore.rolledBack,
      rollbackBlocked: backendRestore.rollbackBlocked,
      rollbackConflicts: backendRestore.conflicts,
      rollbackPath: backendInit.rollbackPath,
      artifactPaths: ["Backend/demo-runtime/auth.js", "Backend/demo-runtime/token.js"],
      message: "Rollback backend ejecutado con exito; el baseline fue restaurado y el archivo nuevo fue removido.",
    }),
  );

  const backendCleanup = await runRollback("cleanup", ["--task", "demo-rollback-backend-01"]);
  events.push(
    makeEvent("Orchestrator", "INCIDENT_RESOLVED", isoAt(baseTime, 23), {
      taskId: "demo-rollback-backend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Orchestrator",
      status: "completed",
      correlationId,
      message: `Backend limpio tras rollback; runtime removido en ${backendCleanup.removedPath}.`,
    }),
  );

  events.push(
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 24), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Frontend",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-rollback-docs-01"],
      correlationId,
      requiresSpec: true,
      featureSlug,
      specRefs: ["docs/internal/specs/runtime-rollback-demo.md"],
      description: "Demostrar un rollback bloqueado por cambio externo en frontend.",
      acceptanceCriteria: ["rollbackBlocked true", "conflicto visible"],
    }),
    makeEvent("Frontend", "TASK_ACCEPTED", isoAt(baseTime, 25), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Frontend",
      status: "accepted",
      correlationId,
      message: "Tomando frontend demo y leyendo spec antes de mutar la UI.",
    }),
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 26), {
      taskId: "demo-rollback-frontend-ui-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Frontend",
      status: "assigned",
      priority: "medium",
      dependsOn: [],
      correlationId,
      description: "Aplicar una mutacion UI para forzar rollback posterior.",
      acceptanceCriteria: ["La UI queda lista para probar rollback bloqueado"],
    }),
    makeEvent("Frontend", "TASK_ACCEPTED", isoAt(baseTime, 27), {
      taskId: "demo-rollback-frontend-ui-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Frontend",
      status: "accepted",
      correlationId,
      message: "Tomando subtarea de mutacion visual controlada.",
    }),
  );

  const frontendInit = await runRollback("init", [
    "--task", "demo-rollback-frontend-01",
    "--agent", "Frontend",
    "--correlation", correlationId,
    "--file", "Frontend/demo-runtime/page.tsx",
  ]);

  events.push(
    makeEvent("Frontend", "TASK_IN_PROGRESS", isoAt(baseTime, 28), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Frontend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Frontend/demo-runtime/page.tsx"],
      rollbackPath: frontendInit.rollbackPath,
      message: "Frontend demo capturo baseline y comenzo la mutacion de prueba.",
    }),
    makeEvent("Frontend", "TASK_IN_PROGRESS", isoAt(baseTime, 29), {
      taskId: "demo-rollback-frontend-ui-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Frontend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Frontend/demo-runtime/page.tsx"],
      message: "Aplicando UI experimental que luego quedara en conflicto con un hotfix externo.",
    }),
  );

  await fs.writeFile(
    path.join(frontendDemoDir, "page.tsx"),
    "export default function DemoLoginPage() {\n  return 'broken-ui';\n}\n",
    "utf-8",
  );
  await runRollback("sync", [
    "--task", "demo-rollback-frontend-01",
    "--file", "Frontend/demo-runtime/page.tsx",
  ]);

  events.push(
    makeEvent("Frontend", "TASK_COMPLETED", isoAt(baseTime, 30), {
      taskId: "demo-rollback-frontend-ui-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Frontend",
      status: "completed",
      correlationId,
      message: "La mutacion visual se completo y queda lista para QA.",
    }),
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 31), {
      taskId: "demo-rollback-tests-frontend-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Tester",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-rollback-frontend-ui-01"],
      correlationId,
      description: "Validar la UI experimental y forzar rollback si falla.",
      acceptanceCriteria: ["Dispara TEST_FAILED si la UI rompe el baseline"],
    }),
    makeEvent("Tester", "TASK_ACCEPTED", isoAt(baseTime, 32), {
      taskId: "demo-rollback-tests-frontend-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Tester",
      status: "accepted",
      correlationId,
      message: "Tomando QA del frontend demo.",
    }),
  );

  await fs.writeFile(
    path.join(frontendDemoDir, "page.tsx"),
    "export default function DemoLoginPage() {\n  return 'external-hotfix';\n}\n",
    "utf-8",
  );

  events.push(
    makeEvent("Tester", "TASK_IN_PROGRESS", isoAt(baseTime, 33), {
      taskId: "demo-rollback-tests-frontend-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Tester",
      status: "in_progress",
      correlationId,
      message: "Ejecutando QA sobre la UI mutada y el hotfix externo.",
    }),
    makeEvent("Tester", "TEST_FAILED", isoAt(baseTime, 34), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-frontend-01",
      assignedTo: "Tester",
      status: "failed",
      correlationId,
      rootCause: "El estado visual ya no coincide con el baseline y existe un hotfix externo.",
      message: "QA detecta fallo y activa rollback en frontend, pero el archivo ya cambio despues del ultimo write del agente.",
    }),
  );

  const frontendRestore = await runRollback("restore", ["--task", "demo-rollback-frontend-01"]);
  events.push(
    makeEvent("Frontend", "TASK_FAILED", isoAt(baseTime, 35), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Frontend",
      status: "failed",
      correlationId,
      retryCount: 3,
      rolledBack: frontendRestore.rolledBack,
      rollbackBlocked: frontendRestore.rollbackBlocked,
      rollbackConflicts: frontendRestore.conflicts,
      rollbackPath: frontendInit.rollbackPath,
      artifactPaths: ["Frontend/demo-runtime/page.tsx"],
      message: "Rollback frontend bloqueado porque el archivo cambio despues del ultimo write del agente.",
    }),
    makeEvent("Orchestrator", "INCIDENT_OPENED", isoAt(baseTime, 36), {
      taskId: "demo-rollback-frontend-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Orchestrator",
      status: "failed",
      correlationId,
      rollbackBlocked: true,
      rollbackConflicts: frontendRestore.conflicts,
      message: "Se requiere intervencion humana porque el rollback frontend no pudo restaurar el archivo por conflicto externo.",
    }),
    makeEvent("Documenter", "LEARNING_RECORDED", isoAt(baseTime, 37), {
      taskId: "demo-rollback-docs-01",
      parentTaskId: "demo-rollback-plan-01",
      assignedTo: "Documenter",
      status: "completed",
      correlationId,
      message: "Queda registrado que rollbackBlocked exige inspeccion humana antes de reasignar la tarea.",
      artifactPaths: ["docs/internal/specs/runtime-rollback-demo.md", "docs/internal/registry/docs_registry.jsonl"],
    }),
  );

  await appendDemoEvents(events);

  process.stdout.write(JSON.stringify({
    ok: true,
    seeded: true,
    correlationId,
    events: events.length,
    specPath: "docs/internal/specs/runtime-rollback-demo.md",
    registryPath: "docs/internal/registry/docs_registry.jsonl",
    backendRollback: backendRestore,
    frontendRollback: frontendRestore,
  }, null, 2));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
