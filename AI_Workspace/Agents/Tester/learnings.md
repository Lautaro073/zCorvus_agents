## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Cuando un agente falle, revisar `rolledBack` y `rollbackBlocked` antes de escalar.
- Prevencion futura: Priorizar reportes reproducibles con input, output esperado y output real.

## 2026-03-30 - e2e coverage gate
- Trigger: QA_GATE_SCOPE_MISMATCH
- Regla aprendida: Cuando se asigne testing E2E, no validar solo smoke; exigir configuracion y cobertura suficientes antes de aprobar gate.
- Checklist minimo requerido: `playwright.config` robusto, proyectos cross-browser, specs por flujo critico, dataset deterministico, artifacts (trace/screenshots/video/report), y comandos separados smoke/regression/visual.
- Prevencion futura: Si falta cualquiera de esos prerrequisitos, publicar `TASK_BLOCKED` + `SUBTASK_REQUESTED` a Orchestrator con el gap exacto.
- Eficiencia de tokens: Apenas se lee la task, si faltan recursos/infra para testear (config, fixtures, dataset, server, permisos, artefactos), bloquear de inmediato y pedir subtask a Orchestrator sin ejecutar intentos parciales.
- Ejecucion autonoma QA: Tester puede crear/ajustar tests y scripts de Playwright directamente para validar hipotesis y producir evidencia reproducible, sin depender de otro agente para escribirlos.
