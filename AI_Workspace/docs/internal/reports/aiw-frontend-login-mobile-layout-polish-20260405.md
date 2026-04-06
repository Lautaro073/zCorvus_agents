# Frontend Login Mobile Layout Polish

- Task ID: `aiw-frontend-login-mobile-layout-polish-20260405-18`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-05
- Agent: Frontend

## Objective

Improve login on mobile so it feels intentional and readable, without changing the authentication flow or damaging the desktop layout the user already preferred.

## User feedback addressed

- Login mobile felt visually weak and improvised.
- After an initial attempt, desktop login should go back to the prior structure while keeping the mobile polish.

## Root cause

- Mobile inherited the desktop split-auth layout too directly, making the form feel cramped.
- The initial polish also changed desktop presentation more than the user wanted.
- After desktop was partially restored, the auth layout still had a hidden regression: the desktop icon columns were no longer height-constrained, so the animated strips expanded to full content height and generated a very large page scroll.

## Fix applied

### `Frontend/src/app/[locale]/auth/layout.tsx`

- Kept a mobile-first auth shell with better rhythm and visible controls.
- Restored the prior desktop structure more closely:
  - brand anchor in the corner
  - large `Z-ICONS` left column
  - controls in the original desktop area
  - animated icon columns back on desktop
- Reopened and fixed the desktop regression by constraining the auth shell to the available viewport height on large screens so the animated columns stay clipped instead of stretching the whole page.

### `Frontend/src/app/[locale]/auth/login/page.tsx`

- Mobile login now uses a clearer card-style form with stronger spacing and hierarchy.
- Desktop login reverts to the previous lighter feel by removing the heavy card treatment at `lg` and hiding extra labels visually there.
- 2FA state remains clearer on mobile without changing auth logic.

## Validation

```bash
pnpm exec playwright test tests/e2e/home-auth-visual.spec.ts --project desktop-chromium --project mobile-chromium
pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project desktop-chromium --project mobile-chromium --grep "home|auth-login"
pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts --project desktop-chromium --project mobile-chromium
pnpm lint
pnpm build
```

Results:

- `home-auth-visual.spec.ts`: **4/4 PASS**
- `visual-regression-deep.spec.ts --grep "home|auth-login"`: **8/8 PASS**
- `visual-regression-deep.spec.ts`: **32/32 PASS**
- `pnpm lint`: PASS with unrelated pre-existing warnings only
- `pnpm build`: PASS

Additional measured evidence after the final fix:

- Desktop login viewport height: `720`
- Final document height: `720`
- Vertical overflow: `0`

## Files changed

- `Frontend/src/app/[locale]/auth/layout.tsx`
- `Frontend/src/app/[locale]/auth/login/page.tsx`

## Final verdict

`FIXED`
