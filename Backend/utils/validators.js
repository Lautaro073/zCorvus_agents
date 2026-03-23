const { body, validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Validaciones para registro de usuario
 */
const registerValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 45 }).withMessage('Username must be between 3 and 45 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .isLength({ max: 45 }).withMessage('Email must not exceed 45 characters'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('roles_id')
        .optional()
        .isInt({ min: 1 }).withMessage('Role ID must be a valid integer'),

    handleValidationErrors
];

/**
 * Validaciones para login
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('password')
        .notEmpty().withMessage('Password is required'),

    handleValidationErrors
];

/**
 * Validaciones para actualizar usuario
 */
const updateUserValidation = [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 45 }).withMessage('Username must be between 3 and 45 characters'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format')
        .isLength({ max: 45 }).withMessage('Email must not exceed 45 characters'),

    handleValidationErrors
];

/**
 * Validaciones para cambiar contraseña
 */
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),

    handleValidationErrors
];

/**
 * Validar email
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

module.exports = {
    handleValidationErrors,
    registerValidation,
    loginValidation,
    updateUserValidation,
    changePasswordValidation,
    isValidEmail
};
