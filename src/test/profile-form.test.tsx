import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { ProfileForm } from "@/components/profile/ProfileForm";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProfileForm />
      </SettingsProvider>
    </AuthProvider>
  );
}

function seedUser() {
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
      nativeLanguage: "English",
      selfAssessmentLevel: "A0",
      goals: [],
    }),
  );
}

describe("ProfileForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("pre-fills the form from the authenticated learner", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect((screen.getByLabelText(/Display name/) as HTMLInputElement).value).toBe("Demo");
    });
    expect(screen.getByDisplayValue("English")).toBeInTheDocument();
  });

  it("shows the placement entry-point for above-A0 self-assessment", async () => {
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
        nativeLanguage: "English",
        selfAssessmentLevel: "A2",
        goals: [],
      }),
    );

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Take Placement Lesson/ })).toBeInTheDocument();
    });
  });

  it("does not show the placement entry-point for A0 self-assessment", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Display name/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /Take Placement Lesson/ })).not.toBeInTheDocument();
  });

  it("toggles a goal and saves on submit", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Display name/)).toBeInTheDocument();
    });

    const travel = screen.getByLabelText(/^Travel/);
    fireEvent.click(travel);
    await waitFor(() => {
      expect((travel as HTMLInputElement).checked).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Save profile/ }));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
      expect(stored.goals).toContain("travel");
    });
  });

  it("lets the learner skip to a different starting Unit", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Jump straight to a Unit/)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const rotinaButton = buttons.find((button) =>
      button.textContent?.includes("Rotina"),
    );
    expect(rotinaButton).toBeDefined();
    fireEvent.click(rotinaButton!);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
      expect(stored.currentUnitId).toBe("a0-4-rotina-e-horas");
    });
  });
});
