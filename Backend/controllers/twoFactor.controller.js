const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const BackupCode = require('../models/BackupCode');

// Almacenamiento temporal de secrets (en producción usar Redis o similar)
const tempSecrets = new Map();

/**
 * Configurar 2FA - Genera secret y QR code
 */
const setup2FA = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Verificar si ya tiene 2FA habilitado
        const user = await User.findById(userId);
        if (user.two_factor_enabled) {
            return res.status(400).json({
                success: false,
                message: '2FA already enabled'
            });
        }

        // Generar secret
        const secret = speakeasy.generateSecret({
            name: `zCorvus (${user.email})`,
            length: 32
        });

        // Generar QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        // Guardar temporalmente el secret (expira en 10 minutos)
        tempSecrets.set(userId, {
            secret: secret.base32,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCode,
                manualEntry: secret.otpauth_url
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verificar código 2FA y habilitar
 */
const verify2FA = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;

        if (!token || token.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        // Obtener secret temporal o de BD
        const user = await User.findById(userId);
        let secret = user.two_factor_secret;

        // Si no está habilitado, buscar en tempSecrets
        if (!secret) {
            const tempData = tempSecrets.get(userId);
            if (!tempData || Date.now() > tempData.expiresAt) {
                tempSecrets.delete(userId);
                return res.status(400).json({
                    success: false,
                    message: 'No 2FA setup found or expired. Please setup 2FA first.'
                });
            }
            secret = tempData.secret;
        }

        // Verificar el código
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Permite 2 intervalos de tiempo antes/después
        });

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Si es setup nuevo, habilitar 2FA
        if (tempSecrets.has(userId)) {
            await User.enable2FA(userId, secret);
            tempSecrets.delete(userId);

            // Generar códigos de respaldo
            const backupCodes = await BackupCode.generateCodes(userId);

            return res.status(200).json({
                success: true,
                message: '2FA enabled successfully',
                backupCodes: backupCodes,
                warning: 'Save these backup codes in a safe place. Each can only be used once.'
            });
        }

        res.status(200).json({
            success: true,
            message: '2FA enabled successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deshabilitar 2FA
 */
const disable2FA = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { password, token } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Verificar password
        const user = await User.findById(userId);
        const isValidPassword = await User.verifyPassword(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Si tiene 2FA habilitado, verificar código
        if (user.two_factor_enabled) {
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: '2FA code is required'
                });
            }

            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: token,
                window: 2
            });

            if (!verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid 2FA code'
                });
            }
        }

        // Deshabilitar 2FA
        await User.disable2FA(userId);

        res.status(200).json({
            success: true,
            message: '2FA disabled successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verificar código 2FA en login
 */
const verify2FALogin = async (secret, token) => {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
    });
};

/**
 * Obtener códigos de respaldo restantes
 */
const getBackupCodes = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user.two_factor_enabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is not enabled'
            });
        }

        const codes = await BackupCode.getRemainingCodes(userId);

        res.status(200).json({
            success: true,
            data: {
                codes: codes.map(c => c.code),
                count: codes.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Regenerar códigos de respaldo
 */
const regenerateBackupCodes = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { password, token } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Verificar password
        const user = await User.findById(userId);

        if (!user.two_factor_enabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is not enabled'
            });
        }

        const isValidPassword = await User.verifyPassword(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Verificar código 2FA
        if (!token) {
            return res.status(400).json({
                success: false,
                message: '2FA code is required'
            });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Invalid 2FA code'
            });
        }

        // Generar nuevos códigos
        const backupCodes = await BackupCode.generateCodes(userId);

        res.status(200).json({
            success: true,
            message: 'Backup codes regenerated successfully',
            backupCodes: backupCodes,
            warning: 'Old backup codes are now invalid. Save these new codes in a safe place.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    setup2FA,
    verify2FA,
    disable2FA,
    verify2FALogin,
    getBackupCodes,
    regenerateBackupCodes
};
