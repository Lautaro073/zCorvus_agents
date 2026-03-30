# Runbook Operativo — AgentMonitor v4 (Pixel Experience)

## Metadata
- **RunbookId:** `aiw-documenter-pixel-v4-runbook-20260327-01`
- **Fecha:** 2026-03-27
- **Owner:** `Documenter`
- **CorrelationId:** `aiw-agentmonitor-pixel-experience-20260326`
- **ParentEpic:** `aiw-epic-agentmonitor-pixel-experience-plan-20260326`

---

## 1. Introduccion

Este runbook cubre la operacion, despliegue y troubleshooting del AgentMonitor v4 (Pixel Experience), la interfaz de observabilidad del AI_Workspace basada en Vanilla JS con WebSocket en tiempo real.

El AgentMonitor consume eventos del MCP Server (`MCP_Server/shared_context.jsonl`) via REST API y WebSocket, y los presenta en una interfaz operativa enfocada en triage, seguimiento de tareas y deteccion de incidentes.

---

## 2. Pre-requisitos

### 2.1 Software necesario
- Node.js 18+ (para MCP Server)
- npm 9+
- Navegador moderno (Chrome 110+, Firefox 110+, Safari 15+, Edge 110+)

### 2.2 Dependencias de frontend (CDN)
El monitor usa los siguientes CDN automaticamente cargados desde `index.html`:
- Modern Normalize 2.0.0
- Open Props 1.7.9
- Tabler Icons 3.34.1
- Highlight.js 11.11.1
- Marked 12.0+
- DOMPurify 3.1.7

---

## 3. Instalacion y configuracion

### 3.1 Iniciar MCP Server (Backend de eventos)

```bash
cd AI_Workspace/MCP_Server
npm install
npm start
```

El servidor iniciara en:
- **HTTP:** `http://localhost:4311`
- **WebSocket:** `ws://localhost:4311/ws`
- **API Events:** `http://localhost:4311/api/events`

### 3.2 Iniciar AgentMonitor (Frontend)

**Opcion A - Desarrollo con live reload:**
```bash
cd AI_Workspace/AgentMonitor
npx serve .
# O usando Python si esta disponible:
python -m http.server 3000
```

**Opcion B - Build estatico:**
El AgentMonitor es standalone; puedes servirlo con cualquier servidor estatico:
```bash
npx serve AgentMonitor
```

### 3.3 Configurar URL del MCP Server

El monitor busca el MCP en `ws://localhost:4311/ws` por defecto. Para cambiar la URL:

1. Editar `AI_Workspace/AgentMonitor/app.js`
2. Buscar la constante `WS_URL` o conexion WebSocket
3. Reemplazar con tu endpoint:
   ```javascript
   const WS_URL = "ws://tu-servidor:4311/ws";
   ```

Para un servidor remoto:
   ```javascript
   const WS_URL = "wss://tu-dominio.com/ws";
   ```

---

## 4. Verificacion de salud (Sanity Checklist)

Ejecuta este checklist antes de operar el monitor:

| Paso | Verificacion | Esperado |
|------|---------------|----------|
| 1 | MCP Server respondiendo | `curl http://localhost:4311/api/events?limit=1` retorna JSON |
| 2 | WebSocket conectando | Badge en UI muestra "En vivo" (verde) |
| 3 | Eventos fluyendo | Timeline muestra eventos en tiempo real |
| 4 | Filtros funcionales | Seleccionar agente/estado filtra correctamente |
| 5 | Detalle abre | Click en evento/tarea abre el drawer de detalle |
| 6 | Exportes funcionan | "Exportar JSON" descarga archivo valido |

### Diagnostico de problemas

**Problema: Badge muestra "Sin enlace" o "Reconectando"**
1. Verificar que MCP Server este corriendo: `curl http://localhost:4311/api/events`
2. Verificar WebSocket: `wscat -c ws://localhost:4311/ws`
3. Revisar consola del navegador (F12) para errores de red

**Problema: No hay eventos en timeline**
1. Verificar `shared_context.jsonl` tiene datos: `tail -5 MCP_Server/shared_context.jsonl`
2. Refrescar con boton "Actualizar ahora" o `R`
3. Ver filtros activos (barra de filtros activos visible?)

---

## 5. Operacion diaria

### 5.1 Navegacion por atajos de teclado

| Atajo | Accion |
|-------|--------|
| `/` | Foco en campo de busqueda de tarea |
| `R` | Forzar refresh de eventos |
| `F` | Abrir/cerrar panel de filtros |
| `M` | Toggle sonido (silenciar notificaciones) |
| `1` | Ejecutar accion rapida 1 (btn activo) |
| `2` | Ejecutar accion rapida 2 |
| `3` | Ejecutar accion rapida 3 |
| `Esc` | Cerrar drawer de detalle |

### 5.2 Filtros rapidos

