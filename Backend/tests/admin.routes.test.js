const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin Routes Contract & Authz', () => {
    let adminToken;
    let userToken;
    let adminId;
    let userId;

    beforeAll(async () => {
        await query('DELETE FROM user WHERE email IN (?, ?)', [
            'admin_admin_routes@test.com',
            'user_admin_routes@test.com'
        ]);

        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        adminId = generateUUID();
        await User.create({
            id: adminId,
            username: 'admin_admin_routes',
            email: 'admin_admin_routes@test.com',
            password: 'password123',
            roles_id: 1
        });

        userId = generateUUID();
        await User.create({
            id: userId,
            username: 'user_admin_routes',
            email: 'user_admin_routes@test.com',
            password: 'password123',
            roles_id: 2
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_admin_routes@test.com',
            roles_id: 1
        });

        userToken = generateToken({
            id: userId,
            email: 'user_admin_routes@test.com',
            roles_id: 2
        });
    });

    afterAll(async () => {
        await query('DELETE FROM user WHERE email IN (?, ?)', [
            'admin_admin_routes@test.com',
            'user_admin_routes@test.com'
        ]);
    });

    it('should return 401 on /api/admin without token', async () => {
        const response = await request(app).get('/api/admin');
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should return 403 on /api/admin for non-admin', async () => {
        const response = await request(app)
            .get('/api/admin')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    });

    it('should return uniform envelope on /api/admin for admin', async () => {
        const response = await request(app)
            .get('/api/admin')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('filtersApplied');
        expect(response.body).toHaveProperty('generatedAt');
    });

    it('should return users envelope and pagination defaults', async () => {
        const response = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toMatchObject({
            page: 1,
            limit: 20
        });
        expect(response.body).toHaveProperty('filtersApplied');
        expect(response.body).toHaveProperty('generatedAt');
    });

    it('should return 400 with invalidParam for invalid limit', async () => {
        const response = await request(app)
            .get('/api/admin/users?limit=9999')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.invalidParam).toBe('limit');
    });

    it('should return 400 with invalidParam for unknown query', async () => {
        const response = await request(app)
            .get('/api/admin/users?foo=bar')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.invalidParam).toBe('foo');
    });
});
