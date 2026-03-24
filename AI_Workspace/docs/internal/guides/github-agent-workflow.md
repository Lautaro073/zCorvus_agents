# Guia interna: flujo agente -> GitHub

## Objetivo

Definir un flujo repetible para que `Orchestrator`, `Backend` y `Frontend` puedan trabajar con GitHub sin improvisar y sin romper trazabilidad.

## Flujo recomendado

### 1. Crear issue de tarea

Normalmente lo hace el `Orchestrator`.

```bash
node scripts/github/create-task-issue.mjs --task <taskId> --agent Orchestrator
```

### 2. Crear branch del agente

Lo hace el agente ejecutor con worktree limpio.

```bash
node scripts/github/create-agent-branch.mjs --task <taskId> --agent Backend
```

### 3. Implementar y publicar eventos MCP

Durante el trabajo, el agente sigue publicando eventos de estado, artefactos, pruebas o rollback en `shared_context.jsonl`.

### 4. Abrir Pull Request

Cuando el trabajo ya esta listo para revision:

```bash
node scripts/github/create-task-pr.mjs --task <taskId> --agent Backend
```

### 5. Esperar CI y revision

La rama `main` exige:

- check `Backend`
- check `Frontend`
- check `Workspace`
- 1 aprobacion minima
- conversaciones resueltas

## Reglas importantes

1. No crear branch si el worktree esta sucio.
2. No abrir PR si el `taskId` no tiene contexto suficiente en MCP.
3. No mergear directo a `main`.
4. Mantener la rama nombrada como `agents/<agent>/<taskId>` cuando sea posible.

## Troubleshooting

- Si falla la creacion de issue o PR, ejecutar primero:

```bash
node scripts/github/preflight.mjs --branch main
```

- Si el branch script dice `DIRTY_WORKTREE`, limpiar o aislar cambios antes de continuar.

## Resultado esperado

Cada tarea relevante deberia dejar al menos:

- un `taskId` trazable en MCP,
- una issue o referencia GitHub cuando corresponda,
- una branch del agente,
- una PR lista para revision humana o automatizada.
