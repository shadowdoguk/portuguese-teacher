import { describe, expect, it } from "vitest";
import {
  SC5_SAMPLE_RATE,
  fnv1a32,
  shouldSample,
  summariseSampling,
} from "@/lib/sc5";

describe("SC-5 sampler", () => {
  it("exports a 1% sample rate", () => {
    expect(SC5_SAMPLE_RATE).toBe(0.01);
  });

  it("FNV-1a 32-bit is deterministic across calls", () => {
    expect(fnv1a32("utterance-1")).toBe(fnv1a32("utterance-1"));
    expect(fnv1a32("utterance-1")).not.toBe(fnv1a32("utterance-2"));
  });

  it("returns a 32-bit unsigned integer", () => {
    const h = fnv1a32("hello-world");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("shouldSample is deterministic for the same utteranceId", () => {
    const id = "utterance-abc";
    expect(shouldSample(id)).toBe(shouldSample(id));
  });

  it("summariseSampling produces ~1% over 10,000 utterances", () => {
    const ids = Array.from({ length: 10_000 }, (_, i) => `utterance-${i}`);
    const summary = summariseSampling(ids);
    // 1% over 10,000 → 100 ± tolerance. Allow ±0.5% (50 rows).
    expect(summary.total).toBe(10_000);
    expect(summary.sampled).toBeGreaterThanOrEqual(50);
    expect(summary.sampled).toBeLessThanOrEqual(150);
    expect(summary.rate).toBeGreaterThan(0.005);
    expect(summary.rate).toBeLessThan(0.015);
  });

  it("shouldSample with sampleRate=0 returns false for every id", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `u-${i}`);
    expect(ids.every((id) => !shouldSample(id, 0))).toBe(true);
  });

  it("shouldSample with sampleRate=1 returns true for every id", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `u-${i}`);
    expect(ids.every((id) => shouldSample(id, 1))).toBe(true);
  });

  it("summariseSampling handles an empty input", () => {
    expect(summariseSampling([])).toEqual({ total: 0, sampled: 0, rate: 0 });
  });

  it("shouldSample with NaN rate returns false", () => {
    expect(shouldSample("u-1", Number.NaN)).toBe(false);
  });

  it("shouldSample with negative rate returns false", () => {
    expect(shouldSample("u-1", -0.1)).toBe(false);
  });

  it("hash distribution is roughly uniform across [0, 9999]", () => {
    const ids = Array.from({ length: 50_000 }, (_, i) => `utt-${i}`);
    const buckets = new Array<number>(10).fill(0);
    for (const id of ids) {
      const slot = Math.floor((fnv1a32(id) % 10_000) / 1_000);
      buckets[slot] = (buckets[slot] ?? 0) + 1;
    }
    const mean = ids.length / 10;
    for (const count of buckets) {
      // Each bucket should be within 10% of the mean (5,000 ± 500)
      expect(count).toBeGreaterThan(mean * 0.9);
      expect(count).toBeLessThan(mean * 1.1);
    }
  });
});