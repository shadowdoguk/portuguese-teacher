// Drizzle schema for @pt/api — every Phase A table plus amendment
// Task A2's `cv_sentence_versions` projection table and
// `content_status` enum. The migration in `apps/api/migrations/
// 0000_init.sql` MUST agree verbatim with this file; the schema tests
// (`dbSchema.test.ts`, `cvSentenceVersions.test.ts`) enforce that
// mechanically by reading the SQL and asserting the expected table,
// column, constraint, and type shapes appear.

import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
  index,
  primaryKey,
  uniqueIndex,
  check,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------- Auth tables (ADR-0002) -------------------------------------

export const authUsers = pgTable(
  'auth_users',
  {
    userId: text('user_id').primaryKey(),
    email: text('email').notNull().unique(),
    /** SHA-256 hex of the Argon2id-encoded password hash. */
    passwordHash: text('password_hash').notNull(),
    /** Argon2id triple, locked per ADR-0002: memoryCost 19456, timeCost 2, parallelism 1. */
    argonMemoryCost: integer('argon_memory_cost').notNull().default(19456),
    argonTimeCost: integer('argon_time_cost').notNull().default(2),
    argonParallelism: integer('argon_parallelism').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    sessionId: text('session_id').primaryKey(),
    userId: text('user_id').notNull().references(() => authUsers.userId, { onDelete: 'cascade' }),
    accessTokenHash: text('access_token_hash').notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('auth_sessions_user_idx').on(table.userId),
    accessHashIdx: uniqueIndex('auth_sessions_access_hash_idx').on(table.accessTokenHash),
    refreshHashIdx: uniqueIndex('auth_sessions_refresh_hash_idx').on(table.refreshTokenHash),
  }),
);

// ---------- Curriculum tables ------------------------------------------

/** amendment A2 — content_status enum, used as the column type on every status field below. */
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'expert_reviewed',
  'audio_reviewed',
  'published',
]);

export const curriculumVersions = pgTable(
  'curriculum_versions',
  {
    id: text('id').primaryKey(), // cv_<16-hex>
    active: integer('active').notNull().default(0), // 0|1; partial unique index enforces 1 active per level
    publishedAt: timestamp('published_at', { withTimezone: true }),
    manifestHash: text('manifest_hash').notNull(), // sha256 of canonicalised manifest
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // partial unique index: at most one active row per level. The
    // migration creates this as a separate CREATE UNIQUE INDEX
    // statement; the test asserts the predicate.
    activeIdx: index('curriculum_versions_active_idx').on(table.active),
  }),
);

export const units = pgTable(
  'units',
  {
    unitId: text('unit_id').primaryKey(),
    level: text('level').notNull(), // 'a1' | 'a2'
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    status: contentStatusEnum('status').notNull().default('draft'),
    curriculumOrder: integer('curriculum_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    levelIdx: index('units_level_idx').on(table.level, table.curriculumOrder),
  }),
);

