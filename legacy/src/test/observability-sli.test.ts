import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALERT_WINDOW_MS,
  DEFAULT_LATENCY_THRESHOLD_MS,
  LATENCY_WINDOWS,
  MIN_ALERT_SAMPLE_COUNT,
  aggregateSli,
  evaluateLatencyAlert,
  percentile,
  type LatencySample,
} from "@/lib/observability/sli";

describe("percentile", () => {
  it("returns null for empty input", () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(percentile([], 0.95)).toBeNull();
  });

  it("returns the single element when n=1", () => {
    expect(percentile([42], 0)).toBe(42);
    expect(percentile([42], 0.5)).toBe(42);
    expect(percentile([42], 1)).toBe(42);
  });

  it("returns the mean of two elements for p=0.5", () => {
    expect(percentile([10, 20], 0.5)).toBe(15);
  });

  it("pins the linear-interpolation math at p=0.95 over n=4", () => {
    // sorted: [10, 20, 30, 40]; idx = 3 * 0.95 = 2.85; values[2] + 0.85 * (values[3] - values[2]) = 30 + 8.5 = 38.5
    expect(percentile([10, 20, 30, 40], 0.95)).toBe(38.5);
  });

  it("returns the minimum for p=0 and maximum for p=1", () => {
    expect(percentile([5, 1, 3, 2, 4], 0)).toBe(1);
    expect(percentile([5, 1, 3, 2, 4], 1)).toBe(5);
  });

  it("clamps p to [0, 1]", () => {
    expect(percentile([1, 2, 3], -1)).toBe(1);
    expect(percentile([1, 2, 3], 2)).toBe(3);
  });

  it("sorts a defensive copy (does not mutate input)", () => {
    const input = [3, 1, 2];
    const copy = [...input];
    percentile(input, 0.5);
    expect(input).toEqual(copy);
  });

  it("handles 100 samples at p=0.95 deterministically", () => {
    // sorted = [0..99]; idx = 99 * 0.95 = 94.05; values[94] + 0.05 * (values[95] - values[94]) = 94 + 0.05 = 94.05
    expect(percentile(Array.from({ length: 100 }, (_, i) => i), 0.95)).toBeCloseTo(94.05, 10);
  });
});

function sample(overrides: Partial<LatencySample> = {}): LatencySample {
  return {
    stage: "asr",
    latencyMs: 100,
    occurredAt: 1_700_000_000_000,
    ok: true,
    ...overrides,
  };
}

describe("aggregateSli", () => {
  const now = 1_700_000_000_000;
  const hour = 60 * 60 * 1000;

  it("returns a summary per requested stage with null p* when no samples", () => {
    const summaries = aggregateSli({ samples: [], windowMs: LATENCY_WINDOWS["1h"], now });
    for (const summary of summaries) {
      expect(summary.count).toBe(0);
      expect(summary.p50).toBeNull();
      expect(summary.p95).toBeNull();
      expect(summary.p99).toBeNull();
    }
  });

  it("excludes samples outside the rolling window", () => {
    const summaries = aggregateSli({
      samples: [
        sample({ latencyMs: 50, occurredAt: now - hour / 2 }), // in window
        sample({ latencyMs: 9_999, occurredAt: now - hour - 1 }), // out of window
      ],
      windowMs: LATENCY_WINDOWS["1h"],
      now,
      stages: ["asr"],
    });
    const asr = summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(50);
  });

  it("filters by learnerId when supplied", () => {
    const summaries = aggregateSli({
      samples: [
        sample({ latencyMs: 100, learnerId: "learner-1" }),
        sample({ latencyMs: 300, learnerId: "learner-2" }),
      ],
      windowMs: LATENCY_WINDOWS["1h"],
      now,
      stages: ["asr"],
      learnerId: "learner-1",
    });
    const asr = summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(100);
  });

  it("filters by tier + practiceMode when supplied", () => {
    const summaries = aggregateSli({
      samples: [
        sample({ latencyMs: 100, tier: 1, practiceMode: "free-form" }),
        sample({ latencyMs: 500, tier: 2, practiceMode: "drill" }),
        sample({ latencyMs: 200, tier: 1, practiceMode: "drill" }),
      ],
      windowMs: LATENCY_WINDOWS["1h"],
      now,
      stages: ["asr"],
      tier: 1,
      practiceMode: "drill",
    });
    const asr = summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(200);
  });

  it("ignores ok=false samples for the per-stage p* math", () => {
    const summaries = aggregateSli({
      samples: [
        sample({ latencyMs: 100, ok: true }),
        sample({ latencyMs: 9_999, ok: false }),
      ],
      windowMs: LATENCY_WINDOWS["1h"],
      now,
      stages: ["asr"],
    });
    const asr = summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(100);
  });

  it("computes p50/p95/p99 over the bucketed values", () => {
    // n=20 [100..119] (sorted).
    // p50: idx = 19 * 0.5  = 9.5  → values[9] + 0.5 * (values[10] - values[9])  = 109 + 0.5 = 109.5
    // p95: idx = 19 * 0.95 = 18.05 → values[18] + 0.05 * (values[19] - values[18]) = 118 + 0.05 = 118.05
    // p99: idx = 19 * 0.99 = 18.81 → values[18] + 0.81 * (values[19] - values[18]) = 118 + 0.81 = 118.81
    const samples: LatencySample[] = Array.from({ length: 20 }, (_, i) =>
      sample({ latencyMs: 100 + i }),
    );
    const summaries = aggregateSli({
      samples,
      windowMs: LATENCY_WINDOWS["1h"],
      now,
      stages: ["asr"],
    });
    const asr = summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(20);
    expect(asr.p50).toBeCloseTo(109.5, 5);
    expect(asr.p95).toBeCloseTo(118.05, 5);
    expect(asr.p99).toBeCloseTo(118.81, 5);
  });
});

