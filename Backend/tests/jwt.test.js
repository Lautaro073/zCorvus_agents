const { generateToken, verifyToken, generateAccessToken, generateRefreshToken } = require('../utils/jwt');

describe('JWT Utils', () => {
    const testPayload = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'user'
    };

    describe('generateToken', () => {
        it('should generate a valid token', () => {
            const token = generateToken(testPayload);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });

        it('should generate token with custom expiration', () => {
            const token = generateToken(testPayload, '1h');
            expect(token).toBeDefined();
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', () => {
            const token = generateToken(testPayload);
            const decoded = verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe(testPayload.id);
            expect(decoded.email).toBe(testPayload.email);
            expect(decoded.role).toBe(testPayload.role);
        });

        it('should return null for invalid token', () => {
            const decoded = verifyToken('invalid-token');
            expect(decoded).toBeNull();
        });

        it('should return null for expired token', () => {
            const token = generateToken(testPayload, '0s');

            setTimeout(() => {
                const decoded = verifyToken(token);
                expect(decoded).toBeNull();
            }, 1000);
        });
    });

    describe('generateAccessToken', () => {
        it('should generate access token with correct payload', () => {
            const token = generateAccessToken('user-id', 'user@example.com', 'admin');
            const decoded = verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe('user-id');
            expect(decoded.email).toBe('user@example.com');
            expect(decoded.role).toBe('admin');
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate refresh token with correct payload', () => {
            const token = generateRefreshToken('user-id');
            const decoded = verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe('user-id');
            expect(decoded.type).toBe('refresh');
        });
    });
});
