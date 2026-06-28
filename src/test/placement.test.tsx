import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import PlacementPage from "@/app/(app)/placement/page";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PlacementPage />
      </SettingsProvider>
    </AuthProvider>
  );
}

function seedUser(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({
      id: "demo-learner-001",
      name: "Demo",
      email: "demo@portugues.app",
      dialect: "pt-PT",
      level: "A0",
      streakDays: 1,
      weeklyMinutes: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
      selfAssessmentLevel: "A0",
      ...overrides,
    }),
  );
}

describe("Placement page", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("asks the learner to sign in if anonymous", () => {
    render(<Harness />);
    expect(screen.getByText(/Sign in to take the Placement Lesson/)).toBeInTheDocument();
  });

  it("skips the placement intro when self-assessment is A0", async () => {
    seedUser({ selfAssessmentLevel: "A0" });
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByText(/No Placement Lesson needed/)).toBeInTheDocument();
    });
  });

  it("runs the placement intro when self-assessment is above A0", async () => {
    seedUser({ selfAssessmentLevel: "A2", level: "A0" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Placement Lesson/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start Placement Lesson/ }));
    expect(screen.getByText(/Adaptive check running/)).toBeInTheDocument();
  });

  it("writes currentUnitId and level on completion", async () => {
    seedUser({ selfAssessmentLevel: "A2", level: "A0" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Placement Lesson/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start Placement Lesson/ }));
    fireEvent.click(screen.getByRole("button", { name: /Accept recommendation/ }));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
      expect(stored.currentUnitId).toBe("a2-unit-1");
      expect(stored.level).toBe("A2");
    });
  });
});
