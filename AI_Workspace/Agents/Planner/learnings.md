## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Siempre leer la arquitectura del Frontend y Backend antes de proponer tareas redundantes.
- Prevencion futura: En estado `accepted`, hacer uso de `ls` o herramientas de lectura de código antes de planear a ciegas.

## 2026-03-26 - pre-planning inspection
- Trigger: PLAN_GENERATION_STARTED
- Regla aprendida: Nunca generar planes a ciegas.
- Prevencion futura: Antes de planear, inspeccionar la arquitectura existente del Frontend y Backend mediante lectura de estructura y archivos clave.
- Accion obligatoria:
  - Ejecutar `ls` o equivalente.
  - Revisar carpetas principales.
  - Leer archivos de configuración, entrada y módulos relevantes.
  - Detectar tecnologías y funcionalidades ya implementadas.
- Criterio de cumplimiento: No emitir plan hasta haber obtenido evidencia mínima del estado real del código base.
- Falla a evitar: Redundancia, duplicación de trabajo y planes desconectados de la implementación real.
- Enforcement: Sin inspección previa, el planner debe detenerse y reportar bloqueo por falta de análisis.

## 2026-03-31 - token/context planning quality
- Trigger: PLAN_REVIEW_AND_REFINEMENT
- Regla aprendida: En planes de optimización de contexto no alcanza con proponer compresión o cambios de API; también hay que incluir ownership correcto, reglas de perfiles, higiene de eventos y KPIs de claridad operativa.
- Prevención futura: Cuando el objetivo sea bajar tokens o mejorar coordinación multi-agente, revisar siempre:
  - si el ejecutor principal debe ser `AI_Workspace_Optimizer` en vez de `Backend`,
  - si hace falta actualizar `profile.md` de todos los agentes,
  - si el bus MCP está siendo usado como reporte largo y necesita `message budget`,
  - si existen vistas compactas orientadas a `taskId`, `correlationId` y `assignedTo`,
  - si los KPIs miden también calidad del contexto y no solo bytes o tokens,
  - si cualquier vista nueva (`snapshot`, `summary`, `inbox`) tiene schema mínimo explícito,
  - si los cambios nuevos tienen feature flags o kill switches concretos para rollback,
  - si el plan define freshness/provenance para vistas derivadas,
  - si hay estrategia de salida para cualquier modo legacy o compat mode,
  - si existe enforcement automático para evitar drift de profiles y schemas,
  - si la version final incluye politica de evolucion de schemas,
  - si sidecars o caches derivados contemplan atomicidad, idempotencia y deteccion de corrupcion,
  - si existen pruebas negativas/fault injection y SLOs con alertas operativas,
  - si budgets por vista quedan congelados con limites hard,
  - si `degradedMode` tiene policy operativa explicita,
  - si bootstrap/disaster recovery de sidecars esta documentado,
  - si el rollout por waves tiene canary/blast radius y abort thresholds,
  - si las skills externas quedan como optativas y no bloquean tareas criticas,
  - y en la revision final distinguir con claridad entre blockers reales y polish no bloqueante para evitar iterar sin fin.
- Criterio de cumplimiento: Todo plan de optimización interna debe incluir al menos un workstream de profile governance y uno de retrieval relevante/snapshot-first.
- Falla a evitar: Planes técnicamente correctos en ahorro de payload, pero incompletos para mejorar comprensión real del equipo.

## 2026-03-31 - approved plan freeze discipline
- Trigger: POST_APPROVAL_REVIEW
- Regla aprendida: Una vez que un plan queda aprobado como baseline de ejecución, no debe reabrirse por ideas nuevas o polish conceptual.
- Prevención futura: Solo reabrir el plan si aparece evidencia real en implementación, como KPIs incumplidos, drift, incidentes de wave, conflictos snapshot-vs-source o problemas operativos con sidecars/snapshots.
- Criterio de cumplimiento: Si no hay evidencia de implementación, tratar nuevas ideas como follow-up opcional o backlog, no como razón para replanificar el baseline.
- Falla a evitar: Scope creep, iteración infinita de diseño y retraso innecesario del inicio de ejecución.

## 2026-04-05 - frontend plan rigor and correction review
- Trigger: USER_PLAN_CORRECTION_REVIEW
- Regla aprendida: En planes de frontend listos para ejecución, las tareas propuestas deben salir con formato MCP completo y los bloqueos cross-layer deben convertirse en tareas explícitas, no en "decisiones a resolver luego".
- Prevención futura: Cuando planifique iniciativas de UX/frontend, revisar siempre:
  - que cada tarea propuesta use `taskId` canónico del workspace (`aiw-<agente>-<slug>-<fecha>-<seq>`) y `correlationId`,
  - que el `taskId` del documento/PLAN_PROPOSED siga siendo el de la task de planning asignada, aun si el plan tiene revisiones,
  - que cualquier dependencia servidor-cliente faltante (endpoint, cookie contract, redirect contract) exista como tarea explícita upstream,
  - que los acceptance criteria nombren el mecanismo real cuando ya se conoce (cookie SSR, locale en redirect URL, root cause técnico),
  - que el paralelismo posible quede reflejado en `dependsOn` y en el orden recomendado,
  - que cambios visuales con motion o superficies premium incluyan performance gate antes de QA final,
  - que los atributos de cookie se definan de forma explícita pero según el flujo real de lectura/escritura; no asumir `HttpOnly: false` si el cliente no necesita leer la cookie directamente,
  - que las skills disponibles se evalúen por fit real con el producto y el medio; no forzar skills de video, light-mode Apple o motion extrema si chocan con la arquitectura o el lenguaje visual existente.
- Criterio de cumplimiento: Todo plan frontend de ejecución debe dejar claro qué bloquea a quién, qué mecanismo técnico se implementa y qué parte puede correr en paralelo.
- Falla a evitar: Planes visualmente ambiciosos pero operativamente ambiguos, o mapeos de skills que lucen completos en papel pero no encajan con el proyecto real.
