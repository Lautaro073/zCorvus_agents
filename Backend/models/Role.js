const db = require('../utils/db');

/**
 * Modelo Role
 */
class Role {
    /**
     * Obtener todos los roles
     */
    static async findAll() {
        return await db.select('roles');
    }

    /**
     * Obtener rol por ID
     */
    static async findById(id) {
        return await db.findById('roles', id);
    }

    /**
     * Obtener rol por nombre
     */
    static async findByName(name) {
        return await db.findByField('roles', 'name', name);
    }

    /**
     * Crear nuevo rol
     */
    static async create(roleData) {
        const result = await db.insert('roles', roleData);
        return result.insertId;
    }

    /**
     * Actualizar rol
     */
    static async update(id, roleData) {
        return await db.update('roles', roleData, { id });
    }

    /**
     * Eliminar rol
     */
    static async delete(id) {
        return await db.deleteRow('roles', { id });
    }
}

module.exports = Role;
