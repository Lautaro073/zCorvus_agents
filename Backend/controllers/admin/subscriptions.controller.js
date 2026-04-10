const db = require('../../utils/db');

let ensureAdminSubscriptionsIndexesPromise = null;

function toSingleQueryValue(rawValue) {
    if (rawValue === undefined) {
        return undefined;
    }
    if (Array.isArray(rawValue)) {
        return null;
    }
    return String(rawValue).trim();
}

function parseStrictInteger(value, paramName, min, max) {
    if (!/^-?\d+$/.test(value)) {
        return {
            error: {
                invalidParam: paramName,
                expected: `integer between ${min} and ${max}`,
                received: value
            }
        };
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return {
            error: {
                invalidParam: paramName,
                expected: `integer between ${min} and ${max}`,
                received: value
            }
        };
    }

    return { value: parsed };
}

function parseUtcIsoDate(rawValue, paramName) {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
        return {
            error: {
                invalidParam: paramName,
                expected: 'valid ISO-8601 date',
                received: rawValue
            }
        };
    }
    return { value: date.toISOString() };
}

function buildStatusClause(status) {
    if (status === 'active') {
        return {
            clause: '(t.finish_date > ?)',
            args: ['threshold']
        };
    }
    if (status === 'expiring') {
        return {
            clause: '(t.finish_date > ? AND t.finish_date <= ?)',
            args: ['now', 'threshold']
        };
    }
    if (status === 'expired') {
        return {
            clause: '(t.finish_date <= ?)',
            args: ['now']
        };
    }
    return null;
}

