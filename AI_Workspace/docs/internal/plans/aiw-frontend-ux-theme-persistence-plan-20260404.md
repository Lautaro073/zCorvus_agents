# Frontend UX + Theme Persistence Plan — v2

**taskId:** `aiw-planner-frontend-ux-theme-persistence-plan-20260404-01`
**correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
**branch:** `feature/frontend-ux-theme-persistence`
**estado:** `PLAN_PROPOSED`
**documentRevision:** `2`
**revisionNotes:** `Corrige el plan inicial manteniendo el taskId original de planning para preservar la trazabilidad MCP.`

---

## Análisis crítico del plan v1 (correcciones aplicadas)

### ❌ Error 1 — las subtareas no siguen el formato zCorvus (CRÍTICO)

El plan v1 usó IDs cortos como `frontend-ux-theme-contract-01` para las subtareas. El formato obligatorio es:

```
aiw-<agente>-<descripción-corta>-<fecha>-<secuencia>
```

IDs cortos rompen la trazabilidad MCP: el dispatcher no puede matchear estos IDs con eventos `TASK_ASSIGNED` en `shared_context.jsonl`. **Corregidos en todas las subtareas.**

**Nota importante:** el `taskId` del documento y del `PLAN_PROPOSED` debe seguir siendo el de la task de planning original asignada a Planner. Las revisiones del plan no deben inventar un nuevo `taskId` de planning.

### ❌ Error 2 — Ninguna tarea incluía `correlationId`

Requerido por el contrato de eventos. **Agregado en todas las tareas.**

### ❌ Error 3 — `/api/preferences` no existe y nadie lo crea

El plan v1 identificó que `AppearanceSync` llama a un endpoint inexistente, pero solo pedía una "decisión técnica" en task-01 (Frontend). El route handler es un artefacto de servidor — es responsabilidad de **Backend**. Si Frontend arranca sin ese endpoint, queda bloqueada en task-02.

**Corrección:** nueva tarea `aiw-backend-preferences-api-20260404-01` asignada a Backend, que desbloquea a Frontend.

### ❌ Error 4 — Stripe redirect_url no preserva locale

Las rutas premium están en `/[locale]/premium/success|cancel`. Si Stripe redirige a `/premium/success` sin el locale, el layout de Next.js no matchea la ruta y rompe. No estaba mencionado en ninguna tarea.

**Corrección:** agregado como AC explícito en `aiw-frontend-premium-return-20260404-03`.

### ❌ Error 5 — Cookie spec no definida

`AppearanceSync` intenta leer/escribir `user_prefs`. Si esa cookie tiene `HttpOnly: true`, el cliente JS no puede accederla. El plan v1 pedía "documentar la fuente de verdad" pero sin especificar atributos de la cookie.

**Corrección:** AC de `aiw-backend-preferences-api-20260404-01` incluye spec completa de cookie (SameSite, Secure, HttpOnly, expiry) y deja `HttpOnly` condicionado al mecanismo real.

### ❌ Error 6 — Fases 2 y 3 tratadas como secuenciales siendo paralelas

`aiw-frontend-premium-surface-20260404-04` depende de `...-03`.
`aiw-frontend-home-icons-20260404-05` depende de `...-02`.
Son independientes entre sí → pueden correr en paralelo.
El plan v1 las serializaba innecesariamente en el orden recomendado.

**Corrección:** el grafo de dependencias y el orden recomendado ahora reflejan la ejecución paralela posible.

### ❌ Error 7 — Mecanismo de persistencia en retorno Stripe no especificado

El AC de task-03 decía "el retorno no depende del estado en memoria" sin definir el mecanismo. Frontend podría resolverlo con cookie, sessionStorage o URL param de forma incompatible con el contrato.

**Corrección:** AC de `...-03` especifica el mecanismo: cookie `user_prefs` leída en SSR, establecida por el route handler de Backend.

### ❌ Error 8 — `theme: "light"` hardcodeado en `view.initial.ts` no era un AC explícito

Ese valor es el root cause del flash a claro. Estaba implícito en task-02 pero no era verificable.

**Corrección:** AC de `aiw-frontend-theme-bootstrap-20260404-02` lo menciona explícitamente.

### ❌ Error 9 — Race condition `refreshSession()` + theme restore sin AC

El plan lo mencionaba como riesgo pero ninguna tarea tenía un criterio de aceptación para eso.

