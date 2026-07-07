import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ScenarioWorkspace } from "@/components/practice/ScenarioWorkspace";
import { clearLearner, seedLearner, withAuth } from "./auth-helpers";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  clearLearner();
});

describe("ScenarioWorkspace — useLearnerId (#105 PR 1)", () => {
  it("skips the scenarios snapshot fetch when no Learner is signed in", async () => {
    clearLearner();
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, snapshot: { byId: {}, completedScenarioIds: [] } }),
    );
    render(withAuth(<ScenarioWorkspace />));
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
    // ScenarioLibrary is the "library" surface that renders when no scenario is active.
    expect(screen.getByTestId("scenario-library")).toBeInTheDocument();
  });

  it("sends the snapshot fetch with the authenticated Learner's id", async () => {
    seedLearner({ id: "workspace-learner-42" });
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, snapshot: { byId: {}, completedScenarioIds: [] } }),
    );
    render(withAuth(<ScenarioWorkspace />));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const snapshotCall = fetchMock.mock.calls.find((call) => {
      const url = typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return url.includes("/api/scenarios?learnerId=");
    });
    expect(snapshotCall).toBeDefined();
    const url = String(snapshotCall![0]);
    expect(url).toContain("learnerId=workspace-learner-42");
  });
});
