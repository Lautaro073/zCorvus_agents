const request = require('supertest');
const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

describe('Admin User Lifecycle API', () => {
    let adminId;
    let adminToken;
    let managedUserId;
    let secondManagedUserId;

    beforeAll(async () => {
        await query(`
            INSERT OR IGNORE INTO roles (id, name) VALUES
            (1, 'admin'),
            (2, 'user'),
            (3, 'pro')
        `);

        adminId = generateUUID();
        managedUserId = generateUUID();
        secondManagedUserId = generateUUID();

        await query('DELETE FROM user WHERE email IN (?, ?, ?)', [
            'admin_lifecycle@test.com',
            'managed_lifecycle@test.com',
            'managed_lifecycle_2@test.com'
        ]);

        await User.create({
            id: adminId,
            username: 'admin_lifecycle',
            email: 'admin_lifecycle@test.com',
            password: 'password123',
            roles_id: 1
        });

        await User.create({
            id: managedUserId,
            username: 'managed_lifecycle',
            email: 'managed_lifecycle@test.com',
            password: 'password123',
            roles_id: 2
        });

        await User.create({
            id: secondManagedUserId,
            username: 'managed_lifecycle_2',
            email: 'managed_lifecycle_2@test.com',
            password: 'password123',
            roles_id: 2
        });

        adminToken = generateToken({
            id: adminId,
            email: 'admin_lifecycle@test.com',
            roles_id: 1
        });
    });

    afterAll(async () => {
        await query('DELETE FROM user WHERE email IN (?, ?, ?, ?)', [
            'admin_lifecycle@test.com',
            'managed_lifecycle@test.com',
            'managed_lifecycle_updated@test.com',
            'managed_lifecycle_2@test.com'
        ]);
    });

    it('updates username, email and role from admin', async () => {
        const response = await request(app)
            .put(`/api/admin/users/${managedUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'managed_lifecycle_updated',
                email: 'managed_lifecycle_updated@test.com',
                role: 'pro'
            });

        expect(response.status).toBe(200);
        expect(response.body.data.username).toBe('managed_lifecycle_updated');
        expect(response.body.data.email).toBe('managed_lifecycle_updated@test.com');
        expect(response.body.data.role_name).toBe('pro');
    });

    it('rejects duplicate admin update values', async () => {
        const response = await request(app)
            .put(`/api/admin/users/${managedUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'managed_lifecycle_2@test.com'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Email already in use');
    });

    it('disables and re-enables a user', async () => {
        const disableResponse = await request(app)
            .patch(`/api/admin/users/${managedUserId}/disable`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(disableResponse.status).toBe(200);
        expect(disableResponse.body.data.accountStatus).toBe('disabled');

        const reEnableResponse = await request(app)
            .patch(`/api/admin/users/${managedUserId}/re-enable`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(reEnableResponse.status).toBe(200);
        expect(reEnableResponse.body.data.accountStatus).toBe('active');
    });

    it('does not allow permanent deletion of an active user', async () => {
        const response = await request(app)
            .delete(`/api/admin/users/${managedUserId}/permanent`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('User must be disabled before permanent deletion');
    });

    it('does not allow an admin to disable or delete own account', async () => {
        const disableResponse = await request(app)
            .patch(`/api/admin/users/${adminId}/disable`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(disableResponse.status).toBe(400);
        expect(disableResponse.body.message).toBe('Cannot disable your own account');

        const deleteResponse = await request(app)
            .delete(`/api/admin/users/${adminId}/permanent`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(deleteResponse.status).toBe(400);
        expect(deleteResponse.body.message).toBe('Cannot delete your own account');
    });

    it('permanently deletes a disabled user', async () => {
        const disableResponse = await request(app)
            .patch(`/api/admin/users/${secondManagedUserId}/disable`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(disableResponse.status).toBe(200);
        expect(disableResponse.body.data.accountStatus).toBe('disabled');

        const deleteResponse = await request(app)
            .delete(`/api/admin/users/${secondManagedUserId}/permanent`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toBe('User deleted permanently');

        const deletedUser = await User.findById(secondManagedUserId);
        expect(deletedUser).toBeNull();
    });
});