**Corrección:** agregado como AC explícito en `...-03`.

### ❌ Error 10/11/12/13 — 4 skills de Frontend faltantes en tareas visuales

`motion-designer`, `apple-ui-skills`, `svg-animation-engineer` y `dramatic-2000ms-plus` no estaban referenciadas en ninguna tarea, pese a ser críticas para las superficies premium y home.

**Corrección v2:** se revisa el fit real por skill. `svg-animation-engineer` queda como opcional y el resto no se recomienda por defecto porque no calza con este producto o este medio.

### ❌ Error 14 — Tarea de Backend faltante

No había tarea para crear el route handler. **Nueva tarea agregada.**

### 💡 Sugerencias incorporadas

- **Performance gate**: nueva tarea `aiw-optimizer-frontend-perf-regression-20260404-09` para validar que los cambios visuales no regresen Core Web Vitals vs `frontend-performance-baseline.md`.
- **Rollback operativo**: estrategia de rollback granular documentada para separar persistencia de refresh visual.

---

## Skills disponibles por agente en esta iniciativa

### Frontend
| Skill | Tareas donde aplica |
|---|---|
| `design-guide` | 01, 02, 05, 06 — tokens, jerarquía, ritmo |
| `frontend-design` | 02, 03, 05 — claridad de jerarquía, responsive |
| `shadcn` | 01, 04, 06 — composición de componentes |
| `accessibility` | 02, 03, 04, 05, 06 — foco, contraste, teclado |
| `elevated-design` | 04 — tono premium |
| `svg-animation-engineer` | opcional en 04 — solo si se justifica un icono custom en SVG sin aumentar complejidad innecesaria |

**Skills no recomendadas por defecto en esta iniciativa:**
- `motion-designer`: orientada a video specs/remotion; demasiado pesada para este scope de web UI.
- `apple-ui-skills`: empuja light mode + Inter + grid Apple, lo que no calza con el lenguaje actual del producto.
- `dramatic-2000ms-plus`: util solo para momentos cinematicos excepcionales; no se recomienda como baseline de UX web aqui.

### Backend
| Skill | Tareas donde aplica |
|---|---|
| `nodejs-backend-patterns` | BE-01 — route handler, request/response y manejo de cookies |
| `nodejs-best-practices` | BE-01 — validacion y estructura del handler |

### Tester
| Skill | Tareas donde aplica |
|---|---|
| `playwright-testing` | 07 — E2E regression |
| `systematic-debugging` | 07 — validación hard refresh y redirect |

### AI_Workspace_Optimizer
| Skill | Tareas donde aplica |
|---|---|
| `distributed-tracing` | 09 — análisis de Core Web Vitals |

---

## Tareas — Plan Completo Corregido

---

### FASE 0 — Backend (desbloquea todo lo demás)

#### `aiw-backend-preferences-api-20260404-01`
- **assignedTo:** `Backend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** `[]`
- **description:** Crear el route handler `POST /api/preferences` (y `GET /api/preferences` si se necesita) en Next.js para persistir y leer las preferencias visuales del usuario (`theme`, `iconSet`, `layer`). Este endpoint es el que `AppearanceSync` ya intenta llamar pero no encuentra. Definir y documentar la spec completa de la cookie `user_prefs`.
- **skillsRecommended:** `nodejs-backend-patterns`, `nodejs-best-practices`
- **artefactos esperados:**
  - `Frontend/src/app/api/preferences/route.ts`
  - `docs/api/preferences-contract.md` — schema de request/response + spec de cookie
- **acceptanceCriteria:**
  - `POST /api/preferences` acepta `{ theme, iconSet, layer }` y setea la cookie `user_prefs`.
  - `GET /api/preferences` devuelve las preferencias actuales desde la cookie.
  - Cookie spec definida y documentada:
    - `HttpOnly: true` por defecto si la lectura queda encapsulada en SSR + route handler; `false` solo si la implementacion final requiere lectura directa desde JS y queda justificada en la spec
    - `SameSite: Lax`
    - `Secure: true` en producción
    - `Max-Age: 31536000` (1 año) o equivalente configurable
    - `Path: /`
  - El endpoint es backward-compatible con `getServerPreferences()` que ya lee `user_prefs`.
  - Schema documentado en `docs/api/preferences-contract.md`.
  - `AppearanceSync` puede llamar al endpoint y recibir 200 con el payload correcto.

---

### FASE 1 — Foundation de persistencia y contrato visual

#### `aiw-frontend-theme-contract-20260404-01`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-backend-preferences-api-20260404-01`]
- **description:** Corregir `AppearanceSync` para que use el route handler real de Backend. Definir y documentar el orden de sincronización de preferencias: SSR (cookie) → store hydration → client sync. Eliminar la ambigüedad actual donde `AppearanceSync` llama a un endpoint que no existía.
- **skillsRecommended:** `shadcn`, `design-guide`
- **artefactos esperados:**
  - `Frontend/src/components/controllers/AppearanceSync.tsx` — corregido
  - `docs/internal/specs/frontend-theme-persistence-contract.md`
