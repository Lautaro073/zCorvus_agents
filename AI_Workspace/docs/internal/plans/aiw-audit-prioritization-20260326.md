# Plan de Priorización P1/P2/P3 — aiw-opt-plan-prioritization-01

## Contexto
- Correlation ID: `aiw-audit-20260326`
- Parent task: `aiw-opt-audit-all-01`
- Objetivo: convertir hallazgos del audit en un plan ejecutable con dependencias y criterios de aceptación.

## P1 (Alto impacto, bajo riesgo)
1. **Fortalecer validación de eventos de trabajo**
   - Alcance: reducir eventos incompletos en flujo operativo.
   - Dependencias: ninguna.
   - Aceptación:
     - Eventos `TASK_*` incluyen `taskId`, `assignedTo`, `status` y `correlationId`.
     - No se observan eventos nuevos con payload mínimo incompleto.

2. **Normalizar trazabilidad por `correlationId`**
   - Alcance: evitar ruptura entre tarea raíz y subtareas.
   - Dependencias: P1.1.
   - Aceptación:
     - Subtareas publicadas con `parentTaskId` y `correlationId` consistentes.
     - El monitor agrupa correctamente por tarea y correlación.

## P2 (Impacto medio)
3. **Consolidación de documentación operativa**
   - Alcance: alinear `architecture`, `report` y `handoff`.
   - Dependencias: tarea de Documenter.
   - Aceptación:
     - Documento de contradicciones y fuente de verdad publicado.
     - Reglas de operación actualizadas y rastreables.

4. **Mejorar control de ruido en `shared_context.jsonl`**
   - Alcance: facilitar observabilidad y análisis de eventos.
   - Dependencias: P1.2.
   - Aceptación:
     - Se reduce duplicación de eventos sin valor operativo.
     - Se mantiene integridad del historial por `taskId`.

## P3 (Evolutivo)
5. **Dashboard de métricas de optimización**
   - Alcance: latencia, p95, tokens, volumen de eventos.
   - Dependencias: P1/P2 implementadas.
   - Aceptación:
     - Métricas históricas comparables baseline vs post.
     - Señales de alerta para degradación.

## Riesgos
- Cambios contractuales sin migración gradual pueden romper compatibilidad histórica.
- Exceso de normalización temprana puede frenar entrega de features.

## Orden de ejecución recomendado
1) P1.1 → 2) P1.2 → 3) P2.3 → 4) P2.4 → 5) P3.5
