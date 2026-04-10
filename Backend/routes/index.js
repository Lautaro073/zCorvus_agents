const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const settingsIconsRoutes = require('./settingsIcons.routes');
const twoFactorRoutes = require('./twoFactor.routes');
const tokenRoutes = require('./token.routes');
const stripeRoutes = require('./stripe.routes');
const adminRoutes = require('./admin.routes');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-12-14T10:30:00.000Z
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/settings-icons', settingsIconsRoutes);
router.use('/tokens', tokenRoutes);
router.use('/stripe', stripeRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
