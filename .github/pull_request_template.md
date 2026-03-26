## Que cambia
-

## Por que
-

## Checklist
- [ ] Corre `AI Workspace CI`
- [ ] Si toque `AgentMonitor/`, revise UX y tiempo real
- [ ] Si toque `MCP_Server/`, revise `/api/health` y `/api/events`
- [ ] Si toque `scripts/rollback*`, corri tests del runtime rollback
- [ ] Si toque `scripts/docs-registry*` o `docs/internal/`, revise el registry
- [ ] Si toque perfiles en `Agents/`, revise coherencia con `architecture.md`

## Riesgos conocidos
-

## Como validar localmente
```bash
npm run check --prefix MCP_Server
node --test scripts/rollback.test.mjs scripts/docs-registry.test.mjs scripts/mcp-event-contract.test.mjs scripts/backend-smoke.test.mjs scripts/mcp-smoke.test.mjs
```
