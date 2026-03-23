const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { generateUUID } = require('../utils/uuid');
const { User, Token } = require('../models');
const speakeasy = require('speakeasy');

describe('Token Endpoints & Pro User 2FA Requirements', () => {
    let adminToken, userToken, proUserToken;
    let adminId, userId, proUserId;
    let tokenId, twoFactorSecret;

    beforeAll(async () => {
        // Limpiar datos previos (por si quedaron de ejecución fallida)
        await query('DELETE FROM user WHERE email IN (?, ?, ?)',
            ['admin_token@test.com', 'user_token@test.com', 'pro_user_token@test.com']);

        // Crear admin
        adminId = generateUUID();
        await User.create({
            id: adminId,
            username: 'admin_token_test',
            email: 'admin_token@test.com',
            password: 'password123',
            roles_id: 1
        });

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin_token@test.com',
                password: 'password123'
            });
        adminToken = adminLogin.body.data.accessToken;

        // Crear usuario normal
        userId = generateUUID();
        await User.create({
            id: userId,
            username: 'user_token_test',
            email: 'user_token@test.com',
            password: 'password123',
            roles_id: 2
        });

        const userLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'user_token@test.com',
                password: 'password123'
            });
        userToken = userLogin.body.data.accessToken;

        // Crear usuario Pro con token
        proUserId = generateUUID();
        tokenId = generateUUID();

        // Crear token activo
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        await Token.create({
            id: tokenId,
            token: 'TEST-PRO-TOKEN-123',
            type: 'pro',
            start_date: new Date(),
            finish_date: futureDate
        });

        await User.create({
            id: proUserId,
            username: 'pro_token_test',
            email: 'pro_token@test.com',
            password: 'password123',
            roles_id: 3, // Pro
            token_id: tokenId
        });

        const proLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'pro_token@test.com',
                password: 'password123'
            });
        proUserToken = proLogin.body.data.accessToken;
    });

    afterAll(async () => {
        // Limpiar
        await query('DELETE FROM user WHERE email IN (?, ?, ?)', [
            'admin_token@test.com',
            'user_token@test.com',
            'pro_token@test.com'
        ]);
        await query('DELETE FROM token WHERE id = ?', [tokenId]);
        await query('DELETE FROM backup_codes WHERE user_id = ?', [proUserId]);
    });

    describe('GET /api/tokens/me - Pro User WITHOUT 2FA', () => {
        it('should block Pro user from viewing token without 2FA', async () => {
            const response = await request(app)
                .get('/api/tokens/me')
                .set('Authorization', `Bearer ${proUserToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('must enable 2FA');
            expect(response.body.requires2FA).toBe(true);
            expect(response.body.setupUrl).toBe('/api/auth/2fa/setup');
        });
    });

    describe('Setup 2FA for Pro User', () => {
        it('should setup 2FA for Pro user', async () => {
            const response = await request(app)
                .post('/api/auth/2fa/setup')
                .set('Authorization', `Bearer ${proUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('secret');
            expect(response.body.data).toHaveProperty('qrCode');

            twoFactorSecret = response.body.data.secret;
        });

        it('should verify and enable 2FA with backup codes', async () => {
            const token = speakeasy.totp({
                secret: twoFactorSecret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/2fa/verify')
                .set('Authorization', `Bearer ${proUserToken}`)
                .send({ token });

            expect(response.status).toBe(200);
            expect(response.body.backupCodes).toBeDefined();
            expect(response.body.backupCodes.length).toBe(10);
            expect(response.body.warning).toContain('Save these backup codes');
        });
    });

    describe('GET /api/tokens/me - Pro User WITH 2FA', () => {
        it('should allow Pro user to view token with 2FA enabled', async () => {
            const response = await request(app)
                .get('/api/tokens/me')
                .set('Authorization', `Bearer ${proUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.token.token).toBe('TEST-PRO-TOKEN-123');
            expect(response.body.data.token.type).toBe('pro');
            expect(response.body.data.token.is_active).toBe(true);
        });
    });

    describe('GET /api/tokens/me - Regular User', () => {
        it('should allow regular user to view token without 2FA', async () => {
            const response = await request(app)
                .get('/api/tokens/me')
                .set('Authorization', `Bearer ${userToken}`);

            // Usuario normal no tiene token asignado
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('No token assigned to this user');
        });
    });

    describe('GET /api/tokens - Admin', () => {
        it('should allow admin to view all tokens', async () => {
            const response = await request(app)
                .get('/api/tokens')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.tokens)).toBe(true);
        });

        it('should not allow regular user to view all tokens', async () => {
            const response = await request(app)
                .get('/api/tokens')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Admin only');
        });
    });

    describe('Backup Codes', () => {
        it('should get backup codes', async () => {
            const response = await request(app)
                .get('/api/auth/2fa/backup-codes')
                .set('Authorization', `Bearer ${proUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.codes).toBeDefined();
            expect(response.body.data.count).toBeGreaterThan(0);
        });

        it('should regenerate backup codes with password and 2FA', async () => {
            const token = speakeasy.totp({
                secret: twoFactorSecret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/2fa/backup-codes/regenerate')
                .set('Authorization', `Bearer ${proUserToken}`)
                .send({
                    password: 'password123',
                    token: token
                });

            expect(response.status).toBe(200);
            expect(response.body.backupCodes).toBeDefined();
            expect(response.body.backupCodes.length).toBe(10);
            expect(response.body.warning).toContain('Old backup codes are now invalid');
        });

        it('should not regenerate without password', async () => {
            const token = speakeasy.totp({
                secret: twoFactorSecret,
                encoding: 'base32'
            });

            const response = await request(app)
                .post('/api/auth/2fa/backup-codes/regenerate')
                .set('Authorization', `Bearer ${proUserToken}`)
                .send({ token });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Password is required');
        });
    });

    describe('Login with Backup Code', () => {
        let backupCode;

        it('should get a backup code to test', async () => {
            const response = await request(app)
                .get('/api/auth/2fa/backup-codes')
                .set('Authorization', `Bearer ${proUserToken}`);

            backupCode = response.body.data.codes[0];
        });

        it('should login with backup code', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'pro_token@test.com',
                    password: 'password123',
                    twoFactorCode: backupCode
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
        });

        it('should not reuse the same backup code', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'pro_token@test.com',
                    password: 'password123',
                    twoFactorCode: backupCode
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid 2FA code or backup code');
        });
    });
});