async function ensureAdminSubscriptionsIndexes() {
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_token_id ON user(token_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_start_date ON token(start_date)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_finish_date ON token(finish_date)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_type ON token(type)');
}

function ensureAdminSubscriptionsIndexesOnce() {
    if (!ensureAdminSubscriptionsIndexesPromise) {
        ensureAdminSubscriptionsIndexesPromise = ensureAdminSubscriptionsIndexes().catch((error) => {
            ensureAdminSubscriptionsIndexesPromise = null;
            throw error;
        });
    }
    return ensureAdminSubscriptionsIndexesPromise;
}

function validateSubscriptionsQuery(query) {
    const allowedQueryParams = new Set(['status', 'planType', 'expiringInDays', 'from', 'to', 'page', 'pageSize']);
    const unknown = Object.keys(query).filter((key) => !allowedQueryParams.has(key));
    if (unknown.length > 0) {
        return {
            error: {
                invalidParam: unknown[0],
                expected: `one of: ${Array.from(allowedQueryParams).join(', ')}`,
                received: query[unknown[0]]
            }
        };
    }

    const rawStatus = toSingleQueryValue(query.status);
    const rawPlanType = toSingleQueryValue(query.planType);
    const rawExpiringInDays = toSingleQueryValue(query.expiringInDays);
    const rawFrom = toSingleQueryValue(query.from);
    const rawTo = toSingleQueryValue(query.to);
    const rawPage = toSingleQueryValue(query.page);
    const rawPageSize = toSingleQueryValue(query.pageSize);

    if ([rawStatus, rawPlanType, rawExpiringInDays, rawFrom, rawTo, rawPage, rawPageSize].includes(null)) {
        const pair = [
            ['status', rawStatus, query.status],
            ['planType', rawPlanType, query.planType],
            ['expiringInDays', rawExpiringInDays, query.expiringInDays],
            ['from', rawFrom, query.from],
            ['to', rawTo, query.to],
            ['page', rawPage, query.page],
            ['pageSize', rawPageSize, query.pageSize]
        ].find((entry) => entry[1] === null);

        return {
            error: {
                invalidParam: pair[0],
                expected: 'single value',
                received: pair[2]
            }
        };
    }

    let status = null;
    if (rawStatus) {
        const normalizedStatus = rawStatus.toLowerCase();
        if (!['active', 'expiring', 'expired'].includes(normalizedStatus)) {
            return {
                error: {
                    invalidParam: 'status',
                    expected: 'one of: active, expiring, expired',
                    received: rawStatus
                }
            };
        }
        status = normalizedStatus;
    }

    let planType = null;
    if (rawPlanType) {
        const normalizedPlan = rawPlanType.toLowerCase();
        if (!['pro', 'enterprise'].includes(normalizedPlan)) {
            return {
                error: {
                    invalidParam: 'planType',
                    expected: 'one of: pro, enterprise',
                    received: rawPlanType
                }
            };
        }
        planType = normalizedPlan;
    }

    const parsedExpiring = rawExpiringInDays
        ? parseStrictInteger(rawExpiringInDays, 'expiringInDays', 1, 365)
        : { value: 7 };
    if (parsedExpiring.error) {
        return { error: parsedExpiring.error };
    }

    const parsedPage = rawPage ? parseStrictInteger(rawPage, 'page', 1, 100000) : { value: 1 };
    if (parsedPage.error) {
        return { error: parsedPage.error };
    }

    const parsedPageSize = rawPageSize ? parseStrictInteger(rawPageSize, 'pageSize', 1, 100) : { value: 20 };
    if (parsedPageSize.error) {
        return { error: parsedPageSize.error };
    }

    const parsedFrom = rawFrom ? parseUtcIsoDate(rawFrom, 'from') : { value: null };
    if (parsedFrom.error) {
        return { error: parsedFrom.error };
    }

    const parsedTo = rawTo ? parseUtcIsoDate(rawTo, 'to') : { value: null };
    if (parsedTo.error) {
        return { error: parsedTo.error };
    }

    return {
        value: {
            status,
            planType,
            expiringInDays: parsedExpiring.value,
            from: parsedFrom.value,
            to: parsedTo.value,
            page: parsedPage.value,
            pageSize: parsedPageSize.value
        }
    };
}

async function getAdminSubscriptions(req, res, next) {
    try {
        await ensureAdminSubscriptionsIndexesOnce();

        const validation = validateSubscriptionsQuery(req.query || {});
        if (validation.error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameter',
                invalidParam: validation.error.invalidParam,
                expected: validation.error.expected,
                ...(validation.error.received !== undefined ? { received: validation.error.received } : {})
            });
        }

        const { status, planType, expiringInDays, from, to, page, pageSize } = validation.value;
        const now = new Date();
        const threshold = new Date(now);
        threshold.setDate(now.getDate() + expiringInDays);
        const nowIso = now.toISOString();
        const thresholdIso = threshold.toISOString();

        const whereClauses = ['u.token_id IS NOT NULL'];
        const whereArgs = [];

        if (planType) {
            whereClauses.push('t.type = ?');
            whereArgs.push(planType);
        }

        const statusClause = buildStatusClause(status);
        if (statusClause) {
            whereClauses.push(statusClause.clause);
            for (const arg of statusClause.args) {
                whereArgs.push(arg === 'threshold' ? thresholdIso : nowIso);
            }
        }

        if (from) {
            whereClauses.push('t.start_date >= ?');
            whereArgs.push(from);
        }

        if (to) {
            whereClauses.push('t.start_date <= ?');
            whereArgs.push(to);
        }

        const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const offset = (page - 1) * pageSize;
        const dataSql = `
            SELECT
                u.id AS user_id,
                u.email AS user_email,
                u.username,
                t.id AS token_id,
                t.type AS plan_type,
                t.start_date,
                t.finish_date,
                COUNT(*) OVER() AS total_count
            FROM user u
            LEFT JOIN token t ON u.token_id = t.id
            ${whereClause}
            ORDER BY t.finish_date DESC, u.id DESC
            LIMIT ? OFFSET ?
        `;

        const rows = await db.query(dataSql, [...whereArgs, pageSize, offset]);
        let total = Number(rows?.[0]?.total_count || 0);

        if (rows.length === 0 && page > 1) {
            const countSql = `
                SELECT COUNT(*) AS total
                FROM user u
                LEFT JOIN token t ON u.token_id = t.id
                ${whereClause}
            `;
            const countRows = await db.query(countSql, whereArgs);
            total = Number(countRows?.[0]?.total || 0);
        }

        const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

        const data = rows.map((row) => {
            const finishDate = row.finish_date ? new Date(row.finish_date) : null;
            let subscriptionStatus = 'expired';

            if (finishDate && finishDate > threshold) {
                subscriptionStatus = 'active';
            } else if (finishDate && finishDate > now) {
                subscriptionStatus = 'expiring';
            }

            return {
                user_id: row.user_id,
                user_email: row.user_email,
                username: row.username,
                token_id: row.token_id,
                plan_type: row.plan_type,
                start_date: row.start_date,
                finish_date: row.finish_date,
                subscriptionStatus
            };
        });

        const summarySql = `
            SELECT
                SUM(CASE WHEN t.finish_date > ? THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN t.finish_date > ? AND t.finish_date <= ? THEN 1 ELSE 0 END) AS expiring,
                SUM(CASE WHEN t.finish_date <= ? THEN 1 ELSE 0 END) AS expired,
                COUNT(*) AS total
            FROM user u
            LEFT JOIN token t ON u.token_id = t.id
            WHERE u.token_id IS NOT NULL
        `;

        const summaryRows = await db.query(summarySql, [thresholdIso, nowIso, thresholdIso, nowIso]);
        const summary = summaryRows[0] || {};

        return res.status(200).json({
            success: true,
            message: 'Admin subscriptions retrieved successfully',
            data,
            summaryCounts: {
                active: Number(summary.active || 0),
                expiring: Number(summary.expiring || 0),
                expired: Number(summary.expired || 0),
                total: Number(summary.total || 0)
            },
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filtersApplied: {
                status,
                planType,
                expiringInDays,
                from,
                to
            },
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin subscriptions query error:', error);
        next(error);
    }
}

module.exports = {
    getAdminSubscriptions,
    validateSubscriptionsQuery
};
