import { describe, expect, it } from "vitest";
import {
  scoreDrillAgainstReference,
  scoreFromAsrConfidence,
  weightedAggregateScore,
  type DrillScoringContext,
} from "@/lib/voice-loop/pronunciation-scoring";
import type { PronunciationScoreResult } from "@/lib/minimax/types";

describe("scoreFromAsrConfidence", () => {
  it("returns 0 when there are no ASR words", () => {
    expect(scoreFromAsrConfidence({ words: [] })).toBe(0);
  });

  it("returns the mean confidence when no vocab bias is applied", () => {
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "olá", confidence: 0.9 },
          { word: "mundo", confidence: 0.7 },
        ],
      }),
    ).toBe(80);
  });

  it("weights vocab matches higher than out-of-vocab words", () => {
    const score = scoreFromAsrConfidence({
      words: [
        { word: "olá", confidence: 0.9 },
        { word: "xyz", confidence: 0.9 },
      ],
      vocabBias: new Set(["olá"]),
      biasWeight: 1.0,
    });
    expect(score).toBeGreaterThan(80);
  });

  it("ignores the bias when biasWeight is 0", () => {
    const biased = scoreFromAsrConfidence({
      words: [{ word: "olá", confidence: 0.9 }],
      vocabBias: new Set(["olá"]),
      biasWeight: 0,
    });
    const flat = scoreFromAsrConfidence({
      words: [{ word: "olá", confidence: 0.9 }],
    });
    expect(biased).toBe(flat);
  });

  it("falls back to the overall confidence when bias is empty", () => {
    expect(
      scoreFromAsrConfidence({
        words: [{ word: "x", confidence: 0.5 }],
        vocabBias: new Set(),
        biasWeight: 1.0,
      }),
    ).toBe(50);
  });
});

describe("weightedAggregateScore", () => {
  it("applies the calibration offset and clamps to [0, 100]", () => {
    expect(weightedAggregateScore(120, -10)).toBe(100);
    expect(weightedAggregateScore(-5, 10)).toBe(5);
  });

  it("preserves the raw score when offset is 0", () => {
    expect(weightedAggregateScore(73, 0)).toBe(73);
  });
});

describe("scoreDrillAgainstReference", () => {
  const endpointResult: PronunciationScoreResult = {
    score: 70,
    perPhoneme: [
      { phoneme: "o", score: 60, start: 0, end: 0.2 },
      { phoneme: "l", score: 80, start: 0.2, end: 0.4 },
    ],
  };

  it("returns the endpoint score + per-phoneme details, calibrated", () => {
    const result = scoreDrillAgainstReference({
      endpointResult,
      reference: "ol",
      observed: "ol",
      calibrationOffset: 10,
    } satisfies DrillScoringContext);
    expect(result.score).toBe(80);
    expect(result.perPhoneme).toHaveLength(2);
    expect(result.calibrated).toBe(true);
  });

  it("keeps the score in [0, 100] even with a large offset", () => {
    const result = scoreDrillAgainstReference({
      endpointResult,
      reference: "ol",
      observed: "ol",
      calibrationOffset: 100,
    });
    expect(result.score).toBe(100);
  });
});