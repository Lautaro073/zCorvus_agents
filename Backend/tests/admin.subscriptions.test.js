const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin Subscriptions API', () => {
    let adminToken;
    let userToken;
    let seededUserIds = [];
    let seededTokenIds = [];

    beforeAll(async () => {
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        const adminId = generateUUID();
        const userId = generateUUID();
        const userActiveId = generateUUID();
        const userExpiringId = generateUUID();
        const userExpiredId = generateUUID();

        const tokenActiveId = generateUUID();
        const tokenExpiringId = generateUUID();
        const tokenExpiredId = generateUUID();

        seededUserIds = [adminId, userId, userActiveId, userExpiringId, userExpiredId];
        seededTokenIds = [tokenActiveId, tokenExpiringId, tokenExpiredId];

        await query('DELETE FROM user WHERE id IN (?, ?, ?, ?, ?)', seededUserIds);
        await query('DELETE FROM token WHERE id IN (?, ?, ?)', seededTokenIds);

        const now = new Date();
        const activeFinish = new Date(now);
        activeFinish.setDate(activeFinish.getDate() + 45);

        const expiringFinish = new Date(now);
        expiringFinish.setDate(expiringFinish.getDate() + 3);

        const expiredFinish = new Date(now);
        expiredFinish.setDate(expiredFinish.getDate() - 4);

        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [tokenActiveId, 'sub-active-token', 'pro', now.toISOString(), activeFinish.toISOString()]
        );
        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [tokenExpiringId, 'sub-expiring-token', 'enterprise', now.toISOString(), expiringFinish.toISOString()]
        );
        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [tokenExpiredId, 'sub-expired-token', 'pro', now.toISOString(), expiredFinish.toISOString()]
        );

        await User.create({
            id: adminId,
            username: 'admin_subscriptions_api',
            email: 'admin_subscriptions_api@test.com',
            password: 'password123',
            roles_id: 1
        });

        await User.create({
            id: userId,
            username: 'user_subscriptions_api',
            email: 'user_subscriptions_api@test.com',
            password: 'password123',
            roles_id: 2
        });

        await User.create({
            id: userActiveId,
            username: 'sub_active_user',
            email: 'sub_active_user@test.com',
            password: 'password123',
            roles_id: 3,
            token_id: tokenActiveId
        });

        await User.create({
            id: userExpiringId,
            username: 'sub_expiring_user',
            email: 'sub_expiring_user@test.com',
            password: 'password123',
            roles_id: 3,
            token_id: tokenExpiringId
        });

        await User.create({
            id: userExpiredId,
            username: 'sub_expired_user',
            email: 'sub_expired_user@test.com',
            password: 'password123',
            roles_id: 2,
            token_id: tokenExpiredId
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_subscriptions_api@test.com',
            roles_id: 1
        });

        userToken = generateToken({
            id: userId,
            email: 'user_subscriptions_api@test.com',
            roles_id: 2
        });
    });

    afterAll(async () => {
        await query('DELETE FROM user WHERE id IN (?, ?, ?, ?, ?)', seededUserIds);
        await query('DELETE FROM token WHERE id IN (?, ?, ?)', seededTokenIds);
    });

    it('returns 401 without token', async () => {
        const response = await request(app).get('/api/admin/subscriptions');
        expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
    });

    it('returns envelope with summaryCounts and pagination', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions?page=1&pageSize=5')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('summaryCounts');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('filtersApplied');
        expect(response.body).toHaveProperty('generatedAt');
        expect(response.body.summaryCounts.total).toBeGreaterThanOrEqual(3);
    });

    it('supports status and planType filters', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions?status=expiring&planType=enterprise&expiringInDays=7')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(response.body.data[0].subscriptionStatus).toBe('expiring');
        expect(response.body.data[0].plan_type).toBe('enterprise');
        expect(response.body.summaryCounts).toMatchObject({
            active: 0,
            expiring: response.body.data.length,
            expired: 0,
            total: response.body.data.length
        });
    });

    it('aligns summaryCounts with date and planType filtered dataset', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions?planType=pro&from=2020-01-01T00:00:00Z&to=2035-01-01T00:00:00Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        expect(response.body.summaryCounts.total).toBe(response.body.data.length);

        const derivedCounts = response.body.data.reduce((acc, item) => {
            acc[item.subscriptionStatus] += 1;
            return acc;
        }, { active: 0, expiring: 0, expired: 0 });

        expect(response.body.summaryCounts.active).toBe(derivedCounts.active);
        expect(response.body.summaryCounts.expiring).toBe(derivedCounts.expiring);
        expect(response.body.summaryCounts.expired).toBe(derivedCounts.expired);
    });

    it('normalizes from/to as UTC ISO in filtersApplied', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions?from=2026-04-01&to=2026-04-30T23:59:59Z')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.filtersApplied.from).toMatch(/Z$/);
        expect(response.body.filtersApplied.to).toMatch(/Z$/);
    });

    it('returns 400 invalidParam for invalid pageSize', async () => {
        const response = await request(app)
            .get('/api/admin/subscriptions?pageSize=1000')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.invalidParam).toBe('pageSize');
    });
});
