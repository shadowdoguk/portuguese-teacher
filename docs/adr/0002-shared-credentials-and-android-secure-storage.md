# Auth & session model, and Android bearer transport

The Phase A foundation uses Argon2id password hashing, opaque 32-byte
hex tokens persisted only as SHA-256 hashes, and two HttpOnly
SameSite=Lax cookies (`ptp_access` 15 min TTL, `ptp_refresh` 30 d
TTL). Phase C extends this to Android via a bearer-token transport on
the same opaque tokens, secured by `@aparajita/capacitor-secure-storage`.
Three interlocking decisions shape the security posture:

## Decisions

**1. CSRF defense is server-side Origin/Referer allow-listing.**
Every state-changing `/api/auth/*` route rejects requests whose
`Origin` header is not on the `AUTH_ALLOWED_ORIGINS` allow-list with
`403 csrf_origin_denied`. `SameSite=Lax` cookies are the second line
of defense. There is no double-submit CSRF token; that contract
simplifies the SPA (no extra header round-trip) and works without
requiring the Android client to manage a parallel CSRF cookie.

**2. Refresh reuse is treated as compromise.** Inside one Drizzle
transaction the API invalidates every `auth_sessions` row for the
affected `user_id` (`revoked_at = now()`), records a
`refresh_reuse_compromise` audit event, and responds
`401 refresh_reused`. The user re-authenticates on every device.
This is the OWASP-aligned posture: it accepts the cost of a one-off
sign-out in exchange for catching both token theft and accidental
paste-leak.

**3. Logout scope is the current session only.**
`POST /api/auth/logout` revokes the `auth_sessions.id` of the
caller, not every session of that `user_id`. A future
"sign out everywhere" route is out of v1 scope and requires a
separate brainstorm.

## Android bearer transport (Phase C)

The HttpOnly cookie transport is unreliable inside a Capacitor
WebView (cookie storage and SameSite behaviour differ by OS
version). Phase C therefore introduces a second transport: the same
opaque tokens, sent as `Authorization: Bearer <token>` headers,
stored with `@aparajita/capacitor-secure-storage` for the refresh
token and in memory only for the short-lived access token.

The API exposes both transports through the same handler set:

- `POST /api/auth/login` — when the client sends `X-Client-Platform: web`,
  the response sets the two cookies and the body excludes raw tokens.
  When the client sends `X-Client-Platform: android`, the response
  sets only `ptp_access` as a non-HttpOnly, non-Secure, SameSite=None
  debug cookie (used as a warm-up) — the **canonical** Android
  credentials are the bearer tokens returned in the JSON body
  `{ accessToken, refreshToken, accessExpiresAt, refreshExpiresAt }`,
  and the Android client immediately moves them into secure storage
  and discards the cookie.
- Every other `/api/auth/*` and `/api/*` route accepts either
  transport: cookies for web, `Authorization: Bearer <token>` for
  Android. `requireAuth()` abstracts the resolution.

TTS provider credentials, database URLs, and the
`AUTH_ALLOWED_ORIGINS` allow-list are environment-pinned; Android
clients include their bundle id in the Origin allow-list when
making direct API calls.

## Consequences

- **CSRF is asymmetric.** Web benefits from `SameSite=Lax` even if
  the origin check misfires; Android is unaffected by browser CSRF
  protections and relies entirely on Origin allow-listing plus
  bearer-storage hygiene.
- **Compromise recovery is loud.** A leaked refresh token always
  forces a full sign-out. There is no quiet "we noticed but kept
  you signed in" path.
- **Logout does not sign out other devices.** Users wanting global
  revocation must wait for the v2 feature or have an admin issue
  one (out of v1 scope; admins don't exist in v1 anyway).
- **Android storage is the source of truth on Android.** A
  factory-reset Android phone that did not back up secure storage
  cannot recover its session; the user re-authenticates with the
  password. Secure-storage backups are the OS vendor's problem.
