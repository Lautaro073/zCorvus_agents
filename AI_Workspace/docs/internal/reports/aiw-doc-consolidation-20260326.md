# Consolidación documental — aiw-opt-doc-consolidation-01

## Objetivo
Alinear la fuente de verdad documental entre `architecture.md`, `report/` y `handoff/` para reducir contradicciones operativas.

## Hallazgos de contradicción
1. **Reglas vigentes vs históricos**
   - Hay documentos históricos que describen flujos anteriores sin reflejar todos los cambios de contrato actuales.
2. **Granularidad de eventos**
   - Algunos reportes describen eventos resumidos que no incluyen todos los campos operativos del contrato vigente.
3. **Responsabilidades por rol**
   - En históricos, algunas acciones aparecen fuera del perfil actual del rol (especialmente en tareas heredadas).

## Fuente de verdad propuesta
1. **Primaria:** `AI_Workspace/architecture.md`
2. **Secundaria normativa por rol:** `AI_Workspace/Agents/*/profile.md`
3. **Evidencia operacional:** `AI_Workspace/MCP_Server/shared_context.jsonl`
4. **Histórico de contexto:** `AI_Workspace/handoff/` y `AI_Workspace/report/`

## Reglas de mantenimiento
- Toda regla nueva se refleja primero en `architecture.md` y luego en perfiles de rol.
- Handoffs/reportes deben marcar si son históricos y qué versión de regla referencian.
- Cuando exista conflicto, prevalece `architecture.md` + contrato MCP vigente.

## Resultado
- Documento de consolidación emitido para referencia del Orchestrator.
- Ruta recomendada de lectura establecida para evitar interpretaciones inconsistentes.
