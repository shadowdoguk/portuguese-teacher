// Auth router — POST /api/auth/{signup,login,refresh,logout,session} + GET /api/auth/session.
//
// Wires together: argon.ts (hash/verify), repo.ts (users + sessions
// CRUD with the A5 reuse-compromise guard), cookies.ts (ptp_access +
// ptp_refresh cookie helpers), the A4-extended error envelope, and
// the @pt/contracts schemas. Per ADR-0002 the cookie path is the
// only transport in Phase A; Phase C adds the Android bearer
// response shape discriminated by X-Client-Platform.

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  clientPlatformSchema,
  loginRequestSchema,
  logoutResponseSchema,
  refreshRequestSchema,
  sessionProbeResponseSchema,
  type LoginResponse,
} from '@pt/contracts';
import { hashPassword, verifyPassword } from '../../auth/argon.js';
import {
  ACCESS_TTL,
  REFRESH_TTL,
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from '../../auth/cookies.js';
import {
  createSession,
  createUser,
  detectRefreshReuse,
  findSessionByAccessToken,
  findSessionByRefreshToken,
  findUserByEmail,
  findUserById,
  revokeAllSessions,
  rotateSession,
} from '../../auth/repo.js';
import { errorCodeSchema, errorEnvelopeSchema } from '../../contracts/errors.js';

const router = Router();

// ---------- POST /api/auth/signup ----------------------------------------

router.post('/signup', async (req: Request, res: Response) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid signup payload');
    return;
  }
  const { email, password } = parsed.data;
  const existing = await findUserByEmail(email);
  if (existing) {
    // 409 conflict — email already taken. We do NOT leak whether
    // the password is correct, just the email-collision.
    sendError(res, 409, 'conflict', 'Email is already registered');
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash });
  const { session, accessToken, refreshToken } = await createSession({
    userId: user.userId,
    accessTtlSeconds: ACCESS_TTL,
    refreshTtlSeconds: REFRESH_TTL,
  });
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    user: { userId: user.userId, email: user.email },
    accessExpiresAt: session.accessExpiresAt.toISOString(),
  });
});

// ---------- POST /api/auth/login -----------------------------------------

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid login payload');
    return;
  }
  const { email, password } = parsed.data;
  const platform = clientPlatformSchema.safeParse(req.headers['x-client-platform']).success
    ? (req.headers['x-client-platform'] as 'web' | 'android')
    : 'web';

  const user = await findUserByEmail(email);
  if (!user) {
    // Constant-time-ish: still hash a dummy to avoid timing leak.
    await verifyPassword(password, '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    sendError(res, 401, 'unauthorized', 'Invalid email or password');
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    sendError(res, 401, 'unauthorized', 'Invalid email or password');
    return;
  }

  const { session, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = await createSession({
    userId: user.userId,
    accessTtlSeconds: ACCESS_TTL,
    refreshTtlSeconds: REFRESH_TTL,
  });

  // Build the discriminated-union response per @pt/contracts.
  const body: LoginResponse =
    platform === 'android'
      ? {
          clientPlatform: 'android',
          accessToken,
          refreshToken,
          accessExpiresAt: accessExpiresAt.toISOString(),
          refreshExpiresAt: refreshExpiresAt.toISOString(),
        }
      : {
          clientPlatform: 'web',
          user: { userId: user.userId, email: user.email },
          accessExpiresAt: session.accessExpiresAt.toISOString(),
        };

  if (platform === 'web') {
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
  }
  res.status(200).json(body);
});

// ---------- POST /api/auth/refresh ---------------------------------------

