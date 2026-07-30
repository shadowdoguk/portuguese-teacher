// Tests for the practice router — pre-DB surface.
//
// Exercises validation, the requireAuth gate, and the cacheControl
// no-store prefix (A6) on practice mutations. The DB-backed
// integration tests (queue ordering, idempotent rating writes,
// smart-review queue ordering, progress aggregation) live with the
// test DB in Task 8/9.

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { originAllowList } from '../../../middleware/origin.js';
import { cacheControl } from '../../../middleware/cache.js';
import { requireAuth } from '../../../middleware/requireAuth.js';
import practiceRouter from '../router.js';
import { userIdFromAuthShim } from '../../../index.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(originAllowList);
  app.use(cacheControl);
  app.use('/api/practice', requireAuth, userIdFromAuthShim, practiceRouter);
  return app;
}

describe('practice router — pre-DB surface', () => {
  beforeAll(() => {
    process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  it('rejects POST /api/practice/ratings without auth (401)', async () => {
    const res = await request(buildApp())
      .post('/api/practice/ratings')
      .send({ clientMutationId: '00000000-0000-4000-8000-000000000000', sentenceId: 'sen_ola', mode: 'shadow', rating: 4 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/practice/queue without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/practice/queue?mode=shadow');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects GET /api/practice/review without auth (401)', async () => {
    const res = await request(buildApp()).get('/api/practice/review?mode=shadow');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects POST /api/practice/events without auth (401)', async () => {
    const res = await request(buildApp()).post('/api/practice/events').send({});
    expect(res.status).toBe(401);
  });

  it('returns Cache-Control: no-store for practice mutations (A6)', async () => {
    const res = await request(buildApp())
      .post('/api/practice/ratings')
      .send({ clientMutationId: '00000000-0000-4000-8000-000000000000', sentenceId: 'sen_ola', mode: 'shadow', rating: 4 });
    // requireAuth fails first; the no-store header is set before
    // the 401, so it's present on the response.
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns Cache-Control: no-store for queue GETs (A6: prefix match)', async () => {
    const res = await request(buildApp()).get('/api/practice/queue?mode=shadow');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});