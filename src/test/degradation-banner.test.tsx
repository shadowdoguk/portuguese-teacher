import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DegradationBanner } from "@/components/layout/DegradationBanner";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe("DegradationBanner", () => {
  it("renders nothing when the health endpoint reports ok", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          services: {
            asr: { status: "ok", lastChangedAt: 0, detail: null },
            llm: { status: "ok", lastChangedAt: 0, detail: null },
            tts: { status: "ok", lastChangedAt: 0, detail: null },
          },
          takenAt: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { container } = render(<DegradationBanner />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders a degraded banner when the health endpoint reports degraded", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "degraded",
          services: {
            asr: { status: "degraded", lastChangedAt: 1, detail: "stub" },
            llm: { status: "ok", lastChangedAt: 1, detail: null },
            tts: { status: "ok", lastChangedAt: 1, detail: null },
          },
          takenAt: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<DegradationBanner />);
    const banner = await screen.findByTestId("degradation-banner");
    expect(banner.getAttribute("data-status")).toBe("degraded");
    expect(banner.textContent).toMatch(/ASR degraded/);
  });

  it("renders an alert banner when the health endpoint reports down", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "down",
          services: {
            asr: { status: "down", lastChangedAt: 1, detail: "503" },
            llm: { status: "ok", lastChangedAt: 1, detail: null },
            tts: { status: "ok", lastChangedAt: 1, detail: null },
          },
          takenAt: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<DegradationBanner />);
    const banner = await screen.findByTestId("degradation-banner");
    expect(banner.getAttribute("role")).toBe("alert");
    expect(banner.textContent).toMatch(/offline/i);
  });

  it("silently suppresses the banner when the fetch fails (no flicker)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const { container } = render(<DegradationBanner />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });
});