- **"Solo bloqueadas":** Muestra solo `TASK_BLOCKED`
- **"En progreso":** Muestra tareas con estado `in_progress`
- **"Ultima hora":** Filtra eventos desde `now - 1h`

### 5.3 Interpretacion de estados de tarea

| Estado | Color | Significado |
|--------|-------|--------------|
| Asignada | Azul | Nueva tarea asignada a un agente |
| Aceptada | Azul claro | Agente acepto la tarea |
| En progreso | Amarillo | Trabajo activo en la tarea |
| Bloqueada | Rojo | Tarea bloqueada, requiere atencion |
| Completada | Verde | Tarea finalizada exitosamente |
| Fallida | Rojo oscuro | Tarea fallida o tests fallando |
| Cancelada | Gris | Tarea cancelada |

---

## 6. Despliegue en produccion

### 6.1 Build estatico

Copiar los archivos del AgentMonitor a un servidor estatico:
```bash
cp -r AgentMonitor /var/www/agentmonitor
# Configurar nginx para servir en /agentmonitor
```

### 6.2 Configuracion de produccion

1. **HTTPS obligatorio:** El WebSocket debe usar `wss://` en produccion
2. **CORS:** Si el monitor esta en dominio diferente, configurar headers CORS en MCP Server
3. **CDN:** Para mayor rendimiento, precargar los CDN en el servidor de origen

### 6.3 Checklist de despliegue

- [ ] MCP Server corriendo y expuesto en red
- [ ] WebSocket accesible desde navegador cliente
- [ ] Certificados SSL validos (si `wss://`)
- [ ] Test desde navegador limpio (sin cache)
- [ ] Notificaciones sonoreanas funcionan
- [ ] Export de JSON funcional

---

## 7. Troubleshooting avanzado

### 7.1 Error: "Too many events, timeline slow"

**Sintoma:** El timeline tiene miles de eventos y la UI se vuelve lenta.

**Solucion:**
1. Reducir limite de eventos en filtros (por defecto 200)
2. Usar filtro "Ultima hora" para reducir volumen
3. Aplicar filtro por agente especifico
4. Refrescar la pagina (limpia cache de render)

### 7.2 Error: "WebSocket reconnecting continuously"

**Sintoma:** Badge muestra "Reconectando" constantemente.

**Solucion:**
1. Verificar estabilidad de red del servidor
2. Revisar logs del MCP Server: `node index.js` muestra conexiones
3. Aumentar intervalo de reconnect en `app.js` si hay congestion

### 7.3 Error: "Overflow en agente con muchas tareas"

**Sintoma:** Tarjetas de agente con scroll interno que desborde.

**Solucion:**
- Este issue fue corregido en versi.on v4 con `overflow-guardrails`
- Verificar que el CSS tenga `overflow-y: auto` en `.agent-card`

### 7.4 Debugging desde navegador

1. Abrir Developer Tools (F12)
2. Pestana **Console**: Buscar errores rojos
3. Pestana **Network**: Filtrar por `ws://` para ver trafico WebSocket
4. Pestana **Network**: Filtrar por `/api/events` para ver polling REST

---

## 8. Integracion con MCP

### 8.1 Flujo de eventos

```
Agente -> MCP Server (publish) -> WebSocket -> AgentMonitor (render)
                                  -> REST API -> AgentMonitor (polling)
```

### 8.2 Tipos de eventos soportados

| Tipo | Representacion en UI |
|------|---------------------|
| TASK_ASSIGNED | Tarjeta tarea nueva (azul) |
| TASK_ACCEPTED | Badge "Aceptada" en tarea |
| TASK_IN_PROGRESS | Badge "En progreso" amarillo |
| TASK_BLOCKED | Alerta critica (rojo) |
| TASK_COMPLETED | Badge "Completada" verde |
| TEST_FAILED | Incidente en alertas criticas |
| DOC_UPDATED | Notificacion toast |
| GITHUB_* | Badge en detalle de tarea |

---

## 9. Contacto y soporte

- **Owner de este runbook:** Documenter
- **Parent Epic:** `aiw-epic-agentmonitor-pixel-experience-plan-20260326`
- **CorrelationId:** `aiw-agentmonitor-pixel-experience-20260326`

Para reportar errores de documentacion o pedir actualizaciones, usar GitHub Issues con la etiqueta `agentmonitor`.

---

## 10. Registro documental

| Campo | Valor |
|-------|-------|
| RunbookId | `aiw-documenter-pixel-v4-runbook-20260327-01` |
| docType | `runbook` |
| featureSlug | `agentmonitor` |
| path | `docs/internal/reports/aiw-agentmonitor-pixel-v4-runbook-20260327.md` |
| status | `approved` |
| sourceTaskId | `aiw-documenter-pixel-v4-runbook-20260327-01` |
| correlationId | `aiw-agentmonitor-pixel-experience-20260326` |
| ownedBy | `Documenter` |
| updatedAt | `2026-03-27T00:00:00Z` |