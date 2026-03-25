## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Usar al Planner solo para epics o ambiguedad real; no volverlo cuello de botella.
- Prevencion futura: Antes de asignar, revisar dependencias, specs y rollback residual si hubo fallos recientes.

## 2026-03-25 - PR Review autonomous workflow
- Trigger: Testing PR review automation
- Regla aprendida: Antes de merge automatico, verificar que GitHub Actions este habilitado y corriendo. "pending" sin status contexts significa que no hay CI configurado.
- Prevencion futura: Si CI no esta corriendo, notificar al humano para habilitar GitHub Actions o hacer merge manual.
- Script creado: list-open-prs.mjs, approve-pr.mjs, merge-pr.mjs
