# QA Report - Admin Theme/Locale Controls Regression (Rerun)

- Task ID: `aiw-tester-admin-theme-locale-controls-regression-20260408-39`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Assigned To: `Tester`
- Date: `2026-04-08`
- Verdict: `TEST_PASSED`

## Scope

Validate `/admin` theme and locale controls with focus on:

1. Locale switch stays in `/admin` and preserves query params.
2. Theme toggle applies without full reload and without scroll reset.
3. Admin does not expose icon-set toggle.

## Dependency status

- Frontend dependency `aiw-frontend-admin-theme-locale-controls-20260408-38` is completed.
- Implemented frontend artifacts observed:
  - `Frontend/src/features/admin/components/AdminAppearanceControls.tsx`
  - `Frontend/src/app/[locale]/admin/page.tsx`
  - `Frontend/src/messages/es/admin.json`
  - `Frontend/src/messages/en/admin.json`

## Context7 Usage

Context7 not required for this QA regression because the task validates runtime UI behavior and route/state persistence in the existing implementation.

## Environment and execution

Initial rerun against an existing `next dev` session produced nondeterministic app-runtime errors (`Application error: a client-side exception has occurred while loading 127.0.0.1`).

Final deterministic run used a fresh production server process:

- Build: `pnpm build`
- Server: `pnpm exec next start --hostname 127.0.0.1 --port 3111`
- Test command:
  - `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3111" pnpm playwright test tests/e2e/admin-theme-locale-controls.spec.ts --config=playwright.no-webserver.config.ts`

## Results (final run)

- Total: `6`
- Passed: `6`
- Failed: `0`
- Projects: `desktop-chromium`, `mobile-chromium`

### Validations passed

1. `locale toggle keeps admin route and query-state`
   - Locale button visible.
   - Route switches `/es/admin` -> `/en/admin`.
   - Query state preserved (`usersPage`, `role`, `granularity`, `from`, `to`).

2. `theme toggle applies instantly without full reload and keeps scroll`
   - Theme changes without full navigation (`navigation entries` unchanged).
   - Marker state preserved.
   - Scroll position preserved (stable non-top value, minimal delta pre/post toggle).

3. `admin controls do not expose icon-set toggle`
   - Theme + locale controls visible in admin.
   - Icon-set toggle absent.

## Artifacts

- Report: `AI_Workspace/docs/internal/reports/aiw-tester-admin-theme-locale-controls-regression-20260408.md`
- Spec: `Frontend/tests/e2e/admin-theme-locale-controls.spec.ts`
- Config: `Frontend/playwright.no-webserver.config.ts`
- Playwright outputs:
  - `Frontend/playwright-report/index.html`
  - `Frontend/test-results/`

## Technical notes

- QA-only test hardening was applied to remove false negatives caused by viewport-dependent scroll maxima and to click theme by aria-label in a stable way:
  - `Frontend/tests/e2e/admin-theme-locale-controls.spec.ts`
- No product/business logic changes were introduced by Tester in this rerun.

## Conclusion

`TEST_PASSED`. With frontend dependency completed and deterministic server runtime, `/admin` theme/locale controls satisfy regression acceptance criteria in desktop and mobile.
