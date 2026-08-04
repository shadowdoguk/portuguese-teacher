// Practice schemas — shared by @pt/api and @pt/web.
//
// Phase B supersedes the Phase A `practice.ts` (Phase A consumed the
// `clientMutationId` as a UUID and the practice queue did not require
// `unitId`). Phase B's idempotency key prefixes `cm_` (per the plan's
// `cm_<slug>` regex), and the queue is always scoped to a unit.
//
// CONTEXT.md "Listen & Repeat" / "Active Recall" lock the two modes;
// `practice_ratings(user_id, sentence_id, mode)` is the only rating
// surface and is idempotent on `client_mutation_id`. The Smart Review
// queue ordering is rating ASC → last_practised_at ASC NULLS FIRST →
// curriculum_order ASC, encoded by the API response shape (the queue
// order is established server-side).

import { z } from 'zod';

// ---------- Mode ---------------------------------------------------------

/** Practice mode enum — locked by CONTEXT.md "Listen & Repeat" / "Active Recall". */
export const ratingModeSchema = z.enum(['shadow', 'recall']);
export type RatingMode = z.infer<typeof ratingModeSchema>;

/** Backward-compat alias for the Phase A export name. */
export const practiceModeSchema = ratingModeSchema;
export type PracticeMode = RatingMode;

// ---------- Self-rating semantics (rebuild spec §6.1) -------------------

/** 1–5 self-rating; CHECK constraint at the DB layer. */
export const practiceRatingValueSchema = z.number().int().min(1).max(5);
export type PracticeRatingValue = z.infer<typeof practiceRatingValueSchema>;

// ---------- Practice item (queue + review list) -------------------------

/** A practice item shown to the learner in Shadow / Recall / Smart Review. */
export const practiceItemSchema = z.object({
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  /** Portuguese sentence text from the active CV. */
  textPt: z.string().min(1),
  /** English prompt / translation. */
  textEn: z.string().min(1),
  /** NULL until Phase C back-fills audio rows (CONTEXT.md "Pre-Phase C Audio"). */
  audioId: z.string().nullable(),
  /** Unit this item belongs to. */
  unitId: z.string(),
  /** Order index within the unit. */
  orderIndex: z.number().int().nonnegative(),
});

export type PracticeItem = z.infer<typeof practiceItemSchema>;

// ---------- Ratings (POST /api/practice/ratings) ------------------------

/** Client-mutation identifier — idempotency key. */
export const clientMutationIdSchema = z.string().regex(/^cm_[A-Za-z0-9_-]+$/);

/** Input for `POST /api/practice/ratings`. */
export const ratingWriteSchema = z.object({
  clientMutationId: clientMutationIdSchema,
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  mode: ratingModeSchema,
  rating: practiceRatingValueSchema,
});

export type RatingWrite = z.infer<typeof ratingWriteSchema>;

/** Backward-compat alias for the Phase A export name. */
export const practiceRatingInputSchema = ratingWriteSchema;
export type PracticeRatingInput = RatingWrite;

/** Stored practice rating row — what the API echoes back. */
export const practiceRatingSchema = z.object({
  userId: z.string().regex(/^usr_[a-z0-9]+$/),
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  mode: ratingModeSchema,
  rating: practiceRatingValueSchema,
  /** ISO-8601 timestamp of the most recent rating write. */
  lastPractisedAt: z.string().datetime(),
});

export type PracticeRating = z.infer<typeof practiceRatingSchema>;

// ---------- Practice queue (GET /api/practice/queue) --------------------

export const practiceQueueQuerySchema = z.object({
  unitId: z.string().regex(/^unit_[a-z0-9_]+$/),
  mode: ratingModeSchema,
  filter: z.string().max(200).optional(),
  match: z.enum(['or', 'all']).default('or').optional(),
});

export type PracticeQueueQuery = z.infer<typeof practiceQueueQuerySchema>;

export const practiceQueueResponseSchema = z.object({
  items: z.array(practiceItemSchema),
});

export type PracticeQueueResponse = z.infer<typeof practiceQueueResponseSchema>;

// ---------- Smart Review (GET /api/practice/review) ---------------------

export const smartReviewQuerySchema = z.object({
  mode: ratingModeSchema,
  /** Maximum items to return; defaults to 50, capped at 200. */
  limit: z.number().int().min(1).max(200).default(50),
});

export type SmartReviewQuery = z.infer<typeof smartReviewQuerySchema>;

/** Review queue items carry the user's current rating so the UI can
 * sort / group by it. */
export const reviewQueueResponseSchema = z.object({
  items: z.array(
    practiceItemSchema.extend({ rating: practiceRatingValueSchema }),
  ),
});

export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

/** Backward-compat alias for the Phase A export name. */
export const smartReviewQueueResponseSchema = reviewQueueResponseSchema;
export type SmartReviewQueueResponse = ReviewQueueResponse;
