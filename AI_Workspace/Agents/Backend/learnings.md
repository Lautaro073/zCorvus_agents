## 2026-03-23 - initialization
- Trigger: PROJECT_BOOTSTRAPPED
- Regla aprendida: Usar Express Validator siempre, y siempre revisar `learnings.md` en estado `accepted`.
- Prevencion futura: En todo PR revisar si hay nuevos learnings consolidados.

## 2026-04-07 - otp-security-hardening
- Trigger: `aiw-backend-auth-otp-security-hardening-20260407-46`
- Regla aprendida 1: secretos one-time (OTP/reset) deben generarse con CSPRNG (`crypto.randomInt`), nunca con `Math.random`.
- Regla aprendida 2: endpoints de recuperación deben responder de forma indistinguible aun con fallos internos (mailer/downstream) para evitar enumeración.
- Regla aprendida 3: consumo de OTP/token de un solo uso debe ser atómico en DB (`UPDATE ... WHERE used=0`) para bloquear replay concurrente.
- Prevencion futura: en cualquier feature auth/recovery, incluir checklist obligatorio de (a) RNG criptográfico, (b) respuesta anti-enumeración y (c) test de race/reuse.
