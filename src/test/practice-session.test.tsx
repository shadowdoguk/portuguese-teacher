import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { SettingsProvider } from "@/lib/settings/SettingsProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { clearLearner, seedLearner } from "./auth-helpers";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  clearLearner();
});

describe("PracticeSession — useLearnerId (#105 PR 1)", () => {
  // PracticeSession's `handleGrade` is currently dead code (no UI affordance
  // invokes it — see src/components/practice/PracticeSession.tsx:188). The
  // fix in this PR replaces the hard-coded `"demo-learner"` literal at L197
  // with the `learnerId` hook value; when the grade UI is wired up in a
  // future PR, the right id will flow through automatically. Task 7's
  // `grep` covers the static guarantee that the literal is gone.
  it("renders without throwing when an authenticated Learner is signed in", () => {
    seedLearner({ id: "practice-learner-7" });
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    expect(() =>
      render(
        <AuthProvider>
          <SettingsProvider>
            <PracticeSession />
          </SettingsProvider>
        </AuthProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("practice-session")).toBeInTheDocument();
  });
});
