import {
  type PronunciationPhonemeScore,
  type PronunciationScoreResult,
} from "@/lib/minimax/types";

export type AsrWordConfidence = {
  word: string;
  confidence: number;
};

export type AsrScoringInput = {
  words: ReadonlyArray<AsrWordConfidence>;
  vocabBias?: ReadonlySet<string>;
  biasWeight?: number;
};

export type DrillScoringContext = {
  endpointResult: PronunciationScoreResult;
  reference: string;
  observed: string;
  calibrationOffset: number;
};

export type DrillScoringResult = {
  score: number;
  perPhoneme: ReadonlyArray<PronunciationPhonemeScore>;
  calibrated: boolean;
};

const DEFAULT_BIAS_WEIGHT = 0.6;

export function scoreFromAsrConfidence(input: AsrScoringInput): number {
  if (input.words.length === 0) return 0;
  const mean = input.words.reduce((acc, w) => acc + clamp01(w.confidence), 0) / input.words.length;
  const baseline = mean * 100;

  const bias = input.vocabBias;
  const weight = clamp01(input.biasWeight ?? DEFAULT_BIAS_WEIGHT);
  if (!bias || bias.size === 0 || weight === 0) {
    return Math.round(baseline);
  }

  // Normalise both sides of the bias lookup. Words are lowercased + diacritic-stripped
  // (see normalize below). Bias entries arrive raw from `vocabularyFor(level)` /
  // `unitBiasingVocabulary(unitId)`, which lowercase but don't strip diacritics —
  // so a learner saying "café" would never hit a bias entry of "café" without
  // normalising the bias side too. Issue #37 regression pin.
  const normalizedBias = new Set(Array.from(bias, normalize));
  const biased = input.words.filter((w) => normalizedBias.has(normalize(w.word)));
  if (biased.length === 0) {
    return Math.round(baseline);
  }
  const biasedMean = biased.reduce((acc, w) => acc + clamp01(w.confidence), 0) / biased.length;
  const biasedScore = biasedMean * 100;
  const combined = (1 - weight) * baseline + weight * biasedScore;
  return Math.round(clamp(combined, 0, 100));
}

export function weightedAggregateScore(rawScore: number, offset: number): number {
  const adjusted = rawScore + offset;
  if (!Number.isFinite(adjusted)) return 0;
  return Math.round(clamp(adjusted, 0, 100));
}

export function scoreDrillAgainstReference(ctx: DrillScoringContext): DrillScoringResult {
  const calibrated = weightedAggregateScore(ctx.endpointResult.score, ctx.calibrationOffset);
  return {
    score: calibrated,
    perPhoneme: ctx.endpointResult.perPhoneme,
    calibrated: true,
  };
}

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}