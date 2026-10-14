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
  });

  it('GET /api/health should return 200 and healthy status envelope', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.ok(res.body.data.uptimeSeconds !== undefined);
    assert.ok(res.body.data.database);
    assert.ok(res.body.data.memoryUsageMB);
  });

  it('GET /api/unknown-endpoint should return 404 with standardized error envelope', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('not found'));
  });
});
