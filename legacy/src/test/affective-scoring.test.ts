import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AFFECTIVE_HIGH_THRESHOLD,
  AFFECTIVE_LOW_THRESHOLD,
  DEFAULT_WINDOW_DAYS,
  NEUTRAL_SCORE,
  SATURATION_PER_KIND,
  SIGNAL_WEIGHTS,
  TREND_DELTA_THRESHOLD,
  affectiveFilterScore,
  aggregateScore,
  clampScore,
  computeBucketValue,
  computeTrend,
  describeScore,
  type AffectiveFilterSignal,
} from "@/lib/affective";

const ISO = (date: Date) => date.toISOString();

function makeSignal(
  partial: Partial<AffectiveFilterSignal> & {
    kind: AffectiveFilterSignal["kind"];
    occurredAt: string;
  },
): AffectiveFilterSignal {
  return {
    id: `sig-${Math.random().toString(36).slice(2, 8)}`,
    learnerId: "test-learner",
    source: "client",
    ...partial,
  };
}

describe("clampScore", () => {
  it("clamps to [0, 100]", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(110)).toBe(100);
    expect(clampScore(72.4)).toBe(72);
  });

  it("returns neutral for NaN", () => {
    expect(clampScore(Number.NaN)).toBe(NEUTRAL_SCORE);
  });
});

describe("computeBucketValue", () => {
  it("returns 0 for empty list", () => {
    expect(computeBucketValue([], "mic-cancel")).toBe(0);
  });

  it("counts mic-cancel events", () => {
    const signals = [
      makeSignal({ kind: "mic-cancel", occurredAt: "2026-06-27T10:00:00.000Z" }),
      makeSignal({ kind: "mic-cancel", occurredAt: "2026-06-27T11:00:00.000Z" }),
    ];
    expect(computeBucketValue(signals, "mic-cancel")).toBe(2);
  });

  it("caps tab-blur at 4", () => {
    const signals = Array.from({ length: 10 }, (_, i) =>
      makeSignal({ kind: "tab-blur", occurredAt: `2026-06-27T${String(i).padStart(2, "0")}:00:00.000Z` }),
    );
    expect(computeBucketValue(signals, "tab-blur")).toBe(4);
  });

  it("averages response latency in seconds", () => {
    const signals = [
      makeSignal({ kind: "response-latency", occurredAt: "2026-06-27T10:00:00.000Z", value: 1000 }),
      makeSignal({ kind: "response-latency", occurredAt: "2026-06-27T11:00:00.000Z", value: 3000 }),
    ];
    expect(computeBucketValue(signals, "response-latency")).toBe(2);
  });
});

describe("aggregateScore", () => {
  it("starts at neutral with no signals", () => {
    expect(aggregateScore([])).toBe(NEUTRAL_SCORE);
  });

  it("drops score with high accuracy (inverted)", () => {
    const signals = Array.from({ length: 5 }, (_, i) =>
      makeSignal({
        kind: "rolling-accuracy",
        occurredAt: `2026-06-${String(20 + i).padStart(2, "0")}T10:00:00.000Z`,
        value: 0.95,
      }),
    );
    const score = aggregateScore(signals);
    expect(score).toBeLessThan(NEUTRAL_SCORE);
  });

  it("raises score with many mic-cancels and drop-offs", () => {
    const signals = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeSignal({
          kind: "mic-cancel",
          occurredAt: `2026-06-${String(20 + i).padStart(2, "0")}T10:00:00.000Z`,
        }),
      ),
      makeSignal({ kind: "unit-drop-off", occurredAt: "2026-06-25T10:00:00.000Z" }),
    ];
    const score = aggregateScore(signals);
    expect(score).toBeGreaterThan(NEUTRAL_SCORE);
  });

  it("saturates per-kind contribution", () => {
    const signals = Array.from({ length: 50 }, (_, i) =>
      makeSignal({
        kind: "tab-blur",
        occurredAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      }),
    );
    const score = aggregateScore(signals);
    const delta = score - NEUTRAL_SCORE;
    expect(Math.abs(delta)).toBeLessThanOrEqual(SATURATION_PER_KIND + 1);
  });

  it("never exceeds 0–100", () => {
    const signals: AffectiveFilterSignal[] = [];
    for (const kind of Object.keys(SIGNAL_WEIGHTS) as AffectiveFilterSignal["kind"][]) {
      for (let i = 0; i < 10; i += 1) {
        signals.push(
          makeSignal({
            kind,
            occurredAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
            value: 99999,
          }),
        );
      }
    }
    const score = aggregateScore(signals);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeTrend", () => {
  const now = new Date("2026-06-27T12:00:00.000Z");
  const oldDay = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const newDay = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  it("returns rising when second half is significantly higher", () => {
    const firstHalf: AffectiveFilterSignal[] = Array.from({ length: 5 }, () =>
      makeSignal({ kind: "mic-cancel", occurredAt: oldDay }),
    );
    const secondHalf: AffectiveFilterSignal[] = [];
    expect(computeTrend(firstHalf, secondHalf)).toBe("falling");
    expect(computeTrend(secondHalf, firstHalf)).toBe("rising");
  });

  it("returns flat for small delta", () => {
    const tiny = [
      makeSignal({ kind: "tab-blur", occurredAt: oldDay, value: 1 }),
    ];
    expect(computeTrend(tiny, tiny)).toBe("flat");
  });

  it("respects TREND_DELTA_THRESHOLD", () => {
    expect(TREND_DELTA_THRESHOLD).toBe(5);
  });
});

