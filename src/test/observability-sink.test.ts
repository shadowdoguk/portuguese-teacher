import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateRecallStats,
  consoleObservabilitySink,
  createApiObservabilitySink,
  formatRecallStats,
  getObservabilitySink,
  resetObservabilitySink,
  setObservabilitySink,
  type ObservabilityEvent,
} from "@/lib/observability";
import type { SrsRecallEvent } from "@/lib/srs/types";

function makeEvent(overrides: Partial<SrsRecallEvent> = {}): SrsRecallEvent {
  return {
    event: "srs_recall",
    learnerId: overrides.learnerId ?? "learner-1",
    itemId: overrides.itemId ?? "v-ola",
    grade: overrides.grade ?? "good",
    halfLifeBeforeMs: overrides.halfLifeBeforeMs ?? 300_000,
    halfLifeAfterMs: overrides.halfLifeAfterMs ?? 750_000,
    dueAt: overrides.dueAt ?? 1_700_000_000_000,
    timestamp: overrides.timestamp ?? 1_700_000_000_000,
  };
}

describe("ObservabilitySink — active sink swap", () => {
  beforeEach(() => {
    resetObservabilitySink();
  });

  afterEach(() => {
    resetObservabilitySink();
  });

  it("defaults to the console sink", () => {
    expect(getObservabilitySink().name).toBe("console");
  });

  it("supports swapping the active sink", () => {
    const stub = { name: "stub", emit: vi.fn(), flush: vi.fn() };
    setObservabilitySink(stub);
    expect(getObservabilitySink().name).toBe("stub");
  });
});

describe("consoleObservabilitySink", () => {
  it("emits a JSON line to console.info for non-error events", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    consoleObservabilitySink.emit({
      kind: "srs_recall",
      occurredAt: 1,
      learnerId: "learner-1",
      itemId: "v-ola",
      grade: "good",
      halfLifeBeforeMs: 300_000,
      halfLifeAfterMs: 750_000,
      dueAt: 1_700_000_000_000,
    });

    expect(info).toHaveBeenCalledTimes(1);
    const firstCall = info.mock.calls[0]?.[0] as string;
    expect(firstCall).toContain("[observability]");
    expect(firstCall).toContain('"kind":"srs_recall"');
    expect(firstCall).toContain('"source":"portuguese-teacher"');
    expect(warn).not.toHaveBeenCalled();

    info.mockRestore();
    warn.mockRestore();
  });

  it("routes error events to console.warn", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    consoleObservabilitySink.emit({
      kind: "voice_loop_error",
      occurredAt: 1,
      stage: "asr",
      message: "down",
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();

    info.mockRestore();
    warn.mockRestore();
  });

  it("flush is a no-op", async () => {
    await expect(consoleObservabilitySink.flush()).resolves.toBeUndefined();
  });
});

describe("createApiObservabilitySink", () => {
  it("POSTs batched events to the configured endpoint", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fakeFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: String(init?.body ?? "") });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    const sink = createApiObservabilitySink({
      endpoint: "/api/observability/events",
      batchSize: 2,
      flushIntervalMs: 60_000,
      fetchImpl: fakeFetch,
    });

    sink.emit({
      kind: "srs_recall",
      occurredAt: 1,
      learnerId: "l",
      itemId: "v-ola",
      grade: "good",
      halfLifeBeforeMs: 300_000,
      halfLifeAfterMs: 750_000,
      dueAt: 1,
    });
    sink.emit({
      kind: "voice_loop_latency",
      occurredAt: 2,
      stage: "llm",
      latencyMs: 420,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/api/observability/events");
    const parsed = JSON.parse(calls[0]?.body ?? "{}") as {
      events: ObservabilityEvent[];
    };
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[0]?.kind).toBe("srs_recall");
    expect(parsed.events[1]?.kind).toBe("voice_loop_latency");
  });

  it("does not throw when fetch rejects", async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const sink = createApiObservabilitySink({
      batchSize: 1,
      flushIntervalMs: 60_000,
      fetchImpl: fakeFetch,
    });

    sink.emit({
      kind: "srs_recall",
      occurredAt: 1,
      learnerId: "l",
      itemId: "v-ola",
      grade: "good",
      halfLifeBeforeMs: 1,
      halfLifeAfterMs: 1,
      dueAt: 1,
    });
    await expect(sink.flush()).resolves.toBeUndefined();
  });

  it("flushes on demand via flush()", async () => {
    const fakeFetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const sink = createApiObservabilitySink({
      batchSize: 1_000,
      flushIntervalMs: 60_000,
      fetchImpl: fakeFetch,
    });

    sink.emit({
      kind: "degradation",
      occurredAt: 1,
      service: "tts",
      status: "degraded",
      detail: "slow",
    });
    expect(fakeFetch).not.toHaveBeenCalled();

    await sink.flush();
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});

describe("aggregateRecallStats", () => {
  const NOW = Date.UTC(2026, 5, 28, 10, 0, 0); // 2026-06-28T10:00:00Z

  it("returns zeros for an empty event list", () => {
    const stats = aggregateRecallStats([], NOW);
    expect(stats).toEqual({
      total: 0,
      todayCount: 0,
      easyPercent: 0,
      lastRecallAt: null,
    });
  });

  it("counts today's events and easy percent on a mixed batch", () => {
    const todayMorning = Date.UTC(2026, 5, 28, 8, 0, 0);
    const todayEarlier = Date.UTC(2026, 5, 28, 1, 0, 0);
    const yesterday = Date.UTC(2026, 5, 27, 23, 59, 0);
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "easy", timestamp: todayMorning }),
      makeEvent({ grade: "easy", timestamp: todayEarlier }),
      makeEvent({ grade: "good", timestamp: todayMorning + 1_000 }),
      makeEvent({ grade: "again", timestamp: todayMorning + 2_000 }),
      makeEvent({ grade: "hard", timestamp: yesterday }),
    ];

    const stats = aggregateRecallStats(events, NOW);
    expect(stats.total).toBe(5);
    expect(stats.todayCount).toBe(4);
    expect(stats.easyPercent).toBe(40);
    expect(stats.lastRecallAt).toBe(todayMorning + 2_000);
  });

  it("rounds easy percent to nearest whole percent", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "easy", timestamp: NOW - 1 }),
      makeEvent({ grade: "good", timestamp: NOW - 2 }),
      makeEvent({ grade: "hard", timestamp: NOW - 3 }),
    ];
    expect(aggregateRecallStats(events, NOW).easyPercent).toBe(33);
  });
});

describe("formatRecallStats", () => {
  it("renders the empty-state copy when total is zero", () => {
    expect(formatRecallStats(aggregateRecallStats([], Date.now()))).toMatch(
      /No recalls yet/,
    );
  });

  it("formats today's count with correct singular/plural and easy percent", () => {
    const stats = { total: 7, todayCount: 3, easyPercent: 57, lastRecallAt: 1 };
    expect(formatRecallStats(stats)).toBe("3 recalls today · 57% graded Easy");
  });
});