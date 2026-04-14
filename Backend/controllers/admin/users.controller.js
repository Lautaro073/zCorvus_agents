const db = require('../../utils/db');
const { User, Role } = require('../../models');
const { errorResponse } = require('../../utils/response');

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
const ACCOUNT_STATUSES = new Set(['active', 'disabled']);
const ROLE_NAMES = new Set(['admin', 'user', 'pro']);

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
    await User.ensureAccountLifecycleSchema();
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
        'accountStatus',
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
    const rawAccountStatus = toSingleQueryValue(query.accountStatus);
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
    if (rawAccountStatus === null) {
        return { error: { invalidParam: 'accountStatus', expected: 'single account status value', received: query.accountStatus } };
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
        if (!ROLE_NAMES.has(normalizedRole)) {
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

    let accountStatus = null;
    if (rawAccountStatus !== undefined && rawAccountStatus !== '') {
        const normalizedAccountStatus = rawAccountStatus.toLowerCase();
        if (!ACCOUNT_STATUSES.has(normalizedAccountStatus)) {
            return {
                error: {
                    invalidParam: 'accountStatus',
                    expected: 'one of: active, disabled',
                    received: rawAccountStatus
                }
            };
        }
        accountStatus = normalizedAccountStatus;
    }

    const sort = normalizeSort(rawSortBy, rawSortDir);

    return {
        value: {
            page: parsedPage.value,
            pageSize: parsedPageSize.value,
            search,
            role,
            subscriptionStatus,
            accountStatus,
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
        accountStatus: row.account_status || 'active',
        disabled_at: row.disabled_at || null,
        two_factor_enabled: row.two_factor_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

async function findAdminUserRowById(id) {
    const rows = await db.query(
        `
            SELECT
                u.id,
                u.username,
                u.email,
                u.roles_id,
                r.name AS role_name,
                u.token_id,
                t.finish_date AS token_finish_date,
                u.account_status,
                u.disabled_at,
                u.two_factor_enabled,
                u.created_at,
                u.updated_at
            FROM user u
            LEFT JOIN roles r ON u.roles_id = r.id
            LEFT JOIN token t ON u.token_id = t.id
            WHERE u.id = ?
            LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function findAdminUserMappedById(id) {
    const row = await findAdminUserRowById(id);
    if (!row) {
        return null;
    }

    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() + 7);
    return mapUserRow(row, now, threshold);
}

async function resolveRoleIdFromPayload(rawRolesId, rawRole) {
    const hasRolesId = rawRolesId !== undefined && rawRolesId !== null && rawRolesId !== '';
    const hasRole = rawRole !== undefined && rawRole !== null && String(rawRole).trim() !== '';

    if (!hasRolesId && !hasRole) {
        return { value: null };
    }

    let roleById = null;
    if (hasRolesId) {
        roleById = await Role.findById(Number(rawRolesId));
        if (!roleById) {
            return { error: 'Invalid role id' };
        }
    }

    let roleByName = null;
    if (hasRole) {
        roleByName = await Role.findByName(String(rawRole).trim().toLowerCase());
        if (!roleByName) {
            return { error: 'Invalid role name' };
        }
    }

    if (roleById && roleByName && roleById.id !== roleByName.id) {
        return { error: 'role and roles_id do not match' };
    }

    return { value: Number(roleById?.id || roleByName?.id || null) || null };
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
            accountStatus,
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

        if (accountStatus) {
            whereClauses.push('u.account_status = ?');
            whereArgs.push(accountStatus);
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
                u.account_status,
                u.disabled_at,
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
                accountStatus,
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

async function updateAdminUser(req, res, next) {
    try {
        await ensureAdminUsersIndexesOnce();

        const { id } = req.params;
        const { username, email, roles_id, role } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        if (email && email !== user.email) {
            const existingEmail = await User.findByEmail(email);
            if (existingEmail && existingEmail.id !== id) {
                return errorResponse(res, 'Email already in use', 400);
            }
        }

        if (username && username !== user.username) {
            const existingUsername = await User.findByUsername(username);
            if (existingUsername && existingUsername.id !== id) {
                return errorResponse(res, 'Username already taken', 400);
            }
        }

        const roleResolution = await resolveRoleIdFromPayload(roles_id, role);
        if (roleResolution.error) {
            return errorResponse(res, roleResolution.error, 400);
        }

        const updateData = {};
        if (username && username !== user.username) {
            updateData.username = username;
        }
        if (email && email !== user.email) {
            updateData.email = email;
        }
        if (roleResolution.value && roleResolution.value !== user.roles_id) {
            updateData.roles_id = roleResolution.value;
        }

        if (Object.keys(updateData).length === 0) {
            return errorResponse(res, 'No user changes submitted', 400);
        }

        await User.update(id, updateData);

        const updatedUser = await findAdminUserMappedById(id);
        return res.status(200).json({
            success: true,
            message: 'Admin user updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Admin update user error:', error);
        next(error);
    }
}

async function disableAdminUser(req, res, next) {
    try {
        await ensureAdminUsersIndexesOnce();

        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        if (req.user.id === id) {
            return errorResponse(res, 'Cannot disable your own account', 400);
        }

        if (user.account_status === 'disabled') {
            return errorResponse(res, 'User account is already disabled', 400);
        }

        await User.disableAccount(id);
        const updatedUser = await findAdminUserMappedById(id);

        return res.status(200).json({
            success: true,
            message: 'User disabled successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Admin disable user error:', error);
        next(error);
    }
}

async function reEnableAdminUser(req, res, next) {
    try {
        await ensureAdminUsersIndexesOnce();

        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        if (user.account_status !== 'disabled') {
            return errorResponse(res, 'User account is already active', 400);
        }

        await User.enableAccount(id);
        const updatedUser = await findAdminUserMappedById(id);

        return res.status(200).json({
            success: true,
            message: 'User re-enabled successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Admin re-enable user error:', error);
        next(error);
    }
}

async function deleteAdminUserPermanently(req, res, next) {
    try {
        await ensureAdminUsersIndexesOnce();

        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        if (req.user.id === id) {
            return errorResponse(res, 'Cannot delete your own account', 400);
        }

        if (user.account_status !== 'disabled') {
            return errorResponse(res, 'User must be disabled before permanent deletion', 400);
        }

        await User.delete(id);

        return res.status(200).json({
            success: true,
            message: 'User deleted permanently',
            data: null
        });
    } catch (error) {
        console.error('Admin permanent delete user error:', error);
        next(error);
    }
}

module.exports = {
    getAdminUsers,
    updateAdminUser,
    disableAdminUser,
    reEnableAdminUser,
    deleteAdminUserPermanently,
    validateUsersQuery,
    mapUserRow
};
