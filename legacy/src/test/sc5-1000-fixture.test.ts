import { describe, expect, it } from "vitest";
import { summariseSampling, shouldSample } from "@/lib/sc5/sampler";

describe("SC-5 1000-utterance acceptance (issue #35)", () => {
  it("1000 contiguous utteranceIds produce exactly 10 sampled rows (fixture pinned)", () => {
    // A known fixture: starting at id `u-621`, the contiguous 1000-id range
    // `u-621..u-1620` hashes (FNV-1a 32-bit, bucket size 10_000, threshold 100)
    // to exactly 10 sampled ids. The test pins this number so any change to
    // the hash function, the bucket size, or the threshold shows up as a
    // test failure.
    const ids = Array.from({ length: 1000 }, (_, i) => `u-${621 + i}`);
    const sampled = ids.filter((id) => shouldSample(id));
    expect(sampled).toHaveLength(10);
  });

  it("10_000 utterances stay within ±0.5 percentage points of the 1 % target", () => {
    const ids = Array.from({ length: 10_000 }, (_, i) => `u-${i}`);
    const summary = summariseSampling(ids);
    expect(summary.total).toBe(10_000);
    // ±0.5 pp = ±50 rows around 100.
    expect(summary.sampled).toBeGreaterThanOrEqual(50);
    expect(summary.sampled).toBeLessThanOrEqual(150);
  });
});