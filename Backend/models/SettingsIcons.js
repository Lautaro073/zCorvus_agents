const db = require('../utils/db');
const { generateUUID } = require('../utils/uuid');

/**
 * Modelo SettingsIcons
 */
class SettingsIcons {
    /**
     * Obtener todos los settings icons
     */
    static async findAll() {
        return await db.select('settings_icons');
    }

    /**
     * Obtener settings icon por ID
     */
    static async findById(id) {
        return await db.findById('settings_icons', id);
    }

    /**
     * Crear nuevo settings icon
     */
    static async create(settingsData) {
        const settingsId = generateUUID();
        const settingsToInsert = {
            id: settingsId,
            ...settingsData
        };
        await db.insert('settings_icons', settingsToInsert);

        // Retornar el objeto completo creado
        return await this.findById(settingsId);
    }

    /**
     * Actualizar settings icon
     */
    static async update(id, settingsData) {
        return await db.update('settings_icons', settingsData, { id });
    }

    /**
     * Eliminar settings icon
     */
    static async delete(id) {
        return await db.deleteRow('settings_icons', { id });
    }
}

module.exports = SettingsIcons;
