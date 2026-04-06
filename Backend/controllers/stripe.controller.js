const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User, Token } = require('../models');
const { generateUUID } = require('../utils/uuid');

/**
 * Generar token npm premium en el formato correcto
 */
function generateNpmToken() {
    const randomPart = generateUUID().replace(/-/g, '');
    const padding = '0'.repeat(Math.max(0, 68 - 4 - randomPart.length));
    return `npm_${randomPart}${padding}`.substring(0, 68);
}

function normalizeLocale(locale) {
    return locale === 'en' || locale === 'es' ? locale : 'es';
}

/**
 * Crear sesión de checkout de Stripe
 */
exports.createCheckout = async (req, res, next) => {
    try {
        const { userId, userEmail, userName, planType, locale } = req.body;
        const resolvedLocale = normalizeLocale(locale);
        const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const premiumBasePath = `${frontendBaseUrl}/${resolvedLocale}/premium`;

        if (!userId || !userEmail) {
            return res.status(400).json({
                success: false,
                message: 'userId and userEmail are required'
            });
        }

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            customer_email: userEmail, // ✅ Pre-rellenar email del usuario
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: planType === 'enterprise' ? 'zCorvus Enterprise' : 'zCorvus Pro',
                            description: planType === 'enterprise'
                                ? 'Enterprise plan with unlimited access'
                                : 'Pro plan with premium icons access',
                        },
                        unit_amount: planType === 'enterprise' ? 9900 : 4900, // $99 o $49
                        recurring: {
                            interval: 'year'
                        }
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${premiumBasePath}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${premiumBasePath}/cancel`,
            metadata: {
                userId,
                userEmail,
                userName: userName || '',
                planType: planType || 'pro',
                locale: resolvedLocale,
            }
        });

        return res.json({
            success: true,
            data: {
                url: session.url,
                sessionId: session.id
            }
        });
    } catch (error) {
        console.error('Create checkout error:', error);
        next(error);
    }
};

/**
 * Webhook de Stripe para procesar eventos
 */
exports.handleWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Stripe event received:', event.type);

    // Manejar el evento
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;

        console.log('Payment successful for user:', metadata.userId);

        try {
            // Verificar si el usuario existe
            let user = await User.findById(metadata.userId);

            // Si no existe, intentar crearlo
            if (!user) {
                console.log('User not found, attempting to create:', metadata.userId);
                try {
                    await User.create({
                        username: metadata.userName || `user_${Date.now()}`,
                        email: metadata.userEmail || '',
                        password: generateUUID(), // Password temporal (debe cambiarse)
                        roles_id: 2, // user por defecto
                    });
                    console.log('User created successfully');
                } catch (createError) {
                    // Si falla por email/username duplicado, intentar buscar por email
                    if (createError.code === 'SQLITE_CONSTRAINT') {
                        console.log('User already exists (constraint), searching by email:', metadata.userEmail);
                        user = await User.findByEmail(metadata.userEmail);

                        if (!user) {
                            throw createError;
                        }

                        console.log('Found existing user by email:', user.id);
                    } else {
                        throw createError;
                    }
                }

                // Recargar usuario si se creó exitosamente
                if (!user) {
                    user = await User.findByEmail(metadata.userEmail);
                    if (!user) {
                        user = await User.findById(metadata.userId);
                    }
                }
            }

            // Generar token npm premium
            const npmToken = generateNpmToken();
            const now = new Date();
            const oneYearLater = new Date(now);
            oneYearLater.setFullYear(now.getFullYear() + 1);

            // Crear token en la base de datos
            const tokenId = await Token.create({
                token: npmToken,
                type: metadata.planType || 'pro',
                start_date: now.toISOString(),
                finish_date: oneYearLater.toISOString(),
            });

            console.log('Token created:', tokenId);

            // Asignar token al usuario (usar el ID del usuario encontrado/creado)
            const actualUserId = user.id || metadata.userId;
            await User.updateToken(actualUserId, tokenId);

            // Actualizar rol a Pro
            await User.updateRole(actualUserId, 3); // 3 = pro

            console.log('Premium token created and assigned to user:', actualUserId);

            return res.json({
                success: true,
                message: 'Payment processed successfully'
            });
        } catch (error) {
            console.error('Error processing payment:', error);
            return res.status(500).json({
                success: false,
                message: 'Error processing payment',
                error: error.message
            });
        }
    }

    // Responder a Stripe que recibimos el evento
    res.json({ received: true });
};
