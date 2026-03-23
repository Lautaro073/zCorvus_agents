const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User, Role } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Role CRUD Endpoints', () => {
    let adminToken;
    let userToken;
    let adminId;
    let userId;
    let testRoleId;
    let adminRoleId = 1;
    let userRoleId = 2;

    beforeAll(async () => {
        // Limpiar datos previos (por si quedaron de ejecución fallida)
        await query('DELETE FROM user WHERE email IN (?, ?)',
            ['adminrole@test.com', 'userrole@test.com']);

        // Asegurar que existan los roles básicos
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES 
            (1, 'admin'),
            (2, 'user')
        `);

        // Crear admin de prueba
        adminId = generateUUID();
        await User.create({
            id: adminId,
            username: 'adminrole',
            email: 'adminrole@test.com',
            password: 'password123',
            roles_id: adminRoleId
        });

        // Crear usuario regular de prueba
        userId = generateUUID();
        await User.create({
            id: userId,
            username: 'userrole',
            email: 'userrole@test.com',
            password: 'password123',
            roles_id: userRoleId
        });

        // Generar tokens
        adminToken = generateToken({
            id: adminId,
            email: 'adminrole@test.com',
            roles_id: adminRoleId
        });

        userToken = generateToken({
            id: userId,
            email: 'userrole@test.com',
            roles_id: userRoleId
        });
    });

    afterAll(async () => {
        // Limpiar datos de prueba
        await query('DELETE FROM user WHERE email IN (?, ?)',
            ['adminrole@test.com', 'userrole@test.com']);

        // Limpiar roles de prueba (excepto admin, user y pro)
        await query('DELETE FROM roles WHERE id > 3');
    });

    afterEach(async () => {
        // Limpiar rol de prueba creado durante los tests
        if (testRoleId) {
            await query('DELETE FROM roles WHERE id = ?', [testRoleId]);
            testRoleId = null;
        }
    });

    describe('GET /api/roles', () => {
        it('should get all roles as admin', async () => {
            const response = await request(app)
                .get('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            expect(response.body.data).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'admin' }),
                    expect.objectContaining({ name: 'user' })
                ])
            );
        });

        it('should not get roles as regular user', async () => {
            const response = await request(app)
                .get('/api/roles')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should not get roles without authentication', async () => {
            const response = await request(app)
                .get('/api/roles');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/roles/:id', () => {
        it('should get role by ID as admin', async () => {
            const response = await request(app)
                .get('/api/roles/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(1);
            expect(response.body.data.name).toBe('admin');
        });

        it('should return 404 for non-existent role', async () => {
            const response = await request(app)
                .get('/api/roles/999999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not get role as regular user', async () => {
            const response = await request(app)
                .get('/api/roles/1')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/roles', () => {
        beforeEach(async () => {
            // Limpiar rol con ID 4 si existe de ejecuciones anteriores
            await query('DELETE FROM roles WHERE id = 4');
        });

        it('should create new role as admin', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id: 4,
                    name: 'moderator'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('moderator');
            expect(response.body.data.id).toBe(4);

            testRoleId = response.body.data.id;
        });

        it('should not create role with existing name', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'admin'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should not create role without name', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should not create role with invalid name format', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'invalid name 123!'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should not create role as regular user', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'hacker'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/roles/:id', () => {
        beforeEach(async () => {
            // Crear un rol de prueba para actualizar (usar ID 10 para evitar conflictos)
            await query(
                'INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)',
                [10, 'testrole']
            );
            testRoleId = 10;
        });

        it('should update role as admin', async () => {
            const response = await request(app)
                .put(`/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'updatedrole'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe('updatedrole');
        });

        it('should not update role with existing name', async () => {
            const response = await request(app)
                .put(`/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'admin'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return 404 for non-existent role', async () => {
            const response = await request(app)
                .put('/api/roles/999999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'newname'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not update role as regular user', async () => {
            const response = await request(app)
                .put(`/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'hackedrole'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/roles/:id', () => {
        beforeEach(async () => {
            // Crear un rol de prueba para eliminar (usar ID 11 para evitar conflictos)
            await query(
                'INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)',
                [11, 'deleterole']
            );
            testRoleId = 11;
        });

        it('should delete role as admin', async () => {
            const response = await request(app)
                .delete(`/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verificar que el rol fue eliminado
            const deletedRole = await Role.findById(testRoleId);
            expect(deletedRole).toBeNull();

            testRoleId = null;
        });

        it('should not delete admin role', async () => {
            const response = await request(app)
                .delete('/api/roles/1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('essential');
        });

        it('should not delete user role', async () => {
            const response = await request(app)
                .delete('/api/roles/2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('essential');
        });

        it('should return 404 for non-existent role', async () => {
            const response = await request(app)
                .delete('/api/roles/999999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should not delete role as regular user', async () => {
            const response = await request(app)
                .delete(`/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should not delete role without authentication', async () => {
            const response = await request(app)
                .delete(`/api/roles/${testRoleId}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
