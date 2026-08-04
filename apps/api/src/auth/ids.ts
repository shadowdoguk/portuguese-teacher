// Server-side id generators. Pure functions, no state.
//
// `createId(length)` produces a hex string of the requested length
// from `crypto.randomBytes`. Used by `auth/repo.ts` to mint `usr_<hex>`
// and `sess_<uuid>` ids at insert time.

import { randomBytes } from 'node:crypto';

export function createId(hexLength: number): string {
  if (!Number.isInteger(hexLength) || hexLength <= 0) {
    throw new Error(`createId: hexLength must be a positive integer; got ${String(hexLength)}`);
  }
  // hexLength hex chars = hexLength/2 bytes (rounded up to even byte count).
  const byteLength = Math.ceil(hexLength / 2);
  return randomBytes(byteLength).toString('hex').slice(0, hexLength);
}

/** Canonical UUID v4 hex with dashes. */
export function uuidV4(): string {
  const bytes = randomBytes(16);
  // Per RFC 4122 §4.4: set version (4) and variant (10xx).
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}