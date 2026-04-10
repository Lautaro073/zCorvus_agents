# Planner — Learnings

Leer este archivo ANTES de empezar cualquier plan. Cada entrada es una lección de un error real.

---

## 2026-03-23 — initialization
- **Trigger:** PROJECT_BOOTSTRAPPED
- **Regla:** Siempre leer la arquitectura del Frontend y Backend antes de proponer tareas redundantes.
- **Prevención:** En estado `accepted`, hacer `ls` o lectura de código antes de planear a ciegas.

---

## 2026-03-26 — pre-planning inspection
- **Trigger:** PLAN_GENERATION_STARTED
- **Regla:** Nunca generar planes a ciegas.
- **Acción obligatoria antes de planear:**
  - Ejecutar `ls` o equivalente en las carpetas relevantes.
  - Leer archivos de configuración, entrada y módulos clave.
  - Si hay repos externos referenciados, inspeccionarlos (buscar en web si no hay acceso directo).
  - Detectar tecnologías y funcionalidades ya implementadas.
- **Criterio de cumplimiento:** No emitir plan hasta tener evidencia mínima del estado real.
- **Falla a evitar:** Redundancia, duplicación de trabajo, planes desconectados de la implementación real.
- **Enforcement:** Sin inspección previa → publicar `TASK_BLOCKED` con causa y archivos que se necesitan.

---

## 2026-03-31 — token/context planning quality
- **Trigger:** PLAN_REVIEW_AND_REFINEMENT
- **Regla:** En planes de optimización de contexto no alcanza con proponer compresión o cambios de API; también hay que incluir ownership correcto, reglas de perfiles, higiene de eventos y KPIs de claridad operativa.
- **Checklist para planes de optimización interna:**
  - ¿El ejecutor principal es `AI_Workspace_Optimizer` en vez de `Backend`?
  - ¿Hace falta actualizar `profile.md` de todos los agentes afectados?
  - ¿El bus MCP está siendo usado como reporte largo y necesita `message budget`?
  - ¿Existen vistas compactas orientadas a `taskId`, `correlationId` y `assignedTo`?
  - ¿Los KPIs miden calidad del contexto y no solo bytes o tokens?
  - ¿Cualquier vista nueva tiene schema mínimo explícito?
  - ¿Los cambios nuevos tienen feature flags o kill switches para rollback?
  - ¿El plan define freshness/provenance para vistas derivadas?
  - ¿Hay estrategia de salida para cualquier modo legacy o compat?
  - ¿Existe enforcement automático para evitar drift de profiles y schemas?
  - ¿Sidecars o caches contemplan atomicidad, idempotencia y detección de corrupción?
  - ¿Existen pruebas negativas/fault injection y SLOs con alertas?
  - ¿El rollout por waves tiene canary, blast radius y abort thresholds?
  - ¿Las skills externas quedan como optativas y no bloquean tareas críticas?
- **Criterio:** Todo plan de optimización interna debe incluir al menos un workstream de profile governance y uno de retrieval/snapshot-first.
- **Falla a evitar:** Planes técnicamente correctos en ahorro de payload, pero incompletos para mejorar comprensión real del equipo.

---

## 2026-03-31 — approved plan freeze discipline
- **Trigger:** POST_APPROVAL_REVIEW
- **Regla:** Una vez aprobado como baseline, el plan no se reabre por ideas nuevas o polish conceptual.
- **Solo reabrir ante:** KPIs incumplidos, drift real, incidentes de wave, conflictos snapshot-vs-source, problemas operativos con sidecars.
- **Si no hay evidencia de implementación:** tratar ideas nuevas como backlog opcional, no como razón para replanificar.
- **Falla a evitar:** Scope creep, iteración infinita de diseño, retraso del inicio de ejecución.

---

## 2026-04-05 — frontend plan rigor and correction review
- **Trigger:** USER_PLAN_CORRECTION_REVIEW
- **Regla:** En planes de frontend listos para ejecución, las tareas deben salir con formato MCP completo y los bloqueos cross-layer deben convertirse en tareas explícitas, no en "decisiones a resolver luego".
- **Checklist para planes de UX/frontend:**
  - ¿Cada tarea usa `taskId` canónico (`aiw-<agente>-<slug>-<fecha>-<seq>`) y `correlationId`?
  - ¿El `taskId` del `PLAN_PROPOSED` es el mismo que recibió el Planner?
  - ¿Toda dependencia servidor-cliente faltante (endpoint, cookie contract, redirect URL) existe como tarea explícita upstream de `Backend`?
  - ¿Los ACs nombran el mecanismo real cuando ya se conoce (cookie SSR, locale en redirect URL, root cause técnico)?
  - ¿El paralelismo posible queda reflejado en `dependsOn` y en el orden recomendado?
  - ¿Hay performance gate de `AI_Workspace_Optimizer` antes de QA final cuando hay cambios visuales?
  - ¿Los atributos de cookie están definidos según el flujo real de lectura/escritura?
  - ¿Las skills evaluadas tienen fit real con el producto y no se fuerzan si chocan con la arquitectura?
