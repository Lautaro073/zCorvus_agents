const { Role } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Obtener todos los roles
 */
const getAll = async (req, res, next) => {
    try {
        const roles = await Role.findAll();
        return successResponse(res, roles, 'Roles retrieved successfully');
    } catch (error) {
        console.error('Get all roles error:', error);
        next(error);
    }
};

/**
 * Obtener rol por ID
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const role = await Role.findById(id);

        if (!role) {
            return errorResponse(res, 'Role not found', 404);
        }

        return successResponse(res, role, 'Role retrieved successfully');
    } catch (error) {
        console.error('Get role by ID error:', error);
        next(error);
    }
};

/**
 * Crear nuevo rol
 */
const create = async (req, res, next) => {
    try {
        const { id, name } = req.body;

        // Verificar si el rol ya existe
        const existingRole = await Role.findByName(name);

        if (existingRole) {
            return errorResponse(res, 'Role already exists', 400);
        }

        // Si se proporciona un ID, usarlo; de lo contrario, dejar que la BD lo genere
        const roleData = id ? { id, name } : { name };
        const roleId = await Role.create(roleData);

        // Obtener el rol completo creado (usar el ID proporcionado o el generado)
        const newRole = await Role.findById(id || roleId);

        return successResponse(res, newRole, 'Role created successfully', 201);
    } catch (error) {
        console.error('Create role error:', error);
        next(error);
    }
};

/**
 * Actualizar rol
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const role = await Role.findById(id);

        if (!role) {
            return errorResponse(res, 'Role not found', 404);
        }

        // Verificar si el nuevo nombre ya existe
        if (name && name !== role.name) {
            const existingRole = await Role.findByName(name);
            if (existingRole) {
                return errorResponse(res, 'Role name already exists', 400);
            }
        }

        await Role.update(id, { name });

        const updatedRole = await Role.findById(id);

        return successResponse(res, updatedRole, 'Role updated successfully');
    } catch (error) {
        console.error('Update role error:', error);
        next(error);
    }
};

/**
 * Eliminar rol
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const role = await Role.findById(id);

        if (!role) {
            return errorResponse(res, 'Role not found', 404);
        }

        // No permitir eliminar roles esenciales (admin, user)
        if (role.name === 'admin' || role.name === 'user') {
            return errorResponse(res, 'Cannot delete essential role', 400);
        }

        await Role.delete(id);

        return successResponse(res, null, 'Role deleted successfully');
    } catch (error) {
        console.error('Delete role error:', error);
        next(error);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