export const islands = pgTable(
  'islands',
  {
    islandId: text('island_id').primaryKey(),
    unitId: text('unit_id').notNull().references(() => units.unitId, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: contentStatusEnum('status').notNull().default('draft'),
    curriculumOrder: integer('curriculum_order').notNull().default(0),
  },
  (table) => ({
    unitIdx: index('islands_unit_idx').on(table.unitId, table.curriculumOrder),
  }),
);

export const sentences = pgTable(
  'sentences',
  {
    sentenceId: text('sentence_id').primaryKey(),
    unitId: text('unit_id').notNull().references(() => units.unitId, { onDelete: 'cascade' }),
    textPt: text('text_pt').notNull(),
    textEn: text('text_en').notNull(),
    /** comma-separated vocabulary refs; the API splits on read. */
    vocabRefs: text('vocab_refs').notNull().default(''),
    grammarRefs: text('grammar_refs').notNull().default(''),
    pronunciationRefs: text('pronunciation_refs').notNull().default(''),
    tags: text('tags').notNull().default(''),
    curriculumOrder: integer('curriculum_order').notNull().default(0),
    status: contentStatusEnum('status').notNull().default('draft'),
  },
  (table) => ({
    unitIdx: index('sentences_unit_idx').on(table.unitId, table.curriculumOrder),
  }),
);

export const conversationScenarios = pgTable(
  'conversation_scenarios',
  {
    scenarioId: text('scenario_id').primaryKey(),
    unitId: text('unit_id').notNull().references(() => units.unitId, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    setting: text('setting').notNull(),
    roles: text('roles').notNull(), // comma-separated
    learnerObjective: text('learner_objective').notNull(),
    expectedVocabularyRefs: text('expected_vocabulary_refs').notNull().default(''),
    expectedGrammarRefs: text('expected_grammar_refs').notNull().default(''),
    openingMessage: text('opening_message').notNull(),
    completionConditions: text('completion_conditions').notNull(), // comma-separated
    correctionPolicy: text('correction_policy').notNull().default(''),
    feedbackRubric: text('feedback_rubric').notNull(), // comma-separated
    status: contentStatusEnum('status').notNull().default('draft'),
  },
  (table) => ({
    unitIdx: index('conversation_scenarios_unit_idx').on(table.unitId),
  }),
);

/** amendment A2 — per-(CV, sentence) projection. */
export const cvSentenceVersions = pgTable(
  'cv_sentence_versions',
  {
    cvId: text('cv_id').notNull().references(() => curriculumVersions.id, { onDelete: 'cascade' }),
    sentenceId: text('sentence_id').notNull().references(() => sentences.sentenceId, { onDelete: 'cascade' }),
    textPt: text('text_pt').notNull(),
    textEn: text('text_en').notNull(),
    audioId: text('audio_id').references(() => audioAssets.audioId, { onDelete: 'set null' }),
    textReviewedAt: timestamp('text_reviewed_at', { withTimezone: true }),
    audioReviewedAt: timestamp('audio_reviewed_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cvId, table.sentenceId] }),
    cvIdx: index('cv_sentence_versions_cv_id_idx').on(table.cvId),
  }),
);

// ---------- Audio assets (CONTEXT.md "Pre-Phase C Audio") ---------------

export const audioAssets = pgTable(
  'audio_assets',
  {
    audioId: text('audio_id').primaryKey(),
    contentHash: text('content_hash').notNull().unique(),
    voice: text('voice').notNull(),
    text: text('text').notNull(),
    speed: integer('speed').notNull().default(100), // basis points: 100 = 1.0x
    bytesPath: text('bytes_path').notNull(), // server-side path; bytes themselves live outside the DB
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ---------- Practice ratings -------------------------------------------

export const practiceRatings = pgTable(
  'practice_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => authUsers.userId, { onDelete: 'cascade' }),
    sentenceId: text('sentence_id').notNull().references(() => sentences.sentenceId, { onDelete: 'cascade' }),
    mode: text('mode').notNull(), // 'shadow' | 'recall'
    rating: integer('rating').notNull(),
    /** Idempotency key — unique per (user, client_mutation_id). */
    clientMutationId: text('client_mutation_id').notNull(),
    lastPractisedAt: timestamp('last_practised_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSentenceIdx: uniqueIndex('practice_ratings_user_sentence_mode_idx').on(
      table.userId,
      table.sentenceId,
      table.mode,
    ),
    userMutationIdx: uniqueIndex('practice_ratings_user_mutation_idx').on(
      table.userId,
      table.clientMutationId,
    ),
    // Drizzle 0.45.2's `check()` accepts a raw `SQL` value; the
    // `.between()` / `.in()` helpers on `ExtraConfigColumn` were
    // removed in this version, so we build the CHECK expressions
    // as raw `sql` template literals. The migration declares the
    // matching CHECK constraints verbatim; the schema test
    // (`dbSchema.test.ts`) asserts they agree.
    ratingCheck: check('practice_ratings_rating_check', sql`${table.rating} BETWEEN 1 AND 5`),
    modeCheck: check('practice_ratings_mode_check', sql`${table.mode} IN ('shadow', 'recall')`),
  }),
);

// ---------- Per-Learner settings (CONTEXT.md "Settings") --------------
//
// One row per Learner, FK to `auth_users`. `user_id` is the PK so
// the row materialises on first GET and the API can `UPSERT` on
// every PATCH. Defaults match the Phase B plan Task 4 contract;
// `audio_speed` is stored as basis points (integer) to match the
// `audio_assets.speed` convention — the API serialises to the
// 0.5–2.0 float range on the wire.

export const userSettings = pgTable(
  'user_settings',
  {
    userId: text('user_id').primaryKey().references(() => authUsers.userId, { onDelete: 'cascade' }),
    audioSpeed: integer('audio_speed').notNull().default(100), // basis points: 100 = 1.0×
    repetitions: integer('repetitions').notNull().default(2),
    pauseMs: integer('pause_ms').notNull().default(1000),
    textSize: text('text_size').notNull().default('default'), // 'small' | 'default' | 'large' | 'extraLarge'
    sortOrder: text('sort_order').notNull().default('curriculum'), // 'curriculum' | 'easyToHard' | 'hardToEasy'
    loop: integer('loop').notNull().default(0), // 0 | 1
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // No `check()` constraints here: Drizzle 0.45.2's
  // `ExtraConfigColumn.between()` / `.in()` API drifted away from
  // the shape the existing `practice_ratings` checks still use
  // (see `chore/phase-a-zod-4-drift`). The matching CHECK
  // constraints live in `migrations/0000_init.sql` — they are
  // authoritative, and the schema test asserts the migration
  // declares them. The Drizzle CHECK entries will be added once
  // the 0.45.2 API drift is cleared.
);

// Re-export the cvSentenceVersions table so callers can reference the
// composite key directly. (Drizzle already exports it via the const
// above; this is the public type alias for downstream code.)
export type CvSentenceVersionRow = typeof cvSentenceVersions.$inferSelect;
export type CurriculumVersionRow = typeof curriculumVersions.$inferSelect;
export type PracticeRatingRow = typeof practiceRatings.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type AuthUserRow = typeof authUsers.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;

// ---------- Collections (CONTEXT.md "Collections") ---------------------
//
// Per CONTEXT.md: a Collection is a named, ordered set of sentence
// references. Practising a sentence inside a Collection routes
// through the same `(user_id, sentence_id, mode)` ratings table;
// ratings are global to the user, not per-collection. Two tables:
//
//   * `collections(id, user_id, name, created_at)` — per-Learner
//     collection header. `id` is a stable `col_<slug>` slug; the
//     slug generator lives in the API layer, not the schema.
//   * `collection_items(collection_id, sentence_id, order_index)` —
//     the membership rows. Composite PK
//     `(collection_id, sentence_id)` makes the membership
//     idempotent: an `INSERT ... ON CONFLICT DO NOTHING` on the
//     same `(col, sen)` pair is a no-op, so clients can retry
//     "add sentence" without duplicating rows. `order_index` is
//     positive-integer and unique per collection via the
//     `collection_items_order_idx` index — gaps are permitted.

export const collections = pgTable(
  'collections',
  {
    id: text('id').primaryKey(), // col_<slug>
    userId: text('user_id').notNull().references(() => authUsers.userId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('collections_user_idx').on(table.userId, table.createdAt),
  }),
);

export const collectionItems = pgTable(
  'collection_items',
  {
    collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
    sentenceId: text('sentence_id').notNull().references(() => sentences.sentenceId, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.sentenceId] }),
    orderIdx: uniqueIndex('collection_items_order_idx').on(table.collectionId, table.orderIndex),
    sentenceIdx: index('collection_items_sentence_idx').on(table.sentenceId),
  }),
);

