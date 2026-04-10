const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User, Token } = require('../models');
const { generateUUID } = require('../utils/uuid');
const db = require('../utils/db');

const PLAN_PRICES_CENTS = {
    pro: 4900,
    enterprise: 9900
};

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

function resolvePlanType(planType) {
    return planType === 'enterprise' ? 'enterprise' : 'pro';
}

function getPlanAmountCents(planType) {
    const resolvedPlanType = resolvePlanType(planType);
    return PLAN_PRICES_CENTS[resolvedPlanType] || PLAN_PRICES_CENTS.pro;
}

function toIsoFromUnixSeconds(seconds) {
    if (!Number.isFinite(seconds)) {
        return new Date().toISOString();
    }
    return new Date(seconds * 1000).toISOString();
}

function isUniqueConstraintError(error) {
    if (!error) {
        return false;
    }

    if (error.code === 'SQLITE_CONSTRAINT') {
        return true;
    }

    return /UNIQUE constraint failed/i.test(String(error.message || ''));
}

async function ensureSaleEventsSchema() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS sale_events (
            id TEXT PRIMARY KEY,
            stripe_event_id TEXT,
            stripe_session_id TEXT NOT NULL UNIQUE,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            user_id TEXT,
            user_email TEXT,
            plan_type TEXT NOT NULL DEFAULT 'pro',
            currency TEXT NOT NULL DEFAULT 'usd',
            amount_subtotal_cents INTEGER NOT NULL DEFAULT 0,
            amount_total_cents INTEGER NOT NULL DEFAULT 0,
            amount_tax_cents INTEGER NOT NULL DEFAULT 0,
            amount_discount_cents INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            paid_at DATETIME NOT NULL,
            source TEXT NOT NULL DEFAULT 'stripe_webhook',
            payload_json TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
        )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_sale_events_paid_at ON sale_events(paid_at)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sale_events_status ON sale_events(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sale_events_user_id ON sale_events(user_id)');
}

function buildSaleEventFromSession(event, session) {
    const metadata = session.metadata || {};
    const planType = resolvePlanType(metadata.planType || session?.metadata?.planType || 'pro');
    const fallbackTotal = getPlanAmountCents(planType);

    return {
        id: generateUUID(),
        stripeEventId: event.id || null,
        stripeSessionId: session.id,
        stripeCustomerId: session.customer || null,
        stripeSubscriptionId: session.subscription || null,
        userId: metadata.userId || null,
        userEmail: metadata.userEmail || session?.customer_details?.email || null,
        planType,
        currency: session.currency || 'usd',
        amountSubtotalCents: Number.isFinite(session.amount_subtotal) ? session.amount_subtotal : fallbackTotal,
        amountTotalCents: Number.isFinite(session.amount_total) ? session.amount_total : fallbackTotal,
        amountTaxCents: Number(session?.total_details?.amount_tax || 0),
        amountDiscountCents: Number(session?.total_details?.amount_discount || 0),
        status: session.payment_status || 'paid',
        paidAt: toIsoFromUnixSeconds(session.created),
        source: 'stripe_webhook',
        payloadJson: JSON.stringify({
            stripeEventType: event.type,
            stripeLivemode: Boolean(event.livemode),
            sessionId: session.id,
            paymentStatus: session.payment_status || null,
            metadata
        })
    };
}

async function insertSaleEvent(saleEvent) {
    try {
        await db.query(
            `
                INSERT INTO sale_events (
                    id,
                    stripe_event_id,
                    stripe_session_id,
                    stripe_customer_id,
                    stripe_subscription_id,
                    user_id,
                    user_email,
                    plan_type,
                    currency,
                    amount_subtotal_cents,
                    amount_total_cents,
                    amount_tax_cents,
                    amount_discount_cents,
                    status,
                    paid_at,
                    source,
                    payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                saleEvent.id,
                saleEvent.stripeEventId,
                saleEvent.stripeSessionId,
                saleEvent.stripeCustomerId,
                saleEvent.stripeSubscriptionId,
                saleEvent.userId,
                saleEvent.userEmail,
                saleEvent.planType,
                saleEvent.currency,
                saleEvent.amountSubtotalCents,
                saleEvent.amountTotalCents,
                saleEvent.amountTaxCents,
                saleEvent.amountDiscountCents,
                saleEvent.status,
                saleEvent.paidAt,
                saleEvent.source,
                saleEvent.payloadJson
            ]
        );

        return { inserted: true };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { inserted: false, reason: 'duplicate_session' };
        }
        throw error;
    }
}

async function rollbackSaleEventBySessionId(stripeSessionId) {
    await db.query('DELETE FROM sale_events WHERE stripe_session_id = ?', [stripeSessionId]);
}

/**
 * Crear sesión de checkout de Stripe
 */
exports.createCheckout = async (req, res, next) => {
    try {
        const { userId, userEmail, userName, planType, locale } = req.body;
        const resolvedLocale = normalizeLocale(locale);
        const resolvedPlanType = resolvePlanType(planType);
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
                            name: resolvedPlanType === 'enterprise' ? 'zCorvus Enterprise' : 'zCorvus Pro',
                            description: resolvedPlanType === 'enterprise'
                                ? 'Enterprise plan with unlimited access'
                                : 'Pro plan with premium icons access',
                        },
                        unit_amount: getPlanAmountCents(resolvedPlanType),
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
                planType: resolvedPlanType,
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
        const metadata = session.metadata || {};
        let ledgerInserted = false;

        console.log('Payment successful for user:', metadata.userId);

        try {
            await ensureSaleEventsSchema();

            const saleEvent = buildSaleEventFromSession(event, session);
            const ledgerResult = await insertSaleEvent(saleEvent);

            if (!ledgerResult.inserted) {
                return res.json({
                    success: true,
                    message: 'Payment already processed',
                    idempotent: true,
                    stripeSessionId: session.id
                });
            }

            ledgerInserted = true;

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
                type: resolvePlanType(metadata.planType),
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

            if (ledgerInserted) {
                try {
                    await rollbackSaleEventBySessionId(session.id);
                } catch (rollbackError) {
                    console.error('Error rolling back ledger event:', rollbackError);
                }
            }

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
