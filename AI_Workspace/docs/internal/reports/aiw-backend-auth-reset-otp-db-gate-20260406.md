# Backend Auth Reset OTP - DB Gate Report

**taskId:** aiw-backend-auth-reset-otp-db-gate-20260406-38  
**correlationId:** aiw-auth-register-reset-otp-20260406  
**date:** 2026-04-06

## Scope
- Implementar `confirmPassword` en register.
- Implementar reset password por OTP con nodemailer.
- Dejar tests listos y pausar antes de suite completa hasta migración DB manual del usuario.

## Backend Changes Implemented
- `Backend/utils/validators.js`
  - `confirmPassword` obligatorio en register.
  - Nuevas validaciones: request OTP, verify OTP, reset with OTP.
- `Backend/controllers/auth.controller.js`
  - `requestPasswordResetOtp`
  - `verifyPasswordResetOtp`
  - `resetPasswordWithOtp`
  - Integración con `nodemailer` vía utilitario.
- `Backend/routes/auth.routes.js`
  - Nuevos endpoints:
    - `POST /api/auth/password-reset/request-otp`
    - `POST /api/auth/password-reset/verify-otp`
    - `POST /api/auth/password-reset/reset-with-otp`
  - Swagger actualizado para register y password reset.
- `Backend/models/PasswordResetOtp.js`
  - Persistencia OTP hasheado, expiración y consumo one-time.
- `Backend/models/index.js`
  - Registro del modelo `PasswordResetOtp`.
- `Backend/utils/mailer.js`
  - Wrapper de envío con `nodemailer` usando variables de entorno.
- `Backend/templates/password-reset-otp.html.js`
- `Backend/templates/password-reset-otp.text.js`
- `Backend/config/config.js`
  - Configuración `mail` y `auth.passwordResetOtpMinutes`.
- `Backend/package.json` + `Backend/package-lock.json`
  - Dependencia `nodemailer`.
- `Backend/database.sql`
  - Tabla nueva `password_reset_otps`.

## Test Status
- `node --check` ejecutado sobre archivos modificados: PASS.
- `npm test -- auth-password-reset-otp.test.js` ejecutado para validar wiring:
  - Resultado esperado por gate: falla por esquema faltante en runtime actual (`no such table: password_reset_otps`).
  - Esto confirma que se requiere migración DB antes de ejecutar suite completa.

## DB Migration Required (User Action)
Aplicar en la base real la tabla declarada en `Backend/database.sql`:

```sql
CREATE TABLE password_reset_otps (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_password_reset_otps_user_id (user_id),
  INDEX idx_password_reset_otps_expires_at (expires_at),
  INDEX idx_password_reset_otps_used (used)
);
```

## Ready-After-Migration Test Plan
- `npm test -- auth-password-reset-otp.test.js`
- `npm test -- auth.test.js`
- `npm test -- proRole.test.js`

## Gate Conclusion
- Código y tests quedaron implementados/listos.
- Se publica checkpoint de bloqueo controlado esperando migración DB manual del usuario antes de continuar con validación final.
