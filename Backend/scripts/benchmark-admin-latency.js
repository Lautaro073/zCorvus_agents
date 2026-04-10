const request = require('supertest');

const app = require('../app');
const { query } = require('../config/database');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { generateUUID } = require('../utils/uuid');

const REQUESTS = Number(process.env.BENCH_REQUESTS || 30);
const WARMUP = Number(process.env.BENCH_WARMUP || 5);

function percentile(values, p) {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function toMs(hrtimeNs) {
    return Number(hrtimeNs) / 1_000_000;
}

function summarize(name, samples) {
    const total = samples.reduce((acc, value) => acc + value, 0);
    const mean = samples.length ? total / samples.length : 0;

    return {
        endpoint: name,
        samples: samples.length,
        min: Number(Math.min(...samples).toFixed(2)),
        p50: Number(percentile(samples, 50).toFixed(2)),
        p95: Number(percentile(samples, 95).toFixed(2)),
        max: Number(Math.max(...samples).toFixed(2)),
        mean: Number(mean.toFixed(2))
    };
}

async function benchmarkEndpoint(authToken, endpoint, expectedStatus = 200) {
    for (let i = 0; i < WARMUP; i += 1) {
        const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`);

        if (response.status !== expectedStatus) {
            throw new Error(`Warmup failed for ${endpoint}: expected ${expectedStatus}, got ${response.status}`);
        }
    }

    const samples = [];
    for (let i = 0; i < REQUESTS; i += 1) {
        const start = process.hrtime.bigint();

        const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`);

        const elapsed = process.hrtime.bigint() - start;
        if (response.status !== expectedStatus) {
            throw new Error(`Request failed for ${endpoint}: expected ${expectedStatus}, got ${response.status}`);
        }

        samples.push(toMs(elapsed));
    }

    return samples;
}

async function ensureRoles() {
    await query(`
        INSERT OR IGNORE INTO roles (id, name) VALUES
        (1, 'admin'),
        (2, 'user'),
        (3, 'pro')
    `);
}

async function main() {
    await ensureRoles();

    const adminId = generateUUID();
    const adminEmail = `admin_latency_${Date.now()}@test.com`;

    await query('DELETE FROM user WHERE email = ?', [adminEmail]);

    await User.create({
        id: adminId,
        username: `admin_latency_${Date.now()}`,
        email: adminEmail,
        password: 'password123',
        roles_id: 1
    });

    const authToken = generateToken({
        id: adminId,
        email: adminEmail,
        roles_id: 1
    });

    const endpoints = [
        '/api/admin/metrics?granularity=day&from=2026-04-01T00:00:00Z&to=2026-04-08T00:00:00Z',
        '/api/admin/users?page=1&pageSize=20&search=sub&role=pro&sortBy=token_finish_date&sortDir=desc',
        '/api/admin/subscriptions?page=1&pageSize=20&status=active&expiringInDays=7'
    ];

    const reports = [];
    for (const endpoint of endpoints) {
        const samples = await benchmarkEndpoint(authToken, endpoint, 200);
        reports.push(summarize(endpoint, samples));
    }

    await query('DELETE FROM user WHERE id = ?', [adminId]);

    const output = {
        requests: REQUESTS,
        warmup: WARMUP,
        generatedAt: new Date().toISOString(),
        results: reports
    };

    console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
    console.error('Benchmark failed:', error.message);
    process.exitCode = 1;
});
