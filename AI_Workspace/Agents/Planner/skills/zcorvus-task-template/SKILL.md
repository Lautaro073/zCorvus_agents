---
name: zcorvus-task-template
description: "Template exacto para cada tarea propuesta en un plan zCorvus. Usar siempre al redactar tareas individuales. Incluye el formato de taskId, campos obligatorios y ejemplos de ACs correctos e incorrectos."
---

# zCorvus Task Template

Cada tarea propuesta en un plan debe seguir exactamente este formato.
Campos faltantes = tarea inválida para el dispatcher.

---

## Template completo

```markdown
#### `aiw-<agente-lowercase>-<descripcion-slug>-<YYYYMMDD>-<seq>`
- **assignedTo:** `<NombreDelAgente>`
- **correlationId:** `aiw-<epic-slug>-<YYYYMMDD>`
- **dependsOn:** [`aiw-otra-tarea-YYYYMMDD-01`] ← o `[]` si no tiene dependencias
- **description:** Una sola responsabilidad, sin ambigüedad. Qué hace esta tarea y qué produce.
- **skillsRecommended:** `skill-uno`, `skill-dos` ← skills del agente asignado, verificar que existen
- **artefactos esperados:**
  - `ruta/exacta/al/archivo.ts` — descripción de qué contiene
  - `docs/api/nombre-contrato.md` — descripción
- **acceptanceCriteria:**
  - AC específico con mecanismo nombrado (no vago)
  - AC específico con valor o comportamiento verificable
  - AC específico que cubre el caso borde o race condition si aplica
```

---

## Ejemplo correcto — tarea de Backend

```markdown
#### `aiw-backend-preferences-api-20260404-01`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** []
- **description:** Crear route handler POST y GET /api/preferences en Next.js para persistir
  y leer preferencias visuales del usuario (theme, iconSet, layer). Este endpoint es el que
  AppearanceSync ya intenta llamar pero no encuentra.
- **skillsRecommended:** `api-reference-documentation`, `sql-optimization-patterns`
- **artefactos esperados:**
  - `Frontend/src/app/api/preferences/route.ts` — route handler Next.js
  - `docs/api/preferences-contract.md` — schema de request/response y spec de cookie
- **acceptanceCriteria:**
  - POST /api/preferences acepta `{ theme, iconSet, layer }` y setea cookie `user_prefs`
  - Cookie spec: HttpOnly:false, SameSite:Lax, Secure:true (producción), Max-Age:31536000, Path:/
  - GET /api/preferences devuelve las preferencias actuales desde la cookie
  - El endpoint es backward-compatible con getServerPreferences() que ya lee user_prefs
  - Schema documentado en docs/api/preferences-contract.md con request/response y atributos de cookie
```

---

## Ejemplo correcto — tarea de Frontend con dependencia

```markdown
#### `aiw-frontend-theme-bootstrap-20260404-02`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-theme-contract-20260404-01`]
- **description:** Endurecer el bootstrap inicial del tema en layout, store y DOM para que
  arranquen alineados incluso en hard refresh, navegación directa o retorno desde Stripe.
- **skillsRecommended:** `design-guide`, `frontend-design`, `accessibility`
- **artefactos esperados:**
  - `Frontend/src/store/ui/view/view.initial.ts` — tema inicial dinámico, no hardcodeado
  - `Frontend/src/app/[locale]/layout.tsx` — validado sin FOUC
- **acceptanceCriteria:**
  - El valor theme:"light" hardcodeado en view.initial.ts es eliminado o reemplazado por lectura dinámica
  - El tema inicial visible coincide con la cookie user_prefs en hard refresh
  - No hay flash a claro cuando la preferencia real era dark
  - Fallback sin cookie válida: tema inicial es "dark", nunca "light"
  - Validado en: hard refresh /[locale], navegación directa por URL, retorno desde redirect externo
```

---

## Ejemplo correcto — tarea paralela

```markdown
#### `aiw-frontend-home-icons-20260404-05`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-theme-bootstrap-20260404-02`]
  ← NOTA: independiente de aiw-frontend-premium-return-20260404-03.
     Puede correr en paralelo con esa tarea una vez completada la 02.
- **description:** Mejorar jerarquía visual, sistema de títulos y ritmo en home e icons.
...
```

---

## Ejemplos de ACs inválidos vs válidos

| ❌ Inválido | ✅ Válido |
|---|---|
| "Bootstrap mejorado" | "El valor theme:'light' hardcodeado en view.initial.ts es eliminado" |
| "El flujo premium funciona" | "El usuario que sale en dark vuelve en dark a /[locale]/premium/success" |
| "Cookie correctamente configurada" | "Cookie user_prefs: HttpOnly:false, SameSite:Lax, Secure:true, Max-Age:31536000" |
| "El retorno no depende del estado en memoria" | "El tema se preserva vía cookie user_prefs leída en SSR por getServerPreferences()" |
| "UI responsive" | "Grid colapsa a 2 columnas en <1280px y a 1 columna en <768px sin overflow horizontal" |
| "Stripe funciona" | "La redirect_url de Stripe incluye el locale: /<locale>/premium/success (no /premium/success)" |
| "Race condition resuelta" | "El tema se aplica antes de refreshSession(); la página no muestra estado sin tema mientras espera el token" |

---

## Campos requeridos vs opcionales

| Campo | Requerido | Notas |
|---|---|---|
| `taskId` | ✅ | Formato `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>` |
| `assignedTo` | ✅ | Nombre exacto del agente |
| `correlationId` | ✅ | Mismo en todas las tareas de la EPIC |
| `dependsOn` | ✅ | `[]` si no tiene dependencias. Nunca omitir. |
| `description` | ✅ | Una responsabilidad. Sin ambigüedad. |
| `acceptanceCriteria` | ✅ | Mínimo 2, ideal 3-5. Todos verificables. |
| `skillsRecommended` | ✅ | Al menos una. Verificar que existe en el agente. |
| `artefactos esperados` | Recomendado | Obligatorio si la tarea produce archivos |
| `parentTaskId` | Opcional | Solo si la tarea es subtarea de otra |

---

## Cómo generar el taskId

```
Agente asignado: Frontend
Descripción: Contrato de tema y preferencias
Fecha del plan: 2026-04-04
Secuencia: primera tarea de Frontend

→ aiw-frontend-theme-contract-20260404-01
```

```
Agente asignado: AI_Workspace_Optimizer
Descripción: Regresión de performance
Fecha del plan: 2026-04-04
Secuencia: novena tarea del plan

→ aiw-optimizer-perf-regression-20260404-09
```

**Regla del agente en el taskId:** usar el nombre del agente en minúsculas y sin espacios.
- `AI_Workspace_Optimizer` → `optimizer` o `ai_workspace_optimizer`
- `Documenter` → `documenter`
- `Tester` → `tester`