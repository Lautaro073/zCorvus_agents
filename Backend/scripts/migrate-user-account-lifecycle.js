const db = require('../utils/db');

const ACCOUNT_STATUS_ACTIVE = 'active';

async function hasColumn(columnName) {
    const columns = await db.query(`PRAGMA table_info('user')`);
    return columns.some((column) => String(column.name) === columnName);
}

async function run() {
    if (!(await hasColumn('account_status'))) {
        await db.query(`ALTER TABLE user ADD COLUMN account_status TEXT NOT NULL DEFAULT '${ACCOUNT_STATUS_ACTIVE}'`);
    }

    if (!(await hasColumn('disabled_at'))) {
        await db.query('ALTER TABLE user ADD COLUMN disabled_at TEXT NULL');
    }

    await db.query(
        `UPDATE user
         SET account_status = ?
         WHERE account_status IS NULL OR TRIM(account_status) = ''`,
        [ACCOUNT_STATUS_ACTIVE]
    );

    await db.query('CREATE INDEX IF NOT EXISTS idx_user_account_status ON user(account_status)');
}

run()
    .then(() => {
        console.log('User account lifecycle migration applied');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to apply user account lifecycle migration:', error);
        process.exit(1);
    });
