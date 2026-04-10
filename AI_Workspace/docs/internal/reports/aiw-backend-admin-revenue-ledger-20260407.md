# Backend Admin Revenue Ledger

- Task ID: `aiw-backend-admin-revenue-ledger-20260407-02`
- Correlation ID: `aiw-admin-control-panel-20260407`
- Date: 2026-04-07
- Agent: Backend

## Objective

Implementar ledger de ventas para métricas admin con idempotencia de `checkout.session.completed` y backfill legacy con modo dry-run.

## Changes implemented

### 1) Ledger schema contract (`sale_events`)

- Updated `Backend/database.sql`:
  - Added table `sale_events` with required fields:
    - `id`, `stripe_event_id`, `stripe_session_id` (unique), `stripe_customer_id`, `stripe_subscription_id`
    - `user_id`, `user_email`, `plan_type`, `currency`
    - `amount_subtotal_cents`, `amount_total_cents`, `amount_tax_cents`, `amount_discount_cents`
    - `status`, `paid_at`, `source`, `payload_json`, timestamps
  - Added indexes:
    - `idx_sale_events_paid_at`
    - `idx_sale_events_status`
    - `idx_sale_events_user_id`

### 2) Stripe webhook idempotency + ledger integration

- Updated `Backend/controllers/stripe.controller.js`:
  - Added runtime schema ensure (`CREATE TABLE IF NOT EXISTS sale_events` + indexes).
  - Added deterministic mapping from Stripe session to ledger row.
  - Insert into ledger before token assignment.
  - Idempotency behavior:
    - Unique conflict on `stripe_session_id` returns successful idempotent response without duplicating token assignment.
  - Added rollback safety:
    - If token assignment fails after ledger insert, delete inserted ledger row by `stripe_session_id`.
  - Normalized plan type handling (`pro|enterprise`, fallback `pro`) and centralized amount mapping.

### 3) Legacy backfill script

- Added `Backend/scripts/backfill-admin-sales-ledger.js`:
  - Reads legacy paid tokens joined with users.
  - Creates synthetic session ids: `legacy-token-{token_id}`.
  - Inserts into `sale_events` with `source=backfill_legacy`.
  - Supports `--dry-run` and `--limit`.
  - Skips already existing ledger rows by `stripe_session_id`.

- Updated `Backend/package.json` scripts:
  - `db:backfill:admin-sales-ledger`
  - `db:backfill:admin-sales-ledger:dry`

### 4) Tests

- Updated `Backend/tests/stripe.controller.test.js`:
  - Adds planType normalization assertion.

- Added `Backend/tests/stripe.webhook.ledger.test.js`:
  - Verifies idempotent duplicate session behavior.
  - Verifies normal ledger+token path.
  - Verifies rollback delete on downstream failure.

## Validation

- `npm run db:backfill:admin-sales-ledger:dry`:
  - Output: `{ "dryRun": true, "scanned": 14, "inserted": 14, "skippedExisting": 0 }`

- `npm test -- stripe.controller.test.js stripe.webhook.ledger.test.js` -> PASS
- `npm test -- admin.routes.test.js auth.test.js health.test.js` -> PASS

## Acceptance criteria mapping

- `sale_events` created with required fields: ✅
- `idx_sale_events_paid_at` created: ✅
- `idx_sale_events_status` created: ✅
- Stripe webhook idempotent on `stripe_session_id`: ✅
- Backfill supports dry-run: ✅
- Ledger empty compatibility (schema ensured + robust insert path): ✅

## Final verdict

`IMPLEMENTED`
