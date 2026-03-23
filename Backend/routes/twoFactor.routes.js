const express = require('express');
const router = express.Router();
const {
    setup2FA,
    verify2FA,
    disable2FA,
    getBackupCodes,
    regenerateBackupCodes
} = require('../controllers/twoFactor.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Setup Two-Factor Authentication
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code and secret generated successfully
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         description: Unauthorized
 */
router.post('/setup', authenticateToken, setup2FA);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA code and enable 2FA
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit 2FA code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid token
 *       401:
 *         description: Unauthorized
 */
router.post('/verify', authenticateToken, verify2FA);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable Two-Factor Authentication
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - token
 *             properties:
 *               password:
 *                 type: string
 *                 description: User password
 *               token:
 *                 type: string
 *                 description: Current 6-digit 2FA code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Invalid password or token
 *       401:
 *         description: Unauthorized
 */
router.post('/disable', authenticateToken, disable2FA);

/**
 * @swagger
 * /api/auth/2fa/backup-codes:
 *   get:
 *     summary: Get remaining backup codes
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes retrieved successfully
 *       400:
 *         description: 2FA not enabled
 *       401:
 *         description: Unauthorized
 */
router.get('/backup-codes', authenticateToken, getBackupCodes);

/**
 * @swagger
 * /api/auth/2fa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate backup codes
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - token
 *             properties:
 *               password:
 *                 type: string
 *                 description: User password
 *               token:
 *                 type: string
 *                 description: Current 6-digit 2FA code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *       400:
 *         description: Invalid password or token
 *       401:
 *         description: Unauthorized
 */
router.post('/backup-codes/regenerate', authenticateToken, regenerateBackupCodes);

module.exports = router;
