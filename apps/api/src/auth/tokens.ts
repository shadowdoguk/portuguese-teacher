// Auth tokens — ADR-0002.
//
// Phase A generates 32-byte hex tokens at login/refresh time and
// stores only their SHA-256 hashes in `auth_sessions`. The raw
// token never touches the database; a leaked DB never leaks
// valid bearer credentials.
//
// `generateAccessToken` and `generateRefreshToken` produce distinct
// values (caller binds each to its own session column). They share
// the same shape (`rawTokenSchema` — 64-hex) so the schema
// boundary is the same.

import { createHash, randomBytes } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(raw: string): string {
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error('hashToken: input must be a 64-hex raw token');
  }
  return createHash('sha256').update(raw).digest('hex');
}

/** Convenience: same shape as `generateToken()` but named for clarity at call sites. */
export const generateAccessToken = generateToken;
export const generateRefreshToken = generateToken;