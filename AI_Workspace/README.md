# OpenCode Autonomous Task Dispatch (MCP → Agent)

## Qué hace

Monitorea `shared_context.jsonl` en busca de eventos `TASK_ASSIGNED` nuevos y dispara el agente correspondiente via OpenCode en modo no-interactivo, sin intervención manual.

El prompt de intake que recibe el agente es determinístico: le informa el `taskId`, `correlationId`, `assignedTo`, descripción y criterios de aceptación del evento, y le da las instrucciones exactas para comenzar (`TASK_ACCEPTED → TASK_IN_PROGRESS`).

---

## Correcciones respecto al diseño original

| Problema en el diseño original | Solución aplicada |
|---|---|
| `opencode run --agent <name>` no existe en la CLI de OpenCode | Se usa `opencode run --session <id> "prompt"` o `opencode run --prompt "..." "prompt"` según disponibilidad de sesión |
| Las "sesiones" no son un concepto de la CLI estándar de OpenCode | Las sesiones son opcionales: si hay una activa se envía ahí; si no, se inicia una corrida no-interactiva nueva con el system prompt del agente desde su `.jsonl` |
| No había script — solo documentación | El script existe en `scripts/opencode-task-dispatcher.mjs` |
| `--agent` implica un concepto de agente interno de OpenCode que no coincide con el modelo zCorvus | Los agentes zCorvus se identifican por `assignedTo` en el evento; el system prompt se carga desde `agent-prompts/<slug>.jsonl` |
| El prompt de intake no estaba definido | El prompt es generado por `buildIntakePrompt(event)` con todos los campos del evento MCP |

---

## Estructura de archivos

```
AI_Workspace/
  scripts/
    opencode-task-dispatcher.mjs          ← script principal
    opencode-dispatch.config.example.json ← template de config (copiar y editar)
    opencode-dispatch.config.json         ← tu config real (gitignoreado)
    agent-prompts/
      orchestrator.jsonl
      planner.jsonl
      observer.jsonl
      frontend.jsonl
      backend.jsonl
      tester.jsonl
      documenter.jsonl
      ai_workspace_optimizer.jsonl
  MCP_Server/
    shared_context.jsonl                  ← fuente de eventos MCP
  .runtime/
    opencode-task-dispatcher.state.json   ← estado de cursor (offset + IDs procesados)
    opencode-task-dispatcher.log          ← log continuo
```

---

## Setup

### 1. Copiar config

**Windows:**
```cmd
copy AI_Workspace\scripts\opencode-dispatch.config.example.json AI_Workspace\scripts\opencode-dispatch.config.json
```

**PowerShell / bash:**
```bash
cp AI_Workspace/scripts/opencode-dispatch.config.example.json AI_Workspace/scripts/opencode-dispatch.config.json
```

### 2. Editar config

Abrí `opencode-dispatch.config.json` y revisá:

- **`sharedContextPath`** — ruta a tu `shared_context.jsonl` (relativa a la ubicación del config, o absoluta).
- **`systemPromptsDir`** — carpeta con los `.jsonl` de cada agente.
- **`agentMap`** — mapeo de nombre de agente (como aparece en `assignedTo`) al slug del archivo `.jsonl`. No modificar si usás los nombres estándar zCorvus.
- **`sessions`** — acá van los IDs de sesión activa de OpenCode para cada agente (ver sección Sessions abajo). Podés dejarlos vacíos y el dispatcher crea una corrida nueva cada vez.
- **`opencodeBin`** — si `opencode` no está en PATH, poné la ruta completa.

### 3. Verificar que `opencode` está en PATH

```bash
opencode --version
```

Si no responde, instalá OpenCode globalmente o usá la ruta completa en `opencodeBin`.

---

## Modos de ejecución

### Dry-run (por defecto — no llama a OpenCode)

