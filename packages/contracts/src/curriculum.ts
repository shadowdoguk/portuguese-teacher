// Curriculum schemas — shared by @pt/api and @pt/web.
//
// Hierarchy (rebuild spec §5.1):
//   Curriculum → Level → Unit → {Vocabulary, Grammar, Pronunciation,
//   Sentence, Island, Scenario}
// Curriculum Versions (cv_<sha256[:16]>) carry the active pointer per
// level (partial unique index `WHERE active = true`); cv_sentence_versions
// is the per-(CV, sentence) projection table that lets
// practice_ratings(user_id, sentence_id, mode) keep a globally-stable
// PK while recording per-CV text revisions (ADR-0001 §4).

import { z } from 'zod';

// ---------- ID-prefixed primitives (Phase A plan Global Constraints) ----

/** `cv_<16-hex>` Curriculum Version ID. */
export const cvIdSchema = z.string().regex(/^cv_[0-9a-f]{16}$/);

/** `unit_<slug>` Unit ID. */
export const unitIdSchema = z.string().regex(/^unit_[a-z0-9][a-z0-9_]*$/);

/** `sen_<slug>` Sentence ID. */
export const sentenceIdSchema = z.string().regex(/^sen_[a-z0-9][a-z0-9_]*$/);

/** `isl_<slug>` Island ID. */
export const islandIdSchema = z.string().regex(/^isl_[a-z0-9][a-z0-9_]*$/);

/** `scn_<slug>` Conversation Scenario ID. */
export const scenarioIdSchema = z.string().regex(/^scn_[a-z0-9][a-z0-9_]*$/);

// ---------- Content lifecycle (CONTEXT.md "Content Lifecycle") ----------

export const contentStatusSchema = z.enum([
  'draft',
  'expert_reviewed',
  'audio_reviewed',
  'published',
]);

export type ContentStatus = z.infer<typeof contentStatusSchema>;

// ---------- CEFR Levels --------------------------------------------------

/** A1 or A2 in Phase A. B1+ deferred. */
export const levelSchema = z.enum(['a1', 'a2']);
export type Level = z.infer<typeof levelSchema>;

// ---------- Sentences ----------------------------------------------------

/** A sentence in a unit's vocabulary pool (Phase A only ships pt-PT). */
export const sentenceSchema = z.object({
  sentenceId: sentenceIdSchema,
  textPt: z.string().min(1),
  textEn: z.string().min(1),
  /** Vocabulary lesson refs this sentence references. */
  vocabRefs: z.array(z.string()).default([]),
  /** Grammar lesson refs. */
  grammarRefs: z.array(z.string()).default([]),
  /** Pronunciation lesson refs. */
  pronunciationRefs: z.array(z.string()).default([]),
  /** Island refs the sentence appears in. */
  islandRefs: z.array(islandIdSchema).default([]),
  /** Free-form tags for filter (CONTEXT.md "Filter"). */
  tags: z.array(z.string()).default([]),
  /** Order index within the unit. */
  curriculumOrder: z.number().int().nonnegative(),
  /** Status — only `published` surfaces on learner endpoints. */
  status: contentStatusSchema,
});

export type Sentence = z.infer<typeof sentenceSchema>;

/**
 * Per-(CV, sentence) projection (ADR-0001 §4). Lets `practice_ratings`
 * keep a globally-stable `(user_id, sentence_id, mode)` PK while
 * recording each CV's exact Portuguese and English text. Learners see
 * the active CV's text on every read.
 */
export const cvSentenceVersionSchema = z.object({
  cvId: cvIdSchema,
  sentenceId: sentenceIdSchema,
  textPt: z.string().min(1),
  textEn: z.string().min(1),
  /** NULL until Phase C back-fills audio rows. */
  audioId: z.string().nullable(),
  /** NULL until expert review stamps the text. */
  textReviewedAt: z.string().datetime().nullable(),
  /** NULL until Phase C's listening-test gate stamps the audio. */
  audioReviewedAt: z.string().datetime().nullable(),
});

export type CvSentenceVersion = z.infer<typeof cvSentenceVersionSchema>;

// ---------- Units, Levels, Islands --------------------------------------

/** Island — thematic bundle (dialogues, short stories, standalone). */
export const islandSchema = z.object({
  islandId: islandIdSchema,
  title: z.string().min(1),
  /** Island sentences, ordered by `orderIndex`. */
  sentenceIds: z.array(sentenceIdSchema),
});

export type Island = z.infer<typeof islandSchema>;

/** Unit summary — used by Home and `GET /api/curriculum`. */
export const unitSummarySchema = z.object({
  unitId: unitIdSchema,
  level: levelSchema,
  title: z.string().min(1),
  summary: z.string(),
  /** Number of `published` sentences in the unit. */
  sentenceCount: z.number().int().nonnegative(),
  /** Number of islands published in the unit (≥1 per rebuild spec §5.2). */
  islandCount: z.number().int().nonnegative(),
});

export type UnitSummary = z.infer<typeof unitSummarySchema>;

/** Unit detail — full payload for `GET /api/curriculum/units/:unitId`. */
export const unitDetailSchema = unitSummarySchema.extend({
  sentences: z.array(sentenceSchema),
  islands: z.array(islandSchema),
  /** Conversation scenarios on the unit (≥1 per rebuild spec §5.2). */
  scenarios: z.array(z.lazy(() => scenarioIdSchema)),
});

export type UnitDetail = z.infer<typeof unitDetailSchema>;

/** `GET /api/curriculum` — top-level response. */
export const curriculumResponseSchema = z.object({
  levels: z.array(
    z.object({
      level: levelSchema,
      activeCvId: cvIdSchema.nullable(),
      units: z.array(unitSummarySchema),
    }),
  ),
});

export type CurriculumResponse = z.infer<typeof curriculumResponseSchema>;

/** `GET /api/curriculum/levels/:levelId` response. */
export const levelResponseSchema = z.object({
  level: levelSchema,
  activeCvId: cvIdSchema.nullable(),
  units: z.array(unitSummarySchema),
});

export type LevelResponse = z.infer<typeof levelResponseSchema>;

// Forward ref so unitDetailSchema can reference the scenario id type.
// `scenarioIdSchema` lives in `./conversation.js`. We declare a local
// re-declaration here so `curriculum.ts` does not have to import from
// `conversation.ts` (which would create a sibling cycle once that
// module also references the unit schema).
const scenarioIdSchema = z
  .string()
  .regex(/^scn_[a-z0-9][a-z0-9_]*$/);
