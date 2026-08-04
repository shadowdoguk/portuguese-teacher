// Smart Review queue builder — pure ordering over (ratings, sentences).
//
// Per CONTEXT.md "Smart Review" + rebuild spec §6.2:
//   - Excludes rating === 5 (mastered in this mode).
//   - Excludes unrated rows.
//   - Excludes ratings of the wrong mode (Shadow ratings surface only
//     in Shadow queue).
//   - Orders: rating ASC → lastPractisedAt ASC NULLS FIRST →
//     orderIndex ASC.
//   - Clamps to limit (default 50, max 200 — the API layer enforces
//     the cap; this helper trusts the caller).
//
// The `review.ts` module (Phase A) ships `buildSmartReviewQueue` over
// the schema-based `SmartReviewRating` / `SmartReviewSentence`
// interfaces. This Phase B helper takes a `ReadonlyMap` of
// `ReviewRating` values keyed by sentenceId, which is the shape the
// Phase B Practice API query returns. The two helpers are not
// duplicates — `buildSmartReviewQueue` is Drizzle-shape and
// `buildReviewQueue` is Map-shape — they coexist by design.

import type { PracticeItem, PracticeMode } from './types.js';

export type ReviewRating = {
  mode: PracticeMode;
  rating: number | null;
  lastPractisedAt: Date | null;
};

export function buildReviewQueue(
  ratings: ReadonlyMap<string, ReviewRating>,
  sentences: ReadonlyArray<PracticeItem>,
  mode: PracticeMode,
  limit: number,
): ReadonlyArray<PracticeItem> {
  const candidates: Array<{
    sentence: PracticeItem;
    rating: number;
    last: Date | null;
  }> = [];
  for (const s of sentences) {
    const r = ratings.get(s.sentenceId);
    if (!r) continue;
    if (r.mode !== mode) continue;
    if (r.rating === null) continue;
    if (r.rating < 1 || r.rating > 4) continue; // excludes 5 (mastered) and out-of-range
    candidates.push({ sentence: s, rating: r.rating, last: r.lastPractisedAt });
  }
  candidates.sort((a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating;
    if (a.last === null && b.last === null) {
      return a.sentence.orderIndex - b.sentence.orderIndex;
    }
    if (a.last === null) return -1;
    if (b.last === null) return 1;
    return a.last.getTime() - b.last.getTime();
  });
  return candidates.slice(0, limit).map((c) => c.sentence);
}
