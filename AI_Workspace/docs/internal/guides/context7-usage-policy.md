# Context7 Usage Policy

## Objetivo

Establecer una regla operativa común para que todos los agentes usen Context7 cuando una tarea dependa de comportamiento de librerías o frameworks externos, reduciendo errores por documentación desactualizada.

## Regla base

- Si una decisión técnica depende de una API externa versionada, usar Context7 es obligatorio.
- Si la tarea no depende de documentación externa, declarar explícitamente `Context7 not required`.

## Cuándo aplicar Context7

Aplicar siempre en tareas que incluyan uno o más de estos casos:

- Frameworks de runtime/UI: Next.js, React, Express, shadcn/ui, React Query.
- Testing frameworks: Playwright, Jest, Testing Library, Supertest.
- Integraciones/SDK: Stripe, Nodemailer, JWT libs, clientes de terceros.
- Patrones de API cuyo contrato cambie por versión.

## Flujo requerido

1. Resolver `libraryId` con `context7-mcp_resolve-library-id`.
2. Consultar docs con `context7-mcp_query-docs` usando query específica.
3. Aplicar la decisión técnica basada en evidencia.
4. Registrar evidencia en el reporte final.

## Evidencia mínima en reportes

Incluir bloque `context7`:

```json
{
  "context7": {
    "libraryId": "/org/project[/version]",
    "query": "consulta puntual usada",
    "appliedDecision": "cambio aplicado o descarte con motivo"
  }
}
```

Si no aplica:

```json
{
  "context7": {
    "notRequired": true,
    "reason": "la tarea no depende de APIs externas versionadas"
  }
}
```

## Criterio de aceptación para Orchestrator

El `Orchestrator` debe incluir esta política en `TASK_ASSIGNED` cuando aplique y rechazar cierre de tarea si falta evidencia Context7 en trabajos que sí lo requieren.

## Notas

- Context7 complementa, no reemplaza, pruebas locales y validación de integración real.
- En conflicto entre implementación existente y docs, reportar gap y abrir subtarea de investigación.
