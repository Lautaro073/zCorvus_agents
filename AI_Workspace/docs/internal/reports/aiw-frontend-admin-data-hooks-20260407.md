# Frontend Admin Data Hooks

- Task ID: `aiw-frontend-admin-data-hooks-20260407-07`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Frontend

## Objective

Implement the admin data layer in frontend with typed API functions and React Query hooks for:

- users
- subscriptions
- metrics

while ensuring cache-safe query keys, envelope-consistent parsing, and controlled 401 session-expired handling.

## Contract baseline used

- `Backend/docs/admin-api-contract.md`
- `GET /api/admin/users`
- `GET /api/admin/subscriptions`
- `GET /api/admin/metrics`

Envelope alignment:

- `success`, `data`, `pagination`, `filtersApplied`, `generatedAt`
- plus `summaryCounts` on subscriptions endpoint

## Changes applied

### 1) Typed admin API client functions

Updated `Frontend/src/lib/api/backend.ts`:

- Added full admin type model (no `any`):
  - params, filters, pagination, entities, metrics payloads
- Added reusable envelope parser + validators:
  - `parseAdminEnvelope`
  - `assertAdminEnvelope`
- Added admin fetch functions:
  - `getAdminUsers(params)`
  - `getAdminSubscriptions(params)`
  - `getAdminMetrics(params)`
- Added robust auth-aware error model:
  - `BackendApiError`
  - `isBackendApiError`
  - 401 normalization to `SESSION_EXPIRED`

### 2) React Query base integration

Added query infrastructure:

- `Frontend/src/lib/query/client.ts`
  - central `QueryClient` with retry policy
  - no retry on 401 responses
- `Frontend/src/lib/query/provider.tsx`
  - `ReactQueryProvider`
- `Frontend/src/app/[locale]/layout.tsx`
  - wired `ReactQueryProvider` under auth provider

### 3) Admin hooks with collision-safe query keys

Added hooks:

- `Frontend/src/features/admin/hooks/useAdminUsers.ts`
- `Frontend/src/features/admin/hooks/useAdminSubscriptions.ts`
- `Frontend/src/features/admin/hooks/useAdminMetrics.ts`

Shared behavior:

- query keys include normalized filters/pagination/sort
- 401 triggers controlled redirect to `'/auth/login?session=expired'`
- explicit derived state:
  - `loading`
  - `error`
  - `empty`
  - `success`

### 4) Feature exports

- `Frontend/src/features/admin/hooks/index.ts`
- `Frontend/src/features/admin/index.ts`

## Acceptance criteria mapping

1. Typed `getAdminUsers/getAdminSubscriptions/getAdminMetrics` without `any`: ✅
2. Query keys include filters/pagination/sort to avoid cache collisions: ✅
3. `loading/error/empty` differentiated explicitly: ✅
4. 401 triggers session-expired controlled redirect: ✅
5. Envelope contract parsed consistently (no ad-hoc per-hook parsing): ✅

## Validation

- `npm run lint`: PASS with unrelated pre-existing warnings only
- `npm run build`: PASS

## Files changed

- `Frontend/src/lib/api/backend.ts`
- `Frontend/src/lib/query/client.ts`
- `Frontend/src/lib/query/provider.tsx`
- `Frontend/src/app/[locale]/layout.tsx`
- `Frontend/src/features/admin/hooks/useAdminUsers.ts`
- `Frontend/src/features/admin/hooks/useAdminSubscriptions.ts`
- `Frontend/src/features/admin/hooks/useAdminMetrics.ts`
- `Frontend/src/features/admin/hooks/index.ts`
- `Frontend/src/features/admin/index.ts`

## Final verdict

`IMPLEMENTED`
