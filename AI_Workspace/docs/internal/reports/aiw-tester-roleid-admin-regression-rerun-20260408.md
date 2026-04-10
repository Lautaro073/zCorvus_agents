# Role ID Admin Regression Rerun QA

- taskId: `aiw-tester-roleid-admin-regression-rerun-20260408-31`
- correlationId: `aiw-auth-role-assignment-20260408`
- agent: `Tester`
- date: `2026-04-08`
- status: `TEST_PASSED`

## Objective

Re-ejecutar la regresión de asignación de roles tras fix de manejo de `roles_id` inválido para emitir dictamen final del gate.

## Acceptance criteria matrix

1. `roles_id=1` persiste admin y permisos acordes -> **PASS**
2. `roles_id=2` y `roles_id=3` permanecen correctos -> **PASS**
3. `roles_id` inválido no crea usuario y devuelve `400` controlado -> **PASS**
4. Dictamen final con evidencia reproducible -> **PASS**

## Context7

Context7 not required.

Motivo: validación de reglas de negocio y contratos internos del backend (`auth.controller`, `validators`, Jest/Supertest), sin decisiones nuevas dependientes de APIs de framework externas.

## Executed checks

### A) Regression suites

Command:

- `npm test -- auth.test.js proRole.test.js`

Result:

- Suites: `2 passed / 2 total`
- Tests: `31 passed / 31 total`

### B) Reproduction probe (invalid roles_id)

Command (node + supertest inline):

- `POST /api/auth/register` con `roles_id=999`

Observed output:

- `status: 400`
- `message: "Invalid roles_id. Allowed values: 1, 2, 3"`
- `userCreated: false`

## Findings

- `roles_id=1` mantiene persistencia admin (cobertura en `auth.test.js`).
- `roles_id=2` y omitido mantienen comportamiento user por defecto.
- `roles_id=3` conserva política existente en registro (normaliza a user) sin regresión colateral en suite `proRole`.
- `roles_id` inválido numérico/tipo incorrecto ahora falla con `400` y no crea usuario.

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-roleid-admin-regression-rerun-20260408.md`
- `AI_Workspace/docs/internal/reports/aiw-backend-fix-roleid-invalid-handling-20260408.md`
- `Backend/controllers/auth.controller.js`
- `Backend/utils/validators.js`
- `Backend/tests/auth.test.js`
- `Backend/tests/proRole.test.js`

## Verdict

`TEST_PASSED`

Gate de regresión de asignación de roles aprobado para el alcance definido.
