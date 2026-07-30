// Auth cookies — ADR-0002 §2.
//
// Two cookies per session:
//   ptp_access  — 15-minute bearer; HttpOnly + SameSite=Lax + Secure (prod)
//   ptp_refresh — 30-day opaque rotation token; same flags
//
// The cookies are set by the auth router on login / refresh and
// cleared on logout. The middleware that reads them (`requireAuth`)
// accepts the cookie OR a Bearer token (Phase C Android path,
// selected by the X-Client-Platform header per ADR-0002 §3).

import type { Response } from 'express';
import { authCookieSecure } from '../env.js';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export function setAccessCookie(res: Response, rawToken: string): void {
  res.cookie('ptp_access', rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: authCookieSecure,
    path: '/',
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
}

export function setRefreshCookie(res: Response, rawToken: string): void {
  res.cookie('ptp_refresh', rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: authCookieSecure,
    path: '/',
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('ptp_access', { path: '/' });
  res.clearCookie('ptp_refresh', { path: '/' });
}

/** Read a cookie from the parsed `req.cookies` map (cookie-parser must be mounted). */
export function readCookie(req: { cookies?: Record<string, string | undefined> }, name: 'ptp_access' | 'ptp_refresh'): string | undefined {
  return req.cookies?.[name];
}

export const ACCESS_TTL = ACCESS_TTL_SECONDS;
export const REFRESH_TTL = REFRESH_TTL_SECONDS;