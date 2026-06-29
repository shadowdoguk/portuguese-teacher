import { describe, expect, it } from "vitest";
import {
  buildCalibrationOffset,
  CALIBRATION_REFERENCES,
  computeCalibratedScore,
  normalizeAgainstBaseline,
} from "@/lib/voice-loop/pronunciation-calibration";

describe("CALIBRATION_REFERENCES", () => {
  it("ships exactly 10 pt-PT native-speaker utterances", () => {
    expect(CALIBRATION_REFERENCES).toHaveLength(10);
    for (const ref of CALIBRATION_REFERENCES) {
      expect(ref.length).toBeGreaterThan(0);
    }
  });
});

describe("buildCalibrationOffset", () => {
  // Formula: round(100 - mean(selfScores)). When self-scores all = 100, offset = 0.
  // When self-scores are lower, offset is positive (subtracted upward).
  it("returns 0 when the self-scores average 100 (perfect speaker)", () => {
    expect(buildCalibrationOffset([100, 100, 100])).toBe(0);
  });

  it("returns a positive offset when self-scores are below 100", () => {
    // mean = 50; offset = round(100 - 50) = 50
    expect(buildCalibrationOffset([50])).toBe(50);
    // mean = 70; offset = round(100 - 70) = 30
    expect(buildCalibrationOffset([60, 80])).toBe(30);
  });

  it("rounds to the nearest integer (not floor)", () => {
    // mean = 80.5; offset = round(100 - 80.5) = 20 (rounding 19.5 up).
    expect(buildCalibrationOffset([80, 81])).toBe(20);
    // mean = 79.5; offset = round(100 - 79.5) = 21 (rounding 20.5 up).
    expect(buildCalibrationOffset([79, 80])).toBe(21);
  });

  it("returns 0 for an empty input (no calibration runs)", () => {
    expect(buildCalibrationOffset([])).toBe(0);
  });

  it("matches the documented 10-utterance calibration set's anchor offset", () => {
    // The 10 native-speaker calibration references average close to 95 (typical
    // MiniMax endpoint behaviour on near-identical reference/observed pairs).
    // Offset = round(100 - 95) = 5. The test pins the offset value so any
    // change to the calibration math shows up immediately.
    expect(buildCalibrationOffset(Array(10).fill(95))).toBe(5);
  });
});

describe("normalizeAgainstBaseline", () => {
  // adjusted = raw + offset; if !Number.isFinite(adjusted) → 0; clamp to [0,100];
  // round.
  it("applies the offset and clamps the result", () => {
    expect(normalizeAgainstBaseline(80, 5)).toBe(85);
    expect(normalizeAgainstBaseline(120, 0)).toBe(100);
    expect(normalizeAgainstBaseline(-10, 0)).toBe(0);
  });

  it("preserves the raw score when offset is 0", () => {
    expect(normalizeAgainstBaseline(73, 0)).toBe(73);
  });

  it("returns 0 for NaN / Infinity inputs (Number.isFinite guard)", () => {
    expect(normalizeAgainstBaseline(Number.NaN, 5)).toBe(0);
    expect(normalizeAgainstBaseline(50, Number.NaN)).toBe(0);
    expect(normalizeAgainstBaseline(Number.POSITIVE_INFINITY, 0)).toBe(0);
    expect(normalizeAgainstBaseline(Number.NEGATIVE_INFINITY, 0)).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    expect(normalizeAgainstBaseline(70.4, 0)).toBe(70);
    expect(normalizeAgainstBaseline(70.6, 0)).toBe(71);
  });
});

describe("computeCalibratedScore", () => {
  it("is the canonical wrapper around normalizeAgainstBaseline", () => {
    expect(computeCalibratedScore(70, 10)).toBe(
      normalizeAgainstBaseline(70, 10),
    );
    expect(computeCalibratedScore(120, -10)).toBe(100);
  });

  it("matches what the runtime applies per utterance (raw + offset, clamped)", () => {
    // A real utterance with endpoint score 78 against a native-speaker baseline
    // of 95 (offset = 5) should land at 83 — same number the runtime emits.
    const offset = buildCalibrationOffset(Array(10).fill(95));
    expect(computeCalibratedScore(78, offset)).toBe(83);
  });
});