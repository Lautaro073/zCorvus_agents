# Frontend Visual Breakage Triage

- Task ID: `aiw-frontend-visual-breakage-triage-20260405-11`
- Correlation ID: `aiw-frontend-ux-theme-persistence-20260404`
- Date: 2026-04-05
- Agent: Frontend

## Objective

Investigate the user-reported visual breakage after the recent theme/home/icons/premium work, reproduce it in real user states, and fix it if real.

## Investigation summary

The prior deep audit passed because it only covered the **public** home route. It did not cover the **authenticated** home header variant used by real users.

### Reproduction found

- Route: `/es`
- State: authenticated premium user
- Viewports affected: desktop Chromium and mobile Chromium
- Themes affected: light and dark

### Root cause

Home used a full-height flex column with `justify-center` in `Frontend/src/app/[locale]/page.tsx`.

When the authenticated header variant rendered a longer profile trigger, total page content height exceeded the viewport. Because the page was vertically centered inside a fixed-height container, the header was pushed above the visible viewport.

The issue was amplified by `UserProfileCard` not being responsive enough for long usernames and by a fixed-width popover (`500px`) that was unsafe for narrow screens.

## Evidence

### Before fix

Targeted repro test added and run first:

```bash
pnpm exec playwright test tests/e2e/home-auth-visual.spec.ts --project mobile-chromium
```

Failure evidence before fix:

- Playwright could resolve `button[aria-label="User profile"]` but could not click it because it was **outside of the viewport**.
- Measured authenticated mobile trigger box before fix:
  - viewport: `390x664`
  - trigger box: `x=102.44`, `y=-350.09`, `width=271.56`, `height=36`
- After an intermediate responsive patch on `UserProfileCard`, desktop still reproduced:
  - trigger box `y=-197`

This confirmed the primary bug was page-level vertical centering, not only the profile control width.

### After fix

Validated with:

```bash
pnpm exec playwright test tests/e2e/home-auth-visual.spec.ts --project desktop-chromium --project mobile-chromium
pnpm exec playwright test tests/e2e/visual-regression-deep.spec.ts
pnpm lint
pnpm build
```

Results:

- `home-auth-visual.spec.ts`: **4/4 PASS**
- `visual-regression-deep.spec.ts`: **32/32 PASS**
- `pnpm lint`: PASS with unrelated pre-existing warnings only
- `pnpm build`: PASS

## Fix applied

### `Frontend/src/app/[locale]/page.tsx`

- Removed vertical centering of the entire home page by changing the root layout from centered to top-aligned.
- Kept the header container shrink-safe with `w-full min-w-0` behavior for the profile area.

### `Frontend/src/features/user/components/UserProfileCard.tsx`

- Made the trigger responsive with truncation for long usernames.
- Kept sign-in and profile buttons within available width.
- Made the popover width viewport-safe using `min(500px, calc(100vw - 2rem))`.
- Switched popover internals to responsive stacking on narrow screens.
- Added safer wrapping for username/email content.

## Impact assessment

- **Home:** bug reproduced and fixed for authenticated users.
- **Icons / Premium:** revalidated via deep visual regression after the fix; no new visual breakage found.
- **Theme behavior:** unaffected; light/dark remained correct during regression runs.

## Files changed

- `Frontend/src/app/[locale]/page.tsx`
- `Frontend/src/features/user/components/UserProfileCard.tsx`
- `Frontend/tests/e2e/home-auth-visual.spec.ts`

## Final verdict

`FIXED`
