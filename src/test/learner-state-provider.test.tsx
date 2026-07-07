import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { LearnerStateProvider, useLearnerState } from "@/lib/learner/LearnerStateProvider";
import { withAuth } from "./auth-helpers";

const STORAGE_USER = "portuguese-teacher:user";
const SETTINGS_KEY = (id: string) => `portuguese-teacher:settings:${id}`;
const AFFECTIVE_KEY = (id: string) => `portuguese-teacher:affective:${id}`;

function Probe() {
  const s = useLearnerState();
  return (
    <div>
      <output data-testid="learner-id">{s.learnerId ?? ""}</output>
      <output data-testid="hydrated">{String(s.isHydrated)}</output>
      <output data-testid="voice-speed">{s.settings.voiceSpeed}</output>
      <output data-testid="cf-timing">{s.settings.cfTiming}</output>
      <output data-testid="signal-count">{s.affectiveSignals.length}</output>
      <button type="button" onClick={() => s.updateSettings({ voiceSpeed: 1.2 })}>
        PatchSettings
      </button>
      <button
        type="button"
        onClick={() =>
          s.recordAffectiveSignal({ source: "client", kind: "response-latency" })
        }
      >
        RecordSignal
      </button>
      <button type="button" onClick={s.resetSettings}>
        Reset
      </button>
    </div>
  );
}

function LearnerStateWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LearnerStateProvider>{children}</LearnerStateProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("LearnerStateProvider (issue #105 PR 2)", () => {
  it("hydrates Settings + Affective signals together on first authenticated render", async () => {
    const id = "hydration-learner-1";
    window.localStorage.setItem(
      STORAGE_USER,
      JSON.stringify({
        id,
        name: "Ana",
        email: "ana@example.com",
        dialect: "pt-PT",
        level: "A0",
        streakDays: 0,
        weeklyMinutes: 0,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    );
    window.localStorage.setItem(
      SETTINGS_KEY(id),
      JSON.stringify({ voiceSpeed: 1.15, cfTiming: "end-of-conversation" }),
    );
    window.localStorage.setItem(
      AFFECTIVE_KEY(id),
      JSON.stringify([
        {
          id: "hydration-learner-1:response-latency:2026:abc",
          learnerId: id,
          source: "client",
          kind: "response-latency",
          occurredAt: "2026-07-01T00:00:00.000Z",
        },
      ]),
    );

    render(
      <LearnerStateWrapper>
        <Probe />
      </LearnerStateWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });
    expect(screen.getByTestId("learner-id").textContent).toBe(id);
    expect(screen.getByTestId("voice-speed").textContent).toBe("1.15");
    expect(screen.getByTestId("cf-timing").textContent).toBe("end-of-conversation");
    expect(screen.getByTestId("signal-count").textContent).toBe("1");
  });

  it("re-hydrates BOTH Settings and Affective signals when the Learner changes (issue #105 §1.4)", async () => {
    const aId = "learner-aaa";
    const bId = "learner-bbb";

    // Seed A's signals + B's signals in localStorage.
    window.localStorage.setItem(
      SETTINGS_KEY(aId),
      JSON.stringify({ voiceSpeed: 0.85 }),
    );
    window.localStorage.setItem(
      AFFECTIVE_KEY(aId),
      JSON.stringify([
        {
          id: `${aId}:response-latency:2026:a1`,
          learnerId: aId,
          source: "client",
          kind: "response-latency",
          occurredAt: "2026-07-01T00:00:00.000Z",
        },
      ]),
    );
    window.localStorage.setItem(
      AFFECTIVE_KEY(bId),
      JSON.stringify([
        {
          id: `${bId}:tab-blur:2026:b1`,
          learnerId: bId,
          source: "client",
          kind: "tab-blur",
          occurredAt: "2026-07-02T00:00:00.000Z",
        },
        {
          id: `${bId}:tab-blur:2026:b2`,
          learnerId: bId,
          source: "client",
          kind: "tab-blur",
          occurredAt: "2026-07-02T00:00:05.000Z",
        },
      ]),
    );

    render(
      <AuthProvider>
        <LearnerStateProvider initialLearnerId={aId}>
          <Probe />
        </LearnerStateProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });
    expect(screen.getByTestId("learner-id").textContent).toBe(aId);
    expect(screen.getByTestId("voice-speed").textContent).toBe("0.85");
    expect(screen.getByTestId("signal-count").textContent).toBe("1");

    // Switch by re-rendering with a different initialLearnerId (simulates
    // AuthProvider state changing from user A to user B mid-session).
    cleanup();
    render(
      <AuthProvider>
        <LearnerStateProvider initialLearnerId={bId}>
          <Probe />
        </LearnerStateProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("learner-id").textContent).toBe(bId);
    });
    await waitFor(() => {
      expect(screen.getByTestId("signal-count").textContent).toBe("2");
    });
    // B's seeded voiceSpeed defaults to 1.0 (no entry for B).
    expect(screen.getByTestId("voice-speed").textContent).toBe("1");
  });

  it("falls back to defaults when no Learner is signed in", async () => {
    render(
      <LearnerStateWrapper>
        <Probe />
      </LearnerStateWrapper>,
    );
    // Anonymous state: voiceSpeed is DEFAULT_SETTINGS.voiceSpeed (1.0).
    await waitFor(() => {
      expect(screen.getByTestId("voice-speed").textContent).toBe("1");
    });
    expect(screen.getByTestId("signal-count").textContent).toBe("0");
  });

  it("persists Settings and signals updates keyed to the active Learner", async () => {
    const id = "writer-learner";
    window.localStorage.setItem(
      STORAGE_USER,
      JSON.stringify({
        id,
        name: "W",
        email: "w@example.com",
        dialect: "pt-PT",
        level: "A0",
        streakDays: 0,
        weeklyMinutes: 0,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    render(
      <LearnerStateWrapper>
        <Probe />
      </LearnerStateWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });
    fireEvent.click(screen.getByRole("button", { name: "PatchSettings" }));
    await waitFor(() => {
      expect(screen.getByTestId("voice-speed").textContent).toBe("1.2");
    });
    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_KEY(id)) ?? "{}",
    );
    expect(stored.voiceSpeed).toBe(1.2);

    fireEvent.click(screen.getByRole("button", { name: "RecordSignal" }));
    await waitFor(() => {
      expect(screen.getByTestId("signal-count").textContent).toBe("1");
    });
    const signals = JSON.parse(
      window.localStorage.getItem(AFFECTIVE_KEY(id)) ?? "[]",
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("response-latency");
  });
});
