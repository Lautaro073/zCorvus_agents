const { User, Role, Token, BackupCode, RefreshToken, PasswordResetOtp } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { verify2FALogin } = require('./twoFactor.controller');
const { parseTimeToMs } = require('../utils/time');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const config = require('../config/config');
const { getPasswordResetOtpHtml } = require('../templates/password-reset-otp.html');
const { getPasswordResetOtpText } = require('../templates/password-reset-otp.text');
const { getPasswordResetOtpCopy, normalizeOtpLocale } = require('../templates/password-reset-otp.copy');

const generateSixDigitOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');
const PASSWORD_RESET_OTP_MINUTES = Number.isInteger(config.auth?.passwordResetOtpMinutes) && config.auth.passwordResetOtpMinutes > 0
    ? config.auth.passwordResetOtpMinutes
    : 10;
const APP_NAME = config.app?.name || 'zCorvus';
const GENERIC_OTP_REQUEST_MESSAGE = 'If the email exists, an OTP has been sent';
const GENERIC_OTP_INVALID_MESSAGE = 'Invalid or expired OTP';
const INVALID_REGISTER_ROLE_MESSAGE = 'Invalid roles_id. Allowed values: 2';
const INVALID_REGISTER_ROLE_FIELD_MESSAGE = 'Public signup cannot assign privileged roles';

function resolveRegisterRoleId(rawRoleId) {
    if (rawRoleId === undefined || rawRoleId === null || rawRoleId === '') {
        return { value: 2 };
    }

    if (Array.isArray(rawRoleId)) {
        return { error: INVALID_REGISTER_ROLE_MESSAGE };
    }

    if (typeof rawRoleId === 'boolean') {
        return { error: INVALID_REGISTER_ROLE_MESSAGE };
    }

    const parsedRoleId = Number(rawRoleId);
    if (!Number.isInteger(parsedRoleId) || parsedRoleId !== 2) {
        return { error: INVALID_REGISTER_ROLE_MESSAGE };
    }

    return { value: 2 };
}

function resolveOtpLocale(req) {
    const bodyLocale = req.body?.locale;
    const headerLocale = req.get('x-locale');
    const acceptLanguageLocale = req.get('accept-language');

    return normalizeOtpLocale(bodyLocale || headerLocale || acceptLanguageLocale || 'en');
}

function buildResetUrl(locale) {
    const safeLocale = normalizeOtpLocale(locale);
    const frontendBaseUrl = String(config.app?.frontendUrl || 'http://localhost:3000');

    try {
        const url = new URL(frontendBaseUrl);
        url.pathname = `/${safeLocale}/auth/forgot-password`;
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch (_error) {
        const trimmedBase = frontendBaseUrl.replace(/\/+$/, '');
        return `${trimmedBase}/${safeLocale}/auth/forgot-password`;
    }
}

/**
 * Registrar nuevo usuario
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password, roles_id, role } = req.body;

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

        if (role !== undefined && role !== null && String(role).trim() !== '') {
            return errorResponse(res, INVALID_REGISTER_ROLE_FIELD_MESSAGE, 400);
        }

        // Rol publico allowlisted: user (2) solamente.
        // Cualquier intento de pasar roles privilegiados por payload responde 400.
        const roleResolution = resolveRegisterRoleId(roles_id);
        if (roleResolution.error) {
            return errorResponse(res, roleResolution.error, 400);
        }

        const roleId = roleResolution.value;

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

        if (user.account_status === 'disabled') {
            return errorResponse(res, 'Account is disabled', 403);
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
 * Solicitar OTP para reset de contraseña
 */
const requestPasswordResetOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        const locale = resolveOtpLocale(req);
        const resetUrl = buildResetUrl(locale);

        const user = await User.findByEmail(email);
        if (!user) {
            return successResponse(res, null, GENERIC_OTP_REQUEST_MESSAGE, 200);
        }

        const otp = generateSixDigitOtp();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_MINUTES * 60 * 1000);

        await PasswordResetOtp.markAllUnusedAsUsed(user.id);
        await PasswordResetOtp.create(user.id, otp, expiresAt);

        const localizedCopy = getPasswordResetOtpCopy({
            locale,
            expiresInMinutes: PASSWORD_RESET_OTP_MINUTES,
            appName: APP_NAME
        });

        try {
            await sendMail({
                to: user.email,
                subject: localizedCopy.subject,
                text: getPasswordResetOtpText({
                    otp,
                    expiresInMinutes: PASSWORD_RESET_OTP_MINUTES,
                    locale,
                    resetUrl,
                    appName: APP_NAME
                }),
                html: getPasswordResetOtpHtml({
                    otp,
                    expiresInMinutes: PASSWORD_RESET_OTP_MINUTES,
                    locale,
                    resetUrl,
                    appName: APP_NAME
                })
            });
        } catch (mailerError) {
            console.error('Password reset mailer error:', mailerError.message);
        }

        return successResponse(res, null, GENERIC_OTP_REQUEST_MESSAGE, 200);
    } catch (error) {
        console.error('Request password reset OTP error:', error);
        next(error);
    }
};

/**
 * Verificar OTP para reset de contraseña
 */
const verifyPasswordResetOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            return errorResponse(res, GENERIC_OTP_INVALID_MESSAGE, 400);
        }

        const otpRecord = await PasswordResetOtp.findLatestActiveByUserId(user.id);
        const isValid = await PasswordResetOtp.verifyOtp(otpRecord, otp);

        if (!isValid) {
            return errorResponse(res, GENERIC_OTP_INVALID_MESSAGE, 400);
        }

        return successResponse(res, {
            valid: true,
            expiresAt: otpRecord.expires_at
        }, 'OTP is valid', 200);
    } catch (error) {
        console.error('Verify password reset OTP error:', error);
        next(error);
    }
};

/**
 * Resetear contraseña usando OTP
 */
const resetPasswordWithOtp = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            return errorResponse(res, GENERIC_OTP_INVALID_MESSAGE, 400);
        }

        const otpRecord = await PasswordResetOtp.findLatestActiveByUserId(user.id);
        const isValid = await PasswordResetOtp.verifyOtp(otpRecord, otp);

        if (!isValid) {
            return errorResponse(res, GENERIC_OTP_INVALID_MESSAGE, 400);
        }

        const consumed = await PasswordResetOtp.consumeIfValid(otpRecord.id);
        if (!consumed) {
            return errorResponse(res, GENERIC_OTP_INVALID_MESSAGE, 400);
        }

        await User.update(user.id, { password: newPassword });
        await PasswordResetOtp.markAllUnusedAsUsed(user.id);

        return successResponse(res, null, 'Password reset successful', 200);
    } catch (error) {
        console.error('Reset password with OTP error:', error);
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

        if (user.account_status === 'disabled') {
            return errorResponse(res, 'Account is disabled', 403);
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

        if (user.account_status === 'disabled') {
            return errorResponse(res, 'Account is disabled', 403);
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
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
    logout,
    getProfile,
    getRefreshToken,
    refreshAccessToken
};
