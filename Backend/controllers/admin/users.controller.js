const db = require('../../utils/db');

let ensureAdminUsersIndexesPromise = null;

const SORT_COLUMN_MAP = {
    id: 'u.id',
    created_at: 'u.created_at',
    username: 'u.username',
    email: 'u.email',
    role_name: 'r.name',
    token_finish_date: 't.finish_date'
};

const SUBSCRIPTION_STATUSES = new Set(['active', 'expiring', 'expired', 'none']);

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

function normalizeSort(sortBy, sortDir) {
    const normalizedSortBy = typeof sortBy === 'string' ? sortBy : '';
    const normalizedSortDir = typeof sortDir === 'string' ? sortDir.toLowerCase() : '';

    const sortColumn = SORT_COLUMN_MAP[normalizedSortBy] || SORT_COLUMN_MAP.id;
    const direction = normalizedSortDir === 'asc' || normalizedSortDir === 'desc'
        ? normalizedSortDir
        : 'desc';

    return {
        sortBy: SORT_COLUMN_MAP[normalizedSortBy] ? normalizedSortBy : 'id',
        sortDir: direction,
        sql: `${sortColumn} ${direction.toUpperCase()}`
    };
}

function buildSubscriptionStatusClause(status) {
    if (status === 'active') {
        return {
            clause: '(t.finish_date IS NOT NULL AND t.finish_date > ?)',
            args: ['threshold']
        };
    }
    if (status === 'expiring') {
        return {
            clause: '(t.finish_date IS NOT NULL AND t.finish_date > ? AND t.finish_date <= ?)',
            args: ['now', 'threshold']
        };
    }
    if (status === 'expired') {
        return {
            clause: '(t.finish_date IS NOT NULL AND t.finish_date <= ?)',
            args: ['now']
        };
    }
    if (status === 'none') {
        return {
            clause: 't.finish_date IS NULL',
            args: []
        };
    }

    return null;
}