describe("affectiveFilterScore", () => {
  it("returns neutral score and flat trend for empty signal list", () => {
    const score = affectiveFilterScore("l1", 7, {
      signals: [],
      now: new Date("2026-06-27T12:00:00.000Z"),
    });
    expect(score.score).toBe(NEUTRAL_SCORE);
    expect(score.trend).toBe("flat");
    expect(score.signalsConsidered).toBe(0);
    expect(score.windowDays).toBe(7);
  });

  it("is deterministic for a fixed event history", () => {
    const fixedNow = new Date("2026-06-27T12:00:00.000Z");
    const signals: AffectiveFilterSignal[] = [
      makeSignal({ kind: "mic-cancel", occurredAt: ISO(new Date(fixedNow.getTime() - 1000)) }),
      makeSignal({ kind: "tab-blur", occurredAt: ISO(new Date(fixedNow.getTime() - 2000)) }),
      makeSignal({ kind: "rolling-accuracy", occurredAt: ISO(new Date(fixedNow.getTime() - 3000)), value: 0.7 }),
    ];
    const a = affectiveFilterScore("l1", 7, { signals, now: fixedNow });
    const b = affectiveFilterScore("l1", 7, { signals, now: fixedNow });
    expect(a).toEqual(b);
  });

  it("only counts signals within the window", () => {
    const fixedNow = new Date("2026-06-27T12:00:00.000Z");
    const recent = makeSignal({ kind: "mic-cancel", occurredAt: ISO(new Date(fixedNow.getTime() - 1000)) });
    const stale = makeSignal({ kind: "mic-cancel", occurredAt: ISO(new Date(fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000)) });
    const score = affectiveFilterScore("l1", 7, {
      signals: [recent, stale],
      now: fixedNow,
    });
    expect(score.signalsConsidered).toBe(1);
  });

  it("returns a stable score for a synthetic learner with fixed history", () => {
    const fixedNow = new Date("2026-06-27T12:00:00.000Z");
    const synthSignals: AffectiveFilterSignal[] = [
      ...Array.from({ length: 3 }, () =>
        makeSignal({
          kind: "mic-cancel",
          occurredAt: ISO(new Date(fixedNow.getTime() - 1 * 24 * 60 * 60 * 1000)),
        }),
      ),
      makeSignal({
        kind: "rolling-accuracy",
        occurredAt: ISO(new Date(fixedNow.getTime() - 1 * 24 * 60 * 60 * 1000)),
        value: 0.4,
      }),
      makeSignal({
        kind: "unit-drop-off",
        occurredAt: ISO(new Date(fixedNow.getTime() - 2 * 24 * 60 * 60 * 1000)),
      }),
    ];
    const first = affectiveFilterScore("synth", 7, { signals: synthSignals, now: fixedNow });
    const second = affectiveFilterScore("synth", 7, { signals: synthSignals, now: fixedNow });
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThan(NEUTRAL_SCORE);
    expect(first.score).toBeLessThanOrEqual(100);
  });

  it("uses DEFAULT_WINDOW_DAYS by default", () => {
    const score = affectiveFilterScore("l1", DEFAULT_WINDOW_DAYS, { signals: [] });
    expect(score.windowDays).toBe(DEFAULT_WINDOW_DAYS);
  });
});

describe("describeScore", () => {
  it("returns low for scores at or below the low threshold", () => {
    expect(describeScore({ score: AFFECTIVE_LOW_THRESHOLD, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("low");
    expect(describeScore({ score: 10, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("low");
  });

  it("returns high for scores at or above the high threshold", () => {
    expect(describeScore({ score: AFFECTIVE_HIGH_THRESHOLD, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("high");
    expect(describeScore({ score: 95, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("high");
  });

  it("returns neutral between thresholds", () => {
    expect(describeScore({ score: 50, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("neutral");
    expect(describeScore({ score: AFFECTIVE_LOW_THRESHOLD + 1, trend: "flat", windowDays: 7, computedAt: "", signalsConsidered: 0 })).toBe("neutral");
  });
});
