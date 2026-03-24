# Contributing

## Flujo recomendado

1. Crea una rama desde `main`.
2. Realiza los cambios.
3. Ejecuta las validaciones locales relevantes.
4. Abre un Pull Request usando el template.
5. Espera a que `AI Workspace CI` pase antes de mergear.

## Validaciones locales utiles

### MCP y monitor

```bash
npm run check --prefix MCP_Server
```

### Backend

```bash
npm run check --prefix Backend
```

### Frontend

```bash
npm run check --prefix Frontend
npm run build --prefix Frontend
```

### Tests del workspace

```bash
node --test scripts/rollback.test.mjs scripts/docs-registry.test.mjs scripts/mcp-event-contract.test.mjs scripts/backend-smoke.test.mjs scripts/mcp-smoke.test.mjs
```

## Convenciones

- No romper `architecture.md` sin alinear perfiles y handoffs.
- Si tocas `MCP_Server/`, valida `/api/health` y `/api/events`.
- Si tocas `AgentMonitor/`, revisa UX en desktop y mobile.
- Si tocas `scripts/rollback*` o `scripts/docs-registry*`, ejecuta tests.
- Si introduces un cambio estructural, actualiza `report/SYSTEM_AUDIT_AND_ROADMAP.md` cuando corresponda.
