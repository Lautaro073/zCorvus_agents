const bcrypt = require('bcryptjs');
const request = require('supertest');

jest.mock('../utils/mailer', () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
}));

const app = require('../app');
const { User, PasswordResetOtp } = require('../models');
const { query } = require('../config/database');
const { sendMail } = require('../utils/mailer');
const { getPasswordResetOtpHtml } = require('../templates/password-reset-otp.html');
const { getPasswordResetOtpText } = require('../templates/password-reset-otp.text');
const { normalizeOtpLocale } = require('../templates/password-reset-otp.copy');

describe('Auth Password Reset OTP API', () => {
    const testUser = {
        username: 'otpuser',
        email: 'otp-user@example.com',
        password: 'password123',
        confirmPassword: 'password123'
    };

    beforeAll(async () => {
        await query('DELETE FROM user WHERE email IN (?, ?)', [testUser.email, 'mismatch-user@example.com']);
        await request(app)
            .post('/api/auth/register')
            .send(testUser)
            .expect(201);
    });

    afterAll(async () => {
        const user = await User.findByEmail(testUser.email);
        if (user) {
            await query('DELETE FROM password_reset_otps WHERE user_id = ?', [user.id]);
            await User.delete(user.id);
        }
        await query('DELETE FROM user WHERE email = ?', ['mismatch-user@example.com']);
    });

    beforeEach(async () => {
        sendMail.mockClear();
    });

    it('should reject register when confirmPassword does not match', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'mismatch-user',
                email: 'mismatch-user@example.com',
                password: 'password123',
                confirmPassword: 'password124'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    it('should request OTP and send email when user exists', async () => {
        const response = await request(app)
            .post('/api/auth/password-reset/request-otp')
            .send({ email: testUser.email, locale: 'es' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(sendMail).toHaveBeenCalled();

        const sentMail = sendMail.mock.calls[0][0];
        expect(sentMail.subject).toContain('Codigo para restablecer');
        expect(sentMail.text).toMatch(/\b\d{6}\b/);
    });

    it('should return safe success response when mailer fails for existing email', async () => {
        sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));

        const response = await request(app)
            .post('/api/auth/password-reset/request-otp')
            .send({ email: testUser.email, locale: 'es' })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('If the email exists, an OTP has been sent');
    });

    it('should return safe response for unknown email', async () => {
        const response = await request(app)
            .post('/api/auth/password-reset/request-otp')
            .send({ email: 'unknown@example.com' })
            .expect(200);

        expect(response.body.success).toBe(true);
    });

    it('should verify OTP fails with invalid code', async () => {
        await request(app)
            .post('/api/auth/password-reset/request-otp')
            .send({ email: testUser.email, locale: 'en' })
            .expect(200);

        const response = await request(app)
            .post('/api/auth/password-reset/verify-otp')
            .send({
                email: testUser.email,
                otp: '000000',
                locale: 'en'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    it('should reset password with valid OTP and block reuse', async () => {
        const user = await User.findByEmail(testUser.email);
        await PasswordResetOtp.markAllUnusedAsUsed(user.id);

        const controlledOtp = '123456';
        await PasswordResetOtp.create(user.id, controlledOtp, new Date(Date.now() + 10 * 60 * 1000));

        const verified = await request(app)
            .post('/api/auth/password-reset/verify-otp')
            .send({
                email: testUser.email,
                otp: controlledOtp,
                locale: 'es'
            })
            .expect(200);

        expect(verified.body.success).toBe(true);

        await request(app)
            .post('/api/auth/password-reset/reset-with-otp')
            .send({
                email: testUser.email,
                otp: controlledOtp,
                newPassword: 'newpass123',
                confirmPassword: 'newpass123',
                locale: 'es'
            })
            .expect(200);

        // Reuse should fail
        await request(app)
            .post('/api/auth/password-reset/reset-with-otp')
            .send({
                email: testUser.email,
                otp: controlledOtp,
                newPassword: 'newpass456',
                confirmPassword: 'newpass456',
                locale: 'es'
            })
            .expect(400);

        // Ensure login works with new password
        await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'newpass123'
            })
            .expect(200);

        const persistedUser = await User.findByEmail(testUser.email);
        const passwordMatches = await bcrypt.compare('newpass123', persistedUser.password);
        expect(passwordMatches).toBe(true);
    });

    it('should reject reset when confirmPassword does not match', async () => {
        const user = await User.findByEmail(testUser.email);
        await PasswordResetOtp.markAllUnusedAsUsed(user.id);

        const controlledOtp = '654321';
        await PasswordResetOtp.create(user.id, controlledOtp, new Date(Date.now() + 10 * 60 * 1000));

        const response = await request(app)
            .post('/api/auth/password-reset/reset-with-otp')
            .send({
                email: testUser.email,
                otp: controlledOtp,
                newPassword: 'anotherpass123',
                confirmPassword: 'does-not-match',
                locale: 'es'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    it('should allow only one successful reset under concurrent replay attempts', async () => {
        const user = await User.findByEmail(testUser.email);
        await PasswordResetOtp.markAllUnusedAsUsed(user.id);

        const controlledOtp = '112233';
        await PasswordResetOtp.create(user.id, controlledOtp, new Date(Date.now() + 10 * 60 * 1000));

        const payload = {
            email: testUser.email,
            otp: controlledOtp,
            newPassword: 'racepass123',
            confirmPassword: 'racepass123',
            locale: 'en'
        };

        const [attemptA, attemptB] = await Promise.all([
            request(app).post('/api/auth/password-reset/reset-with-otp').send(payload),
            request(app).post('/api/auth/password-reset/reset-with-otp').send(payload)
        ]);

        const statuses = [attemptA.status, attemptB.status].sort((a, b) => a - b);
        expect(statuses).toEqual([200, 400]);
    });

    it('should generate localized templates with styled content', () => {
        const resetUrl = 'http://localhost:3000/es/auth/forgot-password';
        const html = getPasswordResetOtpHtml({
            otp: '123456',
            expiresInMinutes: 10,
            locale: 'es',
            resetUrl,
            appName: 'zCorvus'
        });
        const text = getPasswordResetOtpText({
            otp: '123456',
            expiresInMinutes: 10,
            locale: 'es',
            resetUrl,
            appName: 'zCorvus'
        });

        expect(html).toContain('lang="es"');
        expect(html).toContain('Codigo de restablecimiento');
        expect(html).toContain('Restablecer contraseña');
        expect(html).toContain('table role="presentation"');
        expect(html).toContain('123456');
        expect(text).toContain('Codigo de restablecimiento');
        expect(text).toContain('Restablecer contraseña');
        expect(text).toContain(resetUrl);
    });

    it('should normalize locale deterministically', () => {
        expect(normalizeOtpLocale('es-AR')).toBe('es');
        expect(normalizeOtpLocale('en-US')).toBe('en');
        expect(normalizeOtpLocale('fr')).toBe('en');
        expect(normalizeOtpLocale(undefined)).toBe('en');
    });
});
