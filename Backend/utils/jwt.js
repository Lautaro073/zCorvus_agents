const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Generar token JWT
 */
const generateToken = (payload, expiresIn = config.jwt.expire) => {
    return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

/**
 * Verificar token JWT
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        return null;
    }
};

/**
 * Decodificar token sin verificar
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

/**
 * Generar Access Token (5 minutos)
 */
const generateAccessToken = (userId, email, role) => {
    const payload = {
        id: userId,
        email,
        role
    };
    return generateToken(payload, process.env.JWT_ACCESS_EXPIRE || '5m');
};

/**
 * Generar Refresh Token (30 días)
 */
const generateRefreshToken = (userId) => {
    const payload = {
        id: userId,
        type: 'refresh'
    };
    return generateToken(payload, process.env.JWT_REFRESH_EXPIRE || '30d');
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
    generateAccessToken,
    generateRefreshToken
};
