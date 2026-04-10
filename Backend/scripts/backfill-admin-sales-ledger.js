const dotenv = require('dotenv');
const { createClient } = require('@libsql/client');

dotenv.config();

const PLAN_PRICES_CENTS = {
    pro: 4900,
    enterprise: 9900
};

function resolvePlanType(planType) {
    return planType === 'enterprise' ? 'enterprise' : 'pro';
}

function toIsoDate(value) {
    if (!value) {
        return new Date().toISOString();
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
    }

    return date.toISOString();
}

function parseArgs(argv) {
    return {
        dryRun: argv.includes('--dry-run'),
        limit: (() => {
            const index = argv.indexOf('--limit');
            if (index === -1 || !argv[index + 1]) {
                return null;
            }

            const parsed = Number(argv[index + 1]);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        })()
    };
}

async function ensureSchema(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS sale_events (
            id TEXT PRIMARY KEY,
            stripe_event_id TEXT,
            stripe_session_id TEXT NOT NULL UNIQUE,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            user_id TEXT,
            user_email TEXT,
            plan_type TEXT NOT NULL DEFAULT 'pro',
            currency TEXT NOT NULL DEFAULT 'usd',
            amount_subtotal_cents INTEGER NOT NULL DEFAULT 0,
            amount_total_cents INTEGER NOT NULL DEFAULT 0,
            amount_tax_cents INTEGER NOT NULL DEFAULT 0,
            amount_discount_cents INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            paid_at DATETIME NOT NULL,
            source TEXT NOT NULL DEFAULT 'backfill_legacy',
            payload_json TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
        )
    `);

    await client.execute('CREATE INDEX IF NOT EXISTS idx_sale_events_paid_at ON sale_events(paid_at)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_sale_events_status ON sale_events(status)');
}

async function readLegacyRows(client, limit) {
    const limitClause = limit ? `LIMIT ${limit}` : '';
    return client.execute(`
        SELECT
            t.id AS token_id,
            t.type AS token_type,
            t.start_date,
            t.finish_date,
            u.id AS user_id,
            u.email AS user_email
        FROM token t
        INNER JOIN user u ON u.token_id = t.id
        ORDER BY t.start_date ASC
        ${limitClause}
    `);
}

function mapLegacyRowToSaleEvent(row) {
    const planType = resolvePlanType(String(row.token_type || 'pro'));
    const amountCents = PLAN_PRICES_CENTS[planType] || PLAN_PRICES_CENTS.pro;
    const stripeSessionId = `legacy-token-${row.token_id}`;

    return {
        id: `legacy-${row.token_id}`,
        stripeEventId: null,
        stripeSessionId,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        userId: row.user_id,
        userEmail: row.user_email,
        planType,
        currency: 'usd',
        amountSubtotalCents: amountCents,
        amountTotalCents: amountCents,
        amountTaxCents: 0,
        amountDiscountCents: 0,
        status: 'paid',
        paidAt: toIsoDate(row.start_date),
        source: 'backfill_legacy',
        payloadJson: JSON.stringify({
            tokenId: row.token_id,
            finishDate: toIsoDate(row.finish_date)
        })
    };
}

async function existsBySessionId(client, stripeSessionId) {
    const result = await client.execute({
        sql: 'SELECT stripe_session_id FROM sale_events WHERE stripe_session_id = ? LIMIT 1',
        args: [stripeSessionId]
    });
    return result.rows.length > 0;
}

async function insertSaleEvent(client, saleEvent) {
    await client.execute({
        sql: `
            INSERT INTO sale_events (
                id,
                stripe_event_id,
                stripe_session_id,
                stripe_customer_id,
                stripe_subscription_id,
                user_id,
                user_email,
                plan_type,
                currency,
                amount_subtotal_cents,
                amount_total_cents,
                amount_tax_cents,
                amount_discount_cents,
                status,
                paid_at,
                source,
                payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
            saleEvent.id,
            saleEvent.stripeEventId,
            saleEvent.stripeSessionId,
            saleEvent.stripeCustomerId,
            saleEvent.stripeSubscriptionId,
            saleEvent.userId,
            saleEvent.userEmail,
            saleEvent.planType,
            saleEvent.currency,
            saleEvent.amountSubtotalCents,
            saleEvent.amountTotalCents,
            saleEvent.amountTaxCents,
            saleEvent.amountDiscountCents,
            saleEvent.status,
            saleEvent.paidAt,
            saleEvent.source,
            saleEvent.payloadJson
        ]
    });
}

async function main() {
    const { dryRun, limit } = parseArgs(process.argv.slice(2));

    if (!process.env.TURSO_DATABASE_URL) {
        throw new Error('Missing TURSO_DATABASE_URL');
    }

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });

    await ensureSchema(client);
    const legacyRows = await readLegacyRows(client, limit);

    let scanned = 0;
    let inserted = 0;
    let skippedExisting = 0;

    for (const row of legacyRows.rows) {
        scanned += 1;

        const saleEvent = mapLegacyRowToSaleEvent(row);
        const alreadyExists = await existsBySessionId(client, saleEvent.stripeSessionId);
        if (alreadyExists) {
            skippedExisting += 1;
            continue;
        }

        if (dryRun) {
            inserted += 1;
            continue;
        }

        await insertSaleEvent(client, saleEvent);
        inserted += 1;
    }

    const summary = {
        dryRun,
        scanned,
        inserted,
        skippedExisting
    };

    console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
});
