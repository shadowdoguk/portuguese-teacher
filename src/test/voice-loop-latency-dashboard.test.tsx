// UI test for the Voice Loop latency dashboard (issue #36).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { VoiceLoopLatencyDashboard } from "@/components/observability/VoiceLoopLatencyDashboard";

type SliBody = Parameters<typeof VoiceLoopLatencyDashboard>[0] extends infer _T
  ? {
      ok: true;
      windowName: "1h" | "24h" | "7d";
      windowMs: number;
      thresholdMs: number;
      alertWindowMs: number;
      summaries: Array<{
        stage: string;
        count: number;
        p50: number | null;
        p95: number | null;
        p99: number | null;
      }>;
      alert: {
        breached: boolean;
        currentP95: number | null;
        sampleCount: number;
        thresholdMs: number;
        windowMs: number;
        firstBreachAt: number | null;
        lastBreachAt: number | null;
      };
      filters: Record<string, never>;
    }
  : never;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse({
        ok: true,
        windowName: "1h",
        windowMs: 3_600_000,
        thresholdMs: 1500,
        alertWindowMs: 300_000,
        summaries: [
          { stage: "asr", count: 20, p50: 250, p95: 280, p99: 310 },
          { stage: "llm", count: 20, p50: 380, p95: 410, p99: 450 },
          { stage: "tts", count: 20, p50: 180, p95: 210, p99: 240 },
          { stage: "client.total", count: 10, p50: 1450, p95: 1490, p99: 1520 },
        ],
        alert: {
          breached: false,
          currentP95: 1490,
          sampleCount: 10,
          thresholdMs: 1500,
          windowMs: 300_000,
          firstBreachAt: null,
          lastBreachAt: null,
        },
        filters: {},
      } satisfies SliBody),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VoiceLoopLatencyDashboard", () => {
  it("renders the per-stage SLI table once data loads", async () => {
    render(<VoiceLoopLatencyDashboard initialWindow="1h" />);
    const table = await screen.findByTestId("sli-table");
    expect(table).toBeInTheDocument();
    expect(table.dataset.window).toBe("1h");
    const rows = screen.getAllByTestId("sli-row");
    // 8 stages are emitted in the default order.
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it("renders the alert banner with role=status when the budget is healthy", async () => {
    render(<VoiceLoopLatencyDashboard initialWindow="1h" />);
    const banner = await screen.findByTestId("latency-alert-banner");
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.dataset.status).toBe("ok");
    expect(banner.textContent).toMatch(/Budget healthy/);
  });

  it("renders the alert banner with role=alert when the budget is breached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          ok: true,
          windowName: "1h",
          windowMs: 3_600_000,
          thresholdMs: 1500,
          alertWindowMs: 300_000,
          summaries: [
            { stage: "client.total", count: 10, p50: 1750, p95: 1900, p99: 2050 },
          ],
          alert: {
            breached: true,
            currentP95: 1900,
            sampleCount: 10,
            thresholdMs: 1500,
            windowMs: 300_000,
            firstBreachAt: 1_700_000_000_000,
            lastBreachAt: 1_700_000_300_000,
          },
          filters: {},
        } satisfies SliBody),
      ),
    );
    render(<VoiceLoopLatencyDashboard initialWindow="1h" />);
    const banner = await screen.findByTestId("latency-alert-banner");
    expect(banner.getAttribute("role")).toBe("alert");
    expect(banner.dataset.status).toBe("breached");
    expect(banner.textContent).toMatch(/Latency budget breach/);
  });

  it("renders the empty state when every stage has 0 samples", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          ok: true,
          windowName: "1h",
          windowMs: 3_600_000,
          thresholdMs: 1500,
          alertWindowMs: 300_000,
          summaries: [
            { stage: "asr", count: 0, p50: null, p95: null, p99: null },
            { stage: "client.total", count: 0, p50: null, p95: null, p99: null },
          ],
          alert: {
            breached: false,
            currentP95: null,
            sampleCount: 0,
            thresholdMs: 1500,
            windowMs: 300_000,
            firstBreachAt: null,
            lastBreachAt: null,
          },
          filters: {},
        } satisfies SliBody),
      ),
    );
    render(<VoiceLoopLatencyDashboard initialWindow="1h" />);
    await waitFor(() =>
      expect(screen.queryByTestId("sli-empty-state")).toBeInTheDocument(),
    );
  });

  it("renders an error card when the API responds ok=false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: false, error: "boom" }, 500)),
    );
    render(<VoiceLoopLatencyDashboard initialWindow="1h" />);
    const errorNode = await screen.findByTestId("dashboard-error");
    expect(errorNode.textContent).toMatch(/boom/);
  });
});