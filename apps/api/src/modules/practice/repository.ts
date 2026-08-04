// Practice repository — DB-shaped helpers for the practice routes.
//
// Layering rule (Phase A plan Global Constraints + CONTEXT.md
// "Curriculum Repository"): the repository is the only module that
// imports `db` and `db/schema`. The controller imports the typed
// functions exported here and translates between the wire shape and
// the row shape.
//
// Phase B introduces the Map-shaped `buildReviewQueue` from
// `@pt/domain` (Task 2). The repository serves it by reading
// `(sentence_id, mode, rating, last_practised_at)` per-user-per-mode
// rows from `practice_ratings` and shaping them into the
// `ReadonlyMap<sentenceId, ReviewRating>` the helper expects.
//
// The Phase A `practice/router.ts` imported `defaultDb` directly and
// inlined the upsert + query SQL. Phase B moves that into this
// repository so the controller is transport-only.

import { and, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../../db/index.js';
import { curriculumVersions, practiceRatings, sentences } from '../../db/schema.js';
import type { PracticeMode, PracticeItem } from '@pt/domain';

// ---------- Types -------------------------------------------------------

export interface RatingUpsertInput {
  userId: string;
  sentenceId: string;
  mode: PracticeMode;
  rating: number;
  clientMutationId: string;
}

export interface RatingRow {
  userId: string;
  sentenceId: string;
  mode: PracticeMode;
  rating: number;
  lastPractisedAt: Date;
}

export interface ReviewRatingRow {
  sentenceId: string;
  mode: PracticeMode;
  rating: number;
  lastPractisedAt: Date;
}

export interface ActiveCvRow {
  id: string;
}

// ---------- Reads -------------------------------------------------------

/**
 * Load the active CV id for a level. Phase B is single-level
 * (a1); the helper is shaped to accept a level anyway so Phase C
 * can pass `'a2'` without churn.
 */
export async function loadActiveCvId(
  database: Database = defaultDb,
  level: 'a1' | 'a2' = 'a1',
): Promise<string | null> {
  // The `curriculum_versions` table has no `level` column — the
  // active-CV pointer is global per Level via the `cv_<level>_<hash>`
  // id prefix (see ADR-0001 + amendment A2). We filter on the
  // `id` prefix post-fetch rather than in the WHERE clause; the
  // CV id encoding is the canonical contract for "which level".
  // Phase B Task 3 used to filter on a non-existent `level`
  // column; the chore branch surfaced the regression.
  const rows = (await database
    .select({ id: curriculumVersions.id })
    .from(curriculumVersions)
    .where(eq(curriculumVersions.active, 1))
    .limit(10)) as ActiveCvRow[];
  const prefix = `cv_${level}`;
  return rows.find((r) => r.id.startsWith(prefix))?.id ?? null;
}

/**
 * Load every sentence in a unit, projected onto the `PracticeItem`
 * shape the helpers expect. The active-CV text (textPt, textEn,
 * audioId) is the source of truth; the canonical sentence row
 * supplies the unit + order_index projection.
 */
export async function loadSentencesForUnit(
  unitId: string,
  cvId: string,
  database: Database = defaultDb,
): Promise<ReadonlyArray<PracticeItem>> {
  const rows = await database.execute(sql`
    SELECT
      s.sentence_id     AS "sentenceId",
      csv.text_pt       AS "textPt",
      csv.text_en       AS "textEn",
      csv.audio_id      AS "audioId",
      s.unit_id         AS "unitId",
      s.curriculum_order AS "orderIndex"
    FROM sentences s
    JOIN cv_sentence_versions csv
      ON csv.sentence_id = s.sentence_id
     AND csv.cv_id = ${cvId}
    WHERE s.unit_id = ${unitId}
    ORDER BY s.curriculum_order ASC
  `);
  return (rows as unknown as ReadonlyArray<PracticeItem>);
}

/**
 * Load every rating the user has written for one mode. The
 * `buildReviewQueue` helper expects a `ReadonlyMap<sentenceId,
 * ReviewRating>`; this helper returns the array and the controller
 * folds it into a Map.
 */
export async function loadRatingsForUserMode(
  userId: string,
  mode: PracticeMode,
  database: Database = defaultDb,
): Promise<ReadonlyArray<ReviewRatingRow>> {
  const rows = await database
    .select({
      sentenceId: practiceRatings.sentenceId,
      mode: practiceRatings.mode,
      rating: practiceRatings.rating,
      lastPractisedAt: practiceRatings.lastPractisedAt,
    })
    .from(practiceRatings)
    .where(and(eq(practiceRatings.userId, userId), eq(practiceRatings.mode, mode)));
  return rows.map((r) => ({
    sentenceId: r.sentenceId,
    mode: r.mode as PracticeMode,
    rating: r.rating,
    lastPractisedAt: r.lastPractisedAt,
  }));
}

// ---------- Writes ------------------------------------------------------

/**
 * Idempotent rating upsert keyed on `(user_id, client_mutation_id)`.
 * The `practice_ratings_user_mutation_idx` UNIQUE index is the
 * conflict target — the DB enforces that two rating writes with the
 * same `(user, client_mutation_id)` cannot create two rows, so a
 * retry returns the same row.
 *
 * Note: the Phase B plan's snippet suggested `ON CONFLICT
 * (user_id, sentence_id, mode)` — that target is the
 * `userSentenceIdx` and would *not* be idempotent on
 * `client_mutation_id`. The Phase A practice router already uses
 * `user_mutation_idx`; Phase B keeps that contract.
 */
export async function upsertRating(
  input: RatingUpsertInput,
  database: Database = defaultDb,
): Promise<RatingRow> {
  const now = new Date();
  const inserted = await database
    .insert(practiceRatings)
    .values({
      userId: input.userId,
      sentenceId: input.sentenceId,
      mode: input.mode,
      rating: input.rating,
      clientMutationId: input.clientMutationId,
      lastPractisedAt: now,
    })
    .onConflictDoUpdate({
      target: [practiceRatings.userId, practiceRatings.clientMutationId],
      set: { lastPractisedAt: now },
    })
    .returning({
      userId: practiceRatings.userId,
      sentenceId: practiceRatings.sentenceId,
      mode: practiceRatings.mode,
      rating: practiceRatings.rating,
      lastPractisedAt: practiceRatings.lastPractisedAt,
    });
  const row = inserted[0];
  if (!row) {
    throw new Error('practice.upsertRating: returning() produced no row');
  }
  return {
    userId: row.userId,
    sentenceId: row.sentenceId,
    mode: row.mode as PracticeMode,
    rating: row.rating,
    lastPractisedAt: row.lastPractisedAt,
  };
}

// Silence unused-import warnings on `sentences` — referenced only
// for type-only joins elsewhere; keep it exported as the canonical
// sentence reference for future helpers.
void sentences;
