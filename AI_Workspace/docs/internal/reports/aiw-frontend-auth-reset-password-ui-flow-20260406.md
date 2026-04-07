# Frontend Auth Reset Password UI Flow

- Task ID: `aiw-frontend-auth-reset-password-ui-flow-20260406-35`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-06
- Agent: Frontend

## Objective

Align auth frontend with backend contract updates by:

- Sending `confirmPassword` in register requests.
- Implementing forgot/reset password UI flow with OTP in localized routes.
- Keeping i18n canonical and avoiding hardcoded UI copy.

## Backend contract used

From backend report and routes:

- `POST /api/auth/register` now requires `confirmPassword`.
- `POST /api/auth/password-reset/request-otp`.
- `POST /api/auth/password-reset/verify-otp`.
- `POST /api/auth/password-reset/reset-with-otp` with `email`, `otp`, `newPassword`, `confirmPassword`.

Reference read:

- `AI_Workspace/docs/internal/reports/aiw-backend-auth-reset-otp-db-gate-20260406.md`
- `Backend/routes/auth.routes.js`
- `Backend/utils/validators.js`

## Changes applied

### 1) Register flow aligned with confirmPassword

- `Frontend/src/lib/api/backend.ts`
  - Updated `register(username, email, password, confirmPassword)` signature.
  - Payload now includes `confirmPassword`.

- `Frontend/src/contexts/AuthContext.tsx`
  - Updated `register` contract and implementation to pass `confirmPassword`.

- `Frontend/src/app/[locale]/auth/signup/page.tsx`
  - Register call now sends `formData.confirmPassword`.

- `Frontend/src/app/[locale]/auth/register/page.tsx`
  - Register call now sends `formData.confirmPassword`.

### 2) OTP password reset client API methods

- `Frontend/src/lib/api/backend.ts`
  - Added `requestPasswordResetOtp(email)`.
  - Added `verifyPasswordResetOtp(email, otp)`.
  - Added `resetPasswordWithOtp(email, otp, newPassword, confirmPassword)`.
  - Added `PasswordResetOtpVerifyResponse` type.

### 3) Forgot password UI flow

- Added route:
  - `Frontend/src/app/[locale]/auth/forgot-password/page.tsx`

Implemented 3-step flow in one screen:

- Step `request`: email + send OTP.
- Step `verify`: OTP validation (client rule: required + 6 digits).
- Step `reset`: new password + confirm new password, then submit reset.

UX behaviors:

- Loading states integrated with canonical `common.actions.loading`.
- Toast success/error messaging with i18n keys.
- Keyboard-friendly single form progression and focusable controls.
- No hardcoded visible copy.

### 4) Login navigation entry to forgot password

- `Frontend/src/app/[locale]/auth/login/page.tsx`
  - Added link to `/auth/forgot-password` using `auth.actions.forgotPassword`.

### 5) i18n additions (es/en)

- `Frontend/src/messages/es/auth.json`
- `Frontend/src/messages/en/auth.json`

Added keys for:

- actions: forgot password + OTP actions + back to login.
- forgotPassword screen labels/placeholders.
- success states: otp sent/verified, password reset success.
- errors: otp required/length + request/verify/reset failures.

## Validation

- Static usage check for updated register signature and OTP methods: PASS.
- `npm run lint`: PASS with unrelated pre-existing warnings only.
- `npm run build`: PASS.
- Build routes confirm page generated:
  - `/[locale]/auth/forgot-password`

## Files changed

- `Frontend/src/lib/api/backend.ts`
- `Frontend/src/contexts/AuthContext.tsx`
- `Frontend/src/app/[locale]/auth/signup/page.tsx`
- `Frontend/src/app/[locale]/auth/register/page.tsx`
- `Frontend/src/app/[locale]/auth/login/page.tsx`
- `Frontend/src/app/[locale]/auth/forgot-password/page.tsx`
- `Frontend/src/messages/es/auth.json`
- `Frontend/src/messages/en/auth.json`

## Final verdict

`FIXED`

---

## Follow-up Task: OTP locale propagation (`aiw-frontend-otp-locale-propagation-20260406-40`)

### Objective

Propagate active UI locale (`es`/`en`) through forgot-password OTP API requests so backend can trace and render localized OTP email content consistently.

### Changes applied

- `Frontend/src/lib/api/backend.ts`
  - Added explicit locale parameter (`'es' | 'en'`) to:
    - `requestPasswordResetOtp(email, locale)`
    - `verifyPasswordResetOtp(email, otp, locale)`
    - `resetPasswordWithOtp(email, otp, newPassword, confirmPassword, locale)`
  - Requests now send locale in both:
    - headers: `Accept-Language`, `X-Locale`
    - body: `locale`

- `Frontend/src/app/[locale]/auth/forgot-password/page.tsx`
  - Wired locale from route context via `useLocale().currentLocale`.
  - Passed locale to request/verify/reset OTP calls.

### Validation

- Static call-site check: all forgot-password OTP actions now include locale argument.
- `npm run lint`: PASS with unrelated pre-existing warnings only.
- `npm run build`: PASS.

### Files impacted by follow-up

- `Frontend/src/lib/api/backend.ts`
- `Frontend/src/app/[locale]/auth/forgot-password/page.tsx`
