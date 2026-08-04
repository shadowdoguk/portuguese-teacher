import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { SettingsForm } from "@/components/settings/SettingsForm";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SettingsForm />
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
    }),
  );
}

describe("SettingsForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all four cards when signed in", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Playback speed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Corrective feedback timing/)).toBeInTheDocument();
    expect(screen.getByText(/Captions, motion, text input/)).toBeInTheDocument();
    expect(screen.getByText(/Weekly practice goal/)).toBeInTheDocument();
    expect(screen.getByText(/What we keep on file/)).toBeInTheDocument();
  });

  it("persists voice-recording opt-in to settings", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Retain my voice recordings/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("switch", { name: /Retain my voice recordings/ }));

    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem("portuguese-teacher:settings:demo-learner-001") ?? "{}",
      );
      expect(stored.voiceRecordingOptIn).toBe(true);
    });
  });

  it("resets to defaults", async () => {
    seedUser();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Playback speed/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("switch", { name: /Retain my voice recordings/ }));
    await waitFor(() => {
      expect(
        JSON.parse(
          window.localStorage.getItem("portuguese-teacher:settings:demo-learner-001") ?? "{}",
        ).voiceRecordingOptIn,
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Reset to defaults/ }));
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem("portuguese-teacher:settings:demo-learner-001") ?? "{}",
      );
      expect(stored.voiceRecordingOptIn).toBe(false);
    });
  });
});