- **acceptanceCriteria:**
  - `AppearanceSync` llama a `POST /api/preferences` (el route handler real) y recibe 200.
  - Documentado el orden canónico: `getServerPreferences()` (SSR) → store hydration → `AppearanceSync` (client sync).
  - Casos sin cookie válida tienen fallback explícito al default oficial del producto; no a un hardcode accidental del store.
  - La solución no introduce un round-trip extra que cause FOUC en SSR.
  - `docs/internal/specs/frontend-theme-persistence-contract.md` publicado con el orden de prioridad y los atributos de cookie usados.

#### `aiw-frontend-theme-bootstrap-20260404-02`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-theme-contract-20260404-01`]
- **description:** Endurecer el bootstrap inicial del tema en layout, store y DOM para que arranquen alineados incluso en hard refresh, navegación directa o retorno desde Stripe.
- **skillsRecommended:** `design-guide`, `frontend-design`, `accessibility`
- **artefactos esperados:**
  - `Frontend/src/store/ui/view/view.initial.ts` — `theme` inicial dinámico desde cookie o default oficial del producto (sin hardcode accidental)
  - `Frontend/src/app/[locale]/layout.tsx` — validado sin FOUC
- **acceptanceCriteria:**
  - El valor `theme: "light"` hardcodeado en `view.initial.ts` es eliminado o reemplazado por lectura dinámica de preferencia persistida.
  - El tema inicial visible coincide con la preferencia en cookie en hard refresh.
  - No hay flash a claro cuando la preferencia real era dark.
  - El store cliente hidrata sin sobrescribir un valor correcto del servidor.
  - Fallback explícito: si no hay cookie, el tema inicial coincide con el default oficial del producto documentado.
  - Validado en: hard refresh `/[locale]`, navegación directa por URL, retorno desde external redirect.

---

### FASE 2 y 3 — Paralelas (pueden ejecutarse simultáneamente)

> **Nota de coordinación para Orchestrator:** `aiw-frontend-premium-return-20260404-03` y `aiw-frontend-home-icons-20260404-05` son independientes entre sí. Pueden asignarse simultáneamente una vez que `aiw-frontend-theme-bootstrap-20260404-02` esté completada.

#### `aiw-frontend-premium-return-20260404-03`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-theme-contract-20260404-01`, `aiw-frontend-theme-bootstrap-20260404-02`]
- **description:** Blindar el retorno post-pasarela premium para preservar apariencia al volver desde un full redirect externo. El usuario sale en dark, Stripe procesa, el usuario vuelve a `/[locale]/premium/success|cancel` y debe ver dark — sin depender del estado en memoria del store.
- **skillsRecommended:** `frontend-design`, `accessibility`
- **acceptanceCriteria:**
  - **Mecanismo explícito:** el tema se preserva vía cookie `user_prefs` leída en SSR por `getServerPreferences()` al renderizar `/premium/success` y `/premium/cancel`. No depende de sessionStorage ni estado en memoria.
  - El usuario que sale en dark vuelve en dark a `/premium/success` y `/premium/cancel`.
  - Las URLs de redirect de Stripe incluyen el locale: `/<locale>/premium/success` y `/<locale>/premium/cancel` (no `/premium/success` sin locale).
  - El flujo cubre: hard refresh en success/cancel, direct open por URL, retry tras cancel.
  - La race condition `refreshSession()` + theme restore está resuelta: el tema se aplica antes del token refresh, no después. Específicamente: si `refreshSession()` tarda, la página no muestra un estado visual sin tema mientras espera.
  - Los cambios no degradan `refreshSession()` ni la obtención del token premium.

