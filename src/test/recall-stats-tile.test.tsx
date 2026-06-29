import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RecallStatsTile } from "@/components/progress/RecallStatsTile";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("RecallStatsTile", () => {
  it("renders the empty-state copy when there are no recalls", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          events: [],
          stats: { total: 0, todayCount: 0, easyPercent: 0, lastRecallAt: null },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RecallStatsTile learnerId="learner-x" />);
    await waitFor(() => {
      expect(screen.getByTestId("recall-stats-headline")).toHaveAttribute(
        "data-status",
        "empty",
      );
    });
    expect(screen.getByText(/No recalls yet/)).toBeInTheDocument();
  });

  it("renders today count + easy percent + total for non-empty events", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          events: [{ event: "srs_recall" }],
          stats: { total: 12, todayCount: 5, easyPercent: 33, lastRecallAt: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RecallStatsTile learnerId="learner-y" />);
    await waitFor(() => {
      expect(screen.getByTestId("recall-stats-today")).toHaveTextContent("5");
    });
    expect(screen.getByTestId("recall-stats-easy-percent")).toHaveTextContent("33");
    expect(screen.getByTestId("recall-stats-total")).toHaveTextContent("12");
  });

  it("surfaces an error message when the fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "boom" }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    render(<RecallStatsTile learnerId="learner-z" />);
    await waitFor(() => {
      expect(screen.getByTestId("recall-stats-error")).toHaveTextContent(/boom/);
    });
    expect(screen.getByTestId("recall-stats-headline")).toHaveAttribute(
      "data-status",
      "error",
    );
  });
});