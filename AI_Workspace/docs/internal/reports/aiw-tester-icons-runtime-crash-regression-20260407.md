# Icons Runtime Crash Regression

- Task ID: `aiw-tester-icons-runtime-crash-regression-20260407-49`
- Correlation ID: `aiw-auth-register-reset-otp-20260406`
- Date: 2026-04-07
- Agent: Tester

## Objective

Validar que el fix de inicializacion i18n elimina el crash `cannot access getRequestConfig before initialization` en rutas `/icons` para `es/en`, y que la navegacion a subrutas mantiene locale.

## Acceptance criteria

1. Abrir `/es/icons` y `/en/icons` no arroja runtime error `getRequestConfig before initialization`.
2. Las rutas `/icons/[type]/all` y `/icons/[type]/[id]` abren y navegan con locale correcto.
3. Evidencia reproducible con dictamen PASS/FAILED.

## Executed validation

### 1) Source audit of i18n fix

Reviewed:

- `Frontend/src/i18n/request.ts`
- `Frontend/src/i18n/server.ts`

Result:

- `request.ts` importa `getRequestConfig` directamente desde `next-intl/server`.
- `server.ts` ya no reexporta `getRequestConfig`.
- El riesgo de ciclo de inicializacion entre request/server i18n queda mitigado.

### 2) Route availability smoke

Runtime checks against active frontend server:

- `GET /es/icons` -> `200`
- `GET /en/icons` -> `200`

### 3) Icons visual regression slice

Command:

- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 PLAYWRIGHT_PORT=3000 pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project=desktop-chromium --project=mobile-chromium --grep "icons-index|icons-local-all|icons-local-core"`

Result:

- PASS (`12/12`).

### 4) Runtime crash regression checks (es/en + subroutes)

Playwright runtime probe over routes:

- `/es/icons`
- `/en/icons`
- `/es/icons/local/all`
- `/en/icons/local/all`
- `/es/icons/local/core`
- `/en/icons/local/core`

Assertions:

- No visible crash text `getRequestConfig before initialization`.
- Routes render expected content/links.
- Capturas full-page guardadas por ruta.

Result:

- PASS (0 crash matches).

### 5) Locale-preserving navigation

Validated from index pages:

- `/es/icons` -> `LOCAL / ALL` => `/es/icons/local/all`
- `/es/icons` -> `CORE` => `/es/icons/local/core`
- `/en/icons` -> `LOCAL / ALL` => `/en/icons/local/all`
- `/en/icons` -> `CORE` => `/en/icons/local/core`

Result:

- PASS (4/4).

## Observation (non-blocking)

- Browser console emitted repeated warning: `A component was suspended by an uncached promise...` during some route probes.
- This warning is not the target crash and did not break rendering or navigation in validated flows.

## Verdict

`TEST_PASSED`

## Artifacts

- `AI_Workspace/docs/internal/reports/aiw-tester-icons-runtime-crash-regression-20260407.md`
- `Frontend/test-results/icons-runtime-crash-regression/es_icons.png`
- `Frontend/test-results/icons-runtime-crash-regression/en_icons.png`
- `Frontend/test-results/icons-runtime-crash-regression/es_icons_local_all.png`
- `Frontend/test-results/icons-runtime-crash-regression/en_icons_local_all.png`
- `Frontend/test-results/icons-runtime-crash-regression/es_icons_local_core.png`
- `Frontend/test-results/icons-runtime-crash-regression/en_icons_local_core.png`
- `Frontend/test-results/visual-regression-deep`
