const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin Metrics API', () => {
    let adminToken;
    let userToken;
    let seededUserIds = [];
    let seededSaleEventIds = [];

    beforeAll(async () => {
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        await query(`
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
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const adminId = generateUUID();
        const userId = generateUUID();
        const user2Id = generateUUID();

        seededUserIds = [adminId, userId, user2Id];

        await query('DELETE FROM user WHERE id IN (?, ?, ?)', seededUserIds);

        await User.create({
            id: adminId,
            username: 'admin_metrics_api',
            email: 'admin_metrics_api@test.com',
            password: 'password123',
            roles_id: 1
        });

        await User.create({
            id: userId,
            username: 'metrics_user_1',
            email: 'metrics_user_1@test.com',
            password: 'password123',
            roles_id: 2
        });

        await User.create({
            id: user2Id,
            username: 'metrics_user_2',
            email: 'metrics_user_2@test.com',
            password: 'password123',
            roles_id: 2
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_metrics_api@test.com',
            roles_id: 1
        });

        userToken = generateToken({
            id: userId,
            email: 'metrics_user_1@test.com',
            roles_id: 2
        });

        const saleA = generateUUID();
        const saleB = generateUUID();
        seededSaleEventIds = [saleA, saleB];

        await query('DELETE FROM sale_events WHERE id IN (?, ?)', seededSaleEventIds);

        await query(
            `
                INSERT INTO sale_events (
                    id, stripe_event_id, stripe_session_id, stripe_customer_id, stripe_subscription_id,
                    user_id, user_email, plan_type, currency,
                    amount_subtotal_cents, amount_total_cents, amount_tax_cents, amount_discount_cents,
                    status, paid_at, source, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                saleA,
                'evt_admin_metrics_1',
                'sess_admin_metrics_1',
                'cus_admin_metrics_1',
                'sub_admin_metrics_1',
                userId,
                'metrics_user_1@test.com',
                'pro',
                'usd',
                4900,
                4900,
                300,
                0,
                'paid',
                        '2046-04-05T10:00:00.000Z',
                'seed_test',
                '{}'
            ]
        );

        await query(
            `
                INSERT INTO sale_events (
                    id, stripe_event_id, stripe_session_id, stripe_customer_id, stripe_subscription_id,
                    user_id, user_email, plan_type, currency,
                    amount_subtotal_cents, amount_total_cents, amount_tax_cents, amount_discount_cents,
                    status, paid_at, source, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                saleB,
                'evt_admin_metrics_2',
                'sess_admin_metrics_2',
                'cus_admin_metrics_2',
                'sub_admin_metrics_2',
                user2Id,
                'metrics_user_2@test.com',
                'enterprise',
                'usd',
                9900,
                9900,
                900,
                0,
                'paid',
                        '2046-04-07T11:00:00.000Z',
                'seed_test',
                '{}'
            ]
        );
    });

    afterAll(async () => {
        await query('DELETE FROM sale_events WHERE id IN (?, ?)', seededSaleEventIds);
        await query('DELETE FROM user WHERE id IN (?, ?, ?)', seededUserIds);
    });

    it('returns 401 without token', async () => {
        const response = await request(app).get('/api/admin/metrics');
        expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin token', async () => {
        const response = await request(app)
            .get('/api/admin/metrics')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
    });

    it('returns metrics envelope for day granularity', async () => {
        const response = await request(app)
            .get('/api/admin/metrics?granularity=day&from=2046-04-01T00:00:00Z&to=2046-04-08T00:00:00Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('kpis');
        expect(response.body.data).toHaveProperty('timeseries');
        expect(response.body.data.kpis.salesCount).toBe(2);
        expect(response.body.data.kpis.grossRevenue).toBe(14800);
        expect(response.body.data.kpis.netRevenue).toBe(13600);
        expect(response.body.filtersApplied.salesSource).toBe('ledger');
        expect(response.body).toHaveProperty('filtersApplied');
        expect(response.body).toHaveProperty('generatedAt');
    });

    it('returns continuous timeseries buckets with zero-fill in range', async () => {
        const response = await request(app)
            .get('/api/admin/metrics?granularity=day&from=2046-04-04T00:00:00Z&to=2046-04-07T00:00:00Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.timeseries.length).toBe(4);
            const zeroBucket = response.body.data.timeseries.find((item) => item.bucketKey === '2046-04-06');
        expect(zeroBucket).toBeTruthy();
        expect(zeroBucket.salesCount).toBe(0);
        expect(zeroBucket.grossRevenue).toBe(0);
        expect(zeroBucket.netRevenue).toBe(0);
    });

    it('falls back to token subscriptions when ledger has no paid sales in range', async () => {
        const fallbackUserId = generateUUID();
        const fallbackTokenId = generateUUID();

        try {
            await query('DELETE FROM user WHERE id = ?', [fallbackUserId]);
            await query('DELETE FROM token WHERE id = ?', [fallbackTokenId]);

            await query(
                'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
                [
                    fallbackTokenId,
                    'metrics-fallback-token',
                    'enterprise',
                    '2031-05-11T10:00:00.000Z',
                    '2032-05-11T10:00:00.000Z'
                ]
            );

            await User.create({
                id: fallbackUserId,
                username: 'metrics_fallback_user',
                email: 'metrics_fallback_user@test.com',
                password: 'password123',
                roles_id: 3,
                token_id: fallbackTokenId
            });

            const response = await request(app)
                .get('/api/admin/metrics?granularity=custom&from=2031-05-10T00:00:00Z&to=2031-05-12T00:00:00Z')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.kpis.salesCount).toBe(1);
            expect(response.body.data.kpis.grossRevenue).toBe(9900);
            expect(response.body.data.kpis.netRevenue).toBe(9900);
            expect(response.body.filtersApplied.salesSource).toBe('subscriptions_fallback');

            const fallbackBucket = response.body.data.timeseries.find((item) => item.bucketKey === '2031-05-11');
            expect(fallbackBucket).toBeTruthy();
            expect(fallbackBucket.salesCount).toBe(1);
            expect(fallbackBucket.grossRevenue).toBe(9900);
            expect(fallbackBucket.netRevenue).toBe(9900);
        } finally {
            await query('DELETE FROM user WHERE id = ?', [fallbackUserId]);
            await query('DELETE FROM token WHERE id = ?', [fallbackTokenId]);
        }
    });

    it('combines ledger and fallback sales correctly across mixed buckets', async () => {
        const mixedUserId = generateUUID();
        const mixedTokenId = generateUUID();

        try {
            await query('DELETE FROM user WHERE id = ?', [mixedUserId]);
            await query('DELETE FROM token WHERE id = ?', [mixedTokenId]);

            await query(
                'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
                [
                    mixedTokenId,
                    'metrics-mixed-token',
                    'pro',
                    '2046-04-06T09:00:00.000Z',
                    '2047-04-06T09:00:00.000Z'
                ]
            );

            await User.create({
                id: mixedUserId,
                username: 'metrics_mixed_user',
                email: 'metrics_mixed_user@test.com',
                password: 'password123',
                roles_id: 3,
                token_id: mixedTokenId
            });

            const response = await request(app)
                .get('/api/admin/metrics?granularity=day&from=2046-04-05T00:00:00Z&to=2046-04-07T23:59:59Z')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.kpis.salesCount).toBe(3);
            expect(response.body.data.kpis.grossRevenue).toBe(19700);
            expect(response.body.data.kpis.netRevenue).toBe(18500);
            expect(response.body.filtersApplied.salesSource).toBe('mixed');

            const fallbackBucket = response.body.data.timeseries.find((item) => item.bucketKey === '2046-04-06');
            expect(fallbackBucket).toBeTruthy();
            expect(fallbackBucket.salesCount).toBe(1);
            expect(fallbackBucket.grossRevenue).toBe(4900);
            expect(fallbackBucket.netRevenue).toBe(4900);
        } finally {
            await query('DELETE FROM user WHERE id = ?', [mixedUserId]);
            await query('DELETE FROM token WHERE id = ?', [mixedTokenId]);
        }
    });

    it('validates granularity and custom from/to requirements', async () => {
        const invalidGranularity = await request(app)
            .get('/api/admin/metrics?granularity=week')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(invalidGranularity.status).toBe(400);
        expect(invalidGranularity.body.invalidParam).toBe('granularity');

        const missingCustomFrom = await request(app)
            .get('/api/admin/metrics?granularity=custom&to=2026-04-07T00:00:00Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(missingCustomFrom.status).toBe(400);
        expect(missingCustomFrom.body.invalidParam).toBe('from');
    });

    it('enforces ISO-8601 UTC format for custom range', async () => {
        const invalid = await request(app)
            .get('/api/admin/metrics?granularity=custom&from=2026-04-01&to=2026-04-07')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(invalid.status).toBe(400);
        expect(invalid.body.invalidParam).toBe('from');
    });

    it('returns zero sales with zero-filled timeseries when no sales source exists in range', async () => {
        const response = await request(app)
            .get('/api/admin/metrics?granularity=custom&from=2030-01-01T00:00:00Z&to=2030-01-03T00:00:00Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.kpis.salesCount).toBe(0);
        expect(response.body.data.kpis.grossRevenue).toBe(0);
        expect(response.body.data.kpis.netRevenue).toBe(0);
        expect(response.body.data.timeseries.length).toBe(3);
        expect(response.body.filtersApplied.salesSource).toBe('none');
    });

    it('keeps registrations when salesCount is zero', async () => {
        const registrationOnlyUserId = generateUUID();

        try {
            await query('DELETE FROM user WHERE id = ?', [registrationOnlyUserId]);

            await User.create({
                id: registrationOnlyUserId,
                username: 'metrics_registration_only_user',
                email: 'metrics_registration_only_user@test.com',
                password: 'password123',
                roles_id: 2
            });

            await query(
                'UPDATE user SET created_at = ?, updated_at = ? WHERE id = ?',
                ['2032-01-02T12:00:00.000Z', '2032-01-02T12:00:00.000Z', registrationOnlyUserId]
            );

            const response = await request(app)
                .get('/api/admin/metrics?granularity=custom&from=2032-01-01T00:00:00Z&to=2032-01-03T00:00:00Z')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.kpis.salesCount).toBe(0);
            expect(response.body.data.kpis.registrations).toBeGreaterThanOrEqual(1);
            expect(response.body.data.timeseries.length).toBe(3);
            expect(response.body.filtersApplied.salesSource).toBe('none');
        } finally {
            await query('DELETE FROM user WHERE id = ?', [registrationOnlyUserId]);
        }
    });
});
