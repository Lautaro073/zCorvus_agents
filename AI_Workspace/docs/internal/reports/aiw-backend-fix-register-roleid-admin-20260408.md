# Backend Fix Register roles_id=1 Admin Persistence

- Task ID: `aiw-backend-fix-register-roleid-admin-20260408-28`
- Correlation ID: `aiw-auth-role-assignment-20260408`
- Date: 2026-04-08
- Agent: Backend

## Objective

Corregir bug en alta de usuario para que cuando el registro recibe `roles_id=1`, el usuario se persista como admin y no se degrade por fallback a user.

## Root cause

- En `auth.controller.register`, el código forzaba siempre `roleId = 2`, ignorando cualquier `roles_id` recibido.
- Esto causaba que una solicitud válida con `roles_id=1` terminara persistiendo usuario con rol user (`roles_id=2`).

## Changes implemented

### 1) Register role resolution

- Updated `Backend/controllers/auth.controller.js`:
  - Added `resolveRegisterRoleId(rawRoleId)` helper.
  - New behavior:
    - No `roles_id` -> default `2`.
    - `roles_id = 1` -> preserve `1` (admin).
    - Any non-integer or other integer value -> fallback `2`.
  - Wired helper inside `register` before `User.create`.

### 2) Regression test for admin persistence

- Updated `Backend/tests/auth.test.js`:
  - Added `should preserve admin role when registering with roles_id=1`.
  - Asserts:
    - HTTP `201`
    - response `user.role === 'admin'`
    - persisted DB user has `roles_id === 1`

## Validation

- Run: `npm test -- auth.test.js proRole.test.js`
- Result: PASS
  - `auth.test.js`: 20/20
  - `proRole.test.js`: 9/9

## Notes

- Existing behavior from `proRole.test.js` remains: attempting to register with `roles_id=3` does not escalate to pro and remains/falls back to user.

## Final verdict

`IMPLEMENTED`
