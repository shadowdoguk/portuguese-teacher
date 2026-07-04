// Pins the AuthProvider ↔ middleware cookie contract.
//
// The middleware (src/middleware.ts, PR #118) gates protected routes on
// the `portuguese-teacher:auth` cookie. On main, AuthProvider only writes
// localStorage (`portuguese-teacher:user`); without this fix, every authed
// user would be redirected to /log-in on the next page load.
//
// This test pins:
//   1. signIn → cookie `portuguese-teacher:auth=<learner.id>` is set
//   2. signOut → cookie is cleared
//   3. The cookie value is the Learner ID, not the full user blob
//   4. Cookie attributes include Max-Age + Path=/ + SameSite=Lax
//
// Issue #133.
import { beforeEach, describe, expect, it } from "vitest";
import { render, act } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { useAuth } from "@/lib/auth/useAuth";

function Harness({ onReady }: { onReady?: (api: ReturnType<typeof useAuth>) => void }) {
  return (
    <AuthProvider>
      <Probe onReady={onReady} />
    </AuthProvider>
  );
}

function Probe({ onReady }: { onReady?: (api: ReturnType<typeof useAuth>) => void }) {
  const api = useAuth();
  if (onReady) onReady(api);
  return null;
}

// jsdom strips Path / Max-Age / SameSite from document.cookie. Capture the
// raw setter calls instead so we can pin the cookie attributes verbatim.
const cookieWrites: string[] = [];
const originalDescriptor = Object.getOwnPropertyDescriptor(
  // jsdom's Document prototype — `document` itself doesn't expose it
  // but the prototype does.
  (globalThis as unknown as { Document: { prototype: Document } }).Document.prototype,
  "cookie",
);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]!) : null;
}

function clearAuthCookie() {
  cookieWrites.length = 0;
  document.cookie = "portuguese-teacher:auth=; Max-Age=0; Path=/";
}

beforeEach(() => {
  window.localStorage.clear();
  cookieWrites.length = 0;
  clearAuthCookie();
});

describe("AuthProvider — portuguese-teacher:auth cookie (issue #133)", () => {
  it("writes the cookie when signIn resolves", async () => {
    let api: ReturnType<typeof useAuth> | null = null;
    render(<Harness onReady={(a) => (api = a)} />);

    expect(readCookie("portuguese-teacher:auth")).toBeNull();

    await act(async () => {
      await api!.signIn("qa@example.com", "password-123");
    });

    const cookie = readCookie("portuguese-teacher:auth");
    expect(cookie, "cookie must be set after signIn").not.toBeNull();
    // Mock-mode returns a deterministic ID — match against the actual user.
    expect(cookie).toBe(api!.user!.id);
  });

  it("writes the cookie when signUp resolves", async () => {
    let api: ReturnType<typeof useAuth> | null = null;
    render(<Harness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api!.signUp({
        name: "QA Tester",
        email: "qa@example.com",
        password: "password-123",
        selfAssessmentLevel: "A0",
      });
    });

    expect(readCookie("portuguese-teacher:auth")).toBe(api!.user!.id);
  });

  it("clears the cookie on signOut", async () => {
    window.localStorage.setItem(
      "portuguese-teacher:user",
      JSON.stringify({
        id: "learner-test-001",
        name: "QA Tester",
        email: "qa@example.com",
        dialect: "pt-PT",
        level: "A0",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    let api: ReturnType<typeof useAuth> | null = null;
    render(<Harness onReady={(a) => (api = a)} />);

    expect(api!.user).toBeTruthy();

    await act(async () => {
      await api!.signOut();
    });

    expect(readCookie("portuguese-teacher:auth")).toBeNull();
  });

  it("the cookie value is the Learner ID only (not the full user blob)", async () => {
    let api: ReturnType<typeof useAuth> | null = null;
    render(<Harness onReady={(a) => (api = a)} />);

    await act(async () => {
      await api!.signIn("qa@example.com", "password-123");
    });

    const cookie = readCookie("portuguese-teacher:auth");
    expect(cookie).not.toMatch(/[{}\[\]"]/);
    expect(cookie).not.toContain("qa@example.com");
    expect(cookie).not.toContain("QA Tester");
  });

  it("cookie write carries Path=/ + SameSite=Lax + Max-Age (downstream middleware contract)", async () => {
    // Intercept the cookie setter so we can see the raw attributes.
    // jsdom's Document.prototype.cookie setter drops Path/Max-Age/SameSite
    // from the string it returns, so we spy on the setter itself.
    const proto = (globalThis as unknown as { Document: { prototype: Document } })
      .Document.prototype as unknown as Record<string, unknown>;
    const setter = Object.getOwnPropertyDescriptor(proto, "cookie")?.set;
    if (!setter) {
      throw new Error("jsdom cookie setter not found");
    }
    const writes: string[] = [];
    Object.defineProperty(proto, "cookie", {
      configurable: true,
      get: () => "",
      set: (v: string) => {
        writes.push(v);
        setter.call(document, v);
      },
    });

    try {
      let api: ReturnType<typeof useAuth> | null = null;
      render(<Harness onReady={(a) => (api = a)} />);

      await act(async () => {
        await api!.signIn("qa@example.com", "password-123");
      });

      const write = writes.find((w) => w.startsWith("portuguese-teacher:auth="));
      expect(write, "setter must have been called for the auth cookie").toBeTruthy();
      expect(write!.toLowerCase()).toContain("path=/");
      expect(write!.toLowerCase()).toContain("samesite=lax");
      expect(write!.toLowerCase()).toMatch(/max-age=[1-9]/);
    } finally {
      // Restore the original descriptor
      if (originalDescriptor) {
        Object.defineProperty(proto, "cookie", originalDescriptor);
      }
    }
  });
});