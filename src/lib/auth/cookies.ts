/**
 * Read the authenticated Learner ID from the `portuguese-teacher:auth`
 * cookie (set by AuthProvider per issue #133). The cookie value carries
 * the Learner ID only — no PII.
 *
 * Returns `null` for anonymous / expired-cookie / malformed-cookie
 * requests. Used by the SC-5 server-side opt-out gate (issue #105 PR 4)
 * to decide whether the audio buffer is recorded.
 *
 * Lives in `src/lib/auth/cookies.ts` (not the route file) because
 * Next.js route files reject non-{GET,POST,PUT,DELETE,runtime} exports;
 * see PR #83's "Next.js route files only accept specific export fields"
 * decision.
 */
export function readAuthLearnerId(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith("portuguese-teacher:auth=")) continue;
    const value = decodeURIComponent(
      trimmed.slice("portuguese-teacher:auth=".length),
    );
    return value.length > 0 ? value : null;
  }
  return null;
}
