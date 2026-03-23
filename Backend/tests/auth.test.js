const request = require('supertest');
const app = require('../app');
const { User } = require('../models');

describe('Auth API', () => {
    const testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
    };

    let authToken;

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).not.toHaveProperty('refreshToken'); // No se devuelve automáticamente
            expect(response.body.data.user.email).toBe(testUser.email);
        });

        it('should not register user with existing email', async () => {
            await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(400);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ username: 'test' })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
        });

        it('should validate email format', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser2',
                    email: 'invalid-email',
                    password: 'password123'
                })
                .expect(400);
        });

        it('should validate password length', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser3',
                    email: 'test3@example.com',
                    password: '123'
                })
                .expect(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).not.toHaveProperty('refreshToken'); // No se devuelve automáticamente

            authToken = response.body.data.accessToken;
        });

        it('should not login with invalid email', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: testUser.password
                })
                .expect(401);
        });

        it('should not login with invalid password', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                })
                .expect(401);
        });

        it('should validate required fields', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email })
                .expect(400);
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should get user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('email', testUser.email);
        });

        it('should not get profile without token', async () => {
            await request(app)
                .get('/api/auth/profile')
                .expect(401);
        });

        it('should not get profile with invalid token', async () => {
            await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(403);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout with valid token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });

        it('should not logout without token', async () => {
            await request(app)
                .post('/api/auth/logout')
                .expect(401);
        });
    });

    describe('POST /api/auth/refresh-token', () => {
        it('should generate refresh token for authenticated user', async () => {
            const response = await request(app)
                .post('/api/auth/refresh-token')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data).toHaveProperty('expiresAt');
            expect(response.body.data).toHaveProperty('inactivityTime');
            // Verificar que sea un formato de tiempo válido (ej: '10d', '5m', '2h')
            expect(response.body.data.inactivityTime).toMatch(/^\d+[smhd]$/);
        });

        it('should not generate refresh token without authentication', async () => {
            await request(app)
                .post('/api/auth/refresh-token')
                .expect(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        let refreshToken;

        beforeAll(async () => {
            // Get a refresh token first
            const response = await request(app)
                .post('/api/auth/refresh-token')
                .set('Authorization', `Bearer ${authToken}`);

            refreshToken = response.body.data.refreshToken;
        });

        it('should refresh access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).not.toHaveProperty('refreshToken');
        });

        it('should not refresh with invalid token', async () => {
            await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(403);
        });

        it('should not refresh without token', async () => {
            await request(app)
                .post('/api/auth/refresh')
                .send({})
                .expect(400);
        });
    });

    // Cleanup after tests
    afterAll(async () => {
        // Delete test user
        if (testUser.email) {
            const user = await User.findByEmail(testUser.email);
            if (user) {
                await User.delete(user.id);
            }
        }
    });
});