#### `aiw-frontend-home-icons-20260404-05`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-theme-bootstrap-20260404-02`]
- **description:** Mejorar jerarquía visual, sistema de títulos y ritmo en `home` e `icons`, con reglas más claras de contraste, apoyo visual y escaneabilidad. Mantener el carácter tipográfico actual.
- **skillsRecommended:** `design-guide`, `frontend-design`, `accessibility`
- **acceptanceCriteria:**
  - Home e icons comparten un sistema de títulos/subtítulos con reglas claras (escala tipográfica, peso, espaciado).
  - El uso de `muted`/`foreground` define claramente primario vs secundario.
  - Los bloques de categorías y links principales mejoran escaneabilidad: jerarquía visible en <2s de lectura.
  - Si se agregan transiciones de entrada, deben ser sutiles, performantes y limitarse al montaje inicial de la página.
  - Compatible responsive: mobile, tablet y desktop sin overflow horizontal.
  - `viewTransitionName` y navegación localizada no se rompen.
  - Foco visible y navegación por teclado preservadas.

#### `aiw-frontend-premium-surface-20260404-04`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-premium-return-20260404-03`]
- **description:** Rediseñar las superficies premium (`/premium`, `/premium/success`, `/premium/cancel`) con una dirección visual intencional y premium. El flujo premium es el momento de mayor peso emocional de la app — debe sentirse diferente del resto.
- **skillsRecommended:** `elevated-design`, `frontend-design`, `shadcn`, `accessibility`
- **skillsOptional:** `svg-animation-engineer`
- **artefactos esperados:**
  - `Frontend/src/app/[locale]/premium/page.tsx` — rediseñado
  - `Frontend/src/app/[locale]/premium/success/page.tsx` — rediseñado
  - `Frontend/src/app/[locale]/premium/cancel/page.tsx` — rediseñado
- **acceptanceCriteria:**
  - `/premium` deja de sentirse como pricing grid genérico: jerarquía visual deliberada, CTA principal claro.
  - `/premium/success`: puede incorporar una celebración inicial sutil o un icono animado si se justifica con el lenguaje del producto y no introduce dependencias nuevas ni regresión de performance.
  - `/premium/cancel`: lenguaje visual consistente con `/premium/success`, pero con tono distinto (recuperación, no celebración). La microinteracción debe apoyarse preferentemente en motion ya disponible en el proyecto.
  - Las acciones principales y secundarias son claras en las 3 páginas.
  - UI legible en mobile y desktop.
  - Foco visible, navegación por teclado, contraste WCAG AA.
  - No se introducen dependencias de librerías nuevas sin coordinación con Orchestrator.

---

### FASE 4 — Hardening de componentes compartidos

#### `aiw-frontend-shared-ui-hardening-20260404-06`
- **assignedTo:** `Frontend`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-home-icons-20260404-05`, `aiw-frontend-premium-surface-20260404-04`]
- **description:** Endurecer componentes y patrones compartidos afectados por la iniciativa para que la mejora no quede solo en páginas aisladas: botones, badges, cards, encabezados, superficies muted.
- **skillsRecommended:** `shadcn`, `design-guide`, `accessibility`
- **acceptanceCriteria:**
  - Los componentes compartidos usan tokens semánticos y variantes consistentes.
  - Los estados hover/focus/disabled son explícitos y accesibles en dark y light.
  - No se introducen overrides `dark:` innecesarios donde bastan tokens semánticos.
  - Consistencia visual centralizada en piezas reutilizables, no en parches por página.
  - Ningún componente compartido regresa al aspecto anterior de home, icons o premium.

---

### FASE 5 — Performance gate

#### `aiw-optimizer-frontend-perf-regression-20260404-09`
- **assignedTo:** `AI_Workspace_Optimizer`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-premium-surface-20260404-04`, `aiw-frontend-home-icons-20260404-05`, `aiw-frontend-shared-ui-hardening-20260404-06`]
- **description:** Validar que los cambios visuales de las Fases 2/3/4 no regresen Core Web Vitals ni bundle size vs el baseline documentado en `frontend-performance-baseline.md`. Particularmente: las animaciones de premium/success con framer-motion + SVG, y el stagger de home/icons.
- **skillsRecommended:** `distributed-tracing`
- **herramientas:**
  ```bash
  npx lighthouse http://localhost:3000/<locale> --view
  npx lighthouse http://localhost:3000/<locale>/premium/success --view
  # Bundle analysis
  npm run build && npx @next/bundle-analyzer
  ```
