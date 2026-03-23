const express = require('express');
const router = express.Router();
const { getMyTokens, getAllTokens } = require('../controllers/token.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/tokens/me:
 *   get:
 *     summary: Get my token information
 *     description: Pro users MUST have 2FA enabled to access this endpoint
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token information retrieved successfully
 *       403:
 *         description: Pro users must enable 2FA first
 *       404:
 *         description: No token assigned
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, getMyTokens);

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     summary: Get all tokens (Admin only)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All tokens retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', authenticateToken, getAllTokens);

module.exports = router;
