const { Role } = require('../models');

/**
 * Middleware para verificar roles de usuario
 */
const checkRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.roles_id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Buscar el rol del usuario en la base de datos
            const userRole = await Role.findById(req.user.roles_id);

            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid role'
                });
            }

            if (!allowedRoles.includes(userRole.name)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            // Agregar el nombre del rol a req.user
            req.user.role = userRole.name;
            next();
        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Middleware para verificar si es admin
 */
const isAdmin = checkRole('admin');

/**
 * Middleware para verificar si es admin o moderador
 */
const isAdminOrModerator = checkRole('admin', 'moderator');

/**
 * Middleware para verificar que el usuario accede a su propio recurso
 */
const isSelfOrAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const requestedUserId = req.params.id || req.params.userId;
        const isOwnResource = req.user.id === requestedUserId;

        if (isOwnResource) {
            return next();
        }

        // Verificar si es admin
        const userRole = await Role.findById(req.user.roles_id);

        if (!userRole || userRole.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.user.role = userRole.name;
        next();
    } catch (error) {
        console.error('isSelfOrAdmin error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking permissions'
        });
    }
};

module.exports = {
    checkRole,
    isAdmin,
    isAdminOrModerator,
    isSelfOrAdmin
};
