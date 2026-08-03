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
    ratingCheck: check('practice_ratings_rating_check', table.rating.between(1, 5)),
    modeCheck: check('practice_ratings_mode_check', table.mode.in(['shadow', 'recall'])),
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