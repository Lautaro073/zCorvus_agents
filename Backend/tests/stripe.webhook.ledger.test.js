describe('Stripe Webhook Sale Ledger', () => {
    let handleWebhook;
    let mockConstructEvent;
    let mockDbQuery;
    let models;

    function buildWebhookEvent(overrides = {}) {
        return {
            id: 'evt_test_1',
            type: 'checkout.session.completed',
            livemode: false,
            data: {
                object: {
                    id: 'cs_test_1',
                    customer: 'cus_test_1',
                    subscription: 'sub_test_1',
                    currency: 'usd',
                    amount_subtotal: 4900,
                    amount_total: 4900,
                    total_details: {
                        amount_tax: 0,
                        amount_discount: 0
                    },
                    payment_status: 'paid',
                    created: 1712505600,
                    customer_details: {
                        email: 'buyer@test.dev'
                    },
                    metadata: {
                        userId: 'user_test_1',
                        userEmail: 'buyer@test.dev',
                        userName: 'Buyer',
                        planType: 'pro'
                    },
                    ...overrides
                }
            }
        };
    }

    beforeEach(() => {
        jest.resetModules();

        mockConstructEvent = jest.fn();
        mockDbQuery = jest.fn().mockResolvedValue([]);

        jest.doMock('stripe', () => {
            return () => ({
                checkout: {
                    sessions: {
                        create: jest.fn()
                    }
                },
                webhooks: {
                    constructEvent: mockConstructEvent
                }
            });
        });

        jest.doMock('../utils/db', () => ({
            query: mockDbQuery
        }));

        jest.doMock('../models', () => ({
            User: {
                findById: jest.fn(),
                findByEmail: jest.fn(),
                create: jest.fn(),
                updateToken: jest.fn(),
                updateRole: jest.fn()
            },
            Token: {
                create: jest.fn()
            }
        }));

        models = require('../models');
        ({ handleWebhook } = require('../controllers/stripe.controller'));
    });

    it('does not duplicate processing when stripe_session_id already exists', async () => {
        const duplicateEvent = buildWebhookEvent();
        mockConstructEvent.mockReturnValue(duplicateEvent);

        mockDbQuery.mockImplementation(async (sql) => {
            if (String(sql).includes('INSERT INTO sale_events')) {
                const error = new Error('UNIQUE constraint failed: sale_events.stripe_session_id');
                error.code = 'SQLITE_CONSTRAINT';
                throw error;
            }
            return [];
        });

        const req = {
            headers: { 'stripe-signature': 'sig_test' },
            body: Buffer.from('{}')
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        await handleWebhook(req, res, jest.fn());

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: 'Payment already processed',
                idempotent: true,
                stripeSessionId: 'cs_test_1'
            })
        );
        expect(models.Token.create).not.toHaveBeenCalled();
        expect(models.User.updateToken).not.toHaveBeenCalled();
    });

    it('processes payment and assigns token when ledger insert is new', async () => {
        const normalEvent = buildWebhookEvent();
        mockConstructEvent.mockReturnValue(normalEvent);

        models.User.findById.mockResolvedValue({
            id: 'user_test_1'
        });
        models.Token.create.mockResolvedValue('token_created_1');

        const req = {
            headers: { 'stripe-signature': 'sig_test' },
            body: Buffer.from('{}')
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        await handleWebhook(req, res, jest.fn());

        expect(models.Token.create).toHaveBeenCalled();
        expect(models.User.updateToken).toHaveBeenCalledWith('user_test_1', 'token_created_1');
        expect(models.User.updateRole).toHaveBeenCalledWith('user_test_1', 3);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Payment processed successfully'
        });
    });

    it('rolls back sale_event insert if downstream token assignment fails', async () => {
        const normalEvent = buildWebhookEvent();
        mockConstructEvent.mockReturnValue(normalEvent);

        models.User.findById.mockResolvedValue({
            id: 'user_test_1'
        });
        models.Token.create.mockRejectedValue(new Error('token create failed'));

        const req = {
            headers: { 'stripe-signature': 'sig_test' },
            body: Buffer.from('{}')
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        await handleWebhook(req, res, jest.fn());

        const deleteCalls = mockDbQuery.mock.calls.filter(([sql]) =>
            String(sql).includes('DELETE FROM sale_events')
        );

        expect(deleteCalls.length).toBe(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Error processing payment'
            })
        );
    });
});
