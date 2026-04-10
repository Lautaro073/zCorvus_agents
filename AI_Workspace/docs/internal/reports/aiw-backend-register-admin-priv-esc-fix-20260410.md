# Backend Public Register Privilege Escalation Fix

- Task ID: `aiw-backend-register-admin-priv-esc-fix-20260410-52`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-10
- Agent: Backend

## Objective

Endurecer `POST /api/auth/register` para que el alta publica no pueda crear admins ni otros roles privilegiados mediante payload `roles_id` o `role`.

## Root cause

- El flujo de registro publico seguia aceptando `roles_id=1`, lo que permitia crear admins desde signup.
- El campo `role` no estaba explicitamente bloqueado, por lo que el contrato era ambiguo para payloads privilegiados.

## Fix

- Updated `Backend/controllers/auth.controller.js`:
  - public signup allowlist reducida a `roles_id=2` solamente.
  - `roles_id=1`, `roles_id=3`, valores invalidos, arrays y booleans -> `400`.
  - `role` con cualquier valor no vacio -> `400` (`Public signup cannot assign privileged roles`).
  - signup sin `roles_id` mantiene default seguro `user`.

## Tests

- Updated `Backend/tests/auth.test.js`:
  - reject admin escalation via `roles_id=1`
  - reject privileged `role` field
- Updated `Backend/tests/proRole.test.js`:
  - public register with `roles_id=3` now rejects with `400` and does not create user.

## Validation

- `npm test -- auth.test.js proRole.test.js` -> PASS (`32/32`)

## Artifacts

- `Backend/controllers/auth.controller.js`
- `Backend/tests/auth.test.js`
- `Backend/tests/proRole.test.js`
- `AI_Workspace/docs/internal/reports/aiw-backend-register-admin-priv-esc-fix-20260410.md`

## Final verdict

`IMPLEMENTED`
