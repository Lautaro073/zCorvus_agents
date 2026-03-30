# Plan técnico AgentMonitor — estrategia tecnológica y UX (2026-03-26)

## 1) Alcance y objetivo

**Workspace analizado:** `AI_Workspace`  
**Módulo foco:** `AgentMonitor` (UI de observabilidad)  
**Objetivo:** decidir si mantener vanilla o migrar a framework/librerías, con plan ejecutable para **Orchestrator + Observer** sin tocar lógica de negocio MCP.

---

## 2) Insumos revisados

### Código AgentMonitor
- `AgentMonitor/index.html`
- `AgentMonitor/styles.css`
- `AgentMonitor/app.js`

### Skills relevantes Frontend
- `Agents/Frontend/skills/design-guide/SKILL.md`
- `Agents/Frontend/skills/shadcn/SKILL.md`
- `Agents/Frontend/skills/pr-report/references/style-guide.md` (tomado como style-guide disponible)

---

## 3) Hallazgos UX/Layout actuales

### 3.1 Fortalezas actuales
- Arquitectura visual potente y consistente para operación en vivo (hero, panel lateral, timeline, tareas, drawer).
- Buen baseline de accesibilidad operativa: `skip-link`, `aria-live`, shortcuts globales, estados visuales de socket, badges semánticos.
- Experiencia de inspección rica (tabs Resumen/Historial/JSON y acciones contextuales).

### 3.2 Riesgos UX/layout detectados (incluye overflow)

1. **Riesgo de overflow horizontal en subtareas anidadas**  
   En `styles.css`, cada task anidada aplica sangría acumulada por profundidad:
   - `margin-left: calc(var(--task-depth, 0) * 18px);`
   Esto puede desbordar en árboles profundos (sobre todo móvil/tablet).

2. **Breakpoints tardíos para columnas rígidas en desktop intermedio**  
   Hay varias grillas con columna secundaria mínima fija (`320px`/`340px`) que sólo colapsan a 1 columna en `max-width: 1180px`. Entre 1180 y anchos cercanos, con contenido largo, hay riesgo de compresión severa y scroll lateral perceptual:
   - workspace principal con rail de `360px`
   - hero con columna mínima `320px`
   - stage con columna mínima `320px`
   - main-grid con columna mínima `340px`

3. **Costo de render completo ante actualizaciones en vivo**  
   En cada refresh se repintan todas las secciones (`summary`, `live`, `critical`, `stage`, `agent boards`, `timeline`, `tasks`) tras `fetch /api/events`, y el websocket dispara refrescos frecuentes.  
   Esto afecta fluidez en datasets altos (no hay virtualización ni diff de listas).

4. **Dependencia de `innerHTML` extensa para composición dinámica**  
   Aunque útil para velocidad de entrega, incrementa costo de mantenimiento visual (composición, test de UI, evolución de tokens/componentes).

5. **Deuda de diseño sistemático vs skills objetivo**  
   Los skills de Frontend apuntan a stack y patrones composables (`React + TS + Tailwind + shadcn/Radix`). AgentMonitor hoy no reutiliza ese ecosistema, lo que abre brecha con el resto del estándar UI.

---

## 4) Evaluación de opciones tecnológicas (3 opciones realistas)

## Opción A — Mantener vanilla + endurecer capa UI utilitaria

**Qué implica**
- Mantener `index.html + app.js + styles.css`.
- Agregar disciplina de componentes “ligeros” (templates + funciones puras), tokens y utilidades CSS.
- Añadir mejoras puntuales: contención overflow, paginación/virtualización manual por secciones calientes.

**Pros**
- Menor riesgo de regresión inmediata.
- No requiere bundler/migración grande.
- Entrega rápida para estabilizar UX.

**Contras**
- Escalabilidad de UI limitada (crece complejidad de `app.js`).
- Testing de componentes y estados más costoso.
- Divergencia con stack recomendado por skills Frontend.

**Costo/Riesgo estimado**
- Costo: **bajo-medio**
- Riesgo técnico: **medio**
- Riesgo de deuda futura: **alto**

