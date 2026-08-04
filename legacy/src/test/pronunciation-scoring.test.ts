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

  // Formula regression pins (ADR-0002 §"Pronunciation Score" — free-form path).
  // The default bias weight is 0.6; combined = (1 - 0.6) * baseline + 0.6 * biasedScore.
  // baseline = mean(confidences) * 100, biasedScore = mean(biased confidences) * 100.
  it("pins the default biasWeight (0.6) combined formula — mixed match/no-match", () => {
    // baseline = (0.5 + 0.9) / 2 * 100 = 70
    // biased = [(0.5)] → biasedScore = 50
    // combined = 0.4 * 70 + 0.6 * 50 = 28 + 30 = 58
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "café", confidence: 0.5 },
          { word: "zzz", confidence: 0.9 },
        ],
        vocabBias: new Set(["café"]),
      }),
    ).toBe(58);
  });

  it("pins the default biasWeight (0.6) combined formula — all words match", () => {
    // baseline = 0.8 * 100 = 80; biasedScore = 80; combined = 80.
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "olá", confidence: 0.8 },
          { word: "café", confidence: 0.8 },
        ],
        vocabBias: new Set(["olá", "café"]),
      }),
    ).toBe(80);
  });

  it("pins the default biasWeight (0.6) combined formula — no words match the bias", () => {
    // No biased hits → returns baseline unchanged.
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "foo", confidence: 0.7 },
          { word: "bar", confidence: 0.9 },
        ],
        vocabBias: new Set(["olá"]),
      }),
    ).toBe(80);
  });

  it("clamps NaN / Infinity confidences to 0 (clamp01 returns 0 for non-finite)", () => {
    // clamp01 short-circuits on !Number.isFinite(value), so NaN, +Infinity,
    // and -Infinity all map to 0 (not 1). baseline = (0+0)/2 * 100 = 0.
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "a", confidence: Number.NaN },
          { word: "b", confidence: Number.POSITIVE_INFINITY },
          { word: "c", confidence: Number.NEGATIVE_INFINITY },
        ],
      }),
    ).toBe(0);
  });

  it("clamps negative or >1 confidences to [0, 1]", () => {
    // -0.5→0, 1.5→1; baseline = (0+1)/2 * 100 = 50.
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "a", confidence: -0.5 },
          { word: "b", confidence: 1.5 },
        ],
      }),
    ).toBe(50);
  });

  it("normalises bias hits via Unicode-aware lowercase + diacritic strip", () => {
    // "Olá" / "CAFÉ" / "São" should match a bias of ["ola","cafe","sao"].
    expect(
      scoreFromAsrConfidence({
        words: [
          { word: "Olá", confidence: 0.9 },
          { word: "CAFÉ", confidence: 0.9 },
          { word: "São", confidence: 0.9 },
        ],
        vocabBias: new Set(["ola", "cafe", "sao"]),
      }),
    ).toBe(90);
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

  // Formula regression pins (ADR-0002 §"Pronunciation Score" — drill path).
  // adjusted = raw + offset; if !Number.isFinite(adjusted) → 0; round(clamp).
  it("pins the drill calibration formula — small offset", () => {
    expect(weightedAggregateScore(70, 10)).toBe(80);
    expect(weightedAggregateScore(70, -10)).toBe(60);
  });

  it("pins the drill calibration formula — rounding", () => {
    expect(weightedAggregateScore(70.4, 0)).toBe(70);
    expect(weightedAggregateScore(70.6, 0)).toBe(71);
    expect(weightedAggregateScore(70.5, 0)).toBe(71);
  });

  it("returns 0 when raw score is NaN", () => {
    expect(weightedAggregateScore(Number.NaN, 5)).toBe(0);
  });

  it("returns 0 when offset is NaN", () => {
    expect(weightedAggregateScore(50, Number.NaN)).toBe(0);
  });

  it("returns 0 when raw score is Infinity (Number.isFinite guard)", () => {
    // adjusted = raw + offset; !Number.isFinite(Infinity + 0) → return 0
    // before clamping. Both +Infinity and -Infinity yield 0.
    expect(weightedAggregateScore(Number.POSITIVE_INFINITY, 0)).toBe(0);
    expect(weightedAggregateScore(Number.NEGATIVE_INFINITY, 0)).toBe(0);
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

  it("preserves per-phoneme identity (score, phoneme, start, end)", () => {
    const result = scoreDrillAgainstReference({
      endpointResult,
      reference: "ol",
      observed: "ol",
      calibrationOffset: 0,
    });
    expect(result.perPhoneme[0]).toEqual({
      phoneme: "o",
      score: 60,
      start: 0,
      end: 0.2,
    });
    expect(result.perPhoneme[1]).toEqual({
      phoneme: "l",
      score: 80,
      start: 0.2,
      end: 0.4,
    });
  });

  it("marks calibrated=true regardless of offset magnitude", () => {
    const result = scoreDrillAgainstReference({
      endpointResult,
      reference: "ol",
      observed: "ol",
      calibrationOffset: -50,
    });
    expect(result.calibrated).toBe(true);
    expect(result.score).toBe(20);
  });
});