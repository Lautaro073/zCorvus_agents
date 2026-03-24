# Spec interna: JWT token generation

## Objetivo

Documentar de forma interna como debe comportarse la generacion de tokens JWT en el backend para que `Backend`, `Tester` y `Documenter` trabajen con el mismo criterio.

## Fuente de verdad actual

- Documento humano existente: `docs/TOKEN_GENERATION.md`
- Task origen: `doc-tokens-01`

## Reglas operativas

1. Toda tarea que toque login o sesion debe revisar este documento antes de modificar la logica.
2. Si se cambia el contrato del token, el agente debe publicar evento y pedir actualizacion documental.
3. Si no existe evidencia del flujo real en codigo, el agente debe bloquearse o pedir aclaracion, no inventar el comportamiento.

## Criterios de aceptacion sugeridos para tareas futuras

- Mantener trazabilidad por `taskId`.
- Publicar artefactos/documentacion al cambiar expiracion o claims.
- Coordinar pruebas de expiracion e invalidez con `Tester`.