Loguea cada decisión de dispatch sin ejecutar nada. Ideal para validar config y ver qué haría el dispatcher.

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --config AI_Workspace/scripts/opencode-dispatch.config.json
```

### Live (disparo real)

```bash
node AI_Workspace/scripts/opencode-task-dispatcher.mjs --live --config AI_Workspace/scripts/opencode-dispatch.config.json
```

### Opciones completas

```
--config  <path>   Config JSON               (default: ./opencode-dispatch.config.json)
--state   <path>   Archivo de estado         (default: .runtime/opencode-task-dispatcher.state.json)
--log     <path>   Archivo de log            (default: .runtime/opencode-task-dispatcher.log)
--poll-ms <n>      Intervalo de polling en ms (default: 1500)
--live             Modo live (disparo real)
--help             Muestra la ayuda
```

---

## Sessions vs. Fresh runs

El dispatcher tiene dos modos de dispatch por agente:

### Modo sesión (recomendado para workflows continuos)

Si `sessions["Orchestrator"]` tiene un ID de sesión activa, el dispatcher envía el intake prompt a esa sesión:

```
opencode run --session <id> --format default "<intake-prompt>"
```

El agente ya tiene contexto de conversación anterior. Útil si el agente mantiene estado entre tareas.

**Cómo obtener el session ID de OpenCode:** los session IDs están en la base de datos SQLite de OpenCode (`.opencode/sessions.db` en el directorio del proyecto). También podés consultar `opencode sessions` si tu versión lo soporta, o ver el ID en la UI de OpenCode al iniciar una sesión.

### Modo fresh run (fallback)

Si no hay session ID configurado para el agente, el dispatcher inicia una corrida no-interactiva con el prompt del agente desde su `.jsonl`:

```
opencode run --prompt "<agent-prompt>" --format default "<intake-prompt>"
```

El agente empieza sin contexto previo pero con su identidad, rol y reglas completas.

---

## Cómo se ve un dispatch en el log

```
[2026-03-30T12:00:01.000Z] [INFO ] Dispatcher starting {"mode":"LIVE","pollMs":1500,"watching":"...shared_context.jsonl"}
[2026-03-30T12:00:03.500Z] [INFO ] Dispatching to Planner {"taskId":"aiw-planner-...","sessionId":"(new session)","live":true}
[2026-03-30T12:00:45.100Z] [INFO ] [Planner] stdout {"preview":"Estado actual: TASK_ACCEPTED publicado..."}
[2026-03-30T12:00:45.200Z] [INFO ] Dispatch OK {"agentName":"Planner","taskId":"aiw-planner-...","dryRun":false}
```

---

## Prompt de intake que recibe el agente

El dispatcher construye automáticamente este mensaje a partir del evento MCP:

```
Revisá shared_context.jsonl: te fue asignada una tarea nueva.

taskId:        aiw-planner-agentmonitor-v2-plan-20260330-01
correlationId: aiw-agentmonitor-v2-20260330
assignedTo:    Planner
status:        TASK_ASSIGNED
timestamp:     2026-03-30T12:00:00.000Z

Descripción:
Crear plan de rework completo para AgentMonitor V2.

dependsOn: (ninguno)

Criterios de aceptación:
  - Plan con fases y dependencias definidas
  - Acceptance criteria por tarea
  - Skills disponibles especificadas

Acción requerida:
1. Leé profile.md, learnings.md y skills de tu directorio.
2. Publicá TASK_ACCEPTED en shared_context.jsonl.
3. Resumí en máximo 5 pasos qué harás.
4. Publicá TASK_IN_PROGRESS y comenzá.
```

---

## Patrón de producción recomendado

```bash
# 1. Iniciar MCP Server
node AI_Workspace/MCP_Server/monitor-server.js

# 2. Iniciar una sesión OpenCode por agente (o dejar que el dispatcher cree runs nuevos)
opencode  # en terminal separada para cada agente — anotá el session ID en el config

# 3. Iniciar el dispatcher en background (live)
node AI_Workspace/scripts/opencode-task-dispatcher.mjs \
  --live \
  --config AI_Workspace/scripts/opencode-dispatch.config.json \
  --log AI_Workspace/.runtime/opencode-task-dispatcher.log

# 4. El Orchestrator emite TASK_ASSIGNED → el dispatcher lo detecta y dispara
```

**En Windows con PowerShell:**
```powershell
Start-Process node -ArgumentList "AI_Workspace/scripts/opencode-task-dispatcher.mjs","--live","--config","AI_Workspace/scripts/opencode-dispatch.config.json" -NoNewWindow -RedirectStandardOutput "AI_Workspace/.runtime/dispatcher.log"
```

---

## `.gitignore` recomendado

```gitignore
# Dispatcher runtime
AI_Workspace/.runtime/
AI_Workspace/scripts/opencode-dispatch.config.json
```

El config real no va al repo (puede tener session IDs). El ejemplo sí va.

---

## Limitaciones conocidas

- **Una sola instancia:** no hay locking entre múltiples instancias del dispatcher. Corré solo una.
- **Si la sesión muere:** el dispatcher cae al fallback de fresh run. Actualizá el `sessions` en el config con el nuevo ID.
- **Dispatch con reconciliacion:** si OpenCode falla o timeout, el dispatcher reconcilia primero contra evidencia MCP (`TASK_ACCEPTED`/`TASK_IN_PROGRESS`/`TASK_COMPLETED`/`TEST_PASSED`) antes de marcar error definitivo y programar retry.
- **No hay queue ordering estricto:** si llegan 3 `TASK_ASSIGNED` en el mismo poll, se despachan en orden de aparición en el JSONL, de forma secuencial. No hay paralelismo intencional para evitar conflictos de sesión.
- **El agente decide:** el dispatcher solo dispara el intake. El agente sigue sus propias reglas de `profile.md` y `learnings.md` una vez que arranca.
