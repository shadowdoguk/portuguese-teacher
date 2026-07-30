// @pt/api env — single source of truth for runtime configuration.
//
// Loaded at boot time. Every required variable is read here so the
// auth/middleware modules can import typed constants rather than
// reaching into `process.env` directly.
//
// amendment Task A4 step: AUTH_ALLOWED_ORIGINS is required at boot
// and is parsed into a `ReadonlySet<string>` for O(1) Origin checks.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required (e.g. postgres://user:pass@localhost:5432/portuguese_teacher)');
}
export const DATABASE_URL: string = databaseUrl;

const authAllowedOriginsRaw = process.env.AUTH_ALLOWED_ORIGINS ?? '';
if (authAllowedOriginsRaw === '') {
  throw new Error('AUTH_ALLOWED_ORIGINS is required (comma-separated origins, e.g. http://localhost:5173)');
}
export const authAllowedOrigins: ReadonlySet<string> = new Set(
  authAllowedOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean),
);

const nodeEnv = process.env.NODE_ENV ?? 'development';
export const NODE_ENV: 'development' | 'production' | 'test' =
  nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development';

export const isProduction: boolean = NODE_ENV === 'production';
export const isTest: boolean = NODE_ENV === 'test';

/**
 * `secure` flag on the auth cookies — `false` in dev, `true` in
 * production. ADR-0002 §2 mandates `Secure` when the API is served
 * over HTTPS; in dev (http://localhost) it must be off or the
 * browser drops the cookie.
 */
export const authCookieSecure: boolean = isProduction;

/**
 * 32-byte hex token generator. Real impl: `crypto.randomBytes(32).toString('hex')`.
 * Stubbed here for tests; the actual generator lives in
 * `apps/api/src/auth/tokens.ts` (Phase 7).
 */
export function _placeholderTokenGen(): string {
  return 'a'.repeat(64);
}