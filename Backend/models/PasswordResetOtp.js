const bcrypt = require('bcryptjs');
const db = require('../utils/db');
const { generateUUID } = require('../utils/uuid');
const { client } = require('../config/database');

class PasswordResetOtp {
    static async create(userId, otp, expiresAt) {
        const id = generateUUID();
        const otpHash = await bcrypt.hash(otp, 10);

        await db.insert('password_reset_otps', {
            id,
            user_id: userId,
            otp_hash: otpHash,
            expires_at: expiresAt,
            used: 0
        });

        return id;
    }

    static async markAllUnusedAsUsed(userId) {
        await db.query(
            'UPDATE password_reset_otps SET used = 1, used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used = 0',
            [userId]
        );
    }

    static async findLatestActiveByUserId(userId) {
        const rows = await db.query(
            `SELECT *
             FROM password_reset_otps
             WHERE user_id = ? AND used = 0
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        return rows[0] || null;
    }

    static async verifyOtp(record, otp) {
        if (!record || record.used) {
            return false;
        }

        const expiresAt = new Date(record.expires_at);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
            return false;
        }

        return bcrypt.compare(otp, record.otp_hash);
    }

    static async consume(id) {
        await db.update('password_reset_otps', {
            used: 1,
            used_at: new Date()
        }, { id });
    }

    static async consumeIfValid(id) {
        const result = await client.execute({
            sql: `
                UPDATE password_reset_otps
                SET used = 1,
                    used_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND used = 0
                  AND datetime(expires_at) > datetime('now')
            `,
            args: [id]
        });

        return Number(result.rowsAffected || 0) > 0;
    }
}

module.exports = PasswordResetOtp;
