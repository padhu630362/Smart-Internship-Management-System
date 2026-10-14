import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';

describe('Health and System Diagnostic Endpoints', () => {
  it('GET /api should return API root metadata', async () => {
    const res = await request(app).get('/api');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.endpoints.health);
    assert.ok(res.body.endpoints.databaseHealth);
  });

  it('GET /api/health should return 200 and healthy status envelope immediately', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/health');
    const elapsed = Date.now() - start;

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(['healthy', 'degraded'].includes(res.body.data.status));
    assert.ok(res.body.data.uptimeSeconds !== undefined);
    assert.ok(res.body.data.database);
    assert.ok(res.body.data.memoryUsageMB);
    // Asserts health endpoint responds swiftly (under 1000ms)
    assert.ok(elapsed < 1000, `Health check took too long: ${elapsed}ms`);
  });

  it('GET /api/health/db should separately check database connection status with timeout', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/health/db?timeout=1500');
    const elapsed = Date.now() - start;

    assert.ok([200, 503].includes(res.status));
    assert.ok(elapsed < 2000, `Database health check took too long: ${elapsed}ms`);

    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'connected');
      assert.ok(res.body.data.latencyMs !== undefined);
    } else {
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'DATABASE_UNAVAILABLE');
    }
  });

  it('GET /api/unknown-endpoint should return 404 with standardized error envelope', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('not found'));
  });
});
