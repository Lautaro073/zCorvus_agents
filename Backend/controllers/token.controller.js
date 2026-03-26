const { Token, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Obtener tokens del usuario autenticado
 * Solo usuarios Pro pueden ver sus tokens y requieren 2FA habilitado
 */
const getMyTokens = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Obtener usuario con información de rol
        const user = await User.findById(userId);

        // Si es usuario Pro (role 3), DEBE tener 2FA habilitado
        if (user.roles_id === 3) {
            if (!user.two_factor_enabled) {
                return res.status(403).json({
                    success: false,
                    message: 'Pro users must enable 2FA to access their tokens',
                    requires2FA: true,
                    setupUrl: '/api/auth/2fa/setup'
                });
            }
        }

        // Obtener token del usuario si tiene
        if (!user.token_id) {
            return res.status(404).json({
                success: false,
                message: 'No token assigned to this user'
            });
        }

        const token = await Token.findById(user.token_id);

        if (!token) {
            return res.status(404).json({
                success: false,
                message: 'Token not found'
            });
        }

        // Verificar si el token está activo
        const isActive = new Date(token.finish_date) > new Date();

        // Deshabilitar caché para que siempre devuelva 200 con datos
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return successResponse(res, {
            token: {
                id: token.id,
                token: token.token,
                type: token.type,
                start_date: token.start_date,
                finish_date: token.finish_date,
                is_active: isActive
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Obtener todos los tokens (solo admin)
 */
const getAllTokens = async (req, res, next) => {
    try {
        // Verificar que sea admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const tokens = await Token.findAll();
        return successResponse(res, { tokens });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyTokens,
    getAllTokens
};
