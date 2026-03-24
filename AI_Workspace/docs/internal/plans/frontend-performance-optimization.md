# Plan por etapas: frontend performance optimization

## Contexto

Plan tecnico derivado de `docs/internal/specs/frontend-performance-baseline.md` para convertir la auditoria del Frontend en trabajo ejecutable, trazable y verificable.

## Correlation ID

- `frontend-performance-20260324`

## Objetivo de la iniciativa

Reducir el costo de render e hidratacion del `Frontend/`, bajar el peso de bundle en rutas criticas y dejar un baseline reproducible para que las siguientes optimizaciones no vuelvan a improvisarse.

## Etapa 1 - Foundation y shell

### Objetivo

Eliminar costo innecesario del layout global y dejar reglas claras de rendering, profiling y boundaries.

### Tarea oficial

- `frontend-perf-foundation-01` -> `Frontend`

### Salidas esperadas

- profiling fuera del camino critico en produccion,
- layout mas predecible y menos cargado,
- boundaries de carga/error para rutas con espera real,
- decision documentada de que providers deben ser globales y cuales no.

## Etapa 2 - Catalogo de iconos y bundles

### Objetivo

Separar la experiencia del explorador de iconos del costo de cargar datasets completos desde el arranque.

### Tarea oficial

- `frontend-perf-icons-01` -> `Frontend`

### Salidas esperadas

- carga diferida por tipo o ruta,
- menor costo inicial de parseo y descarga,
- virtualizacion preservada sin eager expansion del catalogo.

## Etapa 3 - Auth, data fetching y flujo premium

### Objetivo

Unificar la propiedad de datos del usuario y eliminar fetches/reintentos ad hoc que hoy degradan UX y observabilidad.

### Tarea oficial

- `frontend-perf-auth-data-01` -> `Frontend`

### Salidas esperadas

- una sola estrategia de auth cliente/servidor,
- menos fetches duplicados,
- flujo premium sin polling ciego prolongado,
- riesgos de sesion y token mejor acotados.

## Etapa 4 - i18n y payload por ruta

### Objetivo

Reducir trabajo de servidor y payload serializado cargando solo namespaces y datos necesarios por superficie.

### Tarea oficial

- `frontend-perf-i18n-01` -> `Frontend`

### Salidas esperadas

- namespaces por ruta o dominio,
- politica clara de mensajes globales vs locales,
- sin regresiones en middleware ni navegacion internacionalizada.

## Etapa 5 - Verificacion y cierre

### Objetivo

Cerrar la iniciativa con evidencia de mejora, incidencias si aparecen regresiones y documentacion sincronizada.

### Tareas oficiales

- `frontend-perf-qa-01` -> `Tester`
- `frontend-perf-doc-sync-01` -> `Documenter`

### Salidas esperadas

- baseline vs resultado final,
- checklists reproducibles,
- incidentes abiertos si hay regresion,
- documentacion final alineada con la solucion aprobada.

## Dependencias propuestas

- `frontend-perf-foundation-01` abre la iniciativa tecnica.
- `frontend-perf-icons-01`, `frontend-perf-auth-data-01` y `frontend-perf-i18n-01` dependen de la fundacion.
- `frontend-perf-qa-01` depende de las tres tareas tecnicas.
- `frontend-perf-doc-sync-01` depende de `frontend-perf-qa-01`.

## Riesgos que el plan mitiga

- shell global dinamico y demasiado hidratado,
- bundles pesados por icon sets eager,
- auth y fetches duplicados,
- polling premium sin contrato fuerte,
- i18n global sin control de payload,
- ausencia de medicion repetible.

## Criterios de aprobacion del plan

El plan queda listo para ejecucion cuando:

1. Las tareas oficiales existen en MCP con `taskId`, `correlationId`, `parentTaskId` y `dependsOn`.
2. Cada tarea tiene `acceptanceCriteria` verificables.
3. `Frontend` puede empezar por la etapa 1 sin ambiguedades funcionales.
4. `Tester` y `Documenter` ya tienen entrada formal para cierre y regresion.
