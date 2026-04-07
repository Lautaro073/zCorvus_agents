# Backend OTP Security Hardening

- Task ID: `aiw-backend-auth-otp-security-hardening-20260407-46`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-07
- Agent: Backend

## Objective

Aplicar hardening de seguridad al flujo OTP de reset password para cerrar findings de review:

1. Generación OTP con CSPRNG.
2. Respuesta indistinguible en request OTP incluso ante fallo del mailer.
3. Consumo atómico de OTP para bloquear replay concurrente.

## Fixes implemented

### 1) CSPRNG OTP generation

- File: `Backend/controllers/auth.controller.js`
- Change:
  - Antes: `Math.random()`.
  - Ahora: `crypto.randomInt(0, 1000000).toString().padStart(6, '0')`.
- Security impact:
  - Reduce predictibilidad del OTP (entropía real de fuente criptográfica).

### 2) Anti-enumeration on mailer failure

- File: `Backend/controllers/auth.controller.js`
- Change:
  - En `requestPasswordResetOtp`, `sendMail(...)` ahora va en `try/catch` interno.
  - Si falla mailer, el endpoint mantiene `200` + mensaje genérico:
    - `If the email exists, an OTP has been sent`.
- Security impact:
  - Evita canal lateral de enumeración (no diferencia observable entre usuario existente con mail ok vs mail fail).

### 3) Atomic OTP consume to prevent concurrent replay

- File: `Backend/models/PasswordResetOtp.js`
- Change:
  - Nuevo método `consumeIfValid(id)` que hace `UPDATE ... WHERE id=? AND used=0 AND expires_at > now`.
  - Retorna `true` solo si `rowsAffected > 0`.
- File: `Backend/controllers/auth.controller.js`
- Change:
  - `resetPasswordWithOtp` usa `consumeIfValid` y aborta con `400 Invalid or expired OTP` si no pudo consumir.
  - Recién después de consumir exitosamente actualiza password.
- Security impact:
  - Bloquea doble uso bajo requests concurrentes (race/replay).

## Test coverage added/updated

- File: `Backend/tests/auth-password-reset-otp.test.js`
- Added:
  - `should return safe success response when mailer fails for existing email`
  - `should allow only one successful reset under concurrent replay attempts`
- Updated:
  - Assertions de subject/copy y template para reflejar strings actuales.

## Validation executed

- `npm test -- auth-password-reset-otp.test.js` -> PASS (10/10)
- `npm test -- auth.test.js proRole.test.js` -> PASS (28/28)

## Learning recorded for prevention

Three concrete lessons extracted:

1. Nunca usar `Math.random()` para secretos de autenticación.
2. Endpoints de recuperación deben permanecer semanticamente indistinguibles incluso con errores internos de notificación.
3. Flujos one-time token requieren consumo atómico en DB (`UPDATE ... WHERE used=0`) para evitar race conditions.

## Final verdict

`HARDENED`
