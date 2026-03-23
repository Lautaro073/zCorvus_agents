const db = require('../utils/db');
const { generateUUID } = require('../utils/uuid');
const crypto = require('crypto');

/**
 * Modelo BackupCode
 */
class BackupCode {
    /**
     * Generar códigos de respaldo para un usuario
     */
    static async generateCodes(userId, count = 10) {
        const codes = [];

        // Eliminar códigos antiguos
        await db.query('DELETE FROM backup_codes WHERE user_id = ?', [userId]);

        // Generar nuevos códigos
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres
            const id = generateUUID();

            await db.insert('backup_codes', {
                id,
                user_id: userId,
                code,
                used: 0
            });

            codes.push(code);
        }

        return codes;
    }

    /**
     * Verificar y marcar código como usado
     */
    static async verifyAndUse(userId, code) {
        const sql = `
            SELECT * FROM backup_codes 
            WHERE user_id = ? AND code = ? AND used = 0
        `;

        const result = await db.query(sql, [userId, code.toUpperCase()]);

        if (result.length === 0) {
            return false;
        }

        // Marcar como usado
        await db.update('backup_codes', {
            used: 1,
            used_at: new Date()
        }, { id: result[0].id });

        return true;
    }

    /**
     * Obtener códigos restantes del usuario
     */
    static async getRemainingCodes(userId) {
        const sql = `
            SELECT code, created_at FROM backup_codes 
            WHERE user_id = ? AND used = 0
            ORDER BY created_at ASC
        `;

        return await db.query(sql, [userId]);
    }

    /**
     * Contar códigos no usados
     */
    static async countUnused(userId) {
        const sql = `
            SELECT COUNT(*) as count FROM backup_codes 
            WHERE user_id = ? AND used = 0
        `;

        const result = await db.query(sql, [userId]);
        return result[0].count;
    }

    /**
     * Verificar si un usuario tiene códigos de respaldo
     */
    static async hasBackupCodes(userId) {
        const count = await this.countUnused(userId);
        return count > 0;
    }
}

module.exports = BackupCode;
