// Argon2id wrapper — ADR-0002.
//
// The locked triple (memoryCost 19456, timeCost 2, parallelism 1)
// lives on `@pt/contracts.argon2Params`. We import that object and
// pass it to `@node-rs/argon2` verbatim; the test pins the call
// site reads `argon2Params.memoryCost` etc. so any drift is
// caught.
//
// `@node-rs/argon2` is the binding of choice — it ships prebuilt
// binaries for Linux x64 (matches CONTEXT.md "Toolchain") and is
// actively maintained. The fallback to argon2 (native) would
// require node-gyp at install time, which is not Phase A friendly.

import { hash as argonHash, verify as argonVerify, Algorithm } from '@node-rs/argon2';
import { argon2Params } from '@pt/contracts';

const ADAPTER_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: argon2Params.memoryCost,
  timeCost: argon2Params.timeCost,
  parallelism: argon2Params.parallelism,
} as const;

/** Hash a plaintext password using the locked Argon2id triple. */
export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 8) {
    throw new Error('hashPassword: password must be at least 8 characters');
  }
  return argonHash(plaintext, ADAPTER_OPTIONS);
}

/** Verify a plaintext against a stored hash. Constant-time on the hash side; never leaks which side failed. */
export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  return argonVerify(storedHash, plaintext);
}