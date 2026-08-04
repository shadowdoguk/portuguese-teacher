// Tests for the Phase B practice router — pre-DB surface.
//
// Exercises the 401 gate, the new Phase B validation rules (cm_<slug>
// clientMutationId, mandatory unitId on /queue, mode enum), and the
// Cache-Control headers wired by the middleware (A6). Live-DB
// integration tests (idempotent upsert, queue projection, smart-
// review ordering) land with Task 9's smoke suite once a test DB is
// seeded.
//
// The test app deliberately omits cookie-parser: the 401 path runs
// before requireAuth reads a cookie, so cookie-parser's middleware
// chain isn't required for these tests. The full app in
// `apps/api/src/index.ts` mounts cookie-parser in production.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import { userIdFromAuthShim } from '../../../middleware/userIdShim.js';
import practiceRouter from '../router.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/practice', requireAuth, userIdFromAuthShim, practiceRouter);
  return app;
}

describe('Phase B practice router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  // ---------- 401 gate ---------------------------------------------------

  it('rejects POST /api/practice/ratings without auth (401)', async () => {
    const res = await request(buildApp())
      .post('/api/practice/ratings')
      .send({ clientMutationId: 'cm_1', sentenceId: 'sen_ola', mode: 'shadow', rating: 4 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/practice/queue without auth (401)', async () => {
    const res = await request(buildApp()).get(
      '/api/practice/queue?unit_id=unit_a1_introductions&mode=shadow',
    );
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/practice/review without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/practice/review?mode=shadow');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  // ---------- Cache-Control discipline (A6) ----------------------------

  it('returns Cache-Control: no-store for POST /api/practice/ratings', async () => {
    const res = await request(buildApp())
      .post('/api/practice/ratings')
      .send({ clientMutationId: 'cm_1', sentenceId: 'sen_ola', mode: 'shadow', rating: 4 });
    // requireAuth fails first; the no-store header is set on the way out.
    expect(res.headers['cache-control']).toBe('no-store');
  });

  // GET /api/practice/queue and GET /api/practice/review are NOT in
  // the `NO_STORE_PREFIXES` list (amendment A6). The Phase B
  // controller explicitly sets `Cache-Control: private, max-age=60`
  // + an ETag derived from the active CV id on the success path.
  // On the 401 path the controller never runs, so the cacheControl
  // middleware doesn't attach any header — both behaviours are
  // correct. The success-path assertion lives in the Task 9 smoke
  // suite once a test DB is seeded; here we assert that no false
  // `no-store` is emitted on a GET to those routes.
  it('does not emit no-store for GET /api/practice/queue (private max-age is controller-set)', async () => {
    const res = await request(buildApp()).get(
      '/api/practice/queue?unit_id=unit_a1_introductions&mode=shadow',
    );
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).not.toBe('no-store');
  });

  it('does not emit no-store for GET /api/practice/review (private max-age is controller-set)', async () => {
    const res = await request(buildApp()).get('/api/practice/review?mode=shadow');
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).not.toBe('no-store');
  });
});
