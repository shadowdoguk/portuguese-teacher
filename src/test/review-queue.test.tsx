import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReviewQueue } from "@/components/review/ReviewQueue";
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

describe("ReviewQueue — useLearnerId (#105 PR 1)", () => {
  it("skips the SRS fetch when no Learner is signed in", async () => {
    clearLearner();
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, state: { items: {} }, sources: [] }),
    );
    render(withAuth(<ReviewQueue />));
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/Preparing your queue/)).toBeInTheDocument();
  });

  it("sends the recall payload with the authenticated Learner's id", async () => {
    seedLearner({ id: "test-learner-105" });
    const refItemId = "a0-1-v-bom-dia";
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/srs/state")) {
        return jsonResponse({
          ok: true,
          state: {
            items: {
              [refItemId]: {
                halfLifeMs: 300_000,
                dueAt: Date.now() - 1_000,
                reviewCount: 0,
                lapses: 0,
                lastReviewedAt: null,
              },
            },
          },
          sources: [],
        });
      }
      if (url.includes("/api/srs/recalls")) {
        const body = JSON.parse(
          String((init as RequestInit | undefined)?.body ?? "{}"),
        ) as { itemId: string };
        return jsonResponse({
          ok: true,
          record: {
            itemId: body.itemId,
            halfLifeMs: 750_000,
            dueAt: Date.now() + 750_000,
            reviewCount: 1,
            lapses: 0,
            lastReviewedAt: Date.now(),
          },
          event: {
            event: "srs_recall",
            learnerId: "test-learner-105",
            itemId: body.itemId,
            grade: "good",
            halfLifeBeforeMs: 300_000,
            halfLifeAfterMs: 750_000,
            dueAt: Date.now() + 750_000,
            timestamp: Date.now(),
          },
        });
      }
      return new Response(null, { status: 404 });
    });
    render(withAuth(<ReviewQueue />));
    const goodBtn = await screen.findByTestId("srs-grade-good");
    goodBtn.click();
    await waitFor(() => {
      const recallCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/api/srs/recalls"),
      );
      expect(recallCall).toBeDefined();
    });
    const recallCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/srs/recalls"),
    )!;
    const body = JSON.parse(
      String((recallCall[1] as RequestInit)?.body ?? "{}"),
    ) as { learnerId: string };
    expect(body.learnerId).toBe("test-learner-105");
  });
});
