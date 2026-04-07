const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User, Token } = require('../models');
const { generateUUID } = require('../utils/uuid');

describe('Pro Role Token Verification', () => {
    let userId;
    let tokenId;
    let proRoleId;

    beforeAll(async () => {
        // Asegurar que existan los roles básicos (admin y user)
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES 
            (1, 'admin'),
            (2, 'user')
        `);

        // Obtener el ID del rol pro (debe existir en la BD)
        const rows = await query('SELECT id FROM roles WHERE name = ?', ['pro']);
        if (rows.length === 0) {
            throw new Error('El rol "pro" no existe en la base de datos. Por favor, créalo manualmente con: INSERT INTO roles (id, name) VALUES (3, "pro")');
        }
        proRoleId = rows[0].id;
        console.log(`✓ Rol Pro encontrado con ID: ${proRoleId}`);
    });

    afterEach(async () => {
        // Limpiar datos de prueba
        if (userId) {
            await query('DELETE FROM user WHERE id = ?', [userId]);
            userId = null;
        }
        if (tokenId) {
            await query('DELETE FROM token WHERE id = ?', [tokenId]);
            tokenId = null;
        }
    });

    describe('User Registration', () => {
        it('should register new user with role user (ID=2) by default', async () => {
            const timestamp = Date.now();
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `testuser_${timestamp}`,
                    email: `testuser_${timestamp}@test.com`,
                    password: 'password123',
                    confirmPassword: 'password123'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe('user');

            // Verificar en BD que el rol sea 2
            const user = await User.findByEmail(`testuser_${timestamp}@test.com`);
            expect(user.roles_id).toBe(2);

            userId = user.id;
        });

        it('should NOT allow registering with role_id in body', async () => {
            const timestamp = Date.now();
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `hackuser_${timestamp}`,
                    email: `hackuser_${timestamp}@test.com`,
                    password: 'password123',
                    confirmPassword: 'password123',
                    roles_id: 3 // Intentar registrarse como Pro
                });

            expect(response.status).toBe(201);

            // Verificar que se ignoró el roles_id y se asignó rol 2
            const user = await User.findByEmail(`hackuser_${timestamp}@test.com`);
            expect(user.roles_id).toBe(2); // Debe ser user, no pro

            userId = user.id;
        });
    });

    describe('Pro Role Verification', () => {
        beforeEach(async () => {
            // Limpiar usuario previo por si quedó de ejecución fallida
            await query('DELETE FROM user WHERE email = ?', ['prousertest@test.com']);

            // Crear usuario de prueba
            userId = generateUUID();
            await User.create({
                id: userId,
                username: 'prousertest',
                email: 'prousertest@test.com',
                password: 'password123',
                roles_id: 2 // User normal
            });
        });

        it('should upgrade user to Pro when active token is assigned', async () => {
            // Crear token activo
            tokenId = generateUUID();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30); // 30 días en el futuro

            await Token.create({
                id: tokenId,
                token: 'active-pro-token-123',
                type: 'pro',
                start_date: new Date(),
                finish_date: futureDate
            });

            // Asignar token al usuario
            await User.updateToken(userId, tokenId);

            // Actualizar rol a Pro
            await query('UPDATE user SET roles_id = ? WHERE id = ?', [proRoleId, userId]);

            // Verificar que el usuario tiene rol Pro
            const result = await User.verifyAndUpdateProRole(userId);
            expect(result.changed).toBe(false);

            const user = await User.findById(userId);
            expect(user.roles_id).toBe(proRoleId); // Debe ser Pro
        });

        it('should downgrade Pro user to User when token expires', async () => {
            // Crear token EXPIRADO
            tokenId = generateUUID();
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // Ayer (expirado)

            await Token.create({
                id: tokenId,
                token: 'expired-pro-token-123',
                type: 'pro',
                start_date: new Date('2024-01-01'),
                finish_date: pastDate
            });

            // Asignar token al usuario y establecer como Pro
            await User.updateToken(userId, tokenId);
            await query('UPDATE user SET roles_id = ? WHERE id = ?', [proRoleId, userId]);

            // Verificar y actualizar rol (debería degradar a User)
            const result = await User.verifyAndUpdateProRole(userId);
            expect(result.changed).toBe(true);
            expect(result.newRole).toBe(2);
            expect(result.reason).toBe('Token expired or missing');

            const user = await User.findById(userId);
            expect(user.roles_id).toBe(2); // Debe volver a ser User
        });

        it('should NOT allow Pro role without active token', async () => {
            // Intentar establecer rol Pro sin token
            await query('UPDATE user SET roles_id = ? WHERE id = ?', [proRoleId, userId]);

            // Verificar que se degrada automáticamente
            const result = await User.verifyAndUpdateProRole(userId);
            expect(result.changed).toBe(true);
            expect(result.newRole).toBe(2);

            const user = await User.findById(userId);
            expect(user.roles_id).toBe(2); // Debe ser User
        });

        it('should keep User role when no token is assigned', async () => {
            // Usuario sin token
            const result = await User.verifyAndUpdateProRole(userId);
            expect(result.changed).toBe(false);

            const user = await User.findById(userId);
            expect(user.roles_id).toBe(2); // Sigue siendo User
        });
    });

    describe('hasActiveToken method', () => {
        beforeEach(async () => {
            // Limpiar usuario previo por si quedó de ejecución fallida
            await query('DELETE FROM user WHERE email = ?', ['tokentest@test.com']);

            userId = generateUUID();
            await User.create({
                id: userId,
                username: 'tokentest',
                email: 'tokentest@test.com',
                password: 'password123',
                roles_id: 2
            });
        });

        it('should return true when user has active token', async () => {
            tokenId = generateUUID();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);

            await Token.create({
                id: tokenId,
                token: 'active-token-456',
                type: 'pro',
                start_date: new Date(),
                finish_date: futureDate
            });

            await User.updateToken(userId, tokenId);

            const hasActive = await User.hasActiveToken(userId);
            expect(hasActive).toBe(true);
        });

        it('should return false when user has no token', async () => {
            const hasActive = await User.hasActiveToken(userId);
            expect(hasActive).toBe(false);
        });

        it('should return false when user has expired token', async () => {
            tokenId = generateUUID();
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            await Token.create({
                id: tokenId,
                token: 'expired-token-789',
                type: 'pro',
                start_date: new Date('2024-01-01'),
                finish_date: pastDate
            });

            await User.updateToken(userId, tokenId);

            const hasActive = await User.hasActiveToken(userId);
            expect(hasActive).toBe(false);
        });
    });
});
