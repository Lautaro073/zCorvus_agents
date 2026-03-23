const db = require('../utils/db');
const { generateUUID } = require('../utils/uuid');
const { parseTimeToMs } = require('../utils/time');

/**
 * Modelo RefreshToken
 */
class RefreshToken {
    /**
     * Crear nuevo refresh token
     */
    static async create(userId, token, expiresAt) {
        const id = generateUUID();
        await db.insert('refresh_tokens', {
            id,
            user_id: userId,
            token,
            expires_at: expiresAt,
            last_used_at: new Date()
        });
        return id;
    }

    /**
     * Buscar refresh token
     */
    static async findByToken(token) {
        const result = await db.query(
            'SELECT * FROM refresh_tokens WHERE token = ?',
            [token]
        );
        return result[0];
    }

    /**
     * Actualizar last_used_at
     */
    static async updateLastUsed(tokenId) {
        await db.update('refresh_tokens',
            { last_used_at: new Date() },
            { id: tokenId }
        );
    }

    /**
     * Verificar si el token está activo (no expirado y usado recientemente)
     */
    static async isActive(tokenRecord) {
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expires_at);
        const lastUsedAt = new Date(tokenRecord.last_used_at);

        // Verificar expiración
        if (now > expiresAt) {
            return false;
        }

        // Verificar inactividad (soporta formatos: 10d, 5m, 30s, 2h)
        const inactivityTime = process.env.JWT_REFRESH_INACTIVITY || '10d';
        const maxInactivityMs = parseTimeToMs(inactivityTime);
        const inactiveTime = now - lastUsedAt;

        if (inactiveTime > maxInactivityMs) {
            return false;
        }

        return true;
    }

    /**
     * Eliminar refresh tokens de un usuario
     */
    static async deleteByUserId(userId) {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    }

    /**
     * Eliminar refresh token específico
     */
    static async deleteByToken(token) {
        await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    }

    /**
     * Limpiar tokens expirados o inactivos
     */
    static async cleanupExpired() {
        const inactivityDays = parseInt(process.env.JWT_REFRESH_INACTIVITY_DAYS || '10');
        const inactivityDate = new Date();
        inactivityDate.setDate(inactivityDate.getDate() - inactivityDays);

        await db.query(
            "DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR last_used_at < ?",
            [inactivityDate]
        );
    }
}

module.exports = RefreshToken;
