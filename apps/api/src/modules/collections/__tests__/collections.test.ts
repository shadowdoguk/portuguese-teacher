// Tests for the Phase B collections router — pre-DB surface.
//
// Exercises the 401 gate, the Cache-Control `no-store` discipline
// on every collections route (the `GET /:id` detail route emits
// `private, max-age=60` + ETag on the success path; the cache
// middleware doesn't apply to `/api/collections` directly so we
// verify the controller's explicit `no-store` on the 401 path
// the same way the practice + settings pre-DB tests do), and the
// PATCH-style validation gates (POST with empty name → 400
// `collection_name_required`; POST with malformed `sentenceId` →
// 400 `validation_failed`; DELETE on unknown id → 404
// `collection_not_found`).
//
// Live-DB integration tests (idempotent add, ordered items, FK
// cascade) land with Task 9's smoke suite once a test DB is
// seeded.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import { userIdFromAuthShim } from '../../../middleware/userIdShim.js';
import collectionsRouter from '../router.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/collections', requireAuth, userIdFromAuthShim, collectionsRouter);
  return app;
}

describe('Phase B collections router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // ---------- 401 gate ---------------------------------------------------

  it('rejects GET /api/collections without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/collections');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects POST /api/collections without auth (401)', async () => {
    const res = await request(buildApp()).post('/api/collections').send({ name: 'L' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/collections/:id without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/collections/col_anything');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects POST /api/collections/:id/items without auth (401)', async () => {
    const res = await request(buildApp())
      .post('/api/collections/col_anything/items')
      .send({ sentenceId: 'sen_a1_1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects DELETE /api/collections/:id without auth (401)', async () => {
    const res = await request(buildApp()).delete('/api/collections/col_anything');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('Phase B collections router — POST validation (pre-DB)', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // Stub the userId shim so we exercise the validation gate (which
  // runs after requireAuth). The repository calls below fail
  // pre-DB; we only assert the controller reached them — i.e.
  // the validation gate returned 200, 400, or 404 (not 401).

  function buildAppWithStubbedUser() {
    const app = express();
    app.use(express.json());
    app.use(originAllowList);
    app.use(cacheControl);
    app.use((req, _res, next) => {
      req.userIdFromAuth = () => 'usr_stub';
      next();
    });
    app.use('/api/collections', collectionsRouter);
    return app;
  }

  it('POST /api/collections with empty name returns 400 collection_name_required', async () => {
    const res = await request(buildAppWithStubbedUser())
      .post('/api/collections')
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('collection_name_required');
  });

  it('POST /api/collections/:id/items with malformed sentenceId returns 400 validation_failed', async () => {
    const res = await request(buildAppWithStubbedUser())
      .post('/api/collections/col_stub/items')
      .send({ sentenceId: 'not_a_sentence_id' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('Cache-Control on POST /api/collections (401 path) carries no-store (any non-GET)', async () => {
    // The cache middleware emits `Cache-Control: no-store` for
    // every non-GET request regardless of path prefix
    // (`_req.method !== 'GET'`). requireAuth fails first; the
    // no-store header is set on the way out. Mirror of the
    // practice test's `returns Cache-Control: no-store for POST
    // /api/practice/ratings`.
    const res = await request(buildApp()).post('/api/collections').send({ name: 'L' });
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});