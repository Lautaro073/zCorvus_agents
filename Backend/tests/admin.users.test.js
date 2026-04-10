const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin Users Query API', () => {
    let adminToken;
    let userToken;
    let seededUserIds = [];

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

        seededUserIds = [adminId, userId, userActiveId, userExpiringId, userExpiredId];

        await query('DELETE FROM user WHERE id IN (?, ?, ?, ?, ?)', seededUserIds);

        const now = new Date();
        const activeFinish = new Date(now);
        activeFinish.setDate(activeFinish.getDate() + 30);

        const expiringFinish = new Date(now);
        expiringFinish.setDate(expiringFinish.getDate() + 2);

        const expiredFinish = new Date(now);
        expiredFinish.setDate(expiredFinish.getDate() - 2);

        const activeTokenId = generateUUID();
        const expiringTokenId = generateUUID();
        const expiredTokenId = generateUUID();

        await query('DELETE FROM token WHERE id IN (?, ?, ?)', [activeTokenId, expiringTokenId, expiredTokenId]);

        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [activeTokenId, 'active-token-admin-users', 'pro', now.toISOString(), activeFinish.toISOString()]
        );
        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [expiringTokenId, 'expiring-token-admin-users', 'pro', now.toISOString(), expiringFinish.toISOString()]
        );
        await query(
            'INSERT INTO token (id, token, type, start_date, finish_date) VALUES (?, ?, ?, ?, ?)',
            [expiredTokenId, 'expired-token-admin-users', 'enterprise', now.toISOString(), expiredFinish.toISOString()]
        );

        await User.create({
            id: adminId,
            username: 'admin_users_query',
            email: 'admin_users_query@test.com',
            password: 'password123',
            roles_id: 1
        });

        await User.create({
            id: userId,
            username: 'base_user_query',
            email: 'base_user_query@test.com',
            password: 'password123',
            roles_id: 2
        });

        await User.create({
            id: userActiveId,
            username: 'active_sub_user',
            email: 'active_sub_user@test.com',
            password: 'password123',
            roles_id: 3,
            token_id: activeTokenId
        });

        await User.create({
            id: userExpiringId,
            username: 'expiring_sub_user',
            email: 'expiring_sub_user@test.com',
            password: 'password123',
            roles_id: 3,
            token_id: expiringTokenId
        });

        await User.create({
            id: userExpiredId,
            username: 'expired_sub_user',
            email: 'expired_sub_user@test.com',
            password: 'password123',
            roles_id: 2,
            token_id: expiredTokenId
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_users_query@test.com',
            roles_id: 1
        });

        userToken = generateToken({
            id: userId,
            email: 'base_user_query@test.com',
            roles_id: 2
        });
    });

    afterAll(async () => {
        await query('DELETE FROM user WHERE id IN (?, ?, ?, ?, ?)', seededUserIds);
        await query('DELETE FROM token WHERE token IN (?, ?, ?)', [
            'active-token-admin-users',
            'expiring-token-admin-users',
            'expired-token-admin-users'
        ]);
    });

    it('returns 401 without token', async () => {
        const response = await request(app).get('/api/admin/users');
        expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
        const response = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
    });

    it('supports page/pageSize and returns computed subscription fields', async () => {
        const responseAll = await request(app)
            .get('/api/admin/users?page=1&pageSize=50&sortBy=id&sortDir=asc')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(responseAll.status).toBe(200);
        const allUsers = responseAll.body.data;
        expect(allUsers.every((entry) => Object.prototype.hasOwnProperty.call(entry, 'subscriptionStatus'))).toBe(true);
        expect(allUsers.some((entry) => entry.subscriptionStatus === 'active')).toBe(true);
        expect(allUsers.some((entry) => entry.subscriptionStatus === 'expiring')).toBe(true);
        expect(allUsers.some((entry) => entry.subscriptionStatus === 'expired')).toBe(true);
        expect(allUsers.some((entry) => entry.subscriptionStatus === 'none')).toBe(true);

        const response = await request(app)
            .get('/api/admin/users?page=1&pageSize=5&sortBy=id&sortDir=asc')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.pageSize).toBe(5);
        expect(response.body.pagination.limit).toBe(5);
        expect(response.body).toHaveProperty('generatedAt');
    });

    it('supports search, role and subscriptionStatus filters', async () => {
        const response = await request(app)
            .get('/api/admin/users?search=expiring_sub_user&role=pro&subscriptionStatus=expiring')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(response.body.data[0].username).toContain('expiring_sub_user');
        expect(response.body.data[0].role_name).toBe('pro');
        expect(response.body.data[0].subscriptionStatus).toBe('expiring');
    });

    it('supports legacy limit alias and stable sort fallback to id DESC', async () => {
        const response = await request(app)
            .get('/api/admin/users?limit=2&sortBy=unknown&sortDir=wat')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination.pageSize).toBe(2);
        expect(response.body.filtersApplied.sortBy).toBe('id');
        expect(response.body.filtersApplied.sortDir).toBe('desc');
    });

    it('returns 400 invalidParam on invalid pageSize', async () => {
        const response = await request(app)
            .get('/api/admin/users?pageSize=1000')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.invalidParam).toBe('pageSize');
    });
});
