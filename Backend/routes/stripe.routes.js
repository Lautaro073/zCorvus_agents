const express = require('express');
const router = express.Router();
const { createCheckout, handleWebhook } = require('../controllers/stripe.controller');

/**
 * @swagger
 * /api/stripe/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Stripe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - userEmail
 *             properties:
 *               userId:
 *                 type: string
 *               userEmail:
 *                 type: string
 *               userName:
 *                 type: string
 *               planType:
 *                 type: string
 *                 enum: [pro, enterprise]
 *     responses:
 *       200:
 *         description: Checkout session created
 *       400:
 *         description: Invalid request
 */
router.post('/checkout', createCheckout);

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Invalid signature
 */
router.post('/webhook', handleWebhook);

module.exports = router;
