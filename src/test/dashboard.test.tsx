import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <DashboardClient />
      </SettingsProvider>
    </AuthProvider>
  );
}

function seedUser(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({
      id: "demo-learner-001",
      name: "Ana Demo",
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

describe("DashboardClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the sign-in CTA when not authenticated", () => {
    render(<Harness />);
    expect(screen.getByText(/Sign in to see your plan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Log in/ })).toBeInTheDocument();
  });

  it("renders the learner's name and level when authenticated", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Bom dia, Ana\./)).toBeInTheDocument();
    });
    expect(screen.getByText(/Saying where you/)).toBeInTheDocument();
    expect(screen.getByText(/Stage/)).toBeInTheDocument();
    expect(screen.getByText(/A0 · First words/)).toBeInTheDocument();
  });

  it("shows the weekly-goal progress bar", async () => {
    seedUser({ weeklyMinutes: 60, streakDays: 4 });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Weekly goal/)).toBeInTheDocument();
    });
    const pctText = screen.getByText(/\d+% of this week/);
    expect(pctText.textContent).toBeTruthy();
  });

  it("shows a different next lesson for higher levels", async () => {
    seedUser({ level: "A2" });
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Telling a story in the past/)).toBeInTheDocument();
    });
  });
});
