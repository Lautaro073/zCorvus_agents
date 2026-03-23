const { User, Role, Token, BackupCode, RefreshToken } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { verify2FALogin } = require('./twoFactor.controller');
const { parseTimeToMs } = require('../utils/time');

/**
 * Registrar nuevo usuario
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password, roles_id } = req.body;

        // Verificar si el email ya existe
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return errorResponse(res, 'Email already registered', 400);
        }

        // Verificar si el username ya existe
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return errorResponse(res, 'Username already taken', 400);
        }

        // Permitir especificar el rol en el registro
        // Por defecto es 'user' (ID 2) si no se especifica
        // Puede ser Admin (ID 1) si se proporciona roles_id: 1
        // Pro (ID 3) normalmente se asigna mediante Stripe, pero también se permite aquí
        const roleId = roles_id || 2;

        // Crear usuario
        const userId = await User.create({
            username,
            email,
            password,
            roles_id: roleId
        });

        // Obtener usuario creado
        const newUser = await User.findById(userId);

        // Generar solo access token
        const accessToken = generateAccessToken(newUser.id, newUser.email, newUser.role_name);

        return successResponse(res, {
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role_name
            },
            accessToken
        }, 'User registered successfully', 201);

    } catch (error) {
        console.error('Register error:', error);
        next(error);
    }
};

/**
 * Iniciar sesión
 */
const login = async (req, res, next) => {
    try {
        const { email, password, twoFactorCode } = req.body;

        // Buscar usuario por email
        const user = await User.findByEmail(email);

        if (!user) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        // Verificar contraseña
        const isPasswordValid = await User.verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        // Si tiene 2FA habilitado, verificar código
        if (user.two_factor_enabled) {
            if (!twoFactorCode) {
                return res.status(401).json({
                    success: false,
                    message: '2FA code required',
                    requires2FA: true
                });
            }

            // Intentar primero con código 2FA normal
            let is2FAValid = await verify2FALogin(user.two_factor_secret, twoFactorCode);

            // Si falla, intentar con backup code
            if (!is2FAValid) {
                is2FAValid = await BackupCode.verifyAndUse(user.id, twoFactorCode);

                if (!is2FAValid) {
                    return errorResponse(res, 'Invalid 2FA code or backup code', 401);
                }
            }
        }

        // Generar solo access token
        const accessToken = generateAccessToken(user.id, user.email, user.role_name);

        return successResponse(res, {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role_name,
                two_factor_enabled: user.two_factor_enabled === 1
            },
            accessToken
        }, 'Login successful', 200);
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

/**
 * Cerrar sesión
 */
const logout = async (req, res, next) => {
    try {
        // Aquí podrías invalidar el token en la BD si lo guardas
        // Por ahora solo retornamos un mensaje exitoso

        return successResponse(res, null, 'Logout successful');

    } catch (error) {
        console.error('Logout error:', error);
        next(error);
    }
};

/**
 * Obtener perfil del usuario actual
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(res, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_name
        }, 'Profile retrieved successfully');

    } catch (error) {
        console.error('Get profile error:', error);
        next(error);
    }
};

/**
 * Obtener refresh token (nuevo endpoint)
 */
const getRefreshToken = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Generar refresh token
        const refreshToken = generateRefreshToken(userId);

        // Calcular fecha de expiración usando el formato flexible
        const refreshExpireTime = process.env.JWT_REFRESH_EXPIRE || '30d';
        const expireMs = parseTimeToMs(refreshExpireTime);
        const expiresAt = new Date(Date.now() + expireMs);

        // Guardar en base de datos
        await RefreshToken.create(userId, refreshToken, expiresAt);

        // Obtener tiempo de inactividad para la respuesta
        const inactivityTime = process.env.JWT_REFRESH_INACTIVITY || '10d';

        return successResponse(res, {
            refreshToken,
            expiresAt,
            inactivityTime // Devolver formato legible (ej: '10d', '5m')
        }, 'Refresh token generated successfully');

    } catch (error) {
        console.error('Get refresh token error:', error);
        next(error);
    }
};

/**
 * Refrescar access token usando refresh token
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return errorResponse(res, 'Refresh token required', 400);
        }

        // Buscar token en la base de datos
        const tokenRecord = await RefreshToken.findByToken(refreshToken);

        if (!tokenRecord) {
            return errorResponse(res, 'Invalid refresh token', 403);
        }

        // Verificar si está activo (no expirado y usado recientemente)
        const isActive = await RefreshToken.isActive(tokenRecord);

        if (!isActive) {
            // Eliminar token inválido
            await RefreshToken.deleteByToken(refreshToken);
            return errorResponse(res, 'Refresh token expired or inactive', 403);
        }

        // Verificar el JWT
        const { verifyToken } = require('../utils/jwt');
        const decoded = verifyToken(refreshToken);

        if (!decoded || decoded.type !== 'refresh') {
            return errorResponse(res, 'Invalid refresh token format', 403);
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Actualizar last_used_at
        await RefreshToken.updateLastUsed(tokenRecord.id);

        // Generar nuevo access token
        const accessToken = generateAccessToken(user.id, user.email, user.role_name);

        return successResponse(res, {
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role_name,
                two_factor_enabled: user.two_factor_enabled === 1
            }
        }, 'Token refreshed successfully');

    } catch (error) {
        console.error('Refresh token error:', error);
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    getRefreshToken,
    refreshAccessToken
};
