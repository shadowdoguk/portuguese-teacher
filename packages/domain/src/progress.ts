// Progress aggregation — pure snapshot of a learner's mastery in one
// mode, given their ratings and the unit's sentence set.
//
// Phase A "Mastery" (rebuild spec §6.1):
//   - Denominator is "all published sentences in the unit" (or in a
//     collection, Phase B).
//   - Numerator is rating-5-in-mode.
//   - Unit-level progress also records six-stage completion — that is
//     carried verbatim from the input (stages are *not* computed
//     here; Phase B's nextStageRecommendation is the consumer).

import type { PracticeMode } from '@pt/contracts';

export interface MasterySnapshotRating {
  readonly sentenceId: string;
  readonly mode: PracticeMode;
  readonly rating: number;
}

export interface MasterySnapshotSentence {
  readonly sentenceId: string;
}

export interface MasterySnapshotInput {
  readonly mode: PracticeMode;
  readonly unitSentences: ReadonlyArray<MasterySnapshotSentence>;
  readonly ratings: ReadonlyArray<MasterySnapshotRating>;
  readonly completedStages: ReadonlyArray<string>;
}

export interface MasterySnapshot {
  /** Fraction of unit sentences mastered in this mode, in [0, 1]. 0 when unit is empty. */
  readonly unitMastery: number;
  /** Distinct sentences with any rating in this mode. */
  readonly sentencesPractised: number;
  /** Distinct sentences with rating === 5 in this mode. */
  readonly sentencesMastered: number;
  /** Pass-through of the input's `completedStages` (Phase B computes nextStageRecommendation). */
  readonly stagesCompleted: ReadonlyArray<string>;
}

/**
 * Pure: same input → same snapshot. No rounding; consumers can format.
 * NaN-safe: an empty unit yields `unitMastery: 0`, never `NaN`.
 */
export function aggregateProgress(input: MasterySnapshotInput): MasterySnapshot {
  const seenInMode = new Set<string>();
  const masteredInMode = new Set<string>();
  const unitSet = new Set(input.unitSentences.map((s) => s.sentenceId));

  for (const r of input.ratings) {
    if (r.mode !== input.mode) continue;
    if (!unitSet.has(r.sentenceId)) continue;
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) continue;
    seenInMode.add(r.sentenceId);
    if (r.rating === 5) {
      masteredInMode.add(r.sentenceId);
    }
  }

  const total = input.unitSentences.length;
  const unitMastery = total === 0 ? 0 : masteredInMode.size / total;

  return {
    unitMastery,
    sentencesPractised: seenInMode.size,
    sentencesMastered: masteredInMode.size,
    stagesCompleted: [...input.completedStages],
  };
}