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
  it("is 0 when every self-score is 100 (no drift)", () => {
    const scores = CALIBRATION_REFERENCES.map(() => 100);
    expect(buildCalibrationOffset(scores)).toBe(0);
  });

  it("is positive when the model under-reports native speakers", () => {
    const scores = CALIBRATION_REFERENCES.map(() => 90);
    expect(buildCalibrationOffset(scores)).toBe(10);
  });

  it("is negative when the model over-reports native speakers", () => {
    const scores = CALIBRATION_REFERENCES.map(() => 110);
    expect(buildCalibrationOffset(scores)).toBe(-10);
  });

  it("rounds to the nearest integer", () => {
    const scores = CALIBRATION_REFERENCES.map(() => 91.4);
    expect(buildCalibrationOffset(scores)).toBe(9);
  });
});

describe("normalizeAgainstBaseline", () => {
  it("clamps to [0, 100] even if the offset would push the score past a bound", () => {
    expect(normalizeAgainstBaseline(95, 10)).toBe(100);
    expect(normalizeAgainstBaseline(5, -10)).toBe(0);
  });

  it("leaves the score unchanged when the offset is 0", () => {
    expect(normalizeAgainstBaseline(73, 0)).toBe(73);
  });

  it("rounds to the nearest integer", () => {
    expect(normalizeAgainstBaseline(73.4, 0)).toBe(73);
    expect(normalizeAgainstBaseline(73.6, 0)).toBe(74);
  });
});

describe("computeCalibratedScore", () => {
  it("combines an offset and a raw score", () => {
    const offset = buildCalibrationOffset(CALIBRATION_REFERENCES.map(() => 88));
    expect(computeCalibratedScore(80, offset)).toBe(92);
  });
});