---

## Opción B — Migrar AgentMonitor a **Preact + TypeScript + Tailwind** (isla independiente)

**Qué implica**
- Crear app aislada de AgentMonitor con Preact (compat React-like), TS y Tailwind.
- Mantener endpoints y eventos MCP intactos (`/api/events`, `/ws`); sólo cambia la capa de presentación.
- Introducir componentes reutilizables y rendering incremental por secciones.

**Pros**
- Mejor mantenibilidad y estructura por componentes con bundle pequeño.
- Menor costo de runtime que React completo.
- Permite adoptar parte de guía de diseño (tokens/utilidades) sin migración pesada a Next.

**Contras**
- Menor alineación directa con `shadcn/ui` (orientado a React).
- Curva de ajuste del equipo si hoy opera sobre React/Next en otro módulo.
- Necesita pipeline/build separado.

**Costo/Riesgo estimado**
- Costo: **medio**
- Riesgo técnico: **medio**
- Riesgo operativo (release): **medio-bajo**

---

## Opción C — Migrar AgentMonitor a **React/Next (aislado dentro Frontend)** + Tailwind + shadcn

**Qué implica**
- Reimplementar AgentMonitor como módulo aislado en stack estándar (`React + TS + Tailwind + shadcn`).
- Consumir los mismos contratos MCP (sin tocar lógica de negocio).
- Diseñar componentes observability-first (cards, timeline virtualizado, task-tree, drawer inspector).

**Pros**
- Máxima alineación con skills y estándar del workspace.
- Reuso de patrones y componentes (`shadcn`, tokens semánticos, accesibilidad Radix).
- Mejor testabilidad (unit + integration + visual regression).
- Facilita evolución futura (feature flags UI, theming, métricas UX).

**Contras**
- Mayor costo inicial y coordinación cross-team.
- Requiere estrategia de migración incremental (evitar “big-bang”).
- Riesgo temporal de doble mantenimiento (legacy + nuevo).

**Costo/Riesgo estimado**
- Costo: **medio-alto**
- Riesgo técnico: **medio**
- Riesgo de deuda futura: **bajo**

---

## 5) Recomendación final

**Recomendada: Opción C (React/Next aislado) con ejecución incremental y puerta de salida temporal por Opción A.**

### Razonamiento
1. El estándar Frontend declarado por skills ya está definido (React/TS/Tailwind/shadcn/Radix).  
2. AgentMonitor ya alcanzó complejidad de producto (stream, inspector, task tree, alertas, shortcuts).  
3. Continuar sólo en vanilla mantiene velocidad corta, pero agranda deuda estructural y costo de cambios futuros.

**Decisión práctica:**
- **Corto plazo (0-30):** hardening UX/layout en vanilla para estabilidad inmediata.
- **Mediano plazo (30-90):** migración por slices UI, preservando contratos MCP y comportamiento observable.

---

## 6) Estrategia por fases 0-30-60-90 (Orchestrator + Observer)

## Fase 0 (Día 0–30) — Estabilización UX sin tocar MCP

**Objetivo:** eliminar fricción visual y riesgo de overflow/performance básica en la UI actual.

**Acciones**
- Ajustes de layout responsivo:
  - limitar sangría máxima por profundidad en task tree;
  - introducir contención horizontal en panel de tareas;
  - adelantar breakpoints críticos para grids de dos columnas.
- Reducir trabajo de render:
  - top-N inicial para timeline/alerts con “ver más”; 
  - debounce y batching más explícito para refresh por websocket.
- Checklist de accesibilidad operativa (focus, keyboard, labels).

**Ownership**
- **Observer:** ejecución técnica UI y métricas de render.
- **Orchestrator:** definición de criterios y priorización, aprobación de riesgos.

**Criterios de aceptación**
- 0 overflows horizontales en viewport 360/768/1024 en smoke visual.
- Tiempo de refresco percibido estable bajo ráfagas (sin congelamientos visibles).
- Sin cambios en contratos MCP ni rutas API/WS.

---

## Fase 30 (Día 31–60) — Fundaciones del nuevo frontend aislado

