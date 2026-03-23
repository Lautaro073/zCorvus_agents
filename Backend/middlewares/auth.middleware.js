const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Verificar que el usuario existe
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verificar y actualizar rol Pro basado en token activo
        // Solo si el usuario es Pro o User (no admin)
        if (user.roles_id === 2 || user.roles_id === 3) {
            await User.verifyAndUpdateProRole(user.id);
            // Refrescar datos del usuario después de la verificación
            const updatedUser = await User.findById(user.id);
            user.roles_id = updatedUser.roles_id;
        }

        // Adjuntar información del usuario a la request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            roles_id: user.roles_id,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware opcional de autenticación
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyToken(token);

            if (decoded) {
                const user = await User.findById(decoded.id);
                if (user) {
                    req.user = {
                        id: decoded.id,
                        email: decoded.email,
                        role: decoded.role
                    };
                }
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};
