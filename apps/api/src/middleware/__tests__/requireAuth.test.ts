// Tests for requireAuth middleware — cookie-vs-bearer resolution
// per ADR-0002 §3.
//
// The middleware selects the credential transport by
// X-Client-Platform: 'web' reads the ptp_access cookie; 'android'
// reads the Authorization: Bearer header. The 'web' path also
// accepts Authorization if both are sent (the header wins, so the
// caller can override).

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth } from '../requireAuth.js';

// We need a valid 64-hex raw token + its sha256 hash. The test
// only exercises the auth middleware path, so we stub the
// findSessionByAccessToken call indirectly by hitting a route that
// the middleware guards and reading the 401 envelope.

function buildApp() {
  const app = express();
  app.get('/api/secure', requireAuth, (req, res) => {
    res.status(200).json({
      userId: (res.locals.auth as { userId: string }).userId,
      sessionId: (res.locals.auth as { sessionId: string }).sessionId,
    });
  });
  return app;
}

describe('requireAuth (ADR-0002 §3)', () => {
  it('returns 401 unauthorized when no cookie or bearer is sent', async () => {
    const res = await request(buildApp()).get('/api/secure');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
    expect(res.body.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns 401 when X-Client-Platform is android but no Authorization header', async () => {
    const res = await request(buildApp()).get('/api/secure').set('X-Client-Platform', 'android');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('returns 401 when X-Client-Platform is web but no cookie', async () => {
    const res = await request(buildApp()).get('/api/secure').set('X-Client-Platform', 'web');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('returns 401 when Authorization is set on android but malformed', async () => {
    const res = await request(buildApp())
      .get('/api/secure')
      .set('X-Client-Platform', 'android')
      .set('Authorization', 'NotBearer abc');
    expect(res.status).toBe(401);
  });
});