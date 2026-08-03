// Tests for the Phase B settings router — pre-DB surface.
//
// Exercises the 401 gate, the PATCH validation rules (out-of-range
// audio_speed, unknown sort_order, etc.), and the Cache-Control
// `no-store` discipline wired by the cache middleware (A6) plus
// the `/api/me/` prefix added in Task 4. Live-DB integration
// tests (default materialisation, partial-patch merge, idempotent
// upsert) land with Task 9's smoke suite once a test DB is seeded.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import { userIdFromAuthShim } from '../../../middleware/userIdShim.js';
import settingsRouter from '../router.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/me/settings', requireAuth, userIdFromAuthShim, settingsRouter);
  return app;
}

describe('Phase B settings router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // ---------- 401 gate ---------------------------------------------------

  it('rejects GET /api/me/settings without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/me/settings');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects PATCH /api/me/settings without auth (401)', async () => {
    const res = await request(buildApp())
      .patch('/api/me/settings')
      .send({ audioSpeed: 0.75 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  // ---------- Cache-Control discipline (A6 + Task 4) --------------------

  it('returns Cache-Control: no-store for GET /api/me/settings', async () => {
    const res = await request(buildApp()).get('/api/me/settings');
    // requireAuth fails first; the no-store header is set by the
    // cacheControl middleware on the way out (the /api/me/ prefix
    // is in the NO_STORE_PREFIXES list as of Task 4).
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns Cache-Control: no-store for PATCH /api/me/settings', async () => {
    const res = await request(buildApp())
      .patch('/api/me/settings')
      .send({ audioSpeed: 0.75 });
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('Phase B settings router — PATCH validation (pre-DB)', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // Note: the validation gate runs *after* requireAuth. To exercise
  // it without a live session we stub `req.userIdFromAuth()` via a
  // tiny in-line middleware mounted ahead of the router.

  function buildAppWithStubbedUser() {
    const app = express();
    app.use(express.json());
    app.use(originAllowList);
    app.use(cacheControl);
    app.use((req, _res, next) => {
      // Stub the shim output; the router calls req.userIdFromAuth().
      req.userIdFromAuth = () => 'usr_stub';
      next();
    });
    app.use('/api/me/settings', settingsRouter);
    return app;
  }

  it('rejects PATCH with out-of-range audioSpeed (400 validation_failed)', async () => {
    const res = await request(buildAppWithStubbedUser())
      .patch('/api/me/settings')
      .send({ audioSpeed: 5.0 }); // 5.0 is above the 0.5..2.0 bound
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('rejects PATCH with unknown sortOrder (400 validation_failed)', async () => {
    const res = await request(buildAppWithStubbedUser())
      .patch('/api/me/settings')
      .send({ sortOrder: 'random' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('rejects PATCH with unknown textSize (400 validation_failed)', async () => {
    const res = await request(buildAppWithStubbedUser())
      .patch('/api/me/settings')
      .send({ textSize: 'huge' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('accepts an empty PATCH body (no-op) — but DB call fails pre-DB', async () => {
    // Empty patch parses successfully through `partialSettingsSchema`
    // (every column optional) so the controller reaches the
    // repository. Pre-DB the repository throws on missing DB; we
    // only assert the route didn't 400-validate.
    const res = await request(buildAppWithStubbedUser())
      .patch('/api/me/settings')
      .send({});
    expect(res.status).not.toBe(400);
  });
});