import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Regression for issues #T-022, #T-302, #T-456 — protected routes under
// (app)/ must redirect to /log-in when the auth cookie is missing,
// instead of rendering the logged-out client-side state (HTTP 200 with
// "Sign in" CTA). The redirect target preserves the original path + query
// in the `next` search param so /log-in can bounce the learner back.

const PROTECTED = [
  "/dashboard",
  "/review",
  "/progress",
  "/practice",
  "/settings",
  "/profile",
  "/placement",
  "/confidence",
  "/assess/A0-A1",
  "/lesson/a0-1-1",
];

const PUBLIC = [
  "/",
  "/accessibility",
  "/dashboards/voice-loop-latency",
  "/sign-up",
  "/log-in",
  "/log-in?next=/dashboard",
];

const AUTH_COOKIE = "portuguese-teacher:auth";

function makeRequest(path: string, cookie?: string): NextRequest {
  const headers = cookie ? { cookie: `${AUTH_COOKIE}=${cookie}` } : undefined;
  return new NextRequest(`http://localhost${path}`, headers ? { headers } : {});
}

describe("auth middleware (issues T-022 / T-302 / T-456)", () => {
  for (const path of PROTECTED) {
    it(`redirects ${path} to /log-in when the auth cookie is missing`, () => {
      const response = middleware(makeRequest(path));
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toMatch(/^http:\/\/localhost\/log-in\?next=/);
      // The `next` param must round-trip the original path.
      const next = decodeURIComponent(
        new URL(location ?? "").searchParams.get("next") ?? "",
      );
      expect(next).toBe(path);
    });
  }

  it("passes protected routes through when the auth cookie is present", () => {
    const response = middleware(makeRequest("/dashboard", "demo-learner"));
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  for (const path of PUBLIC) {
    it(`does NOT redirect ${path}`, () => {
      const response = middleware(makeRequest(path));
      expect(response.status).not.toBe(307);
      expect(response.headers.get("location")).toBeNull();
    });
  }

  it("preserves query string in the `next` redirect param", () => {
    const response = middleware(makeRequest("/dashboard?foo=bar"));
    const location = response.headers.get("location") ?? "";
    const next = decodeURIComponent(
      new URL(location).searchParams.get("next") ?? "",
    );
    expect(next).toBe("/dashboard?foo=bar");
  });

  it("case-sensitively matches protected prefixes (/Dashboard is NOT protected)", () => {
    // Per RFC 3986 paths are case-sensitive; only the canonical lowercase
    // form is gated. This test pins the matcher contract.
    const response = middleware(makeRequest("/Dashboard"));
    expect(response.status).not.toBe(307);
  });
});