// Practice schemas — shared by @pt/api and @pt/web.
//
// Phase A emits two practice modes (CONTEXT.md "Listen & Repeat" and
// "Active Recall"). `practice_ratings(user_id, sentence_id, mode)` is
// the only rating surface; idempotent on `client_mutation_id`. The
// Smart Review queue ordering is rating ASC → last_practised_at ASC
// NULLS FIRST → curriculum_order ASC, encoded by the API response
// shape (the queue order is established server-side).

import { z } from 'zod';

// ---------- Mode ---------------------------------------------------------

/** Practice mode enum — locked by CONTEXT.md "Listen & Repeat" / "Active Recall". */
export const practiceModeSchema = z.enum(['shadow', 'recall']);
export type PracticeMode = z.infer<typeof practiceModeSchema>;

// ---------- Self-rating semantics (rebuild spec §6.1) -------------------

/** 1–5 self-rating; CHECK constraint at the DB layer. */
export const practiceRatingValueSchema = z.number().int().min(1).max(5);
export type PracticeRatingValue = z.infer<typeof practiceRatingValueSchema>;

// ---------- Practice item (queue + review list) -------------------------

/** A practice item shown to the learner in Shadow / Recall / Smart Review. */
export const practiceItemSchema = z.object({
  sentenceId: z.string().regex(/^sen_[a-z0-9][a-z0-9_]*$/),
  /** Portuguese sentence text from the active CV. */
  textPt: z.string().min(1),
  /** English prompt / translation. */
  textEn: z.string().min(1),
  /** NULL until Phase C back-fills audio rows (CONTEXT.md "Pre-Phase C Audio"). */
  audioId: z.string().nullable(),
  /** Order index within the active CV's unit. */
  curriculumOrder: z.number().int().nonnegative(),
});

export type PracticeItem = z.infer<typeof practiceItemSchema>;

// ---------- Ratings (POST /api/practice/ratings) ------------------------

/** Client-mutation identifier — idempotency key. */
export const clientMutationIdSchema = z.string().uuid();

/** Input for `POST /api/practice/ratings`. */
export const practiceRatingInputSchema = z.object({
  clientMutationId: clientMutationIdSchema,
  sentenceId: z.string().regex(/^sen_[a-z0-9][a-z0-9_]*$/),
  mode: practiceModeSchema,
  rating: practiceRatingValueSchema,
});

export type PracticeRatingInput = z.infer<typeof practiceRatingInputSchema>;

/** Stored practice rating row — what the API echoes back. */
export const practiceRatingSchema = z.object({
  userId: z.string().regex(/^usr_[a-z0-9]+$/),
  sentenceId: z.string().regex(/^sen_[a-z0-9][a-z0-9_]*$/),
  mode: practiceModeSchema,
  rating: practiceRatingValueSchema,
  /** ISO-8601 timestamp of the most recent rating write. */
  lastPractisedAt: z.string().datetime(),
});

export type PracticeRating = z.infer<typeof practiceRatingSchema>;

// ---------- Practice queue (GET /api/practice/queue) --------------------

/** Filter expression: comma-separated terms; default OR, "match=all" switches to AND. */
export const filterExpressionSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(/^[\p{L}\p{N}\s,_\-'.!?]+$/u);

export const matchModeSchema = z.enum(['any', 'all']);

export const practiceQueueQuerySchema = z.object({
  unitId: z.string().regex(/^unit_[a-z0-9][a-z0-9_]*$/).optional(),
  mode: practiceModeSchema,
  filter: filterExpressionSchema.optional(),
  match: matchModeSchema.default('any'),
});

export type PracticeQueueQuery = z.infer<typeof practiceQueueQuerySchema>;

export const practiceQueueResponseSchema = z.object({
  items: z.array(practiceItemSchema),
});

export type PracticeQueueResponse = z.infer<typeof practiceQueueResponseSchema>;

// ---------- Smart Review (GET /api/practice/review) ---------------------

export const smartReviewQuerySchema = z.object({
  mode: practiceModeSchema,
  /** Maximum items to return; defaults to 50, capped at 200. */
  limit: z.number().int().min(1).max(200).default(50),
});

export type SmartReviewQuery = z.infer<typeof smartReviewQuerySchema>;

export const smartReviewQueueResponseSchema = z.object({
  items: z.array(practiceItemSchema),
});

export type SmartReviewQueueResponse = z.infer<typeof smartReviewQueueResponseSchema>;