- **Criterio:** Todo plan frontend debe dejar claro qué bloquea a quién, qué mecanismo técnico se implementa y qué corre en paralelo.
- **Falla a evitar:** Planes visualmente ambiciosos pero operativamente ambiguos.

---

## 2026-04-06 — critical assignment errors from v1 plans
- **Trigger:** PLAN_CORRECTION_REVIEW (AgentMonitor V2 y Frontend UX)
- **Errores reales que invalidan planes completos:**

### Error A — taskIds cortos sin fecha ni formato canónico
- **Qué pasó:** `frontend-ux-theme-contract-01`, `V2-UI-05`. El dispatcher MCP no puede matchear estos IDs.
- **Regla:** taskId siempre `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>`. Sin excepciones.

### Error B — correlationId ausente en tareas individuales
- **Qué pasó:** Solo el evento `PLAN_PROPOSED` tenía correlationId; las tareas propuestas no.
- **Regla:** `correlationId` va en el evento principal Y en cada tarea propuesta. Es el campo que agrupa la EPIC.

### Error C — tareas de UI asignadas a AI_Workspace_Optimizer
- **Qué pasó:** Metrics, Critical Panel, Filters, Task Groups asignados al Optimizer. El Optimizer no implementa UI.
- **Regla:** UI operativa → Observer. Componentes React/datos → Frontend. Optimizer → mide y audita, nunca implementa.

### Error D — tarea de Backend faltante cuando el endpoint no existe
- **Qué pasó:** `AppearanceSync` llama a `/api/preferences` que no existía. El plan pedía "decisión técnica" en Frontend. Frontend no crea route handlers.
- **Regla:** Si Frontend necesita un endpoint que no existe → tarea de Backend primero. Esa tarea desbloquea a Frontend.

### Error E — cookie spec incompleta
- **Qué pasó:** El AC decía "documentar la fuente de verdad" sin especificar SameSite, HttpOnly, Secure, Max-Age.
- **Regla:** Si el plan involucra cookies, especificar todos los atributos. `HttpOnly` importa: si es `true`, el cliente JS no puede leerla con `document.cookie`.

### Error F — locale de Stripe omitido
- **Qué pasó:** Las rutas eran `/[locale]/premium/success` pero nadie verificó que el `success_url` de Stripe incluyera el locale. Si no lo incluye, Next.js no matchea la ruta y rompe.
- **Regla:** Si hay redirects externos (Stripe, OAuth, etc.) a rutas con parámetros dinámicos, el AC debe verificar que la URL completa incluyendo el parámetro sea correcta.

### Error G — mecanismo no especificado en el AC
- **Qué pasó:** AC decía "el retorno no depende del estado en memoria" sin definir si era cookie, sessionStorage o URL param.
- **Regla:** Si el AC implica una decisión técnica, especificar el mecanismo. El agente implementará lo que se le ocurra primero si no está especificado.

### Error H — race conditions en sección de Riesgos pero sin AC
- **Qué pasó:** La race condition `refreshSession()` + theme restore estaba documentada como "riesgo" pero ninguna tarea tenía AC para resolverla.
- **Regla:** Si un riesgo es técnicamente real y tiene un owner claro, convertirlo en AC de la tarea correspondiente. Riesgo sin AC = riesgo ignorado.

### Error I — tareas paralelas serializadas innecesariamente
- **Qué pasó:** El orden recomendado serializaba tareas que dependían del mismo padre pero no se necesitaban entre sí.
- **Regla:** Si dos tareas tienen el mismo conjunto de dependencias y no se requieren mutuamente, son paralelas. Documentar "4a (paralelo con 4b)" en el orden recomendado.

### Error J — V2-UI-09 Testing dependía solo de Foundation
- **Qué pasó:** Testing "cubría todos los componentes" pero su único `dependsOn` era V2-UI-01.
- **Regla:** La tarea de testing debe depender de los componentes reales que testea. No puede ejecutarse antes de que los componentes existan.

### Error K — plan visual sin performance gate
- **Qué pasó:** Cambios visuales con framer-motion + SVG animado sin tarea de `AI_Workspace_Optimizer` para validar LCP, CLS, bundle size.
- **Regla:** Planes con cambios visuales significativos necesitan performance gate antes de QA final. Incluir tarea de Optimizer con Lighthouse y bundle analysis.

