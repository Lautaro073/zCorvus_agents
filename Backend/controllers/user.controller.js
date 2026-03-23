const { User } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Obtener todos los usuarios (solo admin)
 */
const getAll = async (req, res, next) => {
    try {
        const users = await User.findAll();

        const usersWithoutPassword = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        return successResponse(res, usersWithoutPassword, 'Users retrieved successfully');
    } catch (error) {
        console.error('Get all users error:', error);
        next(error);
    }
};

/**
 * Obtener usuario por ID
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        const { password, ...userWithoutPassword } = user;

        return successResponse(res, userWithoutPassword, 'User retrieved successfully');
    } catch (error) {
        console.error('Get user by ID error:', error);
        next(error);
    }
};

/**
 * Actualizar usuario
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, email, roles_id } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Verificar si el email ya existe (si se está cambiando)
        if (email && email !== user.email) {
            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return errorResponse(res, 'Email already in use', 400);
            }
        }

        // Verificar si el username ya existe (si se está cambiando)
        if (username && username !== user.username) {
            const existingUsername = await User.findByUsername(username);
            if (existingUsername) {
                return errorResponse(res, 'Username already taken', 400);
            }
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (roles_id) updateData.roles_id = roles_id;

        await User.update(id, updateData);

        const updatedUser = await User.findById(id);
        const { password, ...userWithoutPassword } = updatedUser;

        return successResponse(res, userWithoutPassword, 'User updated successfully');
    } catch (error) {
        console.error('Update user error:', error);
        next(error);
    }
};

/**
 * Eliminar usuario
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // No permitir que un usuario se elimine a sí mismo
        if (req.user.id === id) {
            return errorResponse(res, 'Cannot delete your own account', 400);
        }

        await User.delete(id);

        return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
        console.error('Delete user error:', error);
        next(error);
    }
};

/**
 * Cambiar contraseña
 */
const changePassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Verificar que solo el usuario pueda cambiar su propia contraseña (o admin)
        if (req.user.id !== id && req.user.role !== 'admin') {
            return errorResponse(res, 'Access denied', 403);
        }

        // Verificar contraseña actual
        const isPasswordValid = await User.verifyPassword(currentPassword, user.password);

        if (!isPasswordValid) {
            return errorResponse(res, 'Current password is incorrect', 400);
        }

        // Actualizar contraseña
        await User.update(id, { password: newPassword });

        return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
        console.error('Change password error:', error);
        next(error);
    }
};

/**
 * Actualizar perfil del usuario actual
 */
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { username, email } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Verificar si el email ya existe
        if (email && email !== user.email) {
            const existingEmail = await User.findByEmail(email);
            if (existingEmail) {
                return errorResponse(res, 'Email already in use', 400);
            }
        }

        // Verificar si el username ya existe
        if (username && username !== user.username) {
            const existingUsername = await User.findByUsername(username);
            if (existingUsername) {
                return errorResponse(res, 'Username already taken', 400);
            }
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;

        await User.update(userId, updateData);

        const updatedUser = await User.findById(userId);
        const { password, ...userWithoutPassword } = updatedUser;

        return successResponse(res, userWithoutPassword, 'Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        next(error);
    }
};

module.exports = {
    getAll,
    getById,
    update,
    remove,
    changePassword,
    updateProfile
};
