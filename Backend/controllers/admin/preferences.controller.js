const db = require('../../utils/db');

const ALLOWED_COLUMN_KEYS = Object.freeze([
    'username',
    'email',
    'role',
    'status',
    'plan',
    'startDate',
    'tokenExpiry'
]);

const ALLOWED_COLUMN_KEYS_SET = new Set(ALLOWED_COLUMN_KEYS);

const DEFAULT_COLUMN_VISIBILITY = Object.freeze(
    ALLOWED_COLUMN_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {})
);

const DEFAULT_COLUMN_ORDER = Object.freeze([...ALLOWED_COLUMN_KEYS]);

let ensureAdminPreferencesSchemaPromise = null;

function cloneDefaultPreferences() {
    return {
        columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY },
        columnOrder: [...DEFAULT_COLUMN_ORDER]
    };
}

function invalidPayloadResponse(res, invalidParam, expected, received) {
    return res.status(400).json({
        success: false,
        message: 'Invalid preferences payload',
        invalidParam,
        expected,
        ...(received !== undefined ? { received } : {})
    });
}

async function ensureAdminPreferencesSchema() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS admin_preferences (
            user_id TEXT PRIMARY KEY,
            column_visibility_json TEXT NOT NULL,
            column_order_json TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
        )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_admin_preferences_updated_at ON admin_preferences(updated_at)');
}

function ensureAdminPreferencesSchemaOnce() {
    if (!ensureAdminPreferencesSchemaPromise) {
        ensureAdminPreferencesSchemaPromise = ensureAdminPreferencesSchema().catch((error) => {
            ensureAdminPreferencesSchemaPromise = null;
            throw error;
        });
    }
    return ensureAdminPreferencesSchemaPromise;
}

function parseJsonValue(rawValue) {
    if (typeof rawValue !== 'string' || rawValue.length === 0) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch (_error) {
        return null;
    }
}

function normalizeStoredColumnVisibility(rawValue) {
    const parsed = parseJsonValue(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ...DEFAULT_COLUMN_VISIBILITY };
    }

    const normalized = { ...DEFAULT_COLUMN_VISIBILITY };
    for (const key of ALLOWED_COLUMN_KEYS) {
        if (typeof parsed[key] === 'boolean') {
            normalized[key] = parsed[key];
        }
    }

    if (!Object.values(normalized).some(Boolean)) {
        return { ...DEFAULT_COLUMN_VISIBILITY };
    }

    return normalized;
}

