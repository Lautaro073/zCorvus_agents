# Frontend Admin CLS Stability Mitigation

- Task ID: `aiw-frontend-admin-cls-stability-mitigation-20260407-16`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Mitigate P1 CLS instability on `/[locale]/admin` by reserving stable layout geometry during async data loading, especially for KPI and table sections.

## Correlated evidence reviewed

- Regate report:
  - `AI_Workspace/docs/internal/reports/aiw-optimizer-admin-panel-perf-regate-20260407.md`
  - Identified CLS P1 spikes caused by late vertical expansion when loading admin sections.

## Root cause in UI structure

The admin page rendered compact placeholders and then expanded significantly once async data arrived:

- KPI cards switched from loading to final card grid with different effective height.
- Users and subscriptions blocks switched from short single skeletons to full tables.
- Metrics list switched from fixed loading state to variable-length time-series rows.

These transitions changed document flow after first paint, producing layout shifts.

## Mitigation applied

Updated `Frontend/src/app/[locale]/admin/page.tsx` with geometry-stable loading patterns:

1. Added a reusable `TableSkeleton` component to mimic table row density instead of a single short block.
2. Added section-level minimum heights for KPI, users, subscriptions, and metrics content containers.
3. Converted users/subscriptions cards to `flex` columns with stable vertical space reservation.
4. Kept loading/error/empty/success states inside the same reserved content container to avoid abrupt growth.

## Validation

- `npm run build`: PASS
- `npm run lint`: FAIL (pre-existing repo issues unrelated to this task)
  - Legacy `require()` usage in `Frontend/.perf/admin-regate/*.js`
  - Existing warnings in unrelated files (`UnifiedIcon.tsx`, `IconGridList.tsx`, `usePremiumAccess.tsx`, `app.store.ts`)

## Files changed

- `Frontend/src/app/[locale]/admin/page.tsx`

## Acceptance criteria mapping

1. Reserve stable geometry for async admin sections: ✅
2. Keep loading/final states close in layout footprint: ✅
3. Avoid introducing auth/data contract changes: ✅
4. Build remains healthy: ✅

## Final verdict

`IMPLEMENTED`
