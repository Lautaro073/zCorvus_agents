---
name: plan-audit
description: "Checklist de auditoría obligatorio antes de publicar cualquier PLAN_PROPOSED. Ejecutar siempre después de redactar el plan y antes de escribir el documento final. Captura los errores más comunes de planificación del workspace zCorvus."
---

# Plan Audit — Checklist Pre-Publicación

Ejecutar este checklist sobre el borrador del plan antes de publicar `PLAN_PROPOSED`.
Cada ítem en ❌ es un bloqueo: corregir antes de continuar.

---

## BLOQUE 1 — Trazabilidad MCP (errores que rompen el dispatcher)

```
[ ] 1.1 — Todos los taskIds siguen el formato aiw-<agente>-<slug>-<YYYYMMDD>-<seq>
          Buscar: taskIds sin "aiw-", sin fecha, sin secuencia numérica.
          Ejemplos inválidos: "V2-UI-05", "cart-backend-01", "frontend-ux-theme-01"

[ ] 1.2 — El taskId del PLAN_PROPOSED es el mismo que recibió el Planner
          No crear un taskId nuevo para el evento de cierre.

[ ] 1.3 — Cada tarea propuesta incluye correlationId explícito
          No solo el evento PLAN_PROPOSED: cada tarea individual también.

[ ] 1.4 — El correlationId es consistente en todo el plan
          Mismo valor en el header del plan, en el evento y en cada tarea.
```

---

## BLOQUE 2 — Asignaciones de agente (errores que bloquean ejecución)

```
[ ] 2.1 — Ninguna tarea de UI o componente React está asignada a AI_Workspace_Optimizer
          El Optimizer mide y audita. No implementa UI.
          Señal de error: tarea con "Rediseñar", "Implementar componente", "Crear vista" asignada al Optimizer.

[ ] 2.2 — Ninguna tarea de route handler, API o endpoint está asignada a Frontend
          Frontend consume APIs existentes. No las crea.
          Señal de error: tarea con "Crear /api/...", "Route handler", "Server action" asignada a Frontend.

[ ] 2.3 — Si Frontend necesita un endpoint que no existe hoy,
          hay una tarea de Backend que lo crea ANTES (dependsOn de Frontend apunta a esa tarea de Backend).

[ ] 2.4 — Ninguna tarea de implementación de código está asignada a AI_Workspace_Optimizer, Tester o Documenter.
          Optimizer → mide. Tester → valida. Documenter → documenta.

[ ] 2.5 — Las tareas de UI operativa (paneles de monitoreo, agent stage, critical alerts)
          están en Observer, no en Frontend.
          Las tareas de componentes React generales están en Frontend.
```

---

## BLOQUE 3 — Dependencias y paralelismo

```
[ ] 3.1 — El grafo de dependencias es acíclico (sin ciclos)
          Verificar que no hay tarea A que depende de B que depende de A.

[ ] 3.2 — Las tareas paralelas están identificadas como tales
          Si dos tareas tienen el mismo dependsOn y no se necesitan mutuamente → paralelas.
          Documentar explícitamente: "Tareas X e Y pueden correr simultáneamente."

[ ] 3.3 — La tarea de Testing depende de los componentes reales que testea
          No solo de Foundation o V2-UI-01. Debe depender de cada componente que valida.

[ ] 3.4 — Si hay cambios visuales significativos (motion, animaciones, nuevas superficies),
          hay una tarea de AI_Workspace_Optimizer para performance gate
          ANTES de la tarea de Tester.

[ ] 3.5 — La tarea de Documenter depende de QA (no puede documentar antes de que QA pase).

[ ] 3.6 — El orden recomendado refleja el grafo de dependencias y el paralelismo.
          No serializar tareas que pueden correr en paralelo.
```

---

## BLOQUE 4 — Criterios de aceptación

```
[ ] 4.1 — Todas las tareas tienen acceptanceCriteria (mínimo 2, ideal 3-5).

[ ] 4.2 — Ningún AC es vago. Cada AC nombra el mecanismo o el valor exacto.
          Inválido: "Bootstrap mejorado", "UI más consistente", "El flujo funciona"
          Válido: "El valor theme:'light' en view.initial.ts es eliminado",
                  "POST /api/preferences setea cookie con SameSite:Lax, Secure:true"

[ ] 4.3 — Si hay cookies involucradas, el AC especifica:
          HttpOnly (true/false), SameSite, Secure, Max-Age, Path.
          Nota: HttpOnly:true significa que el cliente JS no puede leerla con document.cookie.

[ ] 4.4 — Si hay redirects externos (Stripe, OAuth, SSO) a rutas con parámetros dinámicos
          (locale, userId, etc.), el AC verifica que la URL completa incluye el parámetro.
          Ejemplo: "La redirect_url de Stripe incluye el locale: /<locale>/premium/success"

[ ] 4.5 — Si hay race conditions o casos borde identificados en la sección de Riesgos,
          al menos uno de los ACs de alguna tarea los aborda explícitamente.
          Riesgo sin AC = riesgo ignorado.

[ ] 4.6 — Si el AC implica una decisión técnica (mecanismo de persistencia, formato de dato,
          algoritmo), el mecanismo está especificado, no delegado al agente implementador.
```

---

## BLOQUE 5 — Completitud del plan

```
[ ] 5.1 — El plan tiene sección "Contexto inspeccionado" con archivos reales leídos.
          Sin esta sección no hay evidencia de inspección.

[ ] 5.2 — El plan tiene tabla de "Agentes y sus roles en esta EPIC".

[ ] 5.3 — El plan tiene grafo de dependencias en ASCII.

[ ] 5.4 — El plan tiene tabla de Riesgos con probabilidad, impacto y mitigación concreta
          (no "mitigar el riesgo" como mitigación).

[ ] 5.5 — El plan tiene orden recomendado de implementación.

[ ] 5.6 — El plan tiene criterios de aprobación del plan (checklist final).
```

---

## BLOQUE 6 — Verificación de skills y stack técnico

```
[ ] 6.1 — Las skills referenciadas en cada tarea existen en el workspace del agente asignado.
          No referenciar skills de Frontend en tareas de Observer si Observer no las tiene.

[ ] 6.2 — Si las skills implican librerías (framer-motion, @react-spring/web, @svgdotjs/svg.js),
          verificar que están en package.json o que hay una tarea de setup que las instala.

[ ] 6.3 — Si se usa dramatic-2000ms-plus o apple-ui-skills, verificar que el proyecto usa React
          y que el lenguaje visual del producto es compatible con animaciones de ese tipo.

[ ] 6.4 — Si el plan referencia un repo externo, verificar su naturaleza real antes de asumir
          cómo integrarlo. Un README mal leído invalida el plan completo.
```

---

## BLOQUE 7 — Plan freeze

```
[ ] 7.1 — Si el plan tiene una versión anterior aprobada, verificar que hay evidencia real
          (no ideas nuevas) que justifique la revisión.
          Evidencia válida: KPIs incumplidos, bloqueo de implementación, bug detectado.
          No válido: "se me ocurrió algo mejor", "polish conceptual".
```

---

## Resultado

**Si todos los bloques tienen ✅:** publicar `PLAN_PROPOSED`.

**Si hay cualquier ❌:** corregir antes de publicar. Documentar en el plan qué se corrigió y por qué (ayuda a los learnings futuros).

**Si hay ❌ que no pueden resolverse con la información disponible:** publicar `TASK_BLOCKED` con causa específica y archivos/información que se necesita.