// UI test for ScenarioBriefingPlayer (issue #45).
//
// Verifies the player renders captions in canonical order, toggles
// captions via the checkbox, exposes the keyboard shortcut to replay
// (press R), and reflects the TTS state (loading / degraded / error).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ScenarioBriefingPlayer } from "@/components/scenarios/ScenarioBriefingPlayer";
import type { Scenario } from "@/lib/curriculum/types";

function buildScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "sc-cafe",
    unitId: "u1",
    category: "cafe-restaurant",
    targetLevel: "A0",
    goal: "Pedir uma bebida.",
    setting: "Café em Lisboa.",
    roles: { learner: "Cliente", teacher: "Empregado" },
    preTask: "Que horas são?",
    expectedTurns: 3,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: ["Cumprimenta o empregado."],
    passingScore: 0.6,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockTtsRoute(
  body: unknown,
  status = 200,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  fn.mockResolvedValue(jsonResponse(body, status));
  return fn;
}

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi
    .fn()
    .mockResolvedValue(undefined) as unknown as typeof HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.pause = vi.fn() as unknown as typeof HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.load = vi.fn() as unknown as typeof HTMLMediaElement.prototype.load;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ScenarioBriefingPlayer", () => {
  it("renders the three briefing captions in canonical order (goal → setting → preTask)", async () => {
    vi.stubGlobal("fetch", mockTtsRoute({ ok: true, audioUrl: "data:audio/mp3;base64,", durationMs: 1000 }));
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await waitFor(() => {
      expect(screen.getAllByTestId("briefing-caption")).toHaveLength(3);
    });
    const captions = screen.getAllByTestId("briefing-caption");
    expect(captions.map((c) => c.getAttribute("data-field"))).toEqual([
      "goal",
      "setting",
      "preTask",
    ]);
    expect(captions[0]?.textContent).toMatch(/Pedir uma bebida/);
    expect(captions[1]?.textContent).toMatch(/Café em Lisboa/);
    expect(captions[2]?.textContent).toMatch(/Que horas são/);
  });

  it("hides the captions when the captions checkbox is unchecked", async () => {
    vi.stubGlobal("fetch", mockTtsRoute({ ok: true, audioUrl: "data:audio/mp3;base64,", durationMs: 1000 }));
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await waitFor(() => {
      expect(screen.getByTestId("briefing-captions-toggle")).toBeInTheDocument();
    });
    const toggle = screen.getByTestId("briefing-captions-toggle") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(screen.queryByTestId("briefing-caption")).toBeNull();
  });

  it("toggles a retry button when the TTS service is degraded", async () => {
    vi.stubGlobal(
      "fetch",
      mockTtsRoute({ ok: false, degradedReason: "service unavailable" }),
    );
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await waitFor(() => {
      expect(screen.getByTestId("briefing-retry")).toBeInTheDocument();
    });
    expect(screen.getByTestId("briefing-status").textContent).toMatch(
      /TTS unavailable/,
    );
  });

  it("toggles a retry button when the TTS service errors", async () => {
    vi.stubGlobal(
      "fetch",
      mockTtsRoute({ ok: false, error: "boom" }, 500),
    );
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await waitFor(() => {
      expect(screen.getByTestId("briefing-retry")).toBeInTheDocument();
    });
    expect(screen.getByTestId("briefing-status").textContent).toMatch(
      /TTS failed/,
    );
  });

  it("renders nothing when every briefing field is blank", () => {
    vi.stubGlobal("fetch", mockTtsRoute({ ok: true, audioUrl: "", durationMs: 0 }));
    const scenario = buildScenario({ goal: "", setting: "", preTask: "" });
    const { container } = render(<ScenarioBriefingPlayer scenario={scenario} />);
    expect(container.firstChild).toBeNull();
  });

  it("plays (replays) the audio when the replay button is clicked", async () => {
    const playSpy = HTMLMediaElement.prototype.play as unknown as ReturnType<typeof vi.fn>;
    vi.stubGlobal(
      "fetch",
      mockTtsRoute({ ok: true, audioUrl: "data:audio/mp3;base64,XYZ", durationMs: 1000 }),
    );
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    const replay = await screen.findByTestId("briefing-replay");
    expect(replay).not.toBeDisabled();
    fireEvent.click(replay);
    expect(playSpy).toHaveBeenCalled();
  });

  it("keyboard shortcut R triggers a replay (skipping when typing in an input)", async () => {
    const playSpy = HTMLMediaElement.prototype.play as unknown as ReturnType<typeof vi.fn>;
    vi.stubGlobal(
      "fetch",
      mockTtsRoute({ ok: true, audioUrl: "data:audio/mp3;base64,XYZ", durationMs: 1000 }),
    );
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await screen.findByTestId("briefing-replay");

    // Press R → should replay.
    fireEvent.keyDown(window, { key: "r" });
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Pressing R while focused in an input → should be ignored.
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "r" });
    expect(playSpy).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it("announces the keyboard shortcut via aria-keyshortcuts on the region", async () => {
    vi.stubGlobal("fetch", mockTtsRoute({ ok: true, audioUrl: "", durationMs: 0 }));
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    const region = screen.getByTestId("scenario-briefing-player");
    expect(region.getAttribute("aria-keyshortcuts")).toBe("R");
  });

  it("exposes the TTS state via the data-state attribute", async () => {
    vi.stubGlobal("fetch", mockTtsRoute({ ok: true, audioUrl: "data:audio/mp3;base64,", durationMs: 1000 }));
    render(<ScenarioBriefingPlayer scenario={buildScenario()} />);
    await waitFor(() => {
      expect(screen.getByTestId("scenario-briefing-player").getAttribute("data-state")).toBe(
        "ready",
      );
    });
  });
});