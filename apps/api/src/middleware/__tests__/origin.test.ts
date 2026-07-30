// Tests for originAllowList middleware (amendment Task A4 step 3).
//
// Per A4: POST /api/auth/login with a foreign Origin returns 403
// csrf_origin_denied; GET /api/health bypasses; POST /api/auth/login
// with an allowed Origin passes through.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../origin.js';

function buildApp(allowList: string[]) {
  process.env.AUTH_ALLOWED_ORIGINS = allowList.join(',');
  const app = express();
  app.use(originAllowList);
  app.post('/api/auth/login', (_req, res) => res.status(204).end());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}

describe('originAllowList (amendment Task A4)', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
  });

  it('rejects POST /api/auth/login with a foreign Origin', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_origin_denied');
  });

  it('rejects POST /api/auth/login with no Origin header', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app).post('/api/auth/login');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_origin_denied');
  });

  it('accepts POST /api/auth/login with an allow-listed Origin', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(204);
  });

  it('GET /api/health bypasses (exempt path)', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('OPTIONS /api/auth/login bypasses (exempt method)', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://evil.example');
    // Express's default OPTIONS handler returns 200/204 without an Origin check.
    expect([200, 204]).toContain(res.status);
  });
});