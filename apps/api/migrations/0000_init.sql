-- Migration 0000_init — verbatim mirror of apps/api/src/db/schema.ts.
-- Every CREATE TABLE / CREATE INDEX / CREATE TYPE / CHECK statement
-- below MUST agree byte-for-byte with the corresponding Drizzle table
-- definition; the schema tests enforce this mechanically.
--
-- amendment Task A2 is bundled here:
--   * CREATE TYPE content_status AS ENUM (...)
--   * status columns on curriculum_versions, units, islands, sentences,
--     conversation_scenarios use that enum
--   * CREATE TABLE cv_sentence_versions (...) with composite PK

-- ---------- Enums (amendment A2) ---------------------------------------

CREATE TYPE content_status AS ENUM (
  'draft',
  'expert_reviewed',
  'audio_reviewed',
  'published'
);

-- ---------- Auth (ADR-0002) --------------------------------------------

CREATE TABLE auth_users (
  user_id             text         PRIMARY KEY,
  email               text         NOT NULL UNIQUE,
  password_hash       text         NOT NULL,
  argon_memory_cost   integer      NOT NULL DEFAULT 19456,
  argon_time_cost     integer      NOT NULL DEFAULT 2,
  argon_parallelism   integer      NOT NULL DEFAULT 1,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  session_id          text         PRIMARY KEY,
  user_id             text         NOT NULL REFERENCES auth_users (user_id) ON DELETE CASCADE,
  access_token_hash   text         NOT NULL,
  refresh_token_hash  text         NOT NULL,
  access_expires_at   timestamptz  NOT NULL,
  refresh_expires_at  timestamptz  NOT NULL,
  revoked_at          timestamptz,
  rotated_at          timestamptz,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id);
CREATE UNIQUE INDEX auth_sessions_access_hash_idx ON auth_sessions (access_token_hash);
CREATE UNIQUE INDEX auth_sessions_refresh_hash_idx ON auth_sessions (refresh_token_hash);

-- ---------- Curriculum (amendment A2 status columns) -------------------

