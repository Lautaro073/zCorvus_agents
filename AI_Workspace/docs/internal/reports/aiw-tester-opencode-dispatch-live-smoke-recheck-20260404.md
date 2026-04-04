# OpenCode Dispatch Live Smoke Recheck Report

- Task ID: `aiw-tester-opencode-dispatch-live-smoke-recheck-20260404-01`
- Correlation ID: `aiw-opencode-autonomy-20260404`
- Date: 2026-04-04
- Agent: Tester

## Objective

Reejecutar smoke live post-fix para validar:

1. dispatch automatico de una `TASK_ASSIGNED` nueva sin mensaje manual;
2. avance autonomo del agente asignado (`TASK_ACCEPTED` + `TASK_IN_PROGRESS`);
3. ausencia de errores falsos en log del dispatcher para la tarea despachada.

## Dependency check

- `aiw-opt-opencode-dispatch-false-negative-fix-20260404-01` -> **completed**.

## Commands executed

```bash
node --test scripts/opencode-dispatcher-validation.test.mjs
node scripts/opencode-task-dispatcher.mjs --live --config scripts/opencode-dispatch.config.json --state .runtime/opencode-task-dispatcher.live-recheck.state.json --log .runtime/opencode-task-dispatcher.live-recheck.log --poll-ms 300
node scripts/mcp-publish-event.mjs --agent Orchestrator --type TASK_ASSIGNED --task aiw-documenter-opencode-live-smoke-recheck-20260404-qa1 --assignedTo Documenter --status assigned --priority high --correlation aiw-opencode-autonomy-20260404 --description "QA live smoke recheck after false-negative fix"
```

## Results

### 1) Regression suite

- `scripts/opencode-dispatcher-validation.test.mjs` -> **3/3 PASS**.

### 2) Live smoke evidence

- `AI_Workspace/.runtime/opencode-task-dispatcher.live-recheck.log`:
  - `Dispatching to Documenter` for task `aiw-documenter-opencode-live-smoke-recheck-20260404-qa1`.
  - Then `Dispatch failed for Documenter`.
  - Then `Dispatch FAILED, will retry next poll`.

- `AI_Workspace/MCP_Server/shared_context.jsonl` (same taskId):
  - `TASK_ASSIGNED` (Orchestrator)
  - `TASK_ACCEPTED` (Documenter)
  - `TASK_IN_PROGRESS` (Documenter)

## Root cause (recheck)

Fix parcial: la reconciliacion existe, pero la ventana por defecto (`dispatchFailureReconcileMs=5000`) no cubre este caso real.

Observed timings:

- failure logged at `06:16:56.499Z`
- retry-loop log at `06:17:01.788Z`
- lifecycle evidence (`TASK_ACCEPTED` / `TASK_IN_PROGRESS`) at `06:17:16.xxxZ`

La evidencia llega ~20s despues del fallo de proceso, fuera de la ventana de reconciliacion de 5s. Resultado: persiste falso negativo y reintento.

## Acceptance mapping

1. Dispatch automatico sin mensaje manual -> **PASS**
2. Agente asignado publica `TASK_ACCEPTED` y `TASK_IN_PROGRESS` -> **PASS**
3. Sin errores falsos en dispatcher log para task despachada -> **FAIL**

## Severity

- **High**: falso negativo operativo con riesgo de reintentos/duplicacion en cargas reales de latencia variable.

## Final verdict

`TEST_FAILED`

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-opencode-dispatch-live-smoke-recheck-20260404.md`
- `AI_Workspace/docs/internal/reports/aiw-tester-opencode-dispatch-live-smoke-recheck-tests-20260404.txt`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-recheck.log`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-recheck.stdout.log`
- `AI_Workspace/.runtime/opencode-task-dispatcher.live-recheck.state.json`
