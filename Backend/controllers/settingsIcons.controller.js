const { SettingsIcons } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Obtener todos los settings icons (admin)
 */
const getAll = async (req, res, next) => {
    try {
        const settings = await SettingsIcons.findAll();
        return successResponse(res, settings, 'Settings icons retrieved successfully');
    } catch (error) {
        console.error('Get all settings icons error:', error);
        next(error);
    }
};

/**
 * Obtener settings icon por ID
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const setting = await SettingsIcons.findById(id);

        if (!setting) {
            return errorResponse(res, 'Settings icon not found', 404);
        }

        return successResponse(res, setting, 'Settings icon retrieved successfully');
    } catch (error) {
        console.error('Get settings icon by ID error:', error);
        next(error);
    }
};

/**
 * Crear nuevo settings icon
 */
const create = async (req, res, next) => {
    try {
        const { icon, layer } = req.body;

        // Preparar datos con null si layer no existe
        const settingsData = {
            icon: icon || null,
            layer: layer !== undefined ? layer : null
        };

        const newSetting = await SettingsIcons.create(settingsData);

        return successResponse(res, newSetting, 'Settings icon created successfully', 201);
    } catch (error) {
        console.error('Create settings icon error:', error);
        next(error);
    }
};

/**
 * Actualizar settings icon
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { icon, layer } = req.body;

        const setting = await SettingsIcons.findById(id);

        if (!setting) {
            return errorResponse(res, 'Settings icon not found', 404);
        }

        const updateData = {};
        if (icon !== undefined) updateData.icon = icon;
        if (layer !== undefined) updateData.layer = layer;

        await SettingsIcons.update(id, updateData);

        const updatedSetting = await SettingsIcons.findById(id);

        return successResponse(res, updatedSetting, 'Settings icon updated successfully');
    } catch (error) {
        console.error('Update settings icon error:', error);
        next(error);
    }
};

/**
 * Eliminar settings icon
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const setting = await SettingsIcons.findById(id);

        if (!setting) {
            return errorResponse(res, 'Settings icon not found', 404);
        }

        await SettingsIcons.delete(id);

        return successResponse(res, null, 'Settings icon deleted successfully');
    } catch (error) {
        console.error('Delete settings icon error:', error);
        next(error);
    }
};

/**
 * Obtener settings del usuario actual
 */
const getUserSettings = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const { User } = require('../models');
        const user = await User.findById(userId);

        if (!user || !user.settings_icons_id) {
            return errorResponse(res, 'User settings not found', 404);
        }

        const settings = await SettingsIcons.findById(user.settings_icons_id);

        if (!settings) {
            return errorResponse(res, 'Settings icon not found', 404);
        }

        return successResponse(res, settings, 'User settings retrieved successfully');
    } catch (error) {
        console.error('Get user settings error:', error);
        next(error);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    getUserSettings
};
