// Tests for the Phase B unit-progress router — pre-DB surface.
//
// Exercises the 401 gate, the Cache-Control `no-store` discipline
// on both routes, and the validation paths (`stage_unknown`,
// `unit_progress_invalid_status`). Live-DB integration tests
// (idempotent upsert, ordered list projection) land with
// Task 9's smoke suite once a test DB is seeded.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import { userIdFromAuthShim } from '../../../middleware/userIdShim.js';
import { unitProgressRouter } from '../router.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/unit-progress', requireAuth, userIdFromAuthShim, unitProgressRouter);
  return app;
}

describe('Phase B unit-progress router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // ---------- 401 gate ---------------------------------------------------

  it('rejects POST /api/unit-progress/:unitId/:stage without auth (401)', async () => {
    const res = await request(buildApp())
      .post('/api/unit-progress/unit_a1_introductions/learn')
      .send({ status: 'complete' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/unit-progress/:unitId without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/unit-progress/unit_a1_introductions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  // ---------- Cache-Control discipline ---------------------------------

  it('returns Cache-Control: no-store for POST (401 path)', async () => {
    const res = await request(buildApp())
      .post('/api/unit-progress/unit_a1_introductions/learn')
      .send({ status: 'complete' });
    // requireAuth fails first; the cacheControl middleware
    // attaches `no-store` because the request method is non-GET.
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('does not emit no-store for GET (controller-set on success)', async () => {
    const res = await request(buildApp()).get('/api/unit-progress/unit_a1_introductions');
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).not.toBe('no-store');
  });
});

describe('Phase B unit-progress router — POST validation (pre-DB)', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // Stub the userId shim so we exercise the validation gate
  // (which runs after requireAuth). The repository calls fail
  // pre-DB; we only assert the controller reached them — i.e.
  // the validation gate returned 400 (not 401).

  function buildAppWithStubbedUser() {
    const app = express();
    app.use(express.json());
    app.use(originAllowList);
    app.use(cacheControl);
    app.use((req, _res, next) => {
      req.userIdFromAuth = () => 'usr_stub';
      next();
    });
    app.use('/api/unit-progress', unitProgressRouter);
    return app;
  }

  it('rejects POST with an unknown stage (400 stage_unknown)', async () => {
    const res = await request(buildAppWithStubbedUser())
      .post('/api/unit-progress/unit_a1_introductions/bogus')
      .send({ status: 'complete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('stage_unknown');
  });

  it('rejects POST with an invalid body (400 unit_progress_invalid_status)', async () => {
    const res = await request(buildAppWithStubbedUser())
      .post('/api/unit-progress/unit_a1_introductions/learn')
      .send({ status: 'in_progress' }); // Phase B only writes 'complete'
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unit_progress_invalid_status');
  });

  it('rejects an empty POST body (400 unit_progress_invalid_status)', async () => {
    // `unitProgressWriteSchema` requires `status: z.literal('complete')`,
    // so an empty body fails the Zod parse. The controller surfaces
    // this as `unit_progress_invalid_status` (not `stage_unknown`,
    // because the URL `:stage` parsed cleanly first).
    const res = await request(buildAppWithStubbedUser())
      .post('/api/unit-progress/unit_a1_introductions/learn')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unit_progress_invalid_status');
  });
});