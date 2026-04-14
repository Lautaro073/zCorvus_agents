const db = require('../utils/db');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/uuid');

const ACCOUNT_STATUS_ACTIVE = 'active';
const ACCOUNT_STATUS_DISABLED = 'disabled';

let verifyAccountLifecycleSchemaPromise = null;

async function verifyAccountLifecycleSchema() {
    const columns = await db.query(`PRAGMA table_info('user')`);
    const availableColumns = new Set(columns.map((column) => String(column.name)));
    const requiredColumns = ['account_status', 'disabled_at'];
    const missingColumns = requiredColumns.filter((columnName) => !availableColumns.has(columnName));

    if (missingColumns.length > 0) {
        throw new Error(
            `Missing user lifecycle columns: ${missingColumns.join(', ')}. Run "npm run db:migrate:user-account-lifecycle".`
        );
    }
}

function ensureAccountLifecycleSchemaOnce() {
    if (!verifyAccountLifecycleSchemaPromise) {
        verifyAccountLifecycleSchemaPromise = verifyAccountLifecycleSchema().catch((error) => {
            verifyAccountLifecycleSchemaPromise = null;
            throw error;
        });
    }

    return verifyAccountLifecycleSchemaPromise;
}

/**
 * Modelo User
 */
class User {
    static async ensureAccountLifecycleSchema() {
        await ensureAccountLifecycleSchemaOnce();
    }

    /**
     * Obtener todos los usuarios
     */
    static async findAll() {
        await this.ensureAccountLifecycleSchema();

        const sql = `
      SELECT u.id, u.username, u.email, u.roles_id, u.token_id, u.settings_icons_id,
             u.account_status, u.disabled_at,
             u.two_factor_enabled, r.name as role_name
      FROM user u
      LEFT JOIN roles r ON u.roles_id = r.id
    `;
        return await db.query(sql);
    }

    /**
     * Obtener usuario por ID
     */
    static async findById(id) {
        await this.ensureAccountLifecycleSchema();

        const sql = `
      SELECT u.id, u.username, u.email, u.password, u.roles_id, u.token_id, u.settings_icons_id,
             u.account_status, u.disabled_at,
             u.two_factor_enabled, u.two_factor_secret, r.name as role_name
      FROM user u
      LEFT JOIN roles r ON u.roles_id = r.id
      WHERE u.id = ?
    `;
        const result = await db.query(sql, [id]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Obtener usuario por email
     */
    static async findByEmail(email) {
        await this.ensureAccountLifecycleSchema();

        const sql = `
      SELECT u.*, r.name as role_name
      FROM user u
      LEFT JOIN roles r ON u.roles_id = r.id
      WHERE u.email = ?
    `;
        const result = await db.query(sql, [email]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Obtener usuario por username
     */
    static async findByUsername(username) {
        await this.ensureAccountLifecycleSchema();

        const sql = `
      SELECT u.*, r.name as role_name
      FROM user u
      LEFT JOIN roles r ON u.roles_id = r.id
      WHERE u.username = ?
    `;
        const result = await db.query(sql, [username]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Crear nuevo usuario
     */
    static async create(userData) {
        await this.ensureAccountLifecycleSchema();

        // Generar UUID para el usuario
        const userId = generateUUID();

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const userToInsert = {
            id: userId,
            ...userData,
            account_status: userData.account_status || ACCOUNT_STATUS_ACTIVE,
            password: hashedPassword
        };

        await db.insert('user', userToInsert);
        return userId;
    }

    /**
     * Actualizar usuario
     */
    static async update(id, userData) {
        await this.ensureAccountLifecycleSchema();

        // Si se actualiza la contraseña, hashearla
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        return await db.update('user', userData, { id });
    }

    /**
     * Eliminar usuario
     */
    static async delete(id) {
        await this.ensureAccountLifecycleSchema();
        return await db.deleteRow('user', { id });
    }

    static async disableAccount(userId) {
        await this.ensureAccountLifecycleSchema();
        return await db.update('user', {
            account_status: ACCOUNT_STATUS_DISABLED,
            disabled_at: new Date().toISOString()
        }, { id: userId });
    }

    static async enableAccount(userId) {
        await this.ensureAccountLifecycleSchema();
        return await db.update('user', {
            account_status: ACCOUNT_STATUS_ACTIVE,
            disabled_at: null
        }, { id: userId });
    }

    /**
     * Verificar contraseña
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Actualizar token del usuario
     */
    static async updateToken(userId, tokenId) {
        return await db.update('user', { token_id: tokenId }, { id: userId });
    }

    /**
     * Actualizar rol del usuario
     */
    static async updateRole(userId, roleId) {
        return await db.update('user', { roles_id: roleId }, { id: userId });
    }

    /**
     * Actualizar settings icons del usuario
     */
    static async updateSettings(userId, settingsIconsId) {
        return await db.update('user', { settings_icons_id: settingsIconsId }, { id: userId });
    }

    /**
     * Verificar y actualizar rol Pro basado en token activo
     * Un usuario solo puede ser Pro (rol 3) si tiene un token activo (finish_date > NOW)
     */
    static async verifyAndUpdateProRole(userId) {
        await this.ensureAccountLifecycleSchema();

        const sql = `
            SELECT u.id, u.roles_id, u.token_id, u.account_status, t.finish_date
            FROM user u
            LEFT JOIN token t ON u.token_id = t.id
            WHERE u.id = ?
        `;
        const result = await db.query(sql, [userId]);

        if (result.length === 0) return null;

        const user = result[0];
        const hasActiveToken = user.token_id && user.finish_date && new Date(user.finish_date) > new Date();

        // Si tiene rol Pro (3) pero NO tiene token activo, degradar a user (2)
        if (user.roles_id === 3 && !hasActiveToken) {
            await db.update('user', { roles_id: 2 }, { id: userId });
            return { changed: true, newRole: 2, reason: 'Token expired or missing' };
        }

        // Si tiene token activo pero NO es Pro, actualizar a Pro (3)
        if (hasActiveToken && user.roles_id === 2) {
            await db.update('user', { roles_id: 3 }, { id: userId });
            return { changed: true, newRole: 3, reason: 'Active token detected' };
        }

        return { changed: false, currentRole: user.roles_id };
    }

    /**
     * Verificar si un usuario tiene token activo
     */
    static async hasActiveToken(userId) {
        await this.ensureAccountLifecycleSchema();

        const sql = `
            SELECT t.* FROM token t
            INNER JOIN user u ON u.token_id = t.id
            WHERE u.id = ? AND t.finish_date > datetime('now')
        `;
        const result = await db.query(sql, [userId]);
        return result.length > 0;
    }

    /**
     * Habilitar 2FA para un usuario
     */
    static async enable2FA(userId, secret) {
        await this.ensureAccountLifecycleSchema();
        return await db.update('user', {
            two_factor_enabled: 1,
            two_factor_secret: secret
        }, { id: userId });
    }

    /**
     * Deshabilitar 2FA para un usuario
     */
    static async disable2FA(userId) {
        await this.ensureAccountLifecycleSchema();
        return await db.update('user', {
            two_factor_enabled: 0,
            two_factor_secret: null
        }, { id: userId });
    }

    /**
     * Verificar si un usuario tiene 2FA habilitado
     */
    static async has2FAEnabled(userId) {
        const user = await this.findById(userId);
        return user && user.two_factor_enabled === 1;
    }
}

module.exports = User;
