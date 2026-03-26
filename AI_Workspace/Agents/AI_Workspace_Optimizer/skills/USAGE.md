# Skills operativas del AI Workspace Optimizer

## Objetivo
Definir cuándo usar cada skill instalada para mantener ejecución consistente, medible y alineada con `task_id`.

## Matriz de uso rápido

### 1 prompt-engineering-patterns
**Usar cuando:**
- haya que reducir tokens sin perder contexto,
- se detecte redundancia en prompts,
- exista variabilidad alta en respuestas de agentes.

**Entradas mínimas:** baseline de tokens por flujo/agente, prompts actuales, criterios de calidad esperada.

**Salidas esperadas:** prompt optimizado, comparación antes/después, justificación de cambios.

---

### 2 cost-optimization
**Usar cuando:**
- suba el costo operativo por ejecución,
- haya rutas de cómputo caras o repetitivas,
- se requiera plan de ahorro con bajo riesgo.

**Entradas mínimas:** métricas de costo/latencia, frecuencia de flujos, consumo por componente.

**Salidas esperadas:** propuestas priorizadas por impacto/riesgo, estimación de ahorro, plan incremental.

---

### 3 distributed-tracing
**Usar cuando:**
- exista latencia p95 alta,
- no se pueda ubicar cuello de botella en el flujo MCP,
- se necesite correlación end-to-end entre eventos/servicios.

**Entradas mínimas:** eventos MCP, IDs de correlación, puntos de entrada/salida del flujo.

**Salidas esperadas:** mapa de trazas, hotspots identificados, hipótesis verificables de optimización.

---

### 4 task-coordination-strategies
**Usar cuando:**
- una tarea asignada al Optimizer sea grande o ambigua,
- se requiera descomponer trabajo con dependencias,
- se necesite pedir apoyo a `Planner` o `Documenter`.

**Entradas mínimas:** `task_id`, alcance, criterios de aceptación, bloqueos detectados.

**Salidas esperadas:** descomposición por subtareas, dependencias (`dependsOn`), propuesta de `SUBTASK_REQUESTED` al `Orchestrator`.

## Regla de delegación
El `AI_Workspace_Optimizer` no asigna trabajo directo a otros agentes.
Si necesita apoyo, debe emitir `SUBTASK_REQUESTED` y esperar `TASK_ASSIGNED` del `Orchestrator`.

## Orden recomendado de invocación
1. `task-coordination-strategies` (si hay ambigüedad o alto tamaño)
2. `distributed-tracing` (si no hay visibilidad del cuello de botella)
3. `cost-optimization` (priorización por impacto/riesgo)
4. `prompt-engineering-patterns` (refinamiento de consumo/consistencia)

## Criterio de cierre
No marcar `completed` sin comparación de baseline vs post-cambio en latencia, costo o tokens.
