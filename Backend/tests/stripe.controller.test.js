const mockCreateSession = jest.fn();

jest.mock('stripe', () => {
    return () => ({
        checkout: {
            sessions: {
                create: mockCreateSession,
            },
        },
    });
});

jest.mock('../models', () => ({
    User: {},
    Token: {},
}));

const { createCheckout } = require('../controllers/stripe.controller');

describe('stripe controller locale redirects', () => {
    beforeEach(() => {
        process.env.FRONTEND_URL = 'https://app.zcorvus.test';
        mockCreateSession.mockReset();
        mockCreateSession.mockResolvedValue({
            id: 'sess_test_123',
            url: 'https://checkout.stripe.test/session',
        });
    });

    it('builds locale-aware success and cancel URLs', async () => {
        const req = {
            body: {
                userId: 'user-1',
                userEmail: 'user@test.dev',
                planType: 'pro',
                locale: 'en',
            },
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        const next = jest.fn();

        await createCheckout(req, res, next);

        expect(mockCreateSession).toHaveBeenCalledWith(
            expect.objectContaining({
                success_url: 'https://app.zcorvus.test/en/premium/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'https://app.zcorvus.test/en/premium/cancel',
                metadata: expect.objectContaining({ locale: 'en' }),
            })
        );
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                url: 'https://checkout.stripe.test/session',
                sessionId: 'sess_test_123',
            },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('falls back to default locale when input is invalid', async () => {
        const req = {
            body: {
                userId: 'user-2',
                userEmail: 'user2@test.dev',
                planType: 'enterprise',
                locale: 'pt',
            },
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        await createCheckout(req, res, jest.fn());

        expect(mockCreateSession).toHaveBeenCalledWith(
            expect.objectContaining({
                success_url: 'https://app.zcorvus.test/es/premium/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'https://app.zcorvus.test/es/premium/cancel',
                metadata: expect.objectContaining({ locale: 'es' }),
            })
        );
    });

    it('normalizes unsupported planType to pro for pricing and metadata', async () => {
        const req = {
            body: {
                userId: 'user-3',
                userEmail: 'user3@test.dev',
                planType: 'unknown',
                locale: 'en',
            },
        };

        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        await createCheckout(req, res, jest.fn());

        expect(mockCreateSession).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [
                    expect.objectContaining({
                        price_data: expect.objectContaining({
                            unit_amount: 4900,
                        }),
                    }),
                ],
                metadata: expect.objectContaining({ planType: 'pro' }),
            })
        );
    });
});