CREATE TABLE curriculum_versions (
  id            text         PRIMARY KEY,
  active        integer      NOT NULL DEFAULT 0,
  published_at  timestamptz,
  manifest_hash text         NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX curriculum_versions_active_idx ON curriculum_versions (active);
-- Partial unique index: at most one active row globally. The Phase A
-- compile helper asserts this on publish; the predicate is what makes
-- the rule "at most one" rather than "exactly one".
CREATE UNIQUE INDEX curriculum_versions_one_active_idx
  ON curriculum_versions (id)
  WHERE active = 1;

CREATE TABLE units (
  unit_id          text             PRIMARY KEY,
  level            text             NOT NULL,
  title            text             NOT NULL,
  summary          text             NOT NULL DEFAULT '',
  status           content_status   NOT NULL DEFAULT 'draft',
  curriculum_order integer          NOT NULL DEFAULT 0,
  created_at       timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX units_level_idx ON units (level, curriculum_order);

CREATE TABLE islands (
  island_id        text             PRIMARY KEY,
  unit_id          text             NOT NULL REFERENCES units (unit_id) ON DELETE CASCADE,
  title            text             NOT NULL,
  status           content_status   NOT NULL DEFAULT 'draft',
  curriculum_order integer          NOT NULL DEFAULT 0
);

CREATE INDEX islands_unit_idx ON islands (unit_id, curriculum_order);

CREATE TABLE sentences (
  sentence_id       text             PRIMARY KEY,
  unit_id           text             NOT NULL REFERENCES units (unit_id) ON DELETE CASCADE,
  text_pt           text             NOT NULL,
  text_en           text             NOT NULL,
  vocab_refs        text             NOT NULL DEFAULT '',
  grammar_refs      text             NOT NULL DEFAULT '',
  pronunciation_refs text            NOT NULL DEFAULT '',
  tags              text             NOT NULL DEFAULT '',
  curriculum_order  integer          NOT NULL DEFAULT 0,
  status            content_status   NOT NULL DEFAULT 'draft'
);

CREATE INDEX sentences_unit_idx ON sentences (unit_id, curriculum_order);

CREATE TABLE conversation_scenarios (
  scenario_id                text             PRIMARY KEY,
  unit_id                    text             NOT NULL REFERENCES units (unit_id) ON DELETE CASCADE,
  title                      text             NOT NULL,
  setting                    text             NOT NULL,
  roles                      text             NOT NULL,
  learner_objective          text             NOT NULL,
  expected_vocabulary_refs   text             NOT NULL DEFAULT '',
  expected_grammar_refs      text             NOT NULL DEFAULT '',
  opening_message            text             NOT NULL,
  completion_conditions      text             NOT NULL,
  correction_policy          text             NOT NULL DEFAULT '',
  feedback_rubric            text             NOT NULL,
  status                     content_status   NOT NULL DEFAULT 'draft'
);

CREATE INDEX conversation_scenarios_unit_idx ON conversation_scenarios (unit_id);

-- ---------- amendment A2 — cv_sentence_versions projection -------------

CREATE TABLE cv_sentence_versions (
  cv_id              text         NOT NULL REFERENCES curriculum_versions (id) ON DELETE CASCADE,
  sentence_id        text         NOT NULL REFERENCES sentences (sentence_id) ON DELETE CASCADE,
  text_pt            text         NOT NULL,
  text_en            text         NOT NULL,
  audio_id           text         NULL REFERENCES audio_assets (audio_id) ON DELETE SET NULL,
  text_reviewed_at   timestamptz  NULL,
  audio_reviewed_at  timestamptz  NULL,
  PRIMARY KEY (cv_id, sentence_id)
);

CREATE INDEX cv_sentence_versions_cv_id_idx ON cv_sentence_versions (cv_id);

-- ---------- Audio assets (CONTEXT.md "Pre-Phase C Audio") -------------

CREATE TABLE audio_assets (
  audio_id     text         PRIMARY KEY,
  content_hash text         NOT NULL UNIQUE,
  voice        text         NOT NULL,
  text         text         NOT NULL,
  speed        integer      NOT NULL DEFAULT 100,
  bytes_path   text         NOT NULL,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- ---------- Practice ratings ------------------------------------------

CREATE TABLE practice_ratings (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text         NOT NULL REFERENCES auth_users (user_id) ON DELETE CASCADE,
  sentence_id         text         NOT NULL REFERENCES sentences (sentence_id) ON DELETE CASCADE,
  mode                text         NOT NULL,
  rating              integer      NOT NULL,
  client_mutation_id  text         NOT NULL,
  last_practised_at   timestamptz  NOT NULL DEFAULT now(),
  CHECK (rating BETWEEN 1 AND 5),
  CHECK (mode IN ('shadow', 'recall'))
);

CREATE UNIQUE INDEX practice_ratings_user_sentence_mode_idx
  ON practice_ratings (user_id, sentence_id, mode);
CREATE UNIQUE INDEX practice_ratings_user_mutation_idx
  ON practice_ratings (user_id, client_mutation_id);

-- ---------- Per-Learner settings (CONTEXT.md "Settings", Phase B Task 4) --

CREATE TABLE user_settings (
  user_id      text         PRIMARY KEY REFERENCES auth_users (user_id) ON DELETE CASCADE,
  audio_speed  integer      NOT NULL DEFAULT 100,
  repetitions  integer      NOT NULL DEFAULT 2,
  pause_ms     integer      NOT NULL DEFAULT 1000,
  text_size    text         NOT NULL DEFAULT 'default',
  sort_order   text         NOT NULL DEFAULT 'curriculum',
  loop         integer      NOT NULL DEFAULT 0,
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  CHECK (audio_speed BETWEEN 50 AND 200),
  CHECK (repetitions BETWEEN 1 AND 5),
  CHECK (text_size IN ('small', 'default', 'large', 'extraLarge')),
  CHECK (sort_order IN ('curriculum', 'easyToHard', 'hardToEasy'))
);