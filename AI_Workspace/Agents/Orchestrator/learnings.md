## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Usar al Planner solo para epics o ambiguedad real; no volverlo cuello de botella.
- Prevencion futura: Antes de asignar, revisar dependencias, specs y rollback residual si hubo fallos recientes.

## 2026-03-25 - PR Review autonomous workflow
- Trigger: Testing PR review automation
- Regla aprendida: Antes de merge automatico, verificar que GitHub Actions este habilitado y corriendo. "pending" sin status contexts significa que no hay CI configurado.
- Prevencion futura: Si CI no esta corriendo, notificar al humano para habilitar GitHub Actions o hacer merge manual.
- Script creado: list-open-prs.mjs, approve-pr.mjs, merge-pr.mjs

## 2026-03-26 - CI scope-aware para merge
- Trigger: PRs de tareas de workspace bloqueadas por checks de areas no relacionadas
- Regla aprendida: El merge debe considerar solo checks relevantes al scope de archivos tocados por el PR (workspace/backend/frontend). Si una tarea es de workspace, fallos de backend/frontend no relacionados no bloquean.
- Prevencion futura: Usar validacion scope-aware en `scripts/github/merge-pr.mjs` y permitir override con `--scope workspace|backend|frontend|auto`.
