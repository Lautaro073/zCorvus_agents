## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Antes de desarrollar una nueva caracteristica, asegurate siempre de haber leido tus skills actuales en `Agents/Frontend/skills`.
- Prevencion futura: Revisar `learnings.md` en la fase `accepted` antes de transicionar a `in_progress`.

## 2026-04-07 - i18n request/server init cycle
- Trigger: `aiw-frontend-fix-icons-getrequestconfig-init-20260407-48`
- Regla aprendida: No importar `getRequestConfig` desde wrappers locales de i18n (`@/i18n/server`) cuando se define `src/i18n/request.ts`; usar import directo desde `next-intl/server`.
- Prevencion futura: Mantener separadas las capas de i18n: bootstrap (`request.ts`) directo a upstream, runtime helpers (`getMessages/getTranslations`) en wrapper local.
