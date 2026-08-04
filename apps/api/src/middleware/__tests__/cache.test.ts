// Tests for cacheControl middleware (amendment Task A6 step 1).
//
// Per A6: GET /api/curriculum/* → Cache-Control: private, max-age=60;
// POST /api/auth/login, POST /api/practice/ratings → Cache-Control:
// no-store.

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { cacheControl } from '../cache.js';

function buildApp() {
  const app = express();
  app.use(cacheControl);
  app.get('/api/curriculum/levels/a1', (_req, res) => res.json({ ok: true }));
  app.post('/api/auth/login', (_req, res) => res.status(204).end());
  app.post('/api/practice/ratings', (_req, res) => res.status(204).end());
  app.post('/api/curriculum/units/unit_a1_introductions', (_req, res) => res.status(204).end());
  return app;
}

describe('cacheControl (amendment Task A6)', () => {
  it('sets private, max-age=60 on curriculum GETs', async () => {
    const res = await request(buildApp()).get('/api/curriculum/levels/a1');
    expect(res.headers['cache-control']).toBe('private, max-age=60');
  });

  it('sets no-store on POST /api/auth/login', async () => {
    const res = await request(buildApp()).post('/api/auth/login');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets no-store on POST /api/practice/ratings', async () => {
    const res = await request(buildApp()).post('/api/practice/ratings');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets no-store on non-GET methods to /api/curriculum/* (writes against learner state)', async () => {
    const res = await request(buildApp()).post('/api/curriculum/units/unit_a1_introductions');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets the ETag placeholder on curriculum GETs (router overrides in Task 8)', async () => {
    const res = await request(buildApp()).get('/api/curriculum/levels/a1');
    expect(res.headers['etag']).toBeDefined();
  });
});