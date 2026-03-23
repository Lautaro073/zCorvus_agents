const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation } = require('../utils/validators');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: |
 *       Register a new user. Returns only access token (5 min duration).
 *       Use POST /api/auth/refresh-token to obtain a refresh token.
 *       
 *       **ROLES:**
 *       - 1 = Admin (use only for creating admin accounts)
 *       - 2 = User/Free (default)
 *       - 3 = Pro (assigned automatically via Stripe payment)
 *       
 *       **Creating an Admin:**
 *       To create an admin account, include `"roles_id": 1` in the request body.
 *       This bypasses the default role assignment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               roles_id:
 *                 type: integer
 *                 description: Role ID (1=Admin, 2=User, 3=Pro). Default is 2 if not specified. Use 1 to create admin account.
 *                 example: 2
 *                 enum: [1, 2, 3]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (5 minutes validity)
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     description: |
 *       Login user. Returns only access token (5 min duration).
 *       Use POST /api/auth/refresh-token to obtain a refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               twoFactorCode:
 *                 type: string
 *                 description: 6-digit 2FA code (required if 2FA is enabled)
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (5 minutes validity)
 *       401:
 *         description: Invalid credentials or 2FA code required
 */
router.post('/login', loginValidation, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Get refresh token (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Generate a refresh token for the authenticated user.
 *       - Refresh token duration: 30 days
 *       - Inactivity expiration: 10 days without use
 *       - Stored in database for revocation capability
 *     responses:
 *       200:
 *         description: Refresh token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Absolute expiration date
 *                     inactivityTime:
 *                       type: string
 *                       example: "10d"
 *                       description: "Time format for inactivity expiration (Examples: 10d=10 days, 5m=5 minutes, 2h=2 hours)"
 *       401:
 *         description: Unauthorized - requires authentication
 */
router.post('/refresh-token', authenticateToken, authController.getRefreshToken);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     description: |
 *       Use a valid refresh token to obtain a new access token.
 *       - Access token duration: 5 minutes
 *       - Validates token in database (not just JWT signature)
 *       - Checks for expiration (30 days) and inactivity (10 days)
 *       - Updates last_used_at timestamp on successful use
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token obtained from /api/auth/refresh-token
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token (5 minutes validity)
 *       403:
 *         description: Invalid, expired, or inactive refresh token
 */
router.post('/refresh', authController.refreshAccessToken);

module.exports = router;
