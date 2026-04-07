# Backend OTP Template Localized + Styled

- Task ID: `aiw-backend-otp-template-localized-style-20260406-43`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-06
- Agent: Backend

## Objective

Implementar en backend el template OTP con estilo alineado al auth frontend y soporte locale `es/en`, consumiendo locale propagado por UI.

## Inputs used

- Frontend style guide:
  - `AI_Workspace/docs/internal/reports/aiw-frontend-otp-email-style-guidelines-20260406.md`
- Frontend locale propagation:
  - `AI_Workspace/docs/internal/reports/aiw-frontend-auth-reset-password-ui-flow-20260406.md`
  - `Frontend/src/lib/api/backend.ts`

## Backend changes

### 1) Locale resolution + deterministic fallback

- `Backend/controllers/auth.controller.js`
  - Added locale resolution with precedence:
    1. `body.locale`
    2. `x-locale` header
    3. `accept-language` header
    4. fallback `en`
  - Added deterministic normalization using `normalizeOtpLocale` (`es* -> es`, `en* -> en`, else `en`).

### 2) Styled OTP HTML template (inline-safe)

- `Backend/templates/password-reset-otp.html.js`
  - Reworked to table-based email layout (`role="presentation"`) for client compatibility.
  - Added hierarchy and spacing per Frontend guideline.
  - Added neutral palette and OTP focal block.
  - Added CTA button linking to localized reset route.
  - Added HTML escaping utility for injected values.

### 3) Localized copy source of truth

- `Backend/templates/password-reset-otp.copy.js` (new)
  - Centralized localized strings for ES/EN.
  - Provides subject, heading, lead, expiry, CTA and security lines.

### 4) Text template parity

- `Backend/templates/password-reset-otp.text.js`
  - Uses same localized copy source.
  - Keeps same content blocks as HTML.
  - Includes localized reset URL.

### 5) Config additions

- `Backend/config/config.js`
  - Added `app.name` (`APP_NAME`) and `app.frontendUrl` (`FRONTEND_URL`) used to build locale-aware reset URL.

### 6) Validation and API contract updates

- `Backend/utils/validators.js`
  - Added optional `locale` validation for OTP request/verify/reset payloads.
  - Accepts language tags and normalizes at controller level.

- `Backend/routes/auth.routes.js`
  - Swagger schemas for OTP endpoints now document optional `locale` field (`es|en`).

## Runtime behavior

- Locale-aware subject and body copy.
- Reset link generated as:
  - `${FRONTEND_URL}/{locale}/auth/forgot-password`
- If locale is unknown/unsupported, backend sends English (`en`) deterministically.

## Tests executed

- `npm test -- auth-password-reset-otp.test.js`

Results:

- OTP flow regression: PASS
- New checks:
  - localized subject for ES request
  - styled HTML template structure + content parity
  - locale normalization deterministic behavior

## Acceptance criteria mapping

- HTML template uses inline-safe style and hierarchy: ✅
- Plain text template consistent and clear: ✅
- Locale `es/en` selected from request input with deterministic fallback: ✅
- No mixed-language hardcodes in one template: ✅
- OTP expiration and placeholders preserved: ✅

## Final verdict

`IMPLEMENTED`
