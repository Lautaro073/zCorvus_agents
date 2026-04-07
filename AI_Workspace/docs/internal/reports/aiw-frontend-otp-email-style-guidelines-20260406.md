# Frontend OTP Email Style Guidelines

- Task ID: `aiw-frontend-otp-email-style-guidelines-20260406-41`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Define concrete visual and copy guidelines for password-reset OTP email templates so Backend can implement them directly while preserving auth-brand consistency between web UI and transactional email.

## Inputs reviewed

- Current templates:
  - `Backend/templates/password-reset-otp.html.js`
  - `Backend/templates/password-reset-otp.text.js`
- Frontend auth style cues:
  - `Frontend/src/app/[locale]/auth/layout.tsx`
  - `Frontend/src/app/globals.css`

## Design direction (aligned with auth frontend)

### Visual tone

- Clean neutral system with strong typographic hierarchy.
- Brand anchoring through subtle monochrome accents, not saturated campaign colors.
- OTP must be the primary visual focal point.

### Typography (email-safe)

- Primary stack for HTML email:
  - `Georgia, "Times New Roman", serif` (closest portable feel to Kameron/Kadwa spirit).
- Heading:
  - Weight: 700
  - Size: 28-32px
  - Line-height: 1.2
- Body:
  - Size: 15-16px
  - Line-height: 1.5
  - Color: neutral dark (`#111827` light mode email baseline)
- OTP code:
  - Size: 34-40px
  - Weight: 700
  - Letter spacing: 6px
  - Monochrome, centered in dedicated block

### Layout and spacing

- Max content width: 560px centered.
- Outer padding: 24px.
- Main card padding: 24px (mobile-safe fallback 16px).
- Vertical rhythm: 12px base increments.
- Distinct OTP container block with:
  - light neutral background (`#f3f4f6`)
  - subtle border (`#e5e7eb`)
  - rounded corners (10-12px)

### CTA and interaction

- Primary CTA button label:
  - ES: `Restablecer contraseña`
  - EN: `Reset password`
- CTA target: frontend route `/{locale}/auth/forgot-password`.
- Button style (inline CSS safe):
  - background `#111827`
  - text `#ffffff`
  - border radius 10px
  - padding 12px 18px
  - font-size 14px, font-weight 600

### Accessibility and compatibility

- Maintain strong contrast ratio (>= 4.5:1 for body text).
- Include semantic reading order: title -> purpose -> OTP -> expiry -> CTA -> security note.
- Do not rely on external CSS or webfonts; inline styles only.
- Keep template robust for clients that strip advanced styles.

## Content guidelines (copy)

### Mandatory content blocks

1. Clear intent line (password reset request).
2. OTP code as one-time secret.
3. Expiration window (`expiresInMinutes`).
4. Single-use warning.
5. Security fallback text (“if you did not request…”).

### Locale variants

#### ES

- Subject: `Codigo para restablecer tu contraseña - zCorvus`
- Heading: `Codigo de restablecimiento`
- Lead: `Usa este codigo de un solo uso para restablecer tu contraseña de zCorvus.`
- Expiry: `Este codigo vence en {minutes} minutos y solo puede usarse una vez.`
- Security note: `Si no solicitaste este cambio, puedes ignorar este correo de forma segura.`

#### EN

- Subject: `Password reset code - zCorvus`
- Heading: `Password reset code`
- Lead: `Use this one-time code to reset your zCorvus password.`
- Expiry: `This code expires in {minutes} minutes and can only be used once.`
- Security note: `If you did not request this change, you can safely ignore this email.`

## Recommended HTML structure (backend-implementable)

- `table role="presentation"` wrapper (email-client safe).
- Header row with zCorvus brand text.
- Heading + lead paragraph.
- OTP block container.
- Expiry paragraph.
- CTA button anchor.
- Divider + security note.

## Backend implementation notes

- Extend template functions to receive locale:
  - `getPasswordResetOtpHtml({ otp, expiresInMinutes, locale, resetUrl })`
  - `getPasswordResetOtpText({ otp, expiresInMinutes, locale, resetUrl })`
- Choose copy by locale (`es`/`en`) with `en` fallback when unknown.
- Use locale-aware reset URL from frontend context already propagated by task `aiw-frontend-otp-locale-propagation-20260406-40`.
- Keep current plain-text template parity with same informational blocks.

## Acceptance mapping

- Concrete inline-compatible guidance: Provided.
- es/en variants and tone: Provided.
- Direct backend applicability for password-reset templates: Provided.

## Final verdict

`GUIDELINES_READY`
