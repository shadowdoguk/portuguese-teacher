import { NextResponse, type NextRequest } from "next/server";

// Auth-gate middleware (issue #T-022, #T-302, #T-456).
//
// The v1 auth model is localStorage-only — there's no server-side session.
// To make protected routes return a server-side redirect (rather than
// render the logged-out state via the client-side gate in `useAuth()`),
// `AuthProvider` mirrors the user ID into a short-lived cookie that the
// middleware can read at the edge. The cookie carries no sensitive data —
// just enough to gate the redirect. Sign-out clears the cookie alongside
// localStorage.
//
// Routes under `(app)/` are gated. Public surfaces — `/`, `/sign-up`,
// `/log-in`, `/accessibility`, `/dashboards/voice-loop-latency`, and the
// `/api/*` JSON surface — are left alone.

const AUTH_COOKIE = "portuguese-teacher:auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/review",
  "/progress",
  "/practice",
  "/settings",
  "/profile",
  "/placement",
  "/confidence",
  "/assess",
  "/lesson",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }
  const auth = request.cookies.get(AUTH_COOKIE)?.value;
  if (auth) {
    return NextResponse.next();
  }
  const redirectTarget = new URL("/log-in", request.url);
  // Preserve the original path + query so the post-login page can return
  // the learner to where they tried to go. The `/log-in` page reads this
  // back from the `next` query param.
  redirectTarget.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(redirectTarget);
}

export const config = {
  // Run on every request except Next.js internals + static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/).*)",
  ],
};