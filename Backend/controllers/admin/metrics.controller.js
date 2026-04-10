const db = require('../../utils/db');

const ALLOWED_GRANULARITIES = new Set(['day', 'month', 'year', 'custom']);
let ensureSaleEventsSchemaPromise = null;
const PLAN_PRICES_CENTS = {
    pro: 4900,
    enterprise: 9900
};

function toSingleQueryValue(rawValue) {
    if (rawValue === undefined) {
        return undefined;
    }
    if (Array.isArray(rawValue)) {
        return null;
    }
    return String(rawValue).trim();
}

function parseUtcIsoDate(value, paramName) {
    const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    if (!isoUtcPattern.test(value)) {
        return {
            error: {
                invalidParam: paramName,
                expected: 'ISO-8601 UTC datetime (e.g. 2026-04-07T00:00:00Z)',
                received: value
            }
        };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return {
            error: {
                invalidParam: paramName,
                expected: 'valid ISO-8601 UTC datetime',
                received: value
            }
        };
    }

    return { value: parsed };
}

function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function startOfUtcMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function startOfUtcYear(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
}

function endOfUtcYear(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

function formatDayKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatMonthKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function formatYearKey(date) {
    return String(date.getUTCFullYear());
}

function resolveRange(granularity, fromDate, toDate) {
    if (granularity === 'custom') {
        return {
            from: startOfUtcDay(fromDate),
            to: endOfUtcDay(toDate),
            bucketGranularity: 'day'
        };
    }

    if (fromDate && toDate) {
        return {
            from: granularity === 'day' ? startOfUtcDay(fromDate)
                : granularity === 'month' ? startOfUtcMonth(fromDate)
                    : startOfUtcYear(fromDate),
            to: granularity === 'day' ? endOfUtcDay(toDate)
                : granularity === 'month' ? endOfUtcMonth(toDate)
                    : endOfUtcYear(toDate),
            bucketGranularity: granularity
        };
    }

    const now = new Date();

    if (granularity === 'day') {
        const from = startOfUtcDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
        const to = endOfUtcDay(now);
        return { from, to, bucketGranularity: 'day' };
    }

    if (granularity === 'month') {
        const from = startOfUtcMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)));
        const to = endOfUtcMonth(now);
        return { from, to, bucketGranularity: 'month' };
    }

    const from = startOfUtcYear(new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1)));
    const to = endOfUtcYear(now);
    return { from, to, bucketGranularity: 'year' };
}

function buildBuckets(from, to, bucketGranularity) {
    const buckets = [];
    let cursor;

    if (bucketGranularity === 'day') {
        cursor = startOfUtcDay(from);
        while (cursor <= to) {
            const bucketStart = new Date(cursor);
            const bucketEnd = endOfUtcDay(cursor);
            buckets.push({
                bucketKey: formatDayKey(cursor),
                bucketStart: bucketStart.toISOString(),
                bucketEnd: bucketEnd.toISOString()
            });
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }
        return buckets;
    }

    if (bucketGranularity === 'month') {
        cursor = startOfUtcMonth(from);
        while (cursor <= to) {
            const bucketStart = new Date(cursor);
            const bucketEnd = endOfUtcMonth(cursor);
            buckets.push({
                bucketKey: formatMonthKey(cursor),
                bucketStart: bucketStart.toISOString(),
                bucketEnd: bucketEnd.toISOString()
            });
            cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 0, 0, 0, 0));
        }
        return buckets;
    }

    cursor = startOfUtcYear(from);
    while (cursor <= to) {
        const bucketStart = new Date(cursor);
        const bucketEnd = endOfUtcYear(cursor);
        buckets.push({
            bucketKey: formatYearKey(cursor),
            bucketStart: bucketStart.toISOString(),
            bucketEnd: bucketEnd.toISOString()
        });
        cursor = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
    }

    return buckets;
}

function buildBucketExpression(columnName, bucketGranularity) {
    const safeColumn = columnName;

    if (bucketGranularity === 'day') {
        return `strftime('%Y-%m-%d', ${safeColumn})`;
    }
    if (bucketGranularity === 'month') {
        return `strftime('%Y-%m', ${safeColumn})`;
    }
    return `strftime('%Y', ${safeColumn})`;
}

