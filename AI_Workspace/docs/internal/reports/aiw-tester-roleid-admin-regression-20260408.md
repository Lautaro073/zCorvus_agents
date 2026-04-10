# Role ID Admin Regression QA

- taskId: `aiw-tester-roleid-admin-regression-20260408-29`
- correlationId: `aiw-auth-role-assignment-20260408`
- agent: `Tester`
- date: `2026-04-08`
- status: `TEST_FAILED`

## Objective

Validar regresión de asignación de roles en registro de usuario tras fix backend, cubriendo `roles_id=1`, `roles_id=2`, `roles_id=3`, inválido y omitido, además de permisos derivados.

## Acceptance criteria matrix

1. `roles_id=1` persiste admin y autorización acorde -> **PASS**
2. `roles_id=2` y `roles_id=3` mantienen comportamiento esperado -> **PASS**
3. `roles_id` inválido devuelve error controlado sin crear usuario -> **FAIL**
4. Dictamen final con evidencia reproducible -> **PASS**

## Context7

Context7 not required.

Motivo: la validación se hizo sobre lógica interna de negocio y contratos propios del backend (`auth.controller`, `express-validator`, tests Jest/Supertest) sin introducir decisiones nuevas dependientes de API externa.

## Executed checks

Command:

- `npm test -- auth.test.js proRole.test.js`

Result:

- Suites: `2 passed / 2 total`
- Tests: `29 passed / 29 total`

## Failure details (blocking)

### Failure: `roles_id` inválido no retorna error, cae en fallback silencioso

- Severity: `high` (violación explícita de acceptance criteria)
- Expected:
  - `roles_id` inválido (ej. string no numérico o entero fuera del dominio permitido) debe devolver error controlado (4xx) y no crear usuario.
- Actual:
  - `roles_id` inválido entero (`roles_id=999`) no devuelve error y crea usuario como `user` por fallback.
  - En `auth.controller.register`, `resolveRegisterRoleId` degrada cualquier entero distinto de `1` a `2`.
- Root cause:
  - Inconsistencia entre criterio de QA actual y la implementación: el backend mantiene diseño de compatibilidad/fallback (excepto validación de formato).
  - Referencia: `Backend/controllers/auth.controller.js:31`.
  - Adicionalmente, `registerValidation` acepta cualquier entero `>=1`; no restringe dominio estricto ni fuerza error para 999.
  - Referencia: `Backend/utils/validators.js:42`.

## Reproduction steps

1. Ejecutar request:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"qa_invalid_role_999",
    "email":"qa_invalid_role_999@test.com",
    "password":"password123",
    "confirmPassword":"password123",
    "roles_id":999
  }'
```

2. Observar respuesta `201` y creación de usuario.
3. Verificar en DB que `roles_id` persiste como `2` (fallback), en lugar de error 4xx sin alta.

## Notes on passed checks

- `roles_id=1`:
  - `auth.test.js` confirma persistencia `roles_id=1` y `user.role='admin'`.
- `roles_id` omitido:
  - `proRole.test.js` confirma default `user` (`roles_id=2`).
- `roles_id=3`:
  - `proRole.test.js` confirma que no escala a pro en registro y queda en `user` (fallback previsto).

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-roleid-admin-regression-20260408.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-fix-register-roleid-admin-20260408.md`
- `Backend/controllers/auth.controller.js`
- `Backend/utils/validators.js`
- `Backend/tests/auth.test.js`
- `Backend/tests/proRole.test.js`

## Verdict

`TEST_FAILED`

El gate no puede aprobarse porque el AC exige error explícito en `roles_id` inválido, y el comportamiento actual aplica fallback silencioso para enteros fuera de dominio.