- **artefactos esperados:**
  - `docs/internal/reports/aiw-optimizer-frontend-perf-regression-20260404.md`
- **acceptanceCriteria:**
  - LCP en home e `/premium/success` no regresa >20% vs baseline.
  - CLS es 0 o menor en todas las rutas afectadas (las animaciones no causan layout shift).
  - Bundle size de las rutas afectadas no aumenta >50KB gzipped vs baseline.
  - Si alguna métrica regresa, publicar lista priorizada P1/P2/P3 con causa y fix recomendado antes de pasar a QA.

---

### FASE 6 — QA y documentación

#### `aiw-tester-frontend-theme-regression-20260404-07`
- **assignedTo:** `Tester`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-frontend-premium-return-20260404-03`, `aiw-frontend-home-icons-20260404-05`, `aiw-frontend-shared-ui-hardening-20260404-06`, `aiw-optimizer-frontend-perf-regression-20260404-09`]
- **description:** Crear verificación reproducible del flujo de tema y premium return en desktop y mobile. Cubre: hard refresh, cancel y success con tema preservado.
- **skillsRecommended:** `playwright-testing`, `systematic-debugging`
- **artefactos esperados:**
  ```
  tests/e2e/
    theme-persistence.spec.ts    — alternar tema, hard refresh, verificar persistencia
    premium-flow.spec.ts         — dark → Stripe → success/cancel → dark
  ```
- **acceptanceCriteria:**
  - Smoke E2E: alternar tema → hard refresh → tema persiste (en `/[locale]`, `/[locale]/icons`, `/[locale]/premium`).
  - Flujo premium simulado: tema dark establecido → `/premium/success` → tema sigue dark.
  - Flujo cancel: tema dark → `/premium/cancel` → tema sigue dark.
  - Hard refresh en `/[locale]/premium/success` y `/[locale]/premium/cancel` no causa flash a claro.
  - Tests pasan en Chromium. Firefox y WebKit como best-effort.
  - Resultados publicados con `TEST_PASSED` o `TEST_FAILED` con evidencia reproducible.

#### `aiw-documenter-frontend-doc-sync-20260404-08`
- **assignedTo:** `Documenter`
- **correlationId:** `aiw-frontend-ux-theme-persistence-20260404`
- **dependsOn:** [`aiw-tester-frontend-theme-regression-20260404-07`]
- **description:** Sincronizar documentación de comportamiento visual, persistencia de preferencias y riesgos conocidos del flujo premium.
- **skillsRecommended:** `api-reference-documentation`
- **artefactos esperados:**
  - `docs/internal/specs/frontend-theme-persistence-contract.md` — actualizado post-QA
  - `docs/internal/runbooks/premium-flow-runbook.md` — troubleshooting del flujo Stripe → success/cancel
  - Registry `docs/internal/registry/docs_registry.jsonl` — actualizado
- **acceptanceCriteria:**
  - Documentada la estrategia final de persistencia (orden: SSR cookie → store → client sync).
  - Notas operativas sobre premium success/cancel: locale en redirect URL, race condition `refreshSession()`.
  - Riesgos, rollback y evidencia de QA registrados.
  - Registry actualizado con todos los documentos tocados.
  - `DOC_UPDATED` emitido con `artifactPaths` de todos los archivos.

---

## Grafo de dependencias corregido

```
aiw-backend-preferences-api-20260404-01        (Backend — desbloquea todo)
  └─> aiw-frontend-theme-contract-20260404-01  (Frontend)
        └─> aiw-frontend-theme-bootstrap-20260404-02  (Frontend)
              ├─> aiw-frontend-premium-return-20260404-03  (Frontend)
              │     └─> aiw-frontend-premium-surface-20260404-04  (Frontend)  ─┐
              │                                                                  │
              └─> aiw-frontend-home-icons-20260404-05  (Frontend)  ─────────────┤
                                                                                 │
                                  aiw-frontend-shared-ui-hardening-20260404-06 ◄─┘
                                    (depende de 04 y 05)
                                            │
                                  aiw-optimizer-frontend-perf-regression-20260404-09
                                    (depende de 04, 05 y 06)
                                            │
                                  aiw-tester-frontend-theme-regression-20260404-07
                                    (depende de 03, 05, 06 y 09)
                                            │
                                  aiw-documenter-frontend-doc-sync-20260404-08