function normalizeStoredColumnOrder(rawValue) {
    const parsed = parseJsonValue(rawValue);
    if (!Array.isArray(parsed)) {
        return [...DEFAULT_COLUMN_ORDER];
    }

    const seen = new Set();
    const normalized = [];

    for (const item of parsed) {
        if (typeof item !== 'string') {
            continue;
        }

        const trimmed = item.trim();
        if (!ALLOWED_COLUMN_KEYS_SET.has(trimmed) || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        normalized.push(trimmed);
    }

    for (const key of DEFAULT_COLUMN_ORDER) {
        if (!seen.has(key)) {
            normalized.push(key);
        }
    }

    return normalized;
}

function mapRowToPreferences(row) {
    if (!row) {
        return cloneDefaultPreferences();
    }

    return {
        columnVisibility: normalizeStoredColumnVisibility(row.column_visibility_json),
        columnOrder: normalizeStoredColumnOrder(row.column_order_json)
    };
}

async function getPreferencesByUserId(userId) {
    const rows = await db.query(
        `
            SELECT column_visibility_json, column_order_json
            FROM admin_preferences
            WHERE user_id = ?
            LIMIT 1
        `,
        [userId]
    );

    const row = rows.length > 0 ? rows[0] : null;
    return mapRowToPreferences(row);
}

function parseColumnVisibilityInput(rawVisibility, baseVisibility) {
    if (rawVisibility === undefined) {
        return { value: baseVisibility };
    }

    if (!rawVisibility || typeof rawVisibility !== 'object' || Array.isArray(rawVisibility)) {
        return {
            error: {
                invalidParam: 'columnVisibility',
                expected: `object with boolean keys: ${ALLOWED_COLUMN_KEYS.join(', ')}`,
                received: rawVisibility
            }
        };
    }

    const merged = { ...baseVisibility };
    for (const [key, value] of Object.entries(rawVisibility)) {
        if (!ALLOWED_COLUMN_KEYS_SET.has(key)) {
            return {
                error: {
                    invalidParam: `columnVisibility.${key}`,
                    expected: `one of: ${ALLOWED_COLUMN_KEYS.join(', ')}`,
                    received: key
                }
            };
        }

        if (typeof value !== 'boolean') {
            return {
                error: {
                    invalidParam: `columnVisibility.${key}`,
                    expected: 'boolean',
                    received: value
                }
            };
        }

        merged[key] = value;
    }

    if (!Object.values(merged).some(Boolean)) {
        return {
            error: {
                invalidParam: 'columnVisibility',
                expected: 'at least one visible column',
                received: rawVisibility
            }
        };
    }

    return { value: merged };
}

function parseColumnOrderInput(rawOrder, baseOrder) {
    if (rawOrder === undefined) {
        return { value: baseOrder };
    }

    if (!Array.isArray(rawOrder) || rawOrder.length === 0) {
        return {
            error: {
                invalidParam: 'columnOrder',
                expected: `non-empty array with keys: ${ALLOWED_COLUMN_KEYS.join(', ')}`,
                received: rawOrder
            }
        };
    }

    const seen = new Set();
    const normalized = [];

    for (let index = 0; index < rawOrder.length; index += 1) {
        const value = rawOrder[index];
        if (typeof value !== 'string' || value.trim().length === 0) {
            return {
                error: {
                    invalidParam: `columnOrder[${index}]`,
                    expected: `one of: ${ALLOWED_COLUMN_KEYS.join(', ')}`,
                    received: value
                }
            };
        }

        const key = value.trim();
        if (!ALLOWED_COLUMN_KEYS_SET.has(key)) {
            return {
                error: {
                    invalidParam: `columnOrder[${index}]`,
                    expected: `one of: ${ALLOWED_COLUMN_KEYS.join(', ')}`,
                    received: value
                }
            };
        }

        if (seen.has(key)) {
            return {
                error: {
                    invalidParam: `columnOrder[${index}]`,
                    expected: 'unique column keys',
                    received: value
                }
            };
        }

        seen.add(key);
        normalized.push(key);
    }

    for (const key of DEFAULT_COLUMN_ORDER) {
        if (!seen.has(key)) {
            normalized.push(key);
        }
    }

    return { value: normalized };
}

function validatePreferencesPayload(payload, existingPreferences) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            error: {
                invalidParam: 'body',
                expected: 'JSON object with columnVisibility and/or columnOrder',
                received: payload
            }
        };
    }

    const allowedTopLevelKeys = new Set(['columnVisibility', 'columnOrder']);
    const unknownKeys = Object.keys(payload).filter((key) => !allowedTopLevelKeys.has(key));
    if (unknownKeys.length > 0) {
        const firstUnknown = unknownKeys[0];
        return {
            error: {
                invalidParam: firstUnknown,
                expected: 'one of: columnVisibility, columnOrder',
                received: payload[firstUnknown]
            }
        };
    }

    const hasVisibility = Object.prototype.hasOwnProperty.call(payload, 'columnVisibility');
    const hasOrder = Object.prototype.hasOwnProperty.call(payload, 'columnOrder');

    if (!hasVisibility && !hasOrder) {
        return {
            error: {
                invalidParam: 'body',
                expected: 'at least one of: columnVisibility, columnOrder',
                received: payload
            }
        };
    }

    const parsedVisibility = parseColumnVisibilityInput(payload.columnVisibility, existingPreferences.columnVisibility);
    if (parsedVisibility.error) {
        return { error: parsedVisibility.error };
    }

    const parsedOrder = parseColumnOrderInput(payload.columnOrder, existingPreferences.columnOrder);
    if (parsedOrder.error) {
        return { error: parsedOrder.error };
    }

    return {
        value: {
            columnVisibility: parsedVisibility.value,
            columnOrder: parsedOrder.value
        }
    };
}

async function upsertPreferencesByUserId(userId, preferences) {
    await db.query(
        `
            INSERT INTO admin_preferences (
                user_id,
                column_visibility_json,
                column_order_json,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                column_visibility_json = excluded.column_visibility_json,
                column_order_json = excluded.column_order_json,
                updated_at = CURRENT_TIMESTAMP
        `,
        [
            userId,
            JSON.stringify(preferences.columnVisibility),
            JSON.stringify(preferences.columnOrder)
        ]
    );
}

async function getAdminPreferences(req, res, next) {
    try {
        await ensureAdminPreferencesSchemaOnce();

        const preferences = await getPreferencesByUserId(req.user.id);

        return res.status(200).json({
            success: true,
            message: 'Admin preferences retrieved successfully',
            data: preferences,
            pagination: null,
            filtersApplied: {},
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin preferences read error:', error);
        next(error);
    }
}

async function saveAdminPreferences(req, res, next) {
    try {
        await ensureAdminPreferencesSchemaOnce();

        const existingPreferences = await getPreferencesByUserId(req.user.id);
        const validation = validatePreferencesPayload(req.body, existingPreferences);

        if (validation.error) {
            return invalidPayloadResponse(
                res,
                validation.error.invalidParam,
                validation.error.expected,
                validation.error.received
            );
        }

        await upsertPreferencesByUserId(req.user.id, validation.value);

        return res.status(200).json({
            success: true,
            message: 'Admin preferences saved successfully',
            data: validation.value,
            pagination: null,
            filtersApplied: {},
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin preferences write error:', error);
        next(error);
    }
}

module.exports = {
    ALLOWED_COLUMN_KEYS,
    DEFAULT_COLUMN_ORDER,
    DEFAULT_COLUMN_VISIBILITY,
    getAdminPreferences,
    saveAdminPreferences
};
