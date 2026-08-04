// Rating semantics — the rebuild spec §6.1 1..5 scale and the
// idempotent-upsert validator.
//
// Phase A "Self-Rating Semantics":
//   1 = barely recognized or produced
//   2 = significant help required
//   3 = partly secure but hesitant
//   4 = correct with minor hesitation
//   5 = confident and fluent for the mode
//
// "Mastered in mode" is *derived* — a rating of 5 in that mode. There
// is no separate mastered flag; lowering a rating immediately removes
// mastery (CONTEXT.md "Self-Rating Semantics" + "Refresh Reuse
// Compromise").
//
// Idempotency on the same client_mutation_id lets the client retry a
// rating write without creating duplicate rows; the API layer
// enforces the PK-level constraint, but the validator catches
// malformed input before the round-trip.

import {
  practiceModeSchema,
  practiceRatingValueSchema,
  practiceRatingInputSchema,
  type PracticeMode,
  type PracticeRatingInput,
} from '@pt/contracts';

export type RatingSemantics =
  | 'barely-recognized'
  | 'significant-help'
  | 'partly-secure'
  | 'minor-hesitation'
  | 'confident';

const RATING_SEMANTICS_MAP: Readonly<Record<1 | 2 | 3 | 4 | 5, RatingSemantics>> = Object.freeze({
  1: 'barely-recognized',
  2: 'significant-help',
  3: 'partly-secure',
  4: 'minor-hesitation',
  5: 'confident',
});

/** Returns the named band for a 1..5 rating; throws on out-of-range input. */
export function ratingSemantics(value: number): RatingSemantics {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new RangeError(
      `ratingSemantics: rating must be an integer in [1, 5]; got ${String(value)}`,
    );
  }
  return RATING_SEMANTICS_MAP[value as 1 | 2 | 3 | 4 | 5];
}

/** Mastery is derived — rating 5 in that mode = mastered. */
export function isMasteredInMode(rating: number | null | undefined): boolean {
  return rating === 5;
}

// ---------- Idempotent rating validation --------------------------------

export type RatingValidationOk = { ok: true; value: PracticeRatingInput };
export type RatingValidationErr = {
  ok: false;
  code: 'validation_failed';
  message: string;
  /** The fields that failed — opaque to the wire but useful for logs. */
  issues: ReadonlyArray<string>;
};
export type RatingValidationResult = RatingValidationOk | RatingValidationErr;

/**
 * Validates a rating write before it reaches the API. Pure: same input
 * yields the same verdict. The shape this accepts is the same shape the
 * Phase B `POST /api/practice/ratings` endpoint will receive, with one
 * addition: the `userId` is required because mastery is per-user
 * (CONTEXT.md "Per-Learner Mastery").
 */
export function validateIdempotentRating(input: {
  userId: string;
  sentenceId: string;
  mode: PracticeMode;
  rating: number;
  clientMutationId: string;
}): RatingValidationResult {
  const parsed = practiceRatingInputSchema.safeParse({
    clientMutationId: input.clientMutationId,
    sentenceId: input.sentenceId,
    mode: input.mode,
    rating: input.rating,
  });

  if (parsed.success) {
    return {
      ok: true,
      value: {
        clientMutationId: parsed.data.clientMutationId,
        sentenceId: parsed.data.sentenceId,
        mode: parsed.data.mode,
        rating: parsed.data.rating,
      },
    };
  }

  // Defensive guards the Zod schema does not enforce (it's @pt/domain's
  // job to reject user_id and rating-with-fraction issues with stable
  // messages; the schema gives us a typed error path).
  const issues: string[] = [];
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    issues.push('rating must be an integer in [1, 5]');
  }
  if (!practiceModeSchema.safeParse(input.mode).success) {
    issues.push('mode must be one of {shadow, recall}');
  }
  for (const issue of parsed.error.issues) {
    issues.push(`${issue.path.join('.') || '<root>'}: ${issue.message}`);
  }

  return {
    ok: false,
    code: 'validation_failed',
    message: issues[0] ?? 'Rating input failed validation',
    issues,
  };
}

/** Locked at 1..5 — re-exported for callers that prefer the runtime validator. */
export { practiceRatingValueSchema };