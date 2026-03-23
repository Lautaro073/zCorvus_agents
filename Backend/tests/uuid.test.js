const { generateUUID, isValidUUID } = require('../utils/uuid');

describe('UUID Utils', () => {
    describe('generateUUID', () => {
        it('should generate a valid UUID', () => {
            const uuid = generateUUID();
            expect(uuid).toBeDefined();
            expect(typeof uuid).toBe('string');
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate unique UUIDs', () => {
            const uuid1 = generateUUID();
            const uuid2 = generateUUID();
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('isValidUUID', () => {
        it('should validate correct UUID', () => {
            const uuid = generateUUID();
            expect(isValidUUID(uuid)).toBe(true);
        });

        it('should reject invalid UUID format', () => {
            expect(isValidUUID('invalid-uuid')).toBe(false);
            expect(isValidUUID('12345')).toBe(false);
            expect(isValidUUID('')).toBe(false);
        });

        it('should reject non-v4 UUID', () => {
            expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
        });
    });
});
