# Frontend Fix - Icons getRequestConfig Initialization Crash

- Task ID: `aiw-frontend-fix-icons-getrequestconfig-init-20260407-48`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Fix runtime crash on `/icons` and related routes caused by `cannot access getRequestConfig before initialization`, preserving project i18n conventions and route behavior in `es/en`.

## Root cause

- `Frontend/src/i18n/request.ts` imported `getRequestConfig` from `@/i18n/server`.
- `Frontend/src/i18n/server.ts` wraps `next-intl/server` exports for page/layout helpers.
- This created an initialization-order/cycle risk between i18n bootstrap modules where request config resolution touched a module still being initialized.

In short: request bootstrap depended on server wrapper, while wrapper itself is part of the same i18n initialization path.

## Fix applied

### 1) Break request/server i18n cycle at source

- `Frontend/src/i18n/request.ts`
  - Changed import from:
    - `@/i18n/server`
  - To direct source:
    - `next-intl/server`

This isolates request bootstrap from local wrapper initialization.

### 2) Harden server wrapper API surface

- `Frontend/src/i18n/server.ts`
  - Removed re-export of `getRequestConfig` from wrapper.
  - Wrapper now exposes only page/layout runtime helpers:
    - `getMessages`
    - `getTranslations`

This prevents future accidental import of `getRequestConfig` through wrapper and reduces cycle risk.

## Validation

- Import scan confirms `getRequestConfig` now only appears in `request.ts` with direct `next-intl/server` import.
- `npm run lint`: PASS with unrelated pre-existing warnings only.
- `npm run build`: PASS.
- Build output includes routes without crash during compilation:
  - `/[locale]/icons`
  - `/[locale]/icons/[type]/all`
  - `/[locale]/icons/[type]/[id]`

## Files changed

- `Frontend/src/i18n/request.ts`
- `Frontend/src/i18n/server.ts`

## Learning captured

- Never route `getRequestConfig` through local i18n wrappers used by runtime page/layout translation helpers.
- Keep request bootstrap import path direct to upstream (`next-intl/server`) to avoid circular init coupling.

## Final verdict

`FIXED`
