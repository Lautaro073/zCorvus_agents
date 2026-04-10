const { Role } = require('../models');

const roleNameCache = new Map();
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveRoleNameById(roleId) {
    if (!roleId) {
        return null;
    }

    const cacheKey = String(roleId);
    const cached = roleNameCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
        return cached.name;
    }

    const userRole = await Role.findById(roleId);
    if (!userRole || !userRole.name) {
        return null;
    }

    roleNameCache.set(cacheKey, {
        name: userRole.name,
        expiresAt: now + ROLE_CACHE_TTL_MS
    });

    return userRole.name;
}

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

            if (typeof req.user.role === 'string' && req.user.role.length > 0) {
                if (!allowedRoles.includes(req.user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }
                return next();
            }

            const roleName = await resolveRoleNameById(req.user.roles_id);
            if (!roleName) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid role'
                });
            }

            if (!allowedRoles.includes(roleName)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            req.user.role = roleName;
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

        const roleName = req.user.role || await resolveRoleNameById(req.user.roles_id);
        if (!roleName || roleName !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.user.role = roleName;
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