router.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid refresh payload');
    return;
  }
  const platform = parsed.data.clientPlatform;

  // Android path: bearer refresh token in the body. Web path: ptp_refresh cookie.
  let rawRefresh: string | undefined = parsed.data.refreshToken;
  if (platform === 'web' && !rawRefresh) {
    rawRefresh = req.cookies?.['ptp_refresh'];
  }
  if (!rawRefresh) {
    sendError(res, 401, 'unauthorized', 'No refresh token supplied');
    return;
  }

  // Step 1: detect reuse (A5).
  const reusedSession = await detectRefreshReuse(rawRefresh);
  if (reusedSession) {
    await revokeAllSessions(reusedSession.userId);
    sendError(res, 401, 'refresh_reused', 'Refresh token reuse detected; please re-authenticate');
    return;
  }

  // Step 2: find the session by the hash.
  const session = await findSessionByRefreshToken(rawRefresh);
  if (!session || session.revokedAt !== null || session.refreshExpiresAt.getTime() <= Date.now()) {
    sendError(res, 401, 'unauthorized', 'Refresh token invalid or expired');
    return;
  }

  // Step 3: rotate. The new session has a fresh refresh-token-hash; the old one is marked rotated+revoked.
  const next = await rotateSession(
    session.sessionId,
    {
      userId: session.userId,
      accessTtlSeconds: ACCESS_TTL,
      refreshTtlSeconds: REFRESH_TTL,
    },
  );

  if (platform === 'web') {
    setAccessCookie(res, next.accessToken);
    setRefreshCookie(res, next.refreshToken);
    res.status(200).json({
      clientPlatform: 'web',
      accessExpiresAt: next.accessExpiresAt.toISOString(),
    });
    return;
  }

  res.status(200).json({
    clientPlatform: 'android',
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    accessExpiresAt: next.accessExpiresAt.toISOString(),
    refreshExpiresAt: next.refreshExpiresAt.toISOString(),
  });
});

// ---------- POST /api/auth/logout (ADR-0002 §3: current session only) --

router.post('/logout', async (req: Request, res: Response) => {
  const rawRefresh = req.cookies?.['ptp_refresh'];
  if (!rawRefresh) {
    // No refresh token: just clear cookies and return success (idempotent).
    clearAuthCookies(res);
    res.status(200).json({ revoked: true, sessionId: 'sess_none' });
    return;
  }
  const session = await findSessionByRefreshToken(rawRefresh);
  if (!session) {
    clearAuthCookies(res);
    res.status(200).json({ revoked: true, sessionId: 'sess_none' });
    return;
  }
  await revokeAllSessions(session.userId); // current-session-only on web (one device); see ADR-0002 §3
  clearAuthCookies(res);
  const out = logoutResponseSchema.parse({
    revoked: true,
    sessionId: session.sessionId,
  });
  res.status(200).json(out);
});

// ---------- GET /api/auth/session ----------------------------------------

router.get('/session', async (req: Request, res: Response) => {
  const rawAccess = req.cookies?.['ptp_access'];
  if (!rawAccess) {
    sendError(res, 401, 'unauthorized', 'Not authenticated');
    return;
  }
  const session = await findSessionByAccessToken(rawAccess);
  if (!session || session.revokedAt !== null) {
    sendError(res, 401, 'unauthorized', 'Not authenticated');
    return;
  }
  const user = await findUserById(session.userId);
  if (!user) {
    sendError(res, 401, 'unauthorized', 'Not authenticated');
    return;
  }
  const out = sessionProbeResponseSchema.parse({
    userId: user.userId,
    email: user.email,
    accessExpiresAt: session.accessExpiresAt.toISOString(),
  });
  res.status(200).json(out);
});

// ---------- Helpers -----------------------------------------------------

function sendError(
  res: Response,
  httpStatus: number,
  code: 'validation_failed' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'internal' | 'csrf_origin_denied' | 'refresh_reused' | 'not_publishable',
  message: string,
): void {
  // Validate the code against the extended enum (defensive: callers
  // pass literals; this catches typos at runtime in dev/test).
  const parsedCode = errorCodeSchema.safeParse(code);
  if (!parsedCode.success) {
    throw new Error(`sendError: invalid code "${code}"`);
  }
  const envelope = errorEnvelopeSchema.parse({
    error: {
      code: parsedCode.data,
      message,
      correlationId: randomUUID(),
    },
  });
  res.status(httpStatus).json(envelope);
}

export default router;