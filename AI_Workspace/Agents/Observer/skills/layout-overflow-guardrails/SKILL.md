# Skill: Layout Overflow Guardrails (Observer)

## Objetivo
Prevenir desbordes horizontales y cortes de contenido en paneles de monitoreo con cambios pequeños y seguros.

## Cuándo usarla
- Cuando aparecen scrolls horizontales no deseados.
- Cuando badges/títulos largos rompen cards o headers.
- Cuando grids/flex hijos sobresalen de su contenedor.

## Checklist de guardrails
1. En grids críticos, usar `minmax(0, 1fr)` para columnas fluidas.
2. En hijos de `display:flex`, forzar `min-width: 0` si contienen texto variable.
3. Activar `overflow-wrap: anywhere` en textos con IDs/tokens largos.
4. Limitar indentaciones recursivas (árbol de tareas) con tope máximo.
5. Ajustar breakpoints para colapsar columnas antes del punto de ruptura visual.
6. Evitar `width` rígidos en paneles secundarios; preferir `minmax(...)`.
7. Proteger media embebida con `max-width: 100%`.

## Anti-patrones
- Sidebar con ancho fijo sin fallback en viewport intermedio.
- `margin-left` acumulativo por profundidad sin límite.
- `white-space: nowrap` en elementos con contenido dinámico.
- Resolver overflow solo con `overflow-x: hidden` sin arreglar causa raíz.

## Pasos rápidos
1. Detectar contenedor que se rompe (DevTools: Layout + Computed).
2. Validar si el problema es por grid, flex o contenido largo.
3. Aplicar guardrail mínimo (no refactor completo).
4. Probar en tres anchos: `>=1200`, `~1024`, `<=760`.
5. Confirmar que no cambia comportamiento de datos/eventos.
6. Registrar fix y riesgo pendiente en reporte interno.

## Snippets base
- Grid seguro: `grid-template-columns: minmax(0, 1fr) minmax(0, .8fr);`
- Flex seguro: `header > * { min-width: 0; }`
- Texto largo: `.token { overflow-wrap: anywhere; }`
- Árbol anidado: `margin-left: min(calc(var(--depth) * 14px), 64px);`

## Definición de terminado
- Sin scroll horizontal accidental en layouts objetivo.
- Ningún card/panel clave muestra texto saliendo de su borde.
- Breakpoints conservan legibilidad y acciones operativas.
