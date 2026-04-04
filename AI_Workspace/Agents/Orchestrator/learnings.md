## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Usar al Planner solo para epics o ambiguedad real; no volverlo cuello de botella.
- Prevencion futura: Antes de asignar, revisar dependencias, specs y rollback residual si hubo fallos recientes.

## 2026-03-25 - PR Review autonomous workflow
- Trigger: Testing PR review automation
- Regla aprendida: Antes de merge automatico, verificar que GitHub Actions este habilitado y corriendo. "pending" sin status contexts significa que no hay CI configurado.
- Prevencion futura: Si CI no esta corriendo, notificar al humano para habilitar GitHub Actions o hacer merge manual.
- Script creado: list-open-prs.mjs, approve-pr.mjs, merge-pr.mjs
- **Plantillas de PR en `.github/pull_request_template.md`** - usar al crear PRs
- **Scripts de GitHub en `AI_Workspace/scripts/github/*.mjs`**

## 2026-03-30 - Script path correction
- Trigger: Olvidé que los scripts de GitHub están en AI_Workspace/scripts/github/, no en scripts/
- Regla aprendida: Los scripts de GitHub para PRs, branches y issues están en `AI_Workspace/scripts/github/*.mjs`
- Scripts importantes:
  - `node AI_Workspace/scripts/github/create-task-pr.mjs --task <taskId> --agent <Agent> --base <branch>`
  - `node AI_Workspace/scripts/github/create-agent-branch.mjs --task <taskId> --agent <Agent> --base <branch>`
  - `node AI_Workspace/scripts/github/merge-pr.mjs --pr <numero> --base <branch>`
  - NUNCA usar `gh pr create` directamente
- También existen plantillas en `.github/` para PRs, issues, etc.

## 2026-03-26 - CI scope-aware para merge
- Trigger: PRs de tareas de workspace bloqueadas por checks de areas no relacionadas
- Regla aprendida: El merge debe considerar solo checks relevantes al scope de archivos tocados por el PR (workspace/backend/frontend). Si una tarea es de workspace, fallos de backend/frontend no relacionados no bloquean.
- Prevencion futura: Usar validacion scope-aware en `scripts/github/merge-pr.mjs` y permitir override con `--scope workspace|backend|frontend|auto`.

## 2026-03-30 - Scope lock antes de asignar trabajo en paralelo
- Trigger: Cualquier asignación de 2+ tareas concurrentes entre agentes (en cualquier epic/proyecto).
- Regla aprendida: Antes de asignar tareas en paralelo, analizar solapamiento de scope (archivos/directorios/config/entorno). Si hay riesgo, definir scope lock explícito por agente.
- Prevencion futura:
  - Definir por task: "qué puede tocar" y "qué NO puede tocar".
  - Evitar paralelizar tareas sin límites claros cuando comparten módulo o infraestructura.
  - Si el scope no está claro, secuenciar tareas en vez de paralelizarlas.

## 2026-03-30 - Gestión explícita de SUBTASK_REQUESTED
- Trigger: Cuando llega un evento `SUBTASK_REQUESTED` desde cualquier agente.
- Regla aprendida: El Orchestrator debe resolverlo explícitamente para evitar estados ambiguos en el panel.
- Prevencion futura:
  - Evaluar cada subtask y tomar decisión inmediata: aceptar (asignar task concreta) o rechazar/cancelar con motivo.
  - No dejar subtasks "colgadas" en estado intermedio.
  - Registrar siempre la decisión en MCP para trazabilidad limpia.

## 2026-04-03 - Review técnico obligatorio antes de aprobar/mergear PR
- Trigger: Se intentó avanzar PR #19 con checks operativos, pero el code review profundo detectó issues críticos de runtime-safety.
- Regla aprendida: Nunca aprobar ni intentar mergear una PR sin review técnico formal previo (además de lint/build/tests).
- Prevencion futura:
  - Flujo obligatorio pre-merge:
    1) Verificación operativa (lint/build/tests)
    2) Review técnico estructurado (runtime safety, compatibilidad, datos, rollback)
    3) Corrección de issues críticos/importantes
    4) Recheck QA
    5) Recién ahí aprobar/mergear
  - Si el review da `NEEDS_FIXES`, bloquear aprobación/merge hasta resolver y revalidar.
  - Registrar en MCP la decisión de "pide correcciones" con tasks explícitas para evitar ambigüedad.

## 2026-04-03 - PR template obligatorio y skill de workflow
- Trigger: Se detectó que al crear PRs no siempre se usa `.github/pull_request_template.md` ni se documenta la justificación/checklist esperada.
- Regla aprendida: Todo PR debe usar la plantilla de `.github/pull_request_template.md` (Que cambia, Por que, Checklist, Riesgos, Como validar localmente).
- Prevencion futura:
  - Antes de abrir PR, completar explícitamente cada sección de la plantilla.
  - Si el PR impacta CI/workflows, revisar `create-github-action-workflow-specification` para validar consistencia de triggers, permisos, jobs, quality gates y contratos de entrada/salida.
  - No marcar PR como listo para merge sin checklist de la plantilla completo o con N/A justificado.

## 2026-04-04 - TASK_ASSIGNED con prompt estructurado para dispatcher
- Trigger: asignaciones con descripción genérica producían dispatch pobre y re-trabajo por falta de contexto.
- Regla aprendida: cada `TASK_ASSIGNED` debe llevar contexto estructurado mínimo (`message`, `objective`, `acceptanceCriteria`) y, cuando aplique, `scope`, `deliverables`, `constraints`.
- Prevención futura:
  - Usar `mcp-publish-event.mjs` con `--objective`, `--acceptance`, `--scope`, `--deliverables`, `--constraints`.
  - Evitar mensajes ambiguos tipo "arregla esto" sin criterio de cierre verificable.
