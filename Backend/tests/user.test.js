const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User, Role } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('User CRUD Endpoints', () => {
    let adminToken;
    let userToken;
    let adminId;
    let userId;
    let testUserId;
    let adminRoleId = 1;
    let userRoleId = 2;

    beforeAll(async () => {
        // Limpiar datos previos (por si quedaron de ejecución fallida)
        await query('DELETE FROM user WHERE email IN (?, ?)',
            ['admin@test.com', 'user@test.com']);

        // Crear roles de prueba
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES 
            (1, 'admin'),
            (2, 'user')
        `);

        // Crear admin de prueba
        adminId = generateUUID();
        const adminUser = await User.create({
            id: adminId,
            username: 'admintest',
            email: 'admin@test.com',
            password: 'password123',
            roles_id: adminRoleId
        });

        // Crear usuario regular de prueba
        userId = generateUUID();
        const regularUser = await User.create({
            id: userId,
            username: 'usertest',
            email: 'user@test.com',
            password: 'password123',
            roles_id: userRoleId
        });

        // Generar tokens
        adminToken = generateToken({
            id: adminId,
            email: 'admin@test.com',
            roles_id: adminRoleId
        });

        userToken = generateToken({
            id: userId,
            email: 'user@test.com',
            roles_id: userRoleId
        });
    });

    afterAll(async () => {
        // Limpiar datos de prueba
        await query('DELETE FROM user WHERE email IN (?, ?, ?, ?)',
            ['admin@test.com', 'user@test.com', 'newuser@test.com', 'updated@test.com']);
        // No cerrar el pool aquí, lo hace setup.js
    });

    afterEach(async () => {
        // Limpiar usuarios de prueba creados durante los tests
        if (testUserId) {
            await query('DELETE FROM user WHERE id = ?', [testUserId]);
            testUserId = null;
        }
    });

    describe('GET /api/users', () => {
        it('should get all users as admin', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            // Verificar que no se incluya la contraseña
            expect(response.body.data[0]).not.toHaveProperty('password');
        });

        it('should not get all users as regular user', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should not get all users without authentication', async () => {
            const response = await request(app)
                .get('/api/users');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should get own user profile', async () => {
            const response = await request(app)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userId);
            expect(response.body.data.email).toBe('user@test.com');
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should get user by ID as admin', async () => {
            const response = await request(app)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(userId);
        });

        it('should not get other user profile as regular user', async () => {
            const response = await request(app)
                .get(`/api/users/${adminId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .get(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/profile', () => {
        it('should update own profile', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'updatedusername'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe('updatedusername');

            // Restaurar username original
            await User.update(userId, { username: 'usertest' });
        });

        it('should update own email', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    email: 'newemail@test.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe('newemail@test.com');

            // Restaurar email original
            await User.update(userId, { email: 'user@test.com' });
        });

        it('should not update profile with existing email', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    email: 'admin@test.com'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should update own user data', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'selfupdated'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe('selfupdated');

            // Restaurar
            await User.update(userId, { username: 'usertest' });
        });

        it('should update user as admin', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'adminupdated',
                    roles_id: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe('adminupdated');

            // Restaurar
            await User.update(userId, { username: 'usertest', roles_id: userRoleId });
        });

        it('should not update other user as regular user', async () => {
            const response = await request(app)
                .put(`/api/users/${adminId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'hackattempt'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should not update with existing username', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    username: 'admintest'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .put(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'test'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/users/:id/password', () => {
        it('should change own password', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}/password`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Restaurar contraseña original
            await User.update(userId, { password: 'password123' });
        });

        it('should not change password with wrong current password', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}/password`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('incorrect');
        });

        it('should not change password without current password', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}/password`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should not change password with short new password', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}/password`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: '123'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should allow admin to change user password', async () => {
            const response = await request(app)
                .put(`/api/users/${userId}/password`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'adminchanged123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Restaurar contraseña
            await User.update(userId, { password: 'password123' });
        });

        it('should not change other user password as regular user', async () => {
            const response = await request(app)
                .put(`/api/users/${adminId}/password`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'newpassword123'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/users/:id', () => {
        beforeEach(async () => {
            // Limpiar usuario previo por si quedó de ejecución fallida
            await query('DELETE FROM user WHERE email = ?', ['delete@test.com']);

            // Crear usuario para eliminar
            testUserId = generateUUID();
            await User.create({
                id: testUserId,
                username: 'deletetest',
                email: 'delete@test.com',
                password: 'password123',
                roles_id: userRoleId
            });
        });

        afterEach(async () => {
            // Limpiar usuario de prueba si no fue eliminado en el test
            if (testUserId) {
                await query('DELETE FROM user WHERE id = ?', [testUserId]);
                testUserId = null;
            }
        });

        it('should delete user as admin', async () => {
            const response = await request(app)
                .delete(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verificar que el usuario fue eliminado
            const deletedUser = await User.findById(testUserId);
            expect(deletedUser).toBeNull();

            testUserId = null; // Para evitar intentar eliminarlo en afterEach
        });

        it('should not delete user as regular user', async () => {
            const response = await request(app)
                .delete(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);

            // Verificar que el usuario NO fue eliminado
            const user = await User.findById(testUserId);
            expect(user).not.toBeNull();
        });

        it('should not delete own account', async () => {
            const response = await request(app)
                .delete(`/api/users/${adminId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('own account');
        });

        it('should return 404 for non-existent user', async () => {
            const fakeId = generateUUID();
            const response = await request(app)
                .delete(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not delete user without authentication', async () => {
            const response = await request(app)
                .delete(`/api/users/${testUserId}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
