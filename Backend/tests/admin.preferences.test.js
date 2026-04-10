const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin Preferences API', () => {
    let adminId;
    let userId;
    let adminToken;
    let userToken;

    beforeAll(async () => {
        await query(`
            CREATE TABLE IF NOT EXISTS admin_preferences (
                user_id TEXT PRIMARY KEY,
                column_visibility_json TEXT NOT NULL,
                column_order_json TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
            )
        `);

        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        adminId = generateUUID();
        userId = generateUUID();

        await query('DELETE FROM admin_preferences WHERE user_id IN (?, ?)', [adminId, userId]);
        await query('DELETE FROM user WHERE id IN (?, ?)', [adminId, userId]);

        await User.create({
            id: adminId,
            username: 'admin_preferences_api',
            email: 'admin_preferences_api@test.com',
            password: 'password123',
            roles_id: 1
        });

        await User.create({
            id: userId,
            username: 'user_preferences_api',
            email: 'user_preferences_api@test.com',
            password: 'password123',
            roles_id: 2
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_preferences_api@test.com',
            roles_id: 1
        });

        userToken = generateToken({
            id: userId,
            email: 'user_preferences_api@test.com',
            roles_id: 2
        });
    });

    afterAll(async () => {
        await query('DELETE FROM admin_preferences WHERE user_id IN (?, ?)', [adminId, userId]);
        await query('DELETE FROM user WHERE id IN (?, ?)', [adminId, userId]);
    });

    it('returns 401 without token', async () => {
        const response = await request(app).get('/api/admin/preferences');
        expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin token', async () => {
        const response = await request(app)
            .get('/api/admin/preferences')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
    });

    it('returns default preferences for admin without saved row', async () => {
        const response = await request(app)
            .get('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('columnVisibility');
        expect(response.body.data).toHaveProperty('columnOrder');
        expect(response.body.data.columnVisibility.username).toBe(true);
        expect(response.body.data.columnOrder).toContain('username');
    });

    it('saves and returns preferences via PATCH', async () => {
        const patchResponse = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    email: false,
                    tokenExpiry: false
                },
                columnOrder: ['email', 'username', 'role']
            });

        expect(patchResponse.status).toBe(200);
        expect(patchResponse.body.success).toBe(true);
        expect(patchResponse.body.data.columnVisibility.email).toBe(false);
        expect(patchResponse.body.data.columnVisibility.username).toBe(true);
        expect(patchResponse.body.data.columnOrder.slice(0, 3)).toEqual(['email', 'username', 'role']);

        const getResponse = await request(app)
            .get('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.data.columnVisibility.email).toBe(false);
        expect(getResponse.body.data.columnVisibility.tokenExpiry).toBe(false);
        expect(getResponse.body.data.columnOrder.slice(0, 3)).toEqual(['email', 'username', 'role']);
    });

    it('supports PUT compatibility for saving preferences', async () => {
        const response = await request(app)
            .put('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    email: true,
                    tokenExpiry: true
                }
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.columnVisibility.email).toBe(true);
        expect(response.body.data.columnVisibility.tokenExpiry).toBe(true);
    });

    it('keeps a single row with idempotent upsert', async () => {
        const first = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    role: false
                }
            });

        expect(first.status).toBe(200);

        const second = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    role: true
                }
            });

        expect(second.status).toBe(200);

        const countRows = await query('SELECT COUNT(*) AS total FROM admin_preferences WHERE user_id = ?', [adminId]);
        expect(Number(countRows[0]?.total || 0)).toBe(1);
    });

    it('persists preferences across renewed token for same admin user', async () => {
        const saveResponse = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    plan: false
                }
            });

        expect(saveResponse.status).toBe(200);

        const refreshedAdminToken = generateToken({
            id: adminId,
            email: 'admin_preferences_api@test.com',
            roles_id: 1
        });

        const getResponse = await request(app)
            .get('/api/admin/preferences')
            .set('Authorization', `Bearer ${refreshedAdminToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.success).toBe(true);
        expect(getResponse.body.data.columnVisibility.plan).toBe(false);
    });

    it('returns 400 for invalid payload', async () => {
        const response = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    username: 'yes'
                }
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.invalidParam).toBe('columnVisibility.username');
    });

    it('returns 400 when payload would hide all columns', async () => {
        const response = await request(app)
            .patch('/api/admin/preferences')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                columnVisibility: {
                    username: false,
                    email: false,
                    role: false,
                    status: false,
                    plan: false,
                    startDate: false,
                    tokenExpiry: false
                }
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.invalidParam).toBe('columnVisibility');
    });
});