describe("evaluateLatencyAlert", () => {
  const now = 1_700_000_000_000;
  const windowMs = DEFAULT_ALERT_WINDOW_MS;

  it("does not breach when there are too few samples (avoids noisy alerts)", () => {
    const samples: LatencySample[] = Array.from(
      { length: MIN_ALERT_SAMPLE_COUNT - 1 },
      (_, i) =>
        sample({
          stage: "client.total",
          latencyMs: 2_000,
          occurredAt: now - i * 1_000,
        }),
    );
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(false);
    expect(alert.sampleCount).toBe(MIN_ALERT_SAMPLE_COUNT - 1);
  });

  it("does not breach when p95 is exactly at the threshold (strictly greater)", () => {
    // Build MIN_ALERT_SAMPLE_COUNT samples around the threshold so p95 ≈ threshold.
    const samples: LatencySample[] = Array.from(
      { length: MIN_ALERT_SAMPLE_COUNT },
      (_, i) =>
        sample({
          stage: "client.total",
          latencyMs: DEFAULT_LATENCY_THRESHOLD_MS, // p95 = 1500
          occurredAt: now - i * 1_000,
        }),
    );
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(false);
  });

  it("breaches when p95 is strictly above the threshold", () => {
    // 4 below threshold + 1 above → p95 = above.
    const samples: LatencySample[] = [
      sample({ stage: "client.total", latencyMs: 1_000, occurredAt: now - 1_000 }),
      sample({ stage: "client.total", latencyMs: 1_100, occurredAt: now - 2_000 }),
      sample({ stage: "client.total", latencyMs: 1_200, occurredAt: now - 3_000 }),
      sample({ stage: "client.total", latencyMs: 1_300, occurredAt: now - 4_000 }),
      sample({ stage: "client.total", latencyMs: 2_500, occurredAt: now - 5_000 }),
    ];
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(true);
    expect(alert.currentP95).toBeGreaterThan(DEFAULT_LATENCY_THRESHOLD_MS);
    expect(alert.sampleCount).toBe(5);
    expect(alert.firstBreachAt).toBe(now - 5_000);
    expect(alert.lastBreachAt).toBe(now - 5_000);
  });

  it("ignores non-client.total stages when computing the alert", () => {
    const samples: LatencySample[] = Array.from(
      { length: 10 },
      (_, i) =>
        sample({
          stage: "asr", // not client.total
          latencyMs: 5_000,
          occurredAt: now - i * 1_000,
        }),
    );
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(false);
    expect(alert.sampleCount).toBe(0);
  });

  it("ignores ok=false samples", () => {
    const samples: LatencySample[] = Array.from(
      { length: MIN_ALERT_SAMPLE_COUNT + 5 },
      (_, i) =>
        sample({
          stage: "client.total",
          latencyMs: 5_000,
          ok: false,
          occurredAt: now - i * 1_000,
        }),
    );
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(false);
    expect(alert.sampleCount).toBe(0);
  });

  it("excludes samples outside the window from firstBreachAt / lastBreachAt", () => {
    const inWindowAt = now - 1_000;
    const outOfWindowAt = now - windowMs - 1_000;
    const samples: LatencySample[] = [
      sample({ stage: "client.total", latencyMs: 2_000, occurredAt: outOfWindowAt }),
      ...Array.from({ length: MIN_ALERT_SAMPLE_COUNT }, (_, i) =>
        sample({
          stage: "client.total",
          latencyMs: 2_000,
          occurredAt: inWindowAt - i * 1_000,
        }),
      ),
    ];
    const alert = evaluateLatencyAlert({ samples, now, windowMs });
    expect(alert.breached).toBe(true);
    expect(alert.sampleCount).toBe(MIN_ALERT_SAMPLE_COUNT);
    // The first breach in-window is the earliest of the in-window ones.
    expect(alert.firstBreachAt).toBeGreaterThanOrEqual(inWindowAt - (MIN_ALERT_SAMPLE_COUNT - 1) * 1_000);
    expect(alert.lastBreachAt).toBe(inWindowAt);
  });

  it("surfaces the configured threshold + window so the dashboard can label the alert", () => {
    const alert = evaluateLatencyAlert({
      samples: [],
      now,
      windowMs,
      thresholdMs: 2_000,
    });
    expect(alert.thresholdMs).toBe(2_000);
    expect(alert.windowMs).toBe(windowMs);
  });
});