**Objetivo:** levantar esqueleto React/Next del monitor en paralelo (sin cortar producción).

**Acciones**
- Bootstrap módulo `agent-monitor-next` (o ruta equivalente en Frontend).
- Crear design tokens y layout base alineados a guide/skills.
- Implementar slices iniciales:
  1) Summary cards
  2) Live ribbon + socket badge
  3) Critical alerts
- Agregar telemetría de UX (render time, dropped updates).

**Ownership**
- **Observer:** implementación técnica.
- **Orchestrator:** contrato de hitos y gate de calidad.

**Criterios de aceptación**
- Paridad funcional de slices 1–3 respecto a vanilla.
- Tests de componentes + smoke E2E mínimos en CI.
- Feature flag para alternar vista legacy/nueva.

---

## Fase 60 (Día 61–90) — Migración de vistas complejas

**Objetivo:** mover timeline + task tree + inspector con performance aceptable.

**Acciones**
- Migrar timeline con windowing/virtualización.
- Migrar task tree con control de profundidad, collapse estable y no-overflow.
- Migrar inspector (tabs, JSON, acciones contextualizadas).
- Mantener compatibilidad completa de payload/eventos MCP.

**Ownership**
- **Observer:** implementación y QA técnico.
- **Orchestrator:** governance de compatibilidad y aceptación.

**Criterios de aceptación**
- Paridad completa de features principales.
- Cero regresiones P1 en shortcuts/inspector/filtros.
- Presupuesto de performance definido y cumplido (p95 render interactivo).

---

## Fase 90 (Día 91+) — Cutover y retiro de legacy

**Objetivo:** pasar tráfico al nuevo monitor y desmantelar vanilla de forma segura.

**Acciones**
- Canary interno (10%→50%→100% usuarios internos).
- Monitoreo de errores UI y rollback plan.
- Congelar legacy y remover código duplicado al cerrar paridad.

**Ownership**
- **Orchestrator:** decisión de cutover/rollback.
- **Observer:** ejecución operativa y hardening final.

**Criterios de aceptación**
- Adopción 100% interna sin incidentes críticos 7 días.
- Rollback plan validado (dry run).
- Legacy marcado como deprecated y archivado.

---

## 7) Riesgos principales

1. **Riesgo de doble mantenimiento** durante transición (legacy + nuevo).  
2. **Riesgo de regresión funcional** en inspector/shortcuts al migrar componentes complejos.  
3. **Riesgo de deriva visual** si no se consolidan tokens/criterios en un único source-of-truth.  
4. **Riesgo de performance** si se porta 1:1 sin virtualización ni memoización por secciones.  
5. **Riesgo de coordinación** entre Observer y Orchestrator sin gates explícitos por fase.

---

## 8) Backlog mínimo para Observer (accionable)

### Sprint A (inmediato)
1. Definir y ejecutar matriz de viewport QA: 360 / 768 / 1024 / 1366.
2. Corregir overflow de task tree por profundidad y contención horizontal.
3. Ajustar breakpoints de grids secundarios para evitar compresión severa.
4. Implementar top-N visual para timeline/alerts con lazy expand.
5. Instrumentar métricas básicas de render y tasa de refresco.

### Sprint B
6. Crear paquete de componentes observability (Card, Badge, EventRow, TaskNode, AgentTile, Drawer).
7. Portar Summary + Live ribbon + Critical alerts a stack nuevo con feature flag.
8. Tests: unit de componentes + smoke E2E de filtros/shortcuts.

### Sprint C
9. Portar timeline virtualizado.
10. Portar task tree recursivo con collapse persistente.
11. Portar inspector completo (overview/history/json/actions) con parity checklist.

### DoD Observer
- Sin tocar lógica de negocio MCP.
- Contratos API/WS sin cambios breaking.
- Cobertura de pruebas acordada + checklist UX/a11y firmada por Orchestrator.

---

## 9) Nota de gobernanza

Este plan **no propone cambios de lógica MCP**. La estrategia se limita a capa de presentación, arquitectura UI y operabilidad de la experiencia.
