const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User, SettingsIcons } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Settings Icons CRUD Endpoints', () => {
    let adminToken;
    let userToken;
    let adminId;
    let userId;
    let testSettingId;
    let userSettingId;
    let adminRoleId = 1;
    let userRoleId = 2;

    beforeAll(async () => {
        // Limpiar datos previos (por si quedaron de ejecución fallida)
        await query('DELETE FROM user WHERE email IN (?, ?)',
            ['adminsettings@test.com', 'usersettings@test.com']);

        // Asegurar que existan los roles básicos
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES 
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        // Crear setting de prueba para el usuario
        userSettingId = generateUUID();
        await SettingsIcons.create({
            id: userSettingId,
            icon: 'user-icon',
            layer: 'solid'
        });

        // Crear admin de prueba
        adminId = generateUUID();
        await User.create({
            id: adminId,
            username: 'adminsettings',
            email: 'adminsettings@test.com',
            password: 'password123',
            roles_id: adminRoleId,
            settings_icons_id: null
        });

        // Crear usuario regular de prueba con settings
        userId = generateUUID();
        await User.create({
            id: userId,
            username: 'usersettings',
            email: 'usersettings@test.com',
            password: 'password123',
            roles_id: userRoleId,
            settings_icons_id: userSettingId
        });

        // Generar tokens
        adminToken = generateToken({
            id: adminId,
            email: 'adminsettings@test.com',
            roles_id: adminRoleId
        });

        userToken = generateToken({
            id: userId,
            email: 'usersettings@test.com',
            roles_id: userRoleId
        });
    });

    afterAll(async () => {
        // Limpiar datos de prueba
        await query('DELETE FROM user WHERE email IN (?, ?)',
            ['adminsettings@test.com', 'usersettings@test.com']);

        // Limpiar settings de prueba
        await query('DELETE FROM settings_icons WHERE id = ?', [userSettingId]);
    });

    afterEach(async () => {
        // Limpiar setting de prueba creado durante los tests
        if (testSettingId) {
            await query('DELETE FROM settings_icons WHERE id = ?', [testSettingId]);
            testSettingId = null;
        }
    });

    describe('GET /api/settings-icons', () => {
        it('should get all settings icons as admin', async () => {
            const response = await request(app)
                .get('/api/settings-icons')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should not get all settings icons as regular user', async () => {
            const response = await request(app)
                .get('/api/settings-icons')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should not get all settings icons without authentication', async () => {
            const response = await request(app)
                .get('/api/settings-icons');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/settings-icons/me', () => {
        it('should get own user settings', async () => {
            const response = await request(app)
                .get('/api/settings-icons/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userSettingId);
            expect(response.body.data.icon).toBe('user-icon');
        });

        it('should return 404 if user has no settings', async () => {
            const response = await request(app)
                .get('/api/settings-icons/me')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not get settings without authentication', async () => {
            const response = await request(app)
                .get('/api/settings-icons/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/settings-icons/:id', () => {
        it('should get settings icon by ID', async () => {
            const response = await request(app)
                .get(`/api/settings-icons/${userSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userSettingId);
        });

        it('should return 404 for non-existent settings icon', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .get(`/api/settings-icons/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should get settings icon as regular user', async () => {
            const response = await request(app)
                .get(`/api/settings-icons/${userSettingId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/settings-icons', () => {
        it('should create new settings icon as admin', async () => {
            const response = await request(app)
                .post('/api/settings-icons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'new-icon',
                    layer: 'outline'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('new-icon');
            expect(response.body.data.layer).toBe('outline');
            expect(response.body.data.id).toBeDefined();

            testSettingId = response.body.data.id;
        });

        it('should create settings icon as regular user', async () => {
            const response = await request(app)
                .post('/api/settings-icons')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    icon: 'user-created-icon',
                    layer: 'duotone'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('user-created-icon');
            expect(response.body.data.layer).toBe('duotone');

            testSettingId = response.body.data.id;
        });

        it('should create settings icon without layer', async () => {
            const response = await request(app)
                .post('/api/settings-icons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'icon-no-layer'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('icon-no-layer');

            testSettingId = response.body.data.id;
        });

        it('should not create settings icon with invalid layer', async () => {
            const response = await request(app)
                .post('/api/settings-icons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'test-icon',
                    layer: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should not create settings icon without authentication', async () => {
            const response = await request(app)
                .post('/api/settings-icons')
                .send({
                    icon: 'test-icon',
                    layer: 'duotone'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/settings-icons/:id', () => {
        beforeEach(async () => {
            // Crear un settings icon de prueba para actualizar
            testSettingId = generateUUID();
            await SettingsIcons.create({
                id: testSettingId,
                icon: 'test-icon',
                layer: 'filled'
            });
        });

        it('should update settings icon as admin', async () => {
            const response = await request(app)
                .put(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'updated-icon',
                    layer: 'duotone'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('updated-icon');
            expect(response.body.data.layer).toBe('duotone');
        });

        it('should update only icon field', async () => {
            const response = await request(app)
                .put(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'only-icon-updated'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('only-icon-updated');
            expect(response.body.data.layer).toBe('filled'); // Sin cambios
        });

        it('should update only layer field', async () => {
            const response = await request(app)
                .put(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    layer: 'outline-thick'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.layer).toBe('outline-thick');
        });

        it('should return 404 for non-existent settings icon', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .put(`/api/settings-icons/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    icon: 'test'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should update settings icon as regular user', async () => {
            const response = await request(app)
                .put(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    icon: 'user-updated-icon'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.icon).toBe('user-updated-icon');
        });

        it('should not update with invalid layer', async () => {
            const response = await request(app)
                .put(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    layer: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/settings-icons/:id', () => {
        beforeEach(async () => {
            // Crear un settings icon de prueba para eliminar
            testSettingId = generateUUID();
            await SettingsIcons.create({
                id: testSettingId,
                icon: 'delete-icon',
                layer: 'solid'
            });
        });

        it('should delete settings icon as admin', async () => {
            const response = await request(app)
                .delete(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verificar que fue eliminado
            const deletedSetting = await SettingsIcons.findById(testSettingId);
            expect(deletedSetting).toBeNull();

            testSettingId = null;
        });

        it('should delete settings icon as regular user', async () => {
            const response = await request(app)
                .delete(`/api/settings-icons/${testSettingId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verificar que fue eliminado
            const deletedSetting = await SettingsIcons.findById(testSettingId);
            expect(deletedSetting).toBeNull();

            testSettingId = null;
        });

        it('should return 404 for non-existent settings icon', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .delete(`/api/settings-icons/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not delete settings icon without authentication', async () => {
            const response = await request(app)
                .delete(`/api/settings-icons/${testSettingId}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
