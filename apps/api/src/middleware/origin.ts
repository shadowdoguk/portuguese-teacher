// Origin allow-list middleware (amendment Task A4).
//
// Every state-changing /api/auth/* route receives an Origin check.
// The allow-list comes from AUTH_ALLOWED_ORIGINS at boot; failure
// returns 403 csrf_origin_denied. GET /api/health is exempt.

import type { Request, Response, NextFunction } from 'express';
import { authAllowedOrigins } from '../env.js';

const EXEMPT_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS: ReadonlySet<string> = new Set(['/api/health']);

/**
 * Origin allow-list middleware. Safe to apply globally; only
 * state-changing requests on /api/auth/* are gated. The browser
 * always sends Origin on POST/PUT/PATCH/DELETE; absence is treated
 * as a failure (cross-origin POSTs without Origin are not allowed
 * even from the allow-list).
 */
export function originAllowList(req: Request, res: Response, next: NextFunction): void {
  if (EXEMPT_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }
  // Only gate state-changing requests on auth routes. Other POSTs
  // (e.g. POST /api/practice/ratings) are session-authenticated and
  // don't carry Origin checks here — Phase C adds separate CSRF
  // double-submit for them.
  if (!req.path.startsWith('/api/auth/')) {
    next();
    return;
  }
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !authAllowedOrigins.has(origin)) {
    res.status(403).json({
      error: {
        code: 'csrf_origin_denied',
        message: 'Origin header is missing or not in the allow-list',
        correlationId: req.headers['x-correlation-id'] ?? cryptoCorrelationId(),
      },
    });
    return;
  }
  next();
}

function cryptoCorrelationId(): string {
  // Lazy import to keep this middleware pure at module load.
  // Correlation IDs are also generated at the route layer; this is
  // the fallback path when the upstream header is absent.
  const { randomUUID } = require('node:crypto') as typeof import('node:crypto');
  return randomUUID();
}