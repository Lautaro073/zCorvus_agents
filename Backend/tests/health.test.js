const request = require('supertest');
const app = require('../app');

describe('Health Check', () => {
    it('should return OK status', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
    });
});

describe('Root Endpoint', () => {
    it('should return welcome message', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);

        expect(response.body).toHaveProperty('message', 'Welcome to zCorvus API');
        expect(response.body).toHaveProperty('version', '1.0.0');
    });
});
