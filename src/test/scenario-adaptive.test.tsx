import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { ScenarioPlayer } from "@/components/practice/ScenarioPlayer";
import { scenarioAt } from "./fixtures/scenario-fixtures";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

/**
 * Mock each endpoint explicitly. The ScenarioPlayer issues an SRS state
 * fetch on mount, and (as of #45) the ScenarioBriefingPlayer also issues a
 * TTS synthesis fetch. We route by URL so each fetch gets a fresh
 * `Response` object — sharing one Response across calls would exhaust
 * the body stream on the second `.json()` read.
 */
function mockEndpoint(
  urlFragment: string,
  body: unknown,
  status = 200,
): void {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes(urlFragment)) {
      return Promise.resolve(jsonResponse(body, status));
    }
    return Promise.resolve(jsonResponse({ ok: true, items: [] }, 200));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function seedUser(level: "A0" | "A1" | "A2" | "B1") {
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({
      id: "demo-learner",
      name: "Ana Demo",
      email: "demo@portugues.app",
      dialect: "pt-PT",
      level,
      streakDays: 1,
      weeklyMinutes: 30,
      createdAt: "2026-06-01T00:00:00.000Z",
    }),
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ScenarioPlayer — adaptive difficulty (#48)", () => {
  it("renders the Core badge when the Learner level matches the scenario", async () => {
    seedUser("A1");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("scenario-level-mismatch")).toBeInTheDocument();
    });
    const badge = screen.getByTestId("scenario-level-mismatch");
    expect(badge.getAttribute("data-match")).toBe("core");
    expect(badge.getAttribute("data-distance")).toBe("0");
  });

  it("renders the Stretch badge when the scenario is harder than the Learner", async () => {
    seedUser("A0");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A2", ["a2-1-v-passaporte"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      const badge = screen.getByTestId("scenario-level-mismatch");
      expect(badge.getAttribute("data-match")).toBe("stretch");
      expect(badge.getAttribute("data-distance")).toBe("2");
    });
  });

  it("renders the Review badge when the scenario is far below the Learner", async () => {
    seedUser("B1");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A0", ["a0-1-v-bom-dia"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      const badge = screen.getByTestId("scenario-level-mismatch");
      expect(badge.getAttribute("data-match")).toBe("review");
      expect(badge.getAttribute("data-distance")).toBe("-3");
    });
  });

  it("renders the new-vocabulary hint when the Learner hasn't reviewed the items", async () => {
    seedUser("A0");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete", "a1-1-v-passaporte"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("scenario-vocab-unknown")).toBeInTheDocument();
    });
    expect(screen.getByTestId("scenario-vocab-unknown").textContent).toMatch(
      /a1-1-v-bilhete.*a1-1-v-passaporte/,
    );
  });

  it("renders the all-known hint when the Learner has reviewed every item", async () => {
    seedUser("A0");
    mockEndpoint("/api/srs/state", {
      ok: true,
      state: {
        items: {
          "a1-1-v-bilhete": { reviewCount: 3 },
          "a1-1-v-passaporte": { reviewCount: 1 },
        },
      },
      sources: [],
    });
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete", "a1-1-v-passaporte"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("scenario-vocab-all-known")).toBeInTheDocument();
    });
  });

  it("falls back to all-unknown when the SRS state endpoint fails", async () => {
    seedUser("A0");
    mockEndpoint(
      "/api/srs/state",
      { ok: false, error: "boom" },
      500,
    );
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("scenario-vocab-unknown")).toBeInTheDocument();
    });
  });
});

describe("ScenarioPlayer — partial-completion tag write (#104)", () => {
  it("posts the scenario's vocabularyRefs to /api/srs/sources on mount", async () => {
    seedUser("A1");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete", "a1-1-v-passaporte"]);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      const sourcesCall = fetchMock.mock.calls.find((call) => {
        const url = typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
        return url.includes("/api/srs/sources");
      });
      expect(sourcesCall).toBeDefined();
    });

    const sourcesCall = fetchMock.mock.calls.find((call) => {
      const url = typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return url.includes("/api/srs/sources");
    })!;
    const init = sourcesCall[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body)) as {
      learnerId: string;
      scenarioId: string;
      itemIds: ReadonlyArray<string>;
    };
    expect(body.learnerId).toBe("demo-learner");
    expect(body.scenarioId).toBe(scenario.id);
    expect(body.itemIds).toEqual(["a1-1-v-bilhete", "a1-1-v-passaporte"]);
  });

  it("does NOT post to /api/srs/sources when the scenario has no vocabularyRefs", async () => {
    seedUser("A0");
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    const scenario = scenarioAt("A0", []);
    render(
      <AuthProvider>
        <SettingsProvider>
          <ScenarioPlayer
            scenario={scenario}
            onExit={() => undefined}
            onComplete={() => undefined}
          />
        </SettingsProvider>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("scenario-level-mismatch")).toBeInTheDocument();
    });
    const sourcesCall = fetchMock.mock.calls.find((call) => {
      const url = typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return url.includes("/api/srs/sources");
    });
    expect(sourcesCall).toBeUndefined();
  });
});