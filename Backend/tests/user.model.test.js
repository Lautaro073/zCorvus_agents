const bcrypt = require('bcryptjs');
const { User } = require('../models');

describe('User Model', () => {
    const testUser = {
        username: 'modeltest',
        email: 'modeltest@example.com',
        password: 'password123',
        roles_id: 2
    };

    let userId;

    describe('create', () => {
        it('should create a new user with UUID', async () => {
            userId = await User.create(testUser);

            expect(userId).toBeDefined();
            expect(typeof userId).toBe('string');
            expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should hash password when creating user', async () => {
            const user = await User.findById(userId);

            expect(user.password).toBeDefined();
            expect(user.password).not.toBe(testUser.password);
            expect(user.password.length).toBeGreaterThan(20);
        });
    });

    describe('findById', () => {
        it('should find user by UUID', async () => {
            const user = await User.findById(userId);

            expect(user).toBeDefined();
            expect(user.id).toBe(userId);
            expect(user.email).toBe(testUser.email);
            expect(user.username).toBe(testUser.username);
        });

        it('should return null for non-existent UUID', async () => {
            const user = await User.findById('00000000-0000-4000-0000-000000000000');
            expect(user).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const user = await User.findByEmail(testUser.email);

            expect(user).toBeDefined();
            expect(user.email).toBe(testUser.email);
        });

        it('should return null for non-existent email', async () => {
            const user = await User.findByEmail('nonexistent@example.com');
            expect(user).toBeNull();
        });
    });

    describe('findByUsername', () => {
        it('should find user by username', async () => {
            const user = await User.findByUsername(testUser.username);

            expect(user).toBeDefined();
            expect(user.username).toBe(testUser.username);
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const user = await User.findById(userId);
            const isValid = await User.verifyPassword(testUser.password, user.password);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const user = await User.findById(userId);
            const isValid = await User.verifyPassword('wrongpassword', user.password);

            expect(isValid).toBe(false);
        });
    });

    describe('update', () => {
        it('should update user data', async () => {
            await User.update(userId, { username: 'updateduser' });
            const user = await User.findById(userId);

            expect(user.username).toBe('updateduser');
        });

        it('should hash new password when updating', async () => {
            const newPassword = 'newpassword123';
            await User.update(userId, { password: newPassword });

            const user = await User.findById(userId);
            const isValid = await User.verifyPassword(newPassword, user.password);

            expect(isValid).toBe(true);
        });
    });

    describe('delete', () => {
        it('should delete user', async () => {
            await User.delete(userId);
            const user = await User.findById(userId);

            expect(user).toBeNull();
        });
    });
});