### Error L — plan v1 de pixel-agents basado en premisa falsa
- **Qué pasó:** El plan asumió que pixel-agents era un design system cuando es una extensión VS Code completa con motor de canvas propio. Todo el plan fue descartado.
- **Regla:** Si el plan referencia un repo externo, inspeccionarlo antes de planificar. Un README y la estructura de carpetas son suficiente para evitar este error.

### Error M — skills asignadas por nombre pero sin evaluar fit real
- **Qué pasó:** Skills de `dramatic-2000ms-plus` y `apple-ui-skills` asignadas sin verificar si el producto tenía arquitectura React y si el lenguaje visual del proyecto las soportaba.
- **Regla:** Antes de referenciar una skill en un plan, verificar que el stack técnico del proyecto las soporta (librerías instaladas, stack React, etc.) y que el lenguaje visual del producto es compatible.

---

## 2026-04-07 — admin-control-panel plan correction review
- **Trigger:** USER_PLAN_CORRECTION_REVIEW (Admin Control Panel v1 -> v2)
- **Regla:** Cuando el usuario corrige un plan, convertir cada correccion en regla operativa verificable antes del siguiente `PLAN_PROPOSED`.

### Errores detectados y regla nueva

1. **Seq de taskId del plan sin justificacion (`-50`)**
   - **Regla:** usar secuencia real y trazable para Planner; evitar saltos arbitrarios en `taskId`.

2. **Testing sin dependencia del guard de acceso**
   - **Regla:** si QA valida acceso/redirect por rol, Testing debe depender explicitamente de la tarea de routing/guard.

3. **AC de data hooks sin mecanismo tecnico**
   - **Regla:** en hooks/API definir mecanismo concreto de estados (`isLoading`, `isError`, empty-state, retry), no solo el resultado esperado.

4. **Skills no alineadas al trabajo real de la tarea**
   - **Regla:** tareas de data hooks no deben priorizar skills de diseno visual; asignar skills segun tipo de trabajo (data, UI, QA, docs).

5. **Fuente de verdad de filtros no especificada**
   - **Regla:** si hay filtros de dashboard, especificar mecanismo (`URL searchParams`, store, etc.). Si se necesita persistencia/shareable links, usar `searchParams`.

6. **Sesion expirada no cubierta en routing task**
   - **Regla:** toda tarea de acceso admin debe incluir AC de `401` durante sesion activa con redirect controlado.

7. **Riesgo timezone sin AC asociado**
   - **Regla:** riesgo tecnico real debe tener AC en al menos una tarea ejecutable (UTC, formato ISO-8601, ejemplos).

8. **Ledger vacio no cubierto en metricas**
   - **Regla:** API de metricas debe definir comportamiento cuando la fuente esta vacia (KPIs en 0 y serie valida, nunca null/500 por vacio).

9. **Skill de existencia incierta en gate de performance**
   - **Regla:** no proponer skills no confirmadas en el workspace; validar disponibilidad antes de asignarlas.

10. **Mejoras de calidad a incorporar por defecto**
    - **Regla:** en paneles con multiples endpoints, incluir skeleton loaders, paginacion server-side y politica de enmascaramiento para datos sensibles cuando aplique.

---

## Checklist rápido pre-publicación (resumen ejecutivo)

Antes de publicar cualquier `PLAN_PROPOSED`, responder sí/no a cada punto:

- [ ] ¿Inspeccioné el código real antes de escribir el plan?
- [ ] ¿Todos los taskIds siguen `aiw-<agente>-<slug>-<YYYYMMDD>-<seq>`?
- [ ] ¿Cada tarea tiene `correlationId`?
- [ ] ¿Ninguna tarea de UI está asignada a `AI_Workspace_Optimizer`?
- [ ] ¿Si Frontend necesita un endpoint, existe una tarea de Backend que lo crea primero?
- [ ] ¿Todos los ACs especifican el mecanismo técnico, no solo el resultado?
- [ ] ¿Las tareas paralelas están identificadas como tales en `dependsOn` y en el orden?
- [ ] ¿La tarea de Testing depende de los componentes reales que testea?
- [ ] ¿Si hay cambios visuales importantes, hay un performance gate de Optimizer antes de QA?
- [ ] ¿Los riesgos técnicos reales tienen un AC en alguna tarea, no solo en la sección de Riesgos?
- [ ] ¿El seq del taskId del plan es coherente (sin saltos arbitrarios)?
- [ ] ¿Testing depende de todas las tareas que habilitan los flujos que valida (routing/auth incluidos)?
- [ ] ¿La fuente de verdad de filtros/dashboard está especificada (`searchParams`, store, etc.)?
- [ ] ¿Está cubierto el caso de sesión expirada (`401`) en tareas de acceso y en QA?
- [ ] ¿Las APIs de métricas definen comportamiento explícito para dataset vacío?

Si alguna respuesta es No → corregir antes de publicar.
Ver skill `plan-audit` para el checklist completo y detallado.
