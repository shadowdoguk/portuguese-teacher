// @pt/api env — single source of truth for runtime configuration.
//
// Loaded at boot time. Every required variable is read here so the
// auth/middleware modules can import typed constants rather than
// reaching into `process.env` directly.
//
// amendment Task A4 step: AUTH_ALLOWED_ORIGINS is required at boot
// and is parsed into a `ReadonlySet<string>` for O(1) Origin checks.
//
// Phase B Task 3 lazy-init: the original implementation read env
// vars at module-load time and threw on missing values. That broke
// the pre-DB test surface (any test that imports Express middleware
// transitively imports `./env.js`). The fix wraps each required
// value in a lazy getter so the throw fires on first read rather
// than on import. Production semantics are unchanged — every
// production code path that actually uses `DATABASE_URL` or
// `authAllowedOrigins` still throws on missing env, just at the
// call site rather than at boot.

let _databaseUrl: string | undefined;
export function getDatabaseUrl(): string {
  if (_databaseUrl === undefined) {
    const value = process.env.DATABASE_URL;
    if (!value) {
      throw new Error(
        'DATABASE_URL is required (e.g. postgres://user:pass@localhost:5432/portuguese_teacher)',
      );
    }
    _databaseUrl = value;
  }
  return _databaseUrl;
}

/**
 * Backward-compat: `DATABASE_URL` used to be a module-level const.
 * Phase A callers read it as `import { DATABASE_URL } from './env.js'`.
 * The Proxy below makes the namespace export forward reads to the
 * lazy getter so existing `DATABASE_URL` references keep working.
 */
export const DATABASE_URL: string = new Proxy(
  {} as string,
  {
    get(): string {
      return getDatabaseUrl();
    },
  },
);

let _authAllowedOrigins: ReadonlySet<string> | undefined;
export function getAuthAllowedOrigins(): ReadonlySet<string> {
  if (_authAllowedOrigins === undefined) {
    const raw = process.env.AUTH_ALLOWED_ORIGINS ?? '';
    if (raw === '') {
      throw new Error(
        'AUTH_ALLOWED_ORIGINS is required (comma-separated origins, e.g. http://localhost:5173)',
      );
    }
    _authAllowedOrigins = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return _authAllowedOrigins;
}

/** Backward-compat alias — see `DATABASE_URL` Proxy note above. */
export const authAllowedOrigins: ReadonlySet<string> = new Proxy(
  new Set<string>(),
  {
    get(_target, prop): unknown {
      const set = getAuthAllowedOrigins();
      // Reflect the Set's API: has, size, iteration.
      const value = (set as unknown as Record<string | symbol, unknown>)[prop as string];
      if (typeof value === 'function') return value.bind(set);
      return value;
    },
  },
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
