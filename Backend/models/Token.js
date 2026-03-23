const db = require('../utils/db');
const { generateUUID } = require('../utils/uuid');

/**
 * Modelo Token
 */
class Token {
    /**
     * Obtener todos los tokens
     */
    static async findAll() {
        return await db.select('token');
    }

    /**
     * Obtener token por ID
     */
    static async findById(id) {
        return await db.findById('token', id);
    }

    /**
     * Obtener token por valor
     */
    static async findByToken(tokenValue) {
        return await db.findByField('token', 'token', tokenValue);
    }

    /**
     * Crear nuevo token
     */
    static async create(tokenData) {
        const tokenId = generateUUID();
        const tokenToInsert = {
            id: tokenId,
            ...tokenData
        };
        await db.insert('token', tokenToInsert);
        return tokenId;
    }

    /**
     * Actualizar token
     */
    static async update(id, tokenData) {
        return await db.update('token', tokenData, { id });
    }

    /**
     * Eliminar token
     */
    static async delete(id) {
        return await db.deleteRow('token', { id });
    }

    /**
     * Eliminar tokens expirados
     */
    static async deleteExpired() {
        const sql = "DELETE FROM token WHERE finish_date < datetime('now')";
        return await db.query(sql);
    }

    /**
     * Verificar si un token es válido
     */
    static async isValid(tokenValue) {
        const sql = "SELECT * FROM token WHERE token = ? AND finish_date > datetime('now')";
        const result = await db.query(sql, [tokenValue]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Obtener token activo por ID de token
     */
    static async findActiveById(tokenId) {
        const sql = "SELECT * FROM token WHERE id = ? AND finish_date > datetime('now')";
        const result = await db.query(sql, [tokenId]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Verificar si un usuario tiene un token activo
     */
    static async hasActiveToken(userId) {
        const sql = `
            SELECT t.* FROM token t
            INNER JOIN users u ON u.token_id = t.id
            WHERE u.id = ? AND t.finish_date > datetime('now')
        `;
        const result = await db.query(sql, [userId]);
        return result.length > 0 ? result[0] : null;
    }
}

module.exports = Token;
