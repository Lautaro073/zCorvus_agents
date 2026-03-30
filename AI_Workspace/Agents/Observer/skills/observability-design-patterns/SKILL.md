# Skill: Observability Design Patterns (Observer)

## Objetivo
Guiar decisiones de UI/UX operativa en paneles de observabilidad para reducir tiempo de triage sin tocar contratos MCP.

## Cuándo usarla
- Cuando el monitor ya funciona, pero cuesta detectar riesgos rápido.
- Cuando hay mucha señal (timeline, tareas, alertas) y baja priorización visual.
- Antes de introducir nuevas tarjetas o paneles en `AgentMonitor`.

## Checklist operativo
1. **Estado de enlace visible**: socket y última actualización siempre arriba o accesible en 1 scroll.
2. **Jerarquía de severidad**: `danger > warning > info > success` consistente en badges, bordes y timeline.
3. **Contexto mínimo por evento**: agente, tipo, estado, tiempo, y `taskId`/correlación si aplica.
4. **Acción inmediata**: cada entidad crítica debe tener al menos una acción (`filtrar`, `abrir detalle`, `exportar`).
5. **Latencia cognitiva baja**: menos clics para llegar de alerta a detalle.
6. **No romper stream**: filtros/side panels no deben bloquear flujo en vivo.

## Patrones recomendados
- **Lead + Strip**: un “agente protagonista” y una tira de equipo para comparar estado rápidamente.
- **Dualidad Live + Histórico**: panel principal de eventos recientes + agrupación por tareas.
- **Context Drawer**: detalle lateral con tabs (`Resumen`, `Historial`, `JSON`) para no perder foco.
- **Quick Filters**: presets para casos de guardia (`bloqueadas`, `in_progress`, última hora).

## Anti-patrones
- Mezclar métricas de salud con acciones destructivas en el mismo grupo visual.
- Sobrecargar cards con texto largo sin truncado/wrap.
- Cambiar semántica de color por sección (ej. rojo=warning en un panel y rojo=danger en otro).
- Ocultar estados críticos detrás de interacción obligatoria.

## Pasos de implementación
1. Revisar el flujo operativo actual (alerta -> detalle -> filtro -> export).
2. Identificar cuellos de botella visuales y de navegación.
3. Ajustar layout y densidad de contenido sin alterar eventos ni payloads.
4. Validar teclado y responsive (desktop, tablet, móvil).
5. Documentar decisión UX y riesgo residual en `docs/internal/reports`.

## Definición de terminado
- El operador puede identificar un bloqueo y abrir contexto en <= 2 interacciones.
- No hay regressions de MCP/eventos.
- Existe reporte interno con cambios y riesgos pendientes.