async function ensureAdminUsersIndexes() {
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_created_at ON user(created_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_roles_id ON user(roles_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_token_id ON user(token_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_username ON user(username)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_token_finish_date ON token(finish_date)');
}

function ensureAdminUsersIndexesOnce() {
    if (!ensureAdminUsersIndexesPromise) {
        ensureAdminUsersIndexesPromise = ensureAdminUsersIndexes().catch((error) => {
            ensureAdminUsersIndexesPromise = null;
            throw error;
        });
    }
    return ensureAdminUsersIndexesPromise;
}

function invalidQueryResponse(res, invalidParam, expected, received) {
    return res.status(400).json({
        success: false,
        message: 'Invalid query parameter',
        invalidParam,
        expected,
        ...(received !== undefined ? { received } : {})
    });
}

function validateUsersQuery(query) {
    const allowedQueryParams = new Set([
        'page',
        'pageSize',
        'limit',
        'search',
        'role',
        'subscriptionStatus',
        'sortBy',
        'sortDir',
        'expiringInDays'
    ]);

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

    const rawPage = toSingleQueryValue(query.page);
    const rawPageSize = toSingleQueryValue(query.pageSize);
    const rawLimit = toSingleQueryValue(query.limit);
    const rawSearch = toSingleQueryValue(query.search);
    const rawRole = toSingleQueryValue(query.role);
    const rawSubscriptionStatus = toSingleQueryValue(query.subscriptionStatus);
    const rawSortBy = toSingleQueryValue(query.sortBy);
    const rawSortDir = toSingleQueryValue(query.sortDir);
    const rawExpiringInDays = toSingleQueryValue(query.expiringInDays);

    if (rawPage === null) {
        return { error: { invalidParam: 'page', expected: 'single integer value', received: query.page } };
    }
    if (rawPageSize === null) {
        return { error: { invalidParam: 'pageSize', expected: 'single integer value', received: query.pageSize } };
    }
    if (rawLimit === null) {
        return { error: { invalidParam: 'limit', expected: 'single integer value', received: query.limit } };
    }
    if (rawSearch === null) {
        return { error: { invalidParam: 'search', expected: 'single string value', received: query.search } };
    }
    if (rawRole === null) {
        return { error: { invalidParam: 'role', expected: 'single role value', received: query.role } };
    }
    if (rawSubscriptionStatus === null) {
        return { error: { invalidParam: 'subscriptionStatus', expected: 'single status value', received: query.subscriptionStatus } };
    }
    if (rawSortBy === null) {
        return { error: { invalidParam: 'sortBy', expected: 'single sort value', received: query.sortBy } };
    }
    if (rawSortDir === null) {
        return { error: { invalidParam: 'sortDir', expected: 'single sort direction', received: query.sortDir } };
    }
    if (rawExpiringInDays === null) {
        return { error: { invalidParam: 'expiringInDays', expected: 'single integer value', received: query.expiringInDays } };
    }

    const parsedPage = rawPage === undefined || rawPage === ''
        ? { value: 1 }
        : parseStrictInteger(rawPage, 'page', 1, 100000);
    if (parsedPage.error) {
        return { error: parsedPage.error };
    }

    const rawEffectivePageSize = rawPageSize !== undefined && rawPageSize !== ''
        ? rawPageSize
        : rawLimit;

    const parsedPageSize = rawEffectivePageSize === undefined || rawEffectivePageSize === ''
        ? { value: 20 }
        : parseStrictInteger(rawEffectivePageSize, rawPageSize ? 'pageSize' : 'limit', 1, 100);
    if (parsedPageSize.error) {
        return { error: parsedPageSize.error };
    }

    const parsedExpiringInDays = rawExpiringInDays === undefined || rawExpiringInDays === ''
        ? { value: 7 }
        : parseStrictInteger(rawExpiringInDays, 'expiringInDays', 1, 365);
    if (parsedExpiringInDays.error) {
        return { error: parsedExpiringInDays.error };
    }

    let search = null;
    if (rawSearch !== undefined && rawSearch !== '') {
        if (rawSearch.length > 120) {
            return {
                error: {
                    invalidParam: 'search',
                    expected: 'string length <= 120',
                    received: rawSearch
                }
            };
        }
        search = rawSearch;
    }

    let role = null;
    if (rawRole !== undefined && rawRole !== '') {
        const normalizedRole = rawRole.toLowerCase();
        if (!['admin', 'user', 'pro'].includes(normalizedRole)) {
            return {
                error: {
                    invalidParam: 'role',
                    expected: 'one of: admin, user, pro',
                    received: rawRole
                }
            };
        }
        role = normalizedRole;
    }

    let subscriptionStatus = null;
    if (rawSubscriptionStatus !== undefined && rawSubscriptionStatus !== '') {
        const normalizedStatus = rawSubscriptionStatus.toLowerCase();
        if (!SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
            return {
                error: {
                    invalidParam: 'subscriptionStatus',
                    expected: 'one of: active, expiring, expired, none',
                    received: rawSubscriptionStatus
                }
            };
        }
        subscriptionStatus = normalizedStatus;
    }

    const sort = normalizeSort(rawSortBy, rawSortDir);

    return {
        value: {
            page: parsedPage.value,
            pageSize: parsedPageSize.value,
            search,
            role,
            subscriptionStatus,
            sortBy: sort.sortBy,
            sortDir: sort.sortDir,
            sortSql: sort.sql,
            expiringInDays: parsedExpiringInDays.value
        }
    };
}

function mapUserRow(row, now, threshold) {
    const finishDate = row.token_finish_date ? new Date(row.token_finish_date) : null;
    let subscriptionStatus = 'none';

    if (finishDate && !Number.isNaN(finishDate.getTime())) {
        if (finishDate <= now) {
            subscriptionStatus = 'expired';
        } else if (finishDate <= threshold) {
            subscriptionStatus = 'expiring';
        } else {
            subscriptionStatus = 'active';
        }
    }

    return {
        id: row.id,
        username: row.username,
        email: row.email,
        roles_id: row.roles_id,
        role_name: row.role_name,
        token_id: row.token_id,
        token_finish_date: row.token_finish_date,
        subscriptionStatus,
        two_factor_enabled: row.two_factor_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

async function getAdminUsers(req, res, next) {
    try {
        await ensureAdminUsersIndexesOnce();

        const validation = validateUsersQuery(req.query || {});
        if (validation.error) {
            return invalidQueryResponse(
                res,
                validation.error.invalidParam,
                validation.error.expected,
                validation.error.received
            );
        }

        const {
            page,
            pageSize,
            search,
            role,
            subscriptionStatus,
            sortBy,
            sortDir,
            sortSql,
            expiringInDays
        } = validation.value;

        const whereClauses = [];
        const whereArgs = [];
        const now = new Date();
        const threshold = new Date(now);
        threshold.setDate(now.getDate() + expiringInDays);
        const nowIso = now.toISOString();
        const thresholdIso = threshold.toISOString();

        if (search) {
            const likePattern = `%${search}%`;
            whereClauses.push('(u.username LIKE ? OR u.email LIKE ?)');
            whereArgs.push(likePattern, likePattern);
        }

        if (role) {
            whereClauses.push('r.name = ?');
            whereArgs.push(role);
        }

        const subscriptionStatusClause = buildSubscriptionStatusClause(subscriptionStatus);
        if (subscriptionStatusClause) {
            whereClauses.push(subscriptionStatusClause.clause);
            for (const arg of subscriptionStatusClause.args) {
                whereArgs.push(arg === 'threshold' ? thresholdIso : nowIso);
            }
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const offset = (page - 1) * pageSize;

        const dataSql = `
            SELECT
                u.id,
                u.username,
                u.email,
                u.roles_id,
                r.name AS role_name,
                u.token_id,
                t.finish_date AS token_finish_date,
                u.two_factor_enabled,
                u.created_at,
                u.updated_at,
                COUNT(*) OVER() AS total_count
            FROM user u
            LEFT JOIN roles r ON u.roles_id = r.id
            LEFT JOIN token t ON u.token_id = t.id
            ${whereClause}
            ORDER BY ${sortSql}
            LIMIT ? OFFSET ?
        `;

        const rows = await db.query(dataSql, [...whereArgs, pageSize, offset]);
        let total = Number(rows?.[0]?.total_count || 0);

        if (rows.length === 0 && page > 1) {
            const countSql = `
                SELECT COUNT(*) AS total
                FROM user u
                LEFT JOIN roles r ON u.roles_id = r.id
                LEFT JOIN token t ON u.token_id = t.id
                ${whereClause}
            `;
            const countRows = await db.query(countSql, whereArgs);
            total = Number(countRows?.[0]?.total || 0);
        }

        const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
        const users = rows.map((row) => mapUserRow(row, now, threshold));

        return res.status(200).json({
            success: true,
            message: 'Admin users retrieved successfully',
            data: users,
            pagination: {
                page,
                pageSize,
                limit: pageSize,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filtersApplied: {
                search,
                role,
                subscriptionStatus,
                sortBy,
                sortDir,
                expiringInDays
            },
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin users query error:', error);
        next(error);
    }
}

module.exports = {
    getAdminUsers,
    validateUsersQuery,
    mapUserRow
};
