export const DEFAULT_POST_SIGN_IN_PATH = "/dashboard";

/**
 * Validate and normalise the `?next=` query param the edge middleware
 * (`src/middleware.ts`) writes to `/log-in` when redirecting unauthenticated
 * users from a protected route.
 *
 * Rules (per issue #110):
 * - Empty / null → DEFAULT_POST_SIGN_IN_PATH
 * - Must start with "/" (internal path)
 * - Must NOT start with "//" (protocol-relative — open-redirect)
 * - Must NOT start with "/\" (Windows-style — open-redirect on some browsers)
 * - Must NOT contain a colon before the first slash (e.g. `"/\\example.com"`)
 *   (defence-in-depth against URL-parser quirks)
 *
 * Anything else falls back to DEFAULT_POST_SIGN_IN_PATH.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_POST_SIGN_IN_PATH;
  if (!raw.startsWith("/")) return DEFAULT_POST_SIGN_IN_PATH;
  if (raw.startsWith("//")) return DEFAULT_POST_SIGN_IN_PATH;
  if (raw.startsWith("/\\")) return DEFAULT_POST_SIGN_IN_PATH;
  // Pathological: a colon before the first slash hints at a URL scheme ("/javascript:...")
  // — reject anything with a colon in the first segment.
  const firstSegment = raw.split("/")[1] ?? "";
  if (firstSegment.includes(":")) return DEFAULT_POST_SIGN_IN_PATH;
  return raw;
}