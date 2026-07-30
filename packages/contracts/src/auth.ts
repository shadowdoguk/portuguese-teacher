// Auth schemas — shared by @pt/api and @pt/web.
//
// Pins the opaque-token + HttpOnly-cookie + Android-bearer transport
// codified by ADR-0002. The web cookie path is the only transport in
// Phase A; Phase C adds the Android bearer path with the same opaque
// tokens stored under @aparajita/capacitor-secure-storage and selected
// through the X-Client-Platform header.
//
// Argon2id parameter triple is locked here so the web form (Phase A)
// and the Android form (Phase C) validate against the same constants.

import { z } from 'zod';

// ---------- Argon2id parameters (ADR-0002) -------------------------------

export const argon2ParamsSchema = z.object({
  memoryCost: z.literal(19456),
  timeCost: z.literal(2),
  parallelism: z.literal(1),
});

export type Argon2Params = z.infer<typeof argon2ParamsSchema>;

/** Single source of truth — every caller (web, Android, future) reads from this. */
export const argon2Params: Argon2Params = Object.freeze({
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

// ---------- Token shape --------------------------------------------------

/** Raw token (32-byte hex). NEVER persisted; only its SHA-256 hash is. */
export const rawTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** SHA-256 hex hash of the raw token — the only form the DB ever sees. */
export const tokenHashSchema = z.string().regex(/^[0-9a-f]{64}$/);

// ---------- Auth session (DB row) ---------------------------------------

/** `sess_<uuid>` session ID. */
export const authSessionIdSchema = z.string().regex(/^sess_[0-9a-f-]{36}$/);

/** `usr_<hex>` user ID. */
export const userIdSchema = z.string().regex(/^usr_[0-9a-f]+$/);

export const authSessionSchema = z.object({
  sessionId: authSessionIdSchema,
  userId: userIdSchema,
  /** SHA-256 hex of the access token. */
  accessTokenHash: tokenHashSchema,
  /** SHA-256 hex of the refresh token. */
  refreshTokenHash: tokenHashSchema,
  /** ISO-8601 access-token expiry. */
  accessExpiresAt: z.string().datetime(),
  /** ISO-8601 refresh-token expiry. */
  refreshExpiresAt: z.string().datetime(),
  /** ISO-8601; null until revocation. */
  revokedAt: z.string().datetime().nullable(),
  /** ISO-8601; null until reuse-as-compromise flips it. */
  rotatedAt: z.string().datetime().nullable(),
  /** ISO-8601. */
  createdAt: z.string().datetime(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

// ---------- Cookies -----------------------------------------------------

export const cookieNameSchema = z.enum(['ptp_access', 'ptp_refresh']);
export type CookieName = z.infer<typeof cookieNameSchema>;

export const authCookieAttributesSchema = z.object({
  httpOnly: z.literal(true),
  sameSite: z.enum(['Lax', 'Strict', 'None']),
  secure: z.boolean(),
  path: z.literal('/'),
  name: cookieNameSchema,
  /** TTL in seconds — 900 for access, 2_592_000 for refresh. */
  maxAgeSeconds: z.number().int().positive(),
});

export type AuthCookieAttributes = z.infer<typeof authCookieAttributesSchema>;

export const authCookiePairSchema = z.object({
  access: authCookieAttributesSchema.extend({ maxAgeSeconds: z.literal(900) }),
  refresh: authCookieAttributesSchema.extend({ maxAgeSeconds: z.literal(2592000) }),
});

export type AuthCookiePair = z.infer<typeof authCookiePairSchema>;

// ---------- Client platform dispatch (Phase C Android bearer transport) --

/** Drives the cookie-vs-bearer response shape on `POST /api/auth/login`. */
export const clientPlatformSchema = z.enum(['web', 'android']);
export type ClientPlatform = z.infer<typeof clientPlatformSchema>;

// ---------- Login --------------------------------------------------------

/** `POST /api/auth/login` body — web + Android use the same shape. */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  /** Optional. Drives cookie-vs-bearer response shape (Phase C). */
  clientPlatform: clientPlatformSchema.default('web'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Web response — cookies set, body excludes raw tokens. */
export const loginWebResponseSchema = z.object({
  user: z.object({
    userId: userIdSchema,
    email: z.string().email(),
  }),
  /** ISO-8601 — the API returns `auth_sessions.access_expires_at`, not `Date.now()+TTL`. */
  accessExpiresAt: z.string().datetime(),
});

export type LoginWebResponse = z.infer<typeof loginWebResponseSchema>;

/** Android response — bearer tokens returned in JSON body for the client
 *  to move into @aparajita/capacitor-secure-storage. The server still
 *  sets a non-HttpOnly `ptp_access` cookie as a warm-up; the canonical
 *  credentials are the JSON body. */
export const loginAndroidResponseSchema = z.object({
  accessToken: rawTokenSchema,
  refreshToken: rawTokenSchema,
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
});

export type LoginAndroidResponse = z.infer<typeof loginAndroidResponseSchema>;

/** Discriminated union — `clientPlatform` selects which variant. */
export const loginResponseSchema = z.discriminatedUnion('clientPlatform', [
  loginWebResponseSchema.extend({ clientPlatform: z.literal('web') }),
  loginAndroidResponseSchema.extend({ clientPlatform: z.literal('android') }),
]);

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ---------- Refresh -----------------------------------------------------

/** `POST /api/auth/refresh` body. Cookie path reads `ptp_refresh`; Android reads `Authorization`. */
export const refreshRequestSchema = z.object({
  /** Required only on Android — web reads the cookie. */
  refreshToken: rawTokenSchema.optional(),
  clientPlatform: clientPlatformSchema.default('web'),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const refreshResponseSchema = z.discriminatedUnion('clientPlatform', [
  z.object({
    clientPlatform: z.literal('web'),
    accessExpiresAt: z.string().datetime(),
  }),
  z.object({
    clientPlatform: z.literal('android'),
    accessToken: rawTokenSchema,
    refreshToken: rawTokenSchema,
    accessExpiresAt: z.string().datetime(),
    refreshExpiresAt: z.string().datetime(),
  }),
]);

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

// ---------- Logout (ADR-0002 §3 — current session only) -----------------

export const logoutResponseSchema = z.object({
  revoked: z.literal(true),
  sessionId: authSessionIdSchema,
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ---------- Session probe ----------------------------------------------

/** `GET /api/auth/session` — Phase A ships this so the SPA can refresh on focus. */
export const sessionProbeResponseSchema = z.object({
  userId: userIdSchema,
  email: z.string().email(),
  accessExpiresAt: z.string().datetime(),
});

export type SessionProbeResponse = z.infer<typeof sessionProbeResponseSchema>;
