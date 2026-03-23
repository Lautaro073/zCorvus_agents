import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const contextFile = path.join(workspaceRoot, "MCP_Server", "shared_context.jsonl");
const correlationId = "demo-monitor-tree";

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

async function readExistingEvents() {
  try {
    const raw = await fs.readFile(contextFile, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const cleanup = process.argv.includes("--cleanup");
  const existingEvents = await readExistingEvents();
  const isDemoEvent = (event) => {
    return event?.correlationId === correlationId || event?.payload?.correlationId === correlationId;
  };
  const alreadySeeded = existingEvents.some(isDemoEvent);

  if (cleanup) {
    const keptEvents = existingEvents.filter((event) => !isDemoEvent(event));
    const content = keptEvents.map((event) => JSON.stringify(event)).join("\n");
    await fs.writeFile(contextFile, content ? `${content}\n` : "", "utf-8");
    process.stdout.write(JSON.stringify({
      ok: true,
      cleaned: true,
      removed: existingEvents.length - keptEvents.length,
      correlationId,
    }, null, 2));
    return;
  }

  if (alreadySeeded && !force) {
    process.stdout.write(JSON.stringify({
      ok: true,
      skipped: true,
      reason: "demo_already_seeded",
      correlationId,
    }, null, 2));
    return;
  }

  await fs.mkdir(path.dirname(contextFile), { recursive: true });

  const baseTime = Date.now() - 22 * 60_000;
  const events = [
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 0), {
      taskId: "demo-auth-plan-01",
      assignedTo: "Planner",
      status: "assigned",
      priority: "high",
      dependsOn: [],
      correlationId,
      description: "Planificar la feature de autenticacion con tareas atomicas y dependencias.",
      acceptanceCriteria: [
        "Descompone backend, frontend y QA",
        "Define parentTaskId y dependsOn",
        "Propone criterios de aceptacion por task",
      ],
    }),
    makeEvent("Planner", "TASK_ACCEPTED", isoAt(baseTime, 1), {
      taskId: "demo-auth-plan-01",
      assignedTo: "Planner",
      status: "accepted",
      correlationId,
      message: "Tomo la planeacion de la feature de autenticacion.",
    }),
    makeEvent("Planner", "TASK_IN_PROGRESS", isoAt(baseTime, 2), {
      taskId: "demo-auth-plan-01",
      assignedTo: "Planner",
      status: "in_progress",
      correlationId,
      message: "Explorando dependencias y proponiendo subtareas.",
    }),
    makeEvent("Planner", "PLAN_PROPOSED", isoAt(baseTime, 4), {
      taskId: "demo-auth-plan-01",
      assignedTo: "Planner",
      status: "in_progress",
      correlationId,
      message: "Plan listo con backend, frontend y QA.",
      proposedTasks: [
        {
          taskId: "demo-auth-backend-01",
          assignedTo: "Backend",
          parentTaskId: "demo-auth-plan-01",
          dependsOn: [],
          description: "Crear endpoint POST /api/auth/login.",
          acceptanceCriteria: ["Valida body", "Publica ENDPOINT_CREATED"],
        },
        {
          taskId: "demo-auth-frontend-01",
          assignedTo: "Frontend",
          parentTaskId: "demo-auth-plan-01",
          dependsOn: ["demo-auth-backend-01"],
          description: "Construir pantalla de login y manejo de errores.",
          acceptanceCriteria: ["Publica UI_COMPONENT_BUILT"],
        },
        {
          taskId: "demo-auth-tests-01",
          assignedTo: "Tester",
          parentTaskId: "demo-auth-plan-01",
          dependsOn: ["demo-auth-backend-01", "demo-auth-frontend-01"],
          description: "Verificar flujo de autenticacion y regresiones.",
          acceptanceCriteria: ["Publica TEST_PASSED o TEST_FAILED"],
        },
      ],
    }),
    makeEvent("Planner", "TASK_COMPLETED", isoAt(baseTime, 5), {
      taskId: "demo-auth-plan-01",
      assignedTo: "Planner",
      status: "completed",
      correlationId,
      message: "Planeacion entregada al Orchestrator.",
    }),

    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 6), {
      taskId: "demo-auth-backend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Backend",
      status: "assigned",
      priority: "high",
      dependsOn: [],
      correlationId,
      description: "Crear endpoint de login y respuesta base.",
      acceptanceCriteria: ["Valida body", "Publica ENDPOINT_CREATED"],
    }),
    makeEvent("Backend", "TASK_ACCEPTED", isoAt(baseTime, 7), {
      taskId: "demo-auth-backend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Backend",
      status: "accepted",
      correlationId,
      message: "Tomo el backend del login.",
    }),
    makeEvent("Backend", "TASK_IN_PROGRESS", isoAt(baseTime, 8), {
      taskId: "demo-auth-backend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Backend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Backend/src/routes/auth.js", "Backend/src/services/auth-login.js"],
      message: "Implementando endpoint y servicio de autenticacion.",
    }),
    makeEvent("Backend", "ENDPOINT_CREATED", isoAt(baseTime, 10), {
      taskId: "demo-auth-backend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Backend",
      status: "completed",
      correlationId,
      method: "POST",
      path: "/api/auth/login",
      message: "Contrato backend listo para consumo del frontend.",
      artifactPaths: ["Backend/src/routes/auth.js"],
    }),
    makeEvent("Backend", "TASK_COMPLETED", isoAt(baseTime, 11), {
      taskId: "demo-auth-backend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Backend",
      status: "completed",
      correlationId,
      message: "Backend de login completado y listo para QA.",
    }),

    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 12), {
      taskId: "demo-auth-frontend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Frontend",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-auth-backend-01"],
      correlationId,
      description: "Crear pantalla de login y flujo base.",
      acceptanceCriteria: ["Publica UI_COMPONENT_BUILT"],
    }),
    makeEvent("Frontend", "TASK_ACCEPTED", isoAt(baseTime, 13), {
      taskId: "demo-auth-frontend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Frontend",
      status: "accepted",
      correlationId,
      message: "Tomando UI principal de autenticacion.",
    }),
    makeEvent("Frontend", "TASK_IN_PROGRESS", isoAt(baseTime, 14), {
      taskId: "demo-auth-frontend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Frontend",
      status: "in_progress",
      correlationId,
      artifactPaths: ["Frontend/app/login/page.tsx"],
      message: "Construyendo shell visual del login.",
    }),
    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 15), {
      taskId: "demo-auth-frontend-session-01",
      parentTaskId: "demo-auth-frontend-01",
      assignedTo: "Frontend",
      status: "assigned",
      priority: "medium",
      dependsOn: ["demo-auth-backend-01"],
      correlationId,
      description: "Conectar el formulario con el manejo de sesion.",
      acceptanceCriteria: ["Persistencia de sesion basica"],
    }),
    makeEvent("Frontend", "TASK_ACCEPTED", isoAt(baseTime, 16), {
      taskId: "demo-auth-frontend-session-01",
      parentTaskId: "demo-auth-frontend-01",
      assignedTo: "Frontend",
      status: "accepted",
      correlationId,
      message: "Tomando la subtarea de sesion.",
    }),
    makeEvent("Frontend", "TASK_IN_PROGRESS", isoAt(baseTime, 17), {
      taskId: "demo-auth-frontend-session-01",
      parentTaskId: "demo-auth-frontend-01",
      assignedTo: "Frontend",
      status: "in_progress",
      correlationId,
      message: "Conectando formulario con guardado de token y estado.",
    }),
    makeEvent("Frontend", "TASK_COMPLETED", isoAt(baseTime, 19), {
      taskId: "demo-auth-frontend-session-01",
      parentTaskId: "demo-auth-frontend-01",
      assignedTo: "Frontend",
      status: "completed",
      correlationId,
      message: "Subtarea de sesion completada.",
    }),
    makeEvent("Frontend", "UI_COMPONENT_BUILT", isoAt(baseTime, 20), {
      taskId: "demo-auth-frontend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Frontend",
      status: "completed",
      correlationId,
      path: "/login",
      message: "UI de login lista para pruebas.",
      artifactPaths: ["Frontend/app/login/page.tsx"],
    }),
    makeEvent("Frontend", "TASK_COMPLETED", isoAt(baseTime, 21), {
      taskId: "demo-auth-frontend-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Frontend",
      status: "completed",
      correlationId,
      message: "Frontend principal del login finalizado.",
    }),

    makeEvent("Orchestrator", "TASK_ASSIGNED", isoAt(baseTime, 22), {
      taskId: "demo-auth-tests-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Tester",
      status: "assigned",
      priority: "high",
      dependsOn: ["demo-auth-backend-01", "demo-auth-frontend-01"],
      correlationId,
      description: "Validar el flujo de login de punta a punta.",
      acceptanceCriteria: ["Cubre login correcto e incorrecto"],
    }),
    makeEvent("Tester", "TASK_ACCEPTED", isoAt(baseTime, 23), {
      taskId: "demo-auth-tests-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Tester",
      status: "accepted",
      correlationId,
      message: "Tomando QA del flujo de autenticacion.",
    }),
    makeEvent("Tester", "TASK_IN_PROGRESS", isoAt(baseTime, 24), {
      taskId: "demo-auth-tests-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Tester",
      status: "in_progress",
      correlationId,
      message: "Ejecutando pruebas funcionales de login.",
    }),
    makeEvent("Tester", "TEST_FAILED", isoAt(baseTime, 26), {
      taskId: "demo-auth-tests-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Tester",
      status: "failed",
      correlationId,
      rootCause: "El formulario no muestra feedback correcto al expirar la sesion.",
      message: "La regresion de sesion expirada sigue visible en QA.",
    }),
    makeEvent("Tester", "INCIDENT_OPENED", isoAt(baseTime, 27), {
      taskId: "demo-auth-tests-01",
      parentTaskId: "demo-auth-plan-01",
      assignedTo: "Tester",
      status: "failed",
      correlationId,
      message: "Se abre incidente por manejo incorrecto de sesion expirada.",
    }),
  ];

  const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  await fs.appendFile(contextFile, lines, "utf-8");

  process.stdout.write(JSON.stringify({
    ok: true,
    seeded: true,
    correlationId,
    tasks: [
      "demo-auth-plan-01",
      "demo-auth-backend-01",
      "demo-auth-frontend-01",
      "demo-auth-frontend-session-01",
      "demo-auth-tests-01",
    ],
    events: events.length,
  }, null, 2));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
