# Documentacion interna del AI Workspace

Este directorio agrupa artefactos compartidos entre agentes para planificacion, especificaciones y trazabilidad documental.

Subdirectorios actuales:

- `registry/`: indice JSONL de documentos internos.
- `specs/`: especificaciones internas que los agentes pueden consumir antes de implementar.
- `guides/`: guias operativas internas para ejecutar flujos del workspace.

Regla operativa:

- El `Documenter` mantiene el registry usando `node scripts/docs-registry.js`.
- `Backend` y `Frontend` resuelven specs mediante el CLI, no editando el JSONL manualmente.
