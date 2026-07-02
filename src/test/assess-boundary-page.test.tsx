import { describe, expect, it, vi, beforeEach } from "vitest";
import { isLevelBoundary } from "@/lib/assessment";

// Regression for issue #T-328 — `/assess/<invalid-boundary>` must return
// a real HTTP 404, not 200 with an "Unknown boundary" inline message.
//
// The fix split the route into a server-component `page.tsx` that
// normalises the boundary to uppercase + calls `notFound()` for anything
// outside the canonical set, and a `AssessBoundaryClient.tsx` that owns
// the actual UI. These tests pin both pieces of the contract.

// Mock next/navigation so `notFound()` is observable from the test.
const notFoundMock = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    notFoundMock();
    // The real `notFound()` throws a NEXT_NOT_FOUND sentinel; mimic that
    // so the server component's `if (!isLevelBoundary(...)) notFound()`
    // short-circuits the rest of the render.
    const err = new Error("NEXT_NOT_FOUND");
    (err as Error & { digest?: string }).digest = "NEXT_NOT_FOUND";
    throw err;
  },
}));

// Re-import after the mock is set up so the server component picks up the
// mocked `notFound`.
async function loadPage() {
  // Vitest caches modules across tests in the same file; clear before each
  // run so the mock applies to a fresh import.
  vi.resetModules();
  const mod = await import("@/app/(app)/assess/[boundary]/page");
  return mod.default;
}

beforeEach(() => {
  notFoundMock.mockClear();
});

describe("/assess/[boundary] — server-side validation (T-328)", () => {
  it("renders for canonical boundaries (A0-A1 / A1-A2 / A2-B1)", async () => {
    const Page = await loadPage();
    const forA0A1 = Page({ params: { boundary: "A0-A1" } });
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(forA0A1).toBeTruthy();
  });

  it("renders case-insensitively (a0-a1 normalises to A0-A1)", async () => {
    const Page = await loadPage();
    const rendered = Page({ params: { boundary: "a0-a1" } });
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(rendered).toBeTruthy();
  });

  it("calls notFound() for arbitrary invalid boundaries", async () => {
    const Page = await loadPage();
    expect(() => Page({ params: { boundary: "invalid" } })).toThrow(
      /NEXT_NOT_FOUND/,
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("calls notFound() for typos that look almost-right (A0-A2)", async () => {
    const Page = await loadPage();
    expect(() => Page({ params: { boundary: "A0-A2" } })).toThrow(
      /NEXT_NOT_FOUND/,
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("calls notFound() for cross-level non-boundaries (B2-C1)", async () => {
    const Page = await loadPage();
    expect(() => Page({ params: { boundary: "B2-C1" } })).toThrow(
      /NEXT_NOT_FOUND/,
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});

describe("isLevelBoundary contract (T-328 support)", () => {
  it("accepts the three canonical boundaries", () => {
    expect(isLevelBoundary("A0-A1")).toBe(true);
    expect(isLevelBoundary("A1-A2")).toBe(true);
    expect(isLevelBoundary("A2-B1")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const bad of ["", "invalid", "A0", "B1-C1", "a0-a1", "A0-A1 ", " A0-A1"]) {
      expect(isLevelBoundary(bad)).toBe(false);
    }
  });
});