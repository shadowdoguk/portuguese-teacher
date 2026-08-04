import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { ProgressClient } from "@/components/progress/ProgressClient";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProgressClient />
      </SettingsProvider>
    </AuthProvider>
  );
}

function seedUser(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({
      id: "demo-learner-001",
      name: "Ana",
      email: "demo@portugues.app",
      dialect: "pt-PT",
      level: "A0",
      streakDays: 4,
      weeklyMinutes: 95,
      createdAt: "2026-06-01T00:00:00.000Z",
      ...overrides,
    }),
  );
}

describe("ProgressClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the sign-in CTA when not authenticated", () => {
    render(<Harness />);
    expect(screen.getByText(/Sign in to see your progress/)).toBeInTheDocument();
  });

  it("renders four skills and the level ladder", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Per-skill breakdown/)).toBeInTheDocument();
    });
    expect(screen.getByText(/^Reading$/)).toBeInTheDocument();
    expect(screen.getByText(/^Listening$/)).toBeInTheDocument();
    expect(screen.getByText(/^Writing$/)).toBeInTheDocument();
    expect(screen.getByText(/^Speaking$/)).toBeInTheDocument();
    expect(screen.getByText(/Last 14 days/)).toBeInTheDocument();
  });

  it("marks levels below current as passed", async () => {
    seedUser({ level: "A2" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getAllByText(/Passed/).length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
  });

  it("scales mastery values by level", async () => {
    seedUser({ level: "A0" });
    const first = render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/^Reading$/)).toBeInTheDocument();
    });
    expect(screen.getByText("72")).toBeInTheDocument();
    first.unmount();

    window.localStorage.clear();
    seedUser({ level: "B1" });
    render(<Harness />);

    await waitFor(() => {
      // B1 reading is 92, higher than A0's 72.
      expect(screen.getByText("92")).toBeInTheDocument();
    });
  });
});
