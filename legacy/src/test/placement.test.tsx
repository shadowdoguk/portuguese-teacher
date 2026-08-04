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
import { PLACEMENT_LIMITS } from "@/lib/placement";

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
      placementAttempts: [],
      ...overrides,
    }),
  );
}

async function answerAllCorrect() {
  // Click "Got it right" until the outcome screen shows up.
  // The runner shows items one at a time; the page advances on each click.
  // We press up to PLACEMENT_LIMITS.max + 1 to be safe.
  for (let i = 0; i < PLACEMENT_LIMITS.max + 1; i += 1) {
    const button = screen.queryByRole("button", { name: /Got it right/ });
    if (!button) return;
    fireEvent.click(button);
    // Wait for the next render; phase transitions need at least one tick to flush
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
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
    expect(screen.getByRole("button", { name: /Got it right/ })).toBeInTheDocument();
  });

  it("drives the adaptive runner to the outcome screen and accepts the recommendation", async () => {
    seedUser({ selfAssessmentLevel: "A2", level: "A0" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Placement Lesson/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start Placement Lesson/ }));

    await answerAllCorrect();

    await waitFor(() => {
      expect(screen.getByText(/Recommended starting Unit/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Accept recommendation/ }));

    await waitFor(() => {
      expect(screen.getByText(/Placement complete/)).toBeInTheDocument();
    });

    const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
    expect(stored.currentUnitId).toBeTruthy();
    expect(stored.placementAttempts).toHaveLength(1);
    expect(stored.placementAttempts[0].learnerAccepted).toBe(true);
    expect(stored.placementAttempts[0].selfAssessedLevel).toBe("A2");
  });

  it("lets the learner override the recommendation to a different Unit", async () => {
    seedUser({ selfAssessmentLevel: "A2", level: "A0" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Placement Lesson/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start Placement Lesson/ }));

    await answerAllCorrect();

    await waitFor(() => {
      expect(screen.getByText(/Recommended starting Unit/)).toBeInTheDocument();
    });

    const overrideButtons = screen.queryAllByRole("button", { name: /Pick this/ });
    expect(overrideButtons.length).toBeGreaterThan(0);
    const targetButton = overrideButtons[0]!;
    fireEvent.click(targetButton);

    await waitFor(() => {
      expect(screen.getByText(/Placement complete/)).toBeInTheDocument();
    });

    const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
    expect(stored.placementAttempts).toHaveLength(1);
    expect(stored.placementAttempts[0].learnerAccepted).toBe(false);
  });

  it("retakes the placement when the learner clicks Retake", async () => {
    seedUser({ selfAssessmentLevel: "A2", level: "A0" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Placement Lesson/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start Placement Lesson/ }));
    await answerAllCorrect();

    await waitFor(() => {
      expect(screen.getByText(/Recommended starting Unit/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Retake placement/ }));

    await waitFor(() => {
      expect(screen.getByText(/Confirm your starting Unit/)).toBeInTheDocument();
    });
  });
});