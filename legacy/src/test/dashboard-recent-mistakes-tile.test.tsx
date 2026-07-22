import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RecentMistakesTile } from "@/components/dashboard/RecentMistakesTile";

const originalFetch = global.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("RecentMistakesTile", () => {
  it("renders the empty-state copy when there are no recent lapses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          learnerId: "learner-x",
          windowDays: 7,
          limit: 5,
          result: {
            items: [],
            totalLapses: 0,
            windowMs: 7 * 24 * 60 * 60 * 1000,
            uniqueItems: 0,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RecentMistakesTile learnerId="learner-x" />);
    await waitFor(() => {
      expect(screen.getByTestId("recent-mistakes-headline")).toHaveAttribute(
        "data-status",
        "empty",
      );
    });
    expect(screen.getByText(/No recent slips — keep going/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open review queue/ })).toBeInTheDocument();
  });

  it("renders the recent items with lapse counts when populated", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          learnerId: "learner-y",
          windowDays: 7,
          limit: 5,
          result: {
            items: [
              {
                itemId: "v-cafe",
                kind: "vocabulary",
                pt: "café",
                gloss: "coffee",
                lapses: 3,
                lastLapseAt: 1,
              },
              {
                itemId: "grammar-ser-estar",
                kind: "grammar",
                pt: "ser vs estar",
                gloss: "two 'to be' verbs",
                lapses: 1,
                lastLapseAt: 2,
              },
            ],
            totalLapses: 4,
            windowMs: 7 * 24 * 60 * 60 * 1000,
            uniqueItems: 2,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RecentMistakesTile learnerId="learner-y" />);
    await waitFor(() => {
      expect(screen.getByTestId("recent-mistakes-headline")).toHaveAttribute(
        "data-status",
        "ready",
      );
    });
    const items = screen.getAllByTestId("recent-mistakes-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("café")).toBeInTheDocument();
    expect(screen.getByText("ser vs estar")).toBeInTheDocument();
    expect(screen.getAllByTestId("recent-mistakes-lapses")[0]).toHaveTextContent("3×");
    expect(screen.getByText(/4 lapses across the last 7 days/)).toBeInTheDocument();
  });

  it("surfaces an error message when the fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: false, error: "boom" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<RecentMistakesTile learnerId="learner-z" />);
    await waitFor(() => {
      expect(screen.getByTestId("recent-mistakes-headline")).toHaveAttribute(
        "data-status",
        "error",
      );
    });
    expect(screen.getByTestId("recent-mistakes-error")).toHaveTextContent(/boom/);
  });
});