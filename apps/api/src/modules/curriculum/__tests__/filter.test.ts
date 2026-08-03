// Tests for the Phase B curriculum filter router — pre-DB surface.
//
// Exercises the 401 gate + Cache-Control `no-store` discipline
// (any non-GET emits no-store; the cacheControl middleware handles
// this). Live-DB integration tests land with Task 9's smoke
// suite once a test DB is seeded.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import { userIdFromAuthShim } from '../../../middleware/userIdShim.js';
import { curriculumFilterRouter } from '../filter-router.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/curriculum', requireAuth, userIdFromAuthShim, curriculumFilterRouter);
  return app;
}

describe('Phase B curriculum filter router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  it('rejects GET /api/curriculum/sentences without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/curriculum/sentences');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects POST /api/curriculum/sentences (auth gates before method routing)', async () => {
    // `requireAuth` runs ahead of the router's method check, so
    // an unauthenticated POST returns 401 (not 404). An
    // authenticated POST would return 404 from Express's
    // method-not-allowed handler. Both are valid contract
    // responses — the router only registers GET.
    const res = await request(buildApp()).post('/api/curriculum/sentences').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});