async function ensureSaleEventsSchema() {
    await db.query(`
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
            source TEXT NOT NULL DEFAULT 'stripe_webhook',
            payload_json TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
        )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_sale_events_paid_at ON sale_events(paid_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sale_events_status ON sale_events(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_start_date ON token(start_date)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_type ON token(type)');
}

function ensureSaleEventsSchemaOnce() {
    if (!ensureSaleEventsSchemaPromise) {
        ensureSaleEventsSchemaPromise = ensureSaleEventsSchema().catch((error) => {
            ensureSaleEventsSchemaPromise = null;
            throw error;
        });
    }
    return ensureSaleEventsSchemaPromise;
}

function validateMetricsQuery(query) {
    const allowedQueryParams = new Set(['granularity', 'from', 'to']);
    const unknownParams = Object.keys(query).filter((key) => !allowedQueryParams.has(key));

    if (unknownParams.length > 0) {
        return {
            error: {
                invalidParam: unknownParams[0],
                expected: `one of: ${Array.from(allowedQueryParams).join(', ')}`,
                received: query[unknownParams[0]]
            }
        };
    }

    const rawGranularity = toSingleQueryValue(query.granularity) || 'day';
    const rawFrom = toSingleQueryValue(query.from);
    const rawTo = toSingleQueryValue(query.to);

    if (rawGranularity === null) {
        return { error: { invalidParam: 'granularity', expected: 'single value', received: query.granularity } };
    }
    if (rawFrom === null) {
        return { error: { invalidParam: 'from', expected: 'single ISO-8601 UTC datetime', received: query.from } };
    }
    if (rawTo === null) {
        return { error: { invalidParam: 'to', expected: 'single ISO-8601 UTC datetime', received: query.to } };
    }

    const granularity = rawGranularity.toLowerCase();
    if (!ALLOWED_GRANULARITIES.has(granularity)) {
        return {
            error: {
                invalidParam: 'granularity',
                expected: 'one of: day, month, year, custom',
                received: rawGranularity
            }
        };
    }

    if (granularity === 'custom' && (!rawFrom || !rawTo)) {
        return {
            error: {
                invalidParam: !rawFrom ? 'from' : 'to',
                expected: 'required for granularity=custom in ISO-8601 UTC',
                received: !rawFrom ? rawFrom : rawTo
            }
        };
    }

    if (granularity !== 'custom' && ((rawFrom && !rawTo) || (!rawFrom && rawTo))) {
        return {
            error: {
                invalidParam: rawFrom ? 'to' : 'from',
                expected: 'must provide both from and to or neither',
                received: rawFrom ? rawTo : rawFrom
            }
        };
    }

    let parsedFrom = null;
    let parsedTo = null;

    if (rawFrom) {
        const fromResult = parseUtcIsoDate(rawFrom, 'from');
        if (fromResult.error) {
            return { error: fromResult.error };
        }
        parsedFrom = fromResult.value;
    }

    if (rawTo) {
        const toResult = parseUtcIsoDate(rawTo, 'to');
        if (toResult.error) {
            return { error: toResult.error };
        }
        parsedTo = toResult.value;
    }

    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
        return {
            error: {
                invalidParam: 'from',
                expected: 'from <= to',
                received: rawFrom
            }
        };
    }

    return {
        value: {
            granularity,
            parsedFrom,
            parsedTo
        }
    };
}

async function getAdminMetrics(req, res, next) {
    try {
        const validation = validateMetricsQuery(req.query || {});
        if (validation.error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameter',
                invalidParam: validation.error.invalidParam,
                expected: validation.error.expected,
                ...(validation.error.received !== undefined ? { received: validation.error.received } : {})
            });
        }

        await ensureSaleEventsSchemaOnce();

        const { granularity, parsedFrom, parsedTo } = validation.value;
        const range = resolveRange(granularity, parsedFrom, parsedTo);
        const bucketExpressionSale = buildBucketExpression('paid_at', range.bucketGranularity);
        const bucketExpressionToken = buildBucketExpression('s.start_date', range.bucketGranularity);
        const bucketExpressionRegistration = buildBucketExpression('created_at', range.bucketGranularity);

        const fromIso = range.from.toISOString();
        const toIso = range.to.toISOString();

        const salesSql = `
            SELECT
                ${bucketExpressionSale} AS bucket_key,
                COUNT(*) AS sales_count,
                COALESCE(SUM(amount_total_cents), 0) AS gross_revenue,
                COALESCE(SUM(CASE
                    WHEN (amount_total_cents - amount_tax_cents) > 0 THEN (amount_total_cents - amount_tax_cents)
                    ELSE 0
                END), 0) AS net_revenue
            FROM sale_events
            WHERE paid_at >= ?
              AND paid_at <= ?
              AND status = 'paid'
            GROUP BY bucket_key
            ORDER BY bucket_key ASC
        `;

        const registrationsSql = `
            SELECT
                ${bucketExpressionRegistration} AS bucket_key,
                COUNT(*) AS registrations
            FROM user
            WHERE created_at >= ?
              AND created_at <= ?
            GROUP BY bucket_key
            ORDER BY bucket_key ASC
        `;

        const subscriptionSalesSql = `
            SELECT
                ${bucketExpressionToken} AS bucket_key,
                COUNT(*) AS sales_count,
                COALESCE(SUM(CASE
                    WHEN LOWER(s.plan_type) = 'enterprise' THEN ${PLAN_PRICES_CENTS.enterprise}
                    WHEN LOWER(s.plan_type) = 'pro' THEN ${PLAN_PRICES_CENTS.pro}
                    ELSE 0
                END), 0) AS gross_revenue,
                COALESCE(SUM(CASE
                    WHEN LOWER(s.plan_type) = 'enterprise' THEN ${PLAN_PRICES_CENTS.enterprise}
                    WHEN LOWER(s.plan_type) = 'pro' THEN ${PLAN_PRICES_CENTS.pro}
                    ELSE 0
                END), 0) AS net_revenue
            FROM (
                SELECT DISTINCT
                    t.id AS token_id,
                    t.start_date,
                    t.type AS plan_type
                FROM token t
                INNER JOIN user u ON u.token_id = t.id
                WHERE t.start_date >= ?
                  AND t.start_date <= ?
                  AND LOWER(t.type) IN ('pro', 'enterprise')
            ) s
            GROUP BY bucket_key
            ORDER BY bucket_key ASC
        `;

        const [salesRows, registrationRows, subscriptionSalesRows] = await Promise.all([
            db.query(salesSql, [fromIso, toIso]),
            db.query(registrationsSql, [fromIso, toIso]),
            db.query(subscriptionSalesSql, [fromIso, toIso])
        ]);

        const registrationMap = new Map(
            registrationRows.map((row) => [String(row.bucket_key), Number(row.registrations || 0)])
        );

        const ledgerSalesMap = new Map(
            salesRows.map((row) => [
                String(row.bucket_key),
                {
                    salesCount: Number(row.sales_count || 0),
                    grossRevenue: Number(row.gross_revenue || 0),
                    netRevenue: Number(row.net_revenue || 0)
                }
            ])
        );

        const subscriptionSalesMap = new Map(
            subscriptionSalesRows.map((row) => [
                String(row.bucket_key),
                {
                    salesCount: Number(row.sales_count || 0),
                    grossRevenue: Number(row.gross_revenue || 0),
                    netRevenue: Number(row.net_revenue || 0)
                }
            ])
        );

        const buckets = buildBuckets(range.from, range.to, range.bucketGranularity);
        let usedLedgerSource = false;
        let usedSubscriptionFallback = false;
        const timeseries = buckets.map((bucket) => {
            const ledgerSale = ledgerSalesMap.get(bucket.bucketKey) || { salesCount: 0, grossRevenue: 0, netRevenue: 0 };
            const fallbackSale = subscriptionSalesMap.get(bucket.bucketKey) || { salesCount: 0, grossRevenue: 0, netRevenue: 0 };
            const sale = ledgerSale.salesCount > 0 ? ledgerSale : fallbackSale;
            const registrations = registrationMap.get(bucket.bucketKey) || 0;

            if (ledgerSale.salesCount > 0) {
                usedLedgerSource = true;
            } else if (fallbackSale.salesCount > 0) {
                usedSubscriptionFallback = true;
            }

            return {
                bucketKey: bucket.bucketKey,
                bucketStart: bucket.bucketStart,
                bucketEnd: bucket.bucketEnd,
                registrations,
                salesCount: sale.salesCount,
                grossRevenue: sale.grossRevenue,
                netRevenue: sale.netRevenue
            };
        });

        const kpis = {
            registrations: timeseries.reduce((acc, point) => acc + point.registrations, 0),
            salesCount: timeseries.reduce((acc, point) => acc + point.salesCount, 0),
            grossRevenue: timeseries.reduce((acc, point) => acc + point.grossRevenue, 0),
            netRevenue: timeseries.reduce((acc, point) => acc + point.netRevenue, 0)
        };

        const salesSource = usedLedgerSource && usedSubscriptionFallback
            ? 'mixed'
            : usedLedgerSource
                ? 'ledger'
                : usedSubscriptionFallback
                    ? 'subscriptions_fallback'
                    : 'none';

        return res.status(200).json({
            success: true,
            message: 'Admin metrics retrieved successfully',
            data: {
                kpis,
                timeseries
            },
            filtersApplied: {
                granularity,
                from: fromIso,
                to: toIso,
                bucketGranularity: range.bucketGranularity,
                salesSource
            },
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin metrics query error:', error);
        next(error);
    }
}

module.exports = {
    getAdminMetrics,
    validateMetricsQuery
};
