// requireAuth — ADR-0002 §3 cookie-vs-bearer resolution.
//
// The auth model picks the credential transport based on the
// X-Client-Platform header (set by the SPA / Android client):
//
//   web     — read `ptp_access` cookie only; ignore Authorization.
//   android — read Authorization: Bearer <token>; ignore cookies.
//   (default) — accept either, preferring the Authorization header
//               when present.
//
// The middleware returns 401 unauthorized with the canonical
// error envelope on failure. On success, it attaches the session
// row and the user id to `res.locals` for downstream handlers.

import type { Request, Response, NextFunction } from 'express';
import { clientPlatformSchema, type ClientPlatform } from '@pt/contracts';
import { findSessionByAccessToken } from '../auth/repo.js';
import { readCookie } from '../auth/cookies.js';
import { errorEnvelopeSchema } from '@pt/contracts';
import { randomUUID } from 'node:crypto';

export interface AuthedLocals {
  userId: string;
  sessionId: string;
  clientPlatform: ClientPlatform;
}

// `@types/express-serve-static-core` v5 exports `Locals` as an
// empty interface (`export interface Locals extends Express.Locals {}`)
// and `Response.locals` is typed as `LocalsObj & Locals`. The
// module-augmentation contract requires the augmented field to be
// a strict subtype of the declared shape; we extend `Locals`
// directly so the augmentation merges with the upstream interface.
// Our `auth?: AuthedLocals` field is declared as optional so it
// doesn't conflict with the `LocalsObj` indexable side.
declare module 'express-serve-static-core' {
  interface Locals {
    auth?: AuthedLocals;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const platformHeader = req.headers['x-client-platform'];
  const platform: ClientPlatform = clientPlatformSchema.safeParse(platformHeader).success
    ? (platformHeader as ClientPlatform)
    : 'web';

  let rawToken: string | undefined;
  if (platform === 'android') {
    const authz = req.headers.authorization;
    if (typeof authz === 'string' && authz.startsWith('Bearer ')) {
      rawToken = authz.slice('Bearer '.length).trim();
    }
  } else {
    rawToken = readCookie(req, 'ptp_access');
    // Authorization header still wins if the caller sent both.
    const authz = req.headers.authorization;
    if (typeof authz === 'string' && authz.startsWith('Bearer ')) {
      rawToken = authz.slice('Bearer '.length).trim();
    }
  }

  if (!rawToken) {
    sendUnauthorized(res);
    return;
  }

  const session = await findSessionByAccessToken(rawToken);
  if (!session || session.revokedAt !== null || session.accessExpiresAt.getTime() <= Date.now()) {
    sendUnauthorized(res);
    return;
  }

  res.locals.auth = {
    userId: session.userId,
    sessionId: session.sessionId,
    clientPlatform: platform,
  };
  next();
}

function sendUnauthorized(res: Response): void {
  const envelope = errorEnvelopeSchema.parse({
    error: {
      code: 'unauthorized',
      message: 'Authentication required',
      correlationId: randomUUID(),
    },
  });
  res.status(401).json(envelope);
}