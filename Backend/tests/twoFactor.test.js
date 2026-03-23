const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { generateUUID } = require('../utils/uuid');

describe('Two-Factor Authentication (2FA)', () => {
    let userToken;
    let userId;
    let secret;

    beforeAll(async () => {
        // Limpiar datos previos (por si quedaron de ejecución fallida)
        await query('DELETE FROM user WHERE email = ?', ['test2fa@test.com']);

        // Crear usuario de prueba
        userId = generateUUID();
        await User.create({
            id: userId,
            username: 'test2fa',
            email: 'test2fa@test.com',
            password: 'password123',
            roles_id: 2
        });

        // Login para obtener token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test2fa@test.com',
                password: 'password123'
            });

        userToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
        // Limpiar datos de prueba
        await query('DELETE FROM user WHERE email = ?', ['test2fa@test.com']);
    });

    describe('POST /api/auth/2fa/setup', () => {
        it('should generate 2FA QR code and secret', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('secret');
            expect(response.body.data).toHaveProperty('qrCode');
            expect(response.body.data).toHaveProperty('manualEntry');

            // Guardar secret para siguientes tests
            secret = response.body.data.secret;
        });

        it('should not setup 2FA without authentication', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/setup');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/auth/2fa/verify', () => {
        it('should verify 2FA code and enable 2FA', async () => {
            // Generar código válido
            const token = speakeasy.totp({
                secret: secret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/2fa/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('2FA enabled successfully');

            // Verificar en BD que se habilitó
            const user = await User.findById(userId);
            expect(user.two_factor_enabled).toBe(1);
            expect(user.two_factor_secret).toBe(secret);
        });

        it('should reject invalid 2FA code', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token: '000000' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should validate token format', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token: '123' }); // Token muy corto

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid token format');
        });

        it('should not verify without authentication', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/verify')
                .send({ token: '123456' });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/auth/login with 2FA', () => {
        it('should require 2FA code when enabled', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test2fa@test.com',
                    password: 'password123'
                    // No se envía twoFactorCode
                });

            expect(response.status).toBe(401);
            expect(response.body.requires2FA).toBe(true);
            expect(response.body.message).toBe('2FA code required');
        });

        it('should reject invalid 2FA code on login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test2fa@test.com',
                    password: 'password123',
                    twoFactorCode: '000000'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid 2FA code or backup code');
        });

        it('should login with valid 2FA code', async () => {
            // Generar código válido
            const token = speakeasy.totp({
                secret: secret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test2fa@test.com',
                    password: 'password123',
                    twoFactorCode: token
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.two_factor_enabled).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).not.toHaveProperty('refreshToken'); // No se devuelve automáticamente
        });
    });

    describe('POST /api/auth/2fa/disable', () => {
        it('should not disable 2FA without password', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token: '123456' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Password is required');
        });

        it('should not disable 2FA with wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    password: 'wrongpassword',
                    token: '123456'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid password');
        });

        it('should not disable without authentication', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/disable')
                .send({
                    password: 'password123',
                    token: '123456'
                });

            expect(response.status).toBe(401);
        });

        it('should disable 2FA with valid password and code', async () => {
            // Generar código válido
            const token = speakeasy.totp({
                secret: secret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/2fa/disable')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    password: 'password123',
                    token: token
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('2FA disabled successfully');

            // Verificar en BD
            const user = await User.findById(userId);
            expect(user.two_factor_enabled).toBe(0);
            expect(user.two_factor_secret).toBeNull();
        });
    });

    describe('2FA Already Enabled', () => {
        it('should not allow setup when 2FA is already enabled', async () => {
            // Primero habilitar 2FA
            const setupRes = await request(app)
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${userToken}`);

            const tempSecret = setupRes.body.data.secret;
            const token = speakeasy.totp({
                secret: tempSecret,
                encoding: 'base32'
            });

            await request(app)
                .post('/api/auth/2fa/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token });

            // Intentar setup de nuevo
            const response = await request(app)
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('2FA already enabled');
        });
    });
});
