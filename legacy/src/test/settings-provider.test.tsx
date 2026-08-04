import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider, useSettings } from "@/lib/settings";

function ProbeSettings() {
  const { settings, update, reset } = useSettings();
  return (
    <div>
      <output data-testid="voice">{settings.voiceSpeed}</output>
      <output data-testid="cf">{settings.cfTiming}</output>
      <output data-testid="rec">{String(settings.voiceRecordingOptIn)}</output>
      <button type="button" onClick={() => update({ voiceSpeed: 1.2, cfTiming: "end-of-conversation" })}>
        Patch
      </button>
      <button type="button" onClick={() => update({ voiceRecordingOptIn: true })}>
        ToggleRec
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </div>
  );
}

function SignInProbe() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProbeSettings />
      </SettingsProvider>
    </AuthProvider>
  );
}

describe("SettingsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hydrates from localStorage on mount and persists updates", async () => {
    window.localStorage.setItem(
      "portuguese-teacher:settings:demo-learner-001",
      JSON.stringify({ voiceSpeed: 0.85, cfTiming: "end-of-conversation" }),
    );
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

    render(<SignInProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("voice").textContent).toBe("0.85");
    });
    expect(screen.getByTestId("cf").textContent).toBe("end-of-conversation");

    fireEvent.click(screen.getByRole("button", { name: "ToggleRec" }));
    await waitFor(() => {
      expect(screen.getByTestId("rec").textContent).toBe("true");
    });
    const stored = JSON.parse(
      window.localStorage.getItem("portuguese-teacher:settings:demo-learner-001") ?? "{}",
    );
    expect(stored.voiceRecordingOptIn).toBe(true);
  });

  it("resets to defaults when reset() is called", async () => {
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

    render(<SignInProbe />);

    fireEvent.click(screen.getByRole("button", { name: "Patch" }));
    await waitFor(() => {
      expect(screen.getByTestId("voice").textContent).toBe("1.2");
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() => {
      expect(screen.getByTestId("voice").textContent).toBe("1");
      expect(screen.getByTestId("cf").textContent).toBe("immediate");
    });
  });

  it("falls back to defaults when no user is authenticated", () => {
    render(
      <AuthProvider>
        <SettingsProvider>
          <ProbeSettings />
        </SettingsProvider>
      </AuthProvider>,
    );
    expect(screen.getByTestId("voice").textContent).toBe("1");
    expect(screen.getByTestId("rec").textContent).toBe("false");
  });
});
