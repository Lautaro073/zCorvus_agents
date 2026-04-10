# Backend Fix Invalid roles_id Handling

- Task ID: `aiw-backend-fix-roleid-invalid-handling-20260408-30`
- Correlation ID: `aiw-auth-role-assignment-20260408`
- Date: 2026-04-08
- Agent: Backend

## Objective

Corregir el manejo de `roles_id` inválido en registro para que retorne error controlado (`400`) y no cree usuario bajo fallback implícito.

## Root cause

- El flujo de `register` aceptaba cualquier entero y aplicaba fallback silencioso a `roles_id=2` para valores fuera de dominio (ej: `999`).
- Además, la validación de `roles_id` en `registerValidation` devolvía `Validation errors` para algunos tipos (ej: string), lo que rompía la consistencia de mensaje esperado para este caso de negocio.

## Changes implemented

### 1) Domain validation and explicit error in controller

- Updated `Backend/controllers/auth.controller.js`:
  - Added `INVALID_REGISTER_ROLE_MESSAGE` (`Invalid roles_id. Allowed values: 1, 2, 3`).
  - Hardened `resolveRegisterRoleId(rawRoleId)`:
    - `undefined | null | ''` -> default `2`.
    - arrays / booleans -> error.
    - non-integer values -> error.
    - integers outside `[1,2,3]` -> error.
    - `1` -> preserve admin (`1`), `2|3` -> normalize to user (`2`) per existing policy.
  - In `register`, if resolver returns `error`, respond `400` and stop before `User.create`.

### 2) Prevent validator conflict for roles_id in register

- Updated `Backend/utils/validators.js`:
  - Removed `roles_id` field-level validator from `registerValidation`.
  - This allows controller-level domain validation to return a consistent business message for invalid `roles_id` cases.

### 3) Regression coverage for invalid roles_id

- Updated `Backend/tests/auth.test.js` with two new tests:
  - invalid numeric domain (`roles_id=999`) -> `400`, message matches `invalid roles_id`, user is not created.
  - invalid type (`roles_id='admin'`) -> `400`, message matches `invalid roles_id`, user is not created.

## Acceptance criteria check

1. `roles_id` inválido retorna `400` y no persiste usuario -> **PASS**
2. `roles_id=1/2/3` sin regresión -> **PASS**
   - `1` preserva admin.
   - `2` y omitido mantienen user por defecto.
   - `3` mantiene comportamiento previo (normaliza a user en registro).
3. `roles_id` omitido mantiene comportamiento explícito -> **PASS**
4. Tests cubren inválido numérico y tipo incorrecto -> **PASS**

## Context7

Context7 not required.

Reason: this fix is internal business-validation logic in project-owned auth/controller and Jest/Supertest tests; no external library API decision was needed.

## Validation

- Command: `npm test -- auth.test.js proRole.test.js`
- Result: PASS
  - Test Suites: `2 passed / 2 total`
  - Tests: `31 passed / 31 total`

## Artifacts

- `Backend/controllers/auth.controller.js`
- `Backend/utils/validators.js`
- `Backend/tests/auth.test.js`
- `AI_Workspace/docs/internal/reports/aiw-backend-fix-roleid-invalid-handling-20260408.md`

## Final verdict

`IMPLEMENTED`