```

**Paralelismo posible:** una vez completado `...-02`, las tareas `...-03` y `...-05` pueden ejecutarse simultáneamente.

---

## Asignación por agente

| Agente | Tareas |
|---|---|
| **Backend** | `aiw-backend-preferences-api-20260404-01` |
| **Frontend** | `...-01` (theme contract), `...-02` (bootstrap), `...-03` (premium return), `...-04` (premium surface), `...-05` (home/icons), `...-06` (shared hardening) |
| **AI_Workspace_Optimizer** | `...-09` (performance regression) |
| **Tester** | `...-07` (regression E2E) |
| **Documenter** | `...-08` (doc sync) |

---

## Orden recomendado de implementación

```
1.  aiw-backend-preferences-api-20260404-01   ← Backend primero, desbloquea todo
2.  aiw-frontend-theme-contract-20260404-01
3.  aiw-frontend-theme-bootstrap-20260404-02
4a. aiw-frontend-premium-return-20260404-03   ← paralelo con 4b
4b. aiw-frontend-home-icons-20260404-05       ← paralelo con 4a
5.  aiw-frontend-premium-surface-20260404-04  ← depende de 4a
6.  aiw-frontend-shared-ui-hardening-20260404-06  ← depende de 5 y 4b
7.  aiw-optimizer-frontend-perf-regression-20260404-09
8.  aiw-tester-frontend-theme-regression-20260404-07
9.  aiw-documenter-frontend-doc-sync-20260404-08
```

---

## Riesgos y rollback (operativo)

### Riesgos identificados
| # | Riesgo | Mitigación |
|---|---|---|
| 1 | FOUC si el tema inicial no queda bien definido en bootstrap | task-02 tiene AC explícito de "no flash"; validado en hard refresh antes de avanzar |
| 2 | Race condition `refreshSession()` + theme restore en /premium/success | AC explícito en task-03; Tester lo cubre en task-07 |
| 3 | Stripe redirect sin locale rompe el layout de Next.js | AC explícito en task-03: las redirect URLs deben incluir `/<locale>/` |
| 4 | Motion o celebraciones en premium/success regresen LCP o CLS | task-09 (performance gate) antes de QA; cualquier motion debe ser sutil, medible y limitada al montaje inicial |
| 5 | Mejora visual fragmentada si se resuelve por página sin endurecer componentes compartidos | task-06 (shared hardening) es bloqueante de QA |
| 6 | Spec de cookie incompatible con el mecanismo real de lectura/escritura | task-BE-01 documenta `HttpOnly` según el mecanismo final y no por suposición |

### Rollback
- **Rollback de persistencia vs visual:** si las mejoras visuales causan regresiones, se puede hacer rollback del rediseño (tasks 04/05/06) manteniendo el fix de persistencia (tasks 01/02/03) — se implementan en PRs separados.
- **Rollback de route handler:** si el route handler de Backend rompe `getServerPreferences()`, revertir `aiw-backend-preferences-api-20260404-01` vuelve al estado anterior sin afectar la UI.
- **Feature flag recomendado:** tasks 04 y 05 (rediseño visual) deberían ir en un branch separado de tasks 01/02/03 (persistencia) para permitir rollback quirúrgico.

---

## Criterios de aprobación del plan v2

- [x] Todos los taskIds siguen el formato `aiw-<agente>-<desc>-<fecha>-<seq>`
- [x] Todas las tareas incluyen `correlationId`
- [x] Backend tiene tarea explícita para crear `/api/preferences` (desbloquea a Frontend)
- [x] Cookie spec completa en task de Backend (SameSite, HttpOnly, Secure, expiry)
- [x] Locale en Stripe redirect_url es AC explícito en task-03
- [x] Race condition `refreshSession()` + theme restore es AC explícito en task-03
- [x] `theme: "light"` hardcodeado en `view.initial.ts` es AC explícito en task-02
- [x] Paralelismo de tasks 03 y 05 reflejado en grafo y orden recomendado
- [x] Mapeo de skills refinado: se agregan solo las que tienen fit real con el producto y el medio; `svg-animation-engineer` queda opcional
- [x] Task de performance regression gate (task-09) antes de QA
- [x] Rollback granular documentado (persistencia separada de visual)
- [x] 9 tareas con agente, dependencias y ACs verificables
