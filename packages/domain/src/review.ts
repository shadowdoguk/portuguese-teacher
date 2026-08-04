// Smart Review queue — pure ordering over (mode, ratings, sentences).
//
// Phase A "Smart Review" (rebuild spec §6.2):
//   - Excludes rating === 5.
//   - Excludes unrated rows.
//   - Orders: rating ASC → lastPractisedAt ASC NULLS FIRST → curriculumOrder ASC.
//   - Filters by mode (shadow ratings surface only in shadow queue).
//   - Clamps to limit (default 50, max 200).
//
// Phase B may add filter expressions and a "review count" sentinel, but
// those are out of scope for this commit.

import type { PracticeMode } from '@pt/contracts';

export interface SmartReviewRating {
  readonly sentenceId: string;
  readonly mode: PracticeMode;
  readonly rating: number;
  readonly lastPractisedAt: string | null;
}

export interface SmartReviewSentence {
  readonly sentenceId: string;
  readonly curriculumOrder: number;
}

export interface SmartReviewQueueInput {
  readonly mode: PracticeMode;
  readonly limit: number;
  readonly ratings: ReadonlyArray<SmartReviewRating>;
  readonly sentences: ReadonlyArray<SmartReviewSentence>;
}

export interface SmartReviewQueueEntry {
  readonly sentenceId: string;
  readonly rating: number;
  readonly lastPractisedAt: string | null;
  readonly curriculumOrder: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Pure: same input → same output. Order is fully deterministic;
 * ties on `(rating, lastPractisedAt)` fall through to curriculumOrder.
 *
 * The queue excludes ratings at the master threshold (5) — mastered
 * sentences are *not* due for review until they decay, which Phase A
 * does not implement (rebuild spec §6.2: "no hidden SRS in v1").
 */
export function buildSmartReviewQueue(
  input: SmartReviewQueueInput,
): ReadonlyArray<SmartReviewQueueEntry> {
  const limit = clampLimit(input.limit);
  const sentencesById = new Map<string, number>(
    input.sentences.map((s) => [s.sentenceId, s.curriculumOrder]),
  );

  const eligible = input.ratings.filter((r) => {
    if (r.mode !== input.mode) return false;
    if (r.rating === 5) return false;
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) return false;
    if (!sentencesById.has(r.sentenceId)) return false;
    return true;
  });

  const sorted = [...eligible].sort((a, b) => {
    // (1) rating ASC
    if (a.rating !== b.rating) return a.rating - b.rating;

    // (2) lastPractisedAt ASC, NULLS FIRST.
    // We model "unpractised" as lastPractisedAt === null; that goes first.
    if (a.lastPractisedAt === null && b.lastPractisedAt !== null) return -1;
    if (a.lastPractisedAt !== null && b.lastPractisedAt === null) return 1;
    if (a.lastPractisedAt !== b.lastPractisedAt) {
      return (a.lastPractisedAt ?? '').localeCompare(b.lastPractisedAt ?? '');
    }

    // (3) curriculumOrder ASC.
    return (
      (sentencesById.get(a.sentenceId) ?? Number.MAX_SAFE_INTEGER) -
      (sentencesById.get(b.sentenceId) ?? Number.MAX_SAFE_INTEGER)
    );
  });

  return sorted.slice(0, limit).map((r) => ({
    sentenceId: r.sentenceId,
    rating: r.rating,
    lastPractisedAt: r.lastPractisedAt,
    curriculumOrder: sentencesById.get(r.sentenceId) ?? 0,
  }));
}

function clampLimit(requested: number): number {
  if (!Number.isInteger(requested) || requested < 1) return DEFAULT_LIMIT;
  if (requested > MAX_LIMIT) return MAX_LIMIT;
  return requested;
}