# Frontend Use New Skills

- Task ID: `aiw-frontend-use-new-skills`
- Correlation ID: `aiw-frontend-use-new-skills`
- Date: 2026-04-13
- Agent: Frontend

## Objective

Operacionalizar el uso de las 3 skills recien instaladas en Frontend para que se apliquen de forma consistente en tareas reales:

- `emil-design-eng`
- `polish`
- `design-taste-frontend`

## Implementation

Se definio un marco de uso explicito en perfil del agente:

1. `design-taste-frontend` como baseline creativo/anti-slop para decisiones de dirección visual.
2. `emil-design-eng` para refinar decisiones de design-engineering (interacciones, motion y microdetalle perceptual).
3. `polish` como etapa final previa a QA/PR para coherencia y acabado.
4. Orden de precedencia documentado para evitar conflictos con restricciones del repo.
5. Excepción declarada para tareas no UI (evitar aplicar reglas estéticas en wiring técnico puro).

## Files updated

- `AI_Workspace/Agents/Frontend/profile.md`
- `AI_Workspace/Agents/Frontend/learnings.md`

## Validation

- El perfil Frontend ahora incluye sección dedicada de uso operativo para las 3 skills nuevas.
- El aprendizaje operativo quedó registrado para asegurar repetibilidad en próximas asignaciones.

## Context7 evidence

- Not required for this task.
- Motivo: tarea de gobernanza operativa interna de skills (sin cambios de API/librerías de runtime).

## Conclusion

`IMPLEMENTED`

El uso de las nuevas skills quedó formalizado en el flujo del agente Frontend con triggers, precedencia y criterio de excepción.