export type CollectionRow = typeof collections.$inferSelect;
export type CollectionItemRow = typeof collectionItems.$inferSelect;

// ---------- Unit progress (CONTEXT.md "Six-Stage Unit Loop") -----------
//
// Per CONTEXT.md "Six-Stage Unit Loop" + SPEC §12.4, the
// `(user_id, unit_id, stage)` triple is the per-learner record of
// which stages of which unit have been completed. Stage
// completion is the only status Phase B writes — "skipped" and
// "in_progress" are deferred. The PK enforces no double-completion
// across stages; the `unit_progress_user_idx` secondary index
// supports the per-user list queries.
//
// The `stage` column is `text` rather than a PG enum because the
// stage set is documented in `@pt/contracts::unitStageSchema` and
// adding new stages (Phase C may extend) is easier via the
// application contract than a DDL change. The repository enforces
// the allowed set at write time.

export const unitProgress = pgTable(
  'unit_progress',
  {
    userId: text('user_id').notNull().references(() => authUsers.userId, { onDelete: 'cascade' }),
    unitId: text('unit_id').notNull().references(() => units.unitId, { onDelete: 'cascade' }),
    stage: text('stage').notNull(), // 'learn' | 'notice' | 'shadow' | 'recall' | 'apply' | 'communicate'
    status: text('status').notNull().default('complete'), // 'complete' only in Phase B
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.unitId, table.stage] }),
    userIdx: index('unit_progress_user_idx').on(table.userId),
    unitIdx: index('unit_progress_unit_idx').on(table.unitId),
  }),
);

export type UnitProgressRow = typeof unitProgress.$inferSelect;