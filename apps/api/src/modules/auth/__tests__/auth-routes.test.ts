// Tests for the auth router — pre-DB surface only.
//
// The full signup → login → refresh → logout flow + the
// reuse-compromise guard (A5) require a live DB; those tests land
// in Task 8/9 once a test DB is wired. Here we exercise the routes
// that don't touch the DB: validation failures (400), missing
// cookies (401), and the Origin/CSRF gate from amendment A4 which
// runs ahead of the auth router.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { originAllowList } from '../../../middleware/origin.js';
import authRouter from '../router.js';

function buildApp(allowedOrigins: string[]) {
  process.env.AUTH_ALLOWED_ORIGINS = allowedOrigins.join(',');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(originAllowList);
  app.use('/api/auth', authRouter);
  return app;
}

describe('auth router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test'; // required by env.ts
  });

  it('POST /api/auth/login with malformed JSON returns 400 validation_failed', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('POST /api/auth/login with foreign Origin returns 403 csrf_origin_denied (A4)', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://evil.example')
      .send({ email: 'a@b.co', password: 'long-enough-password' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_origin_denied');
  });

  it('POST /api/auth/refresh without a cookie returns 401 unauthorized', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('POST /api/auth/logout without a cookie is a 200 idempotent no-op', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(true);
  });

  it('GET /api/auth/session without a cookie returns 401 unauthorized', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .get('/api/auth/session')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});