## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Siempre leer la arquitectura del Frontend y Backend antes de proponer tareas redundantes.
- Prevencion futura: En estado `accepted`, hacer uso de `ls` o herramientas de lectura de código antes de planear a ciegas.

## 2026-03-26 - pre-planning inspection
- Trigger: PLAN_GENERATION_STARTED
- Regla aprendida: Nunca generar planes a ciegas.
- Prevencion futura: Antes de planear, inspeccionar la arquitectura existente del Frontend y Backend mediante lectura de estructura y archivos clave.
- Accion obligatoria:
  - Ejecutar `ls` o equivalente.
  - Revisar carpetas principales.
  - Leer archivos de configuración, entrada y módulos relevantes.
  - Detectar tecnologías y funcionalidades ya implementadas.
- Criterio de cumplimiento: No emitir plan hasta haber obtenido evidencia mínima del estado real del código base.
- Falla a evitar: Redundancia, duplicación de trabajo y planes desconectados de la implementación real.
- Enforcement: Sin inspección previa, el planner debe detenerse y reportar bloqueo por falta de análisis.