const express = require('express');
const router = express.Router();
const settingsIconsController = require('../controllers/settingsIcons.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators');

// Validación para crear/actualizar settings icons
const settingsIconsValidation = [
    body('icon')
        .optional()
        .trim()
        .notEmpty().withMessage('Icon cannot be empty')
        .isLength({ max: 255 }).withMessage('Icon must not exceed 255 characters'),
    body('layer')
        .optional()
        .trim()
        .notEmpty().withMessage('Layer cannot be empty')
        .isLength({ max: 45 }).withMessage('Layer must not exceed 45 characters'),
    handleValidationErrors
];

/**
 * @swagger
 * tags:
 *   name: Settings Icons
 *   description: User visual preferences management - Controls how users want to view icons (light/dark themes, layers, etc.)
 */

/**
 * @swagger
 * /api/settings-icons:
 *   get:
 *     summary: Get all user visual preferences (Admin only)
 *     description: Retrieves all icon display preferences from all users. Admin access required.
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all user preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Settings icons retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SettingsIcons'
 *       401:
 *         description: Unauthorized - No token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, isAdmin, settingsIconsController.getAll);

/**
 * @swagger
 * /api/settings-icons/me:
 *   get:
 *     summary: Get my visual preferences
 *     description: Retrieves the authenticated user's icon display preferences (theme, style, layers)
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/SettingsIcons'
 *       404:
 *         description: User has no preferences configured yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticateToken, settingsIconsController.getUserSettings);

/**
 * @swagger
 * /api/settings-icons/{id}:
 *   get:
 *     summary: Get visual preferences by ID
 *     description: Retrieves specific user preferences by UUID
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Settings UUID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Preferences found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/SettingsIcons'
 *       404:
 *         description: Preferences not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, settingsIconsController.getById);

/**
 * @swagger
 * /api/settings-icons:
 *   post:
 *     summary: Create new visual preferences
 *     description: Creates a new set of icon display preferences for any authenticated user. These are style preferences (light/dark, layers), not actual icon files.
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               icon:
 *                 type: string
 *                 description: Visual style preference (e.g., "light", "dark", "outline", "filled")
 *                 example: light
 *               layer:
 *                 type: string
 *                 description: Layer or variant identifier (e.g., "solid", "outline", "duotone")
 *                 example: solid
 *           examples:
 *             lightTheme:
 *               summary: Light theme preference
 *               value:
 *                 icon: light
 *                 layer: solid
 *             darkTheme:
 *               summary: Dark theme preference
 *               value:
 *                 icon: dark
 *                 layer: outline
 *     responses:
 *       201:
 *         description: Preferences created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/SettingsIcons'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.post('/', authenticateToken, settingsIconsValidation, settingsIconsController.create);

/**
 * @swagger
 * /api/settings-icons/{id}:
 *   put:
 *     summary: Update visual preferences
 *     description: Updates existing icon display preferences for any authenticated user
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Settings UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               icon:
 *                 type: string
 *                 description: Visual style preference
 *                 example: dark
 *               layer:
 *                 type: string
 *                 description: Layer or variant identifier (e.g., "solid", "outline", "duotone")
 *                 example: duotone
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Preferences not found
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.put('/:id', authenticateToken, settingsIconsValidation, settingsIconsController.update);

/**
 * @swagger
 * /api/settings-icons/{id}:
 *   delete:
 *     summary: Delete visual preferences
 *     description: Deletes a set of icon display preferences for any authenticated user
 *     tags: [Settings Icons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Settings UUID
 *     responses:
 *       200:
 *         description: Preferences deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Settings icon deleted successfully
 *       404:
 *         description: Preferences not found
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.delete('/:id', authenticateToken, settingsIconsController.remove);

module.exports = router;
