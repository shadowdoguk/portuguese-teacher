// Tests for apps/api/src/db/schema.ts + migrations/0000_init.sql.
//
// Per amendment Task A2 step 6: assert the migration declares the
// expected tables, the content_status enum, and the CHECK constraint
// on practice_ratings. Read the SQL file and regex-match the
// expected shapes; this pins the contract that schema.ts and
// 0000_init.sql agree verbatim.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The migration lives three directories up from this test file
// (`apps/api/src/db/__tests__/ → apps/api/migrations/0000_init.sql`):
// `__tests__/` → `db/` → `src/` → `api/migrations/`.
// Anchoring on `import.meta.url` makes the test cwd-independent —
// the previous `process.cwd()` form broke when vitest ran from
// `apps/api/` (it doubled the path).
const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(
  join(here, '..', '..', '..', 'migrations', '0000_init.sql'),
  'utf8',
);

describe('migration 0000_init.sql — auth tables (ADR-0002)', () => {
  it('declares auth_users with email uniqueness', () => {
    // user_id is the inline PRIMARY KEY; email follows.
    expect(migrationSql).toMatch(
      /CREATE TABLE auth_users\s*\([\s\S]*?email\s+text\s+NOT NULL\s+UNIQUE/,
    );
  });

  it('declares auth_sessions with FK to auth_users', () => {
    // session_id is the inline PRIMARY KEY; user_id references auth_users.
    expect(migrationSql).toMatch(
      /CREATE TABLE auth_sessions\s*\([\s\S]*?user_id\s+text\s+NOT NULL\s+REFERENCES\s+auth_users\s*\(\s*user_id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('declares unique indices on both token hashes', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX auth_sessions_access_hash_idx/,
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX auth_sessions_refresh_hash_idx/,
    );
  });
});

describe('migration 0000_init.sql — content_status enum (amendment A2)', () => {
  it('declares content_status AS ENUM with the four lifecycle states', () => {
    expect(migrationSql).toMatch(
      /CREATE TYPE content_status AS ENUM\s*\(\s*'draft'\s*,\s*'expert_reviewed'\s*,\s*'audio_reviewed'\s*,\s*'published'\s*\)/,
    );
  });

  it('uses content_status on units, islands, sentences, conversation_scenarios', () => {
    expect(migrationSql).toMatch(/units[\s\S]*?status\s+content_status/);
    expect(migrationSql).toMatch(/islands[\s\S]*?status\s+content_status/);
    expect(migrationSql).toMatch(/sentences[\s\S]*?status\s+content_status/);
    expect(migrationSql).toMatch(/conversation_scenarios[\s\S]*?status\s+content_status/);
  });
});

describe('migration 0000_init.sql — cv_sentence_versions (amendment A2)', () => {
  it('declares the table with composite PK', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE cv_sentence_versions\s*\([\s\S]*?cv_id[\s\S]*?sentence_id[\s\S]*?PRIMARY KEY\s*\(\s*cv_id\s*,\s*sentence_id\s*\)/,
    );
  });

  it('declares text_pt, text_en, audio_id columns', () => {
    expect(migrationSql).toMatch(/cv_sentence_versions[\s\S]*?text_pt\s+text\s+NOT NULL/);
    expect(migrationSql).toMatch(/cv_sentence_versions[\s\S]*?text_en\s+text\s+NOT NULL/);
    expect(migrationSql).toMatch(/cv_sentence_versions[\s\S]*?audio_id\s+text/);
  });
});

describe('migration 0000_init.sql — practice_ratings CHECK', () => {
  it('declares the rating CHECK constraint', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE practice_ratings\s*\([\s\S]*?CHECK\s*\(\s*rating\s+BETWEEN\s+1\s+AND\s+5\s*\)/,
    );
  });

  it('declares the mode CHECK constraint', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE practice_ratings\s*\([\s\S]*?CHECK\s*\(\s*mode\s+IN\s*\(\s*'shadow'\s*,\s*'recall'\s*\)\s*\)/,
    );
  });

  it('declares the unique indices on (user, sentence, mode) and (user, client_mutation_id)', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX practice_ratings_user_sentence_mode_idx/,
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX practice_ratings_user_mutation_idx/,
    );
  });
});

describe('migration 0000_init.sql — audio_assets', () => {
  it('declares audio_assets with content_hash UNIQUE', () => {
    // audio_id is the inline PRIMARY KEY; content_hash follows.
    expect(migrationSql).toMatch(
      /CREATE TABLE audio_assets\s*\([\s\S]*?content_hash\s+text\s+NOT NULL\s+UNIQUE/,
    );
  });
});

describe('migration 0000_init.sql — curriculum_versions', () => {
  it('declares the partial unique index enforcing at-most-one active CV', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX curriculum_versions_one_active_idx\s+ON\s+curriculum_versions\s*\(\s*id\s*\)\s+WHERE\s+active\s*=\s*1/,
    );
  });
});

describe('migration 0000_init.sql — user_settings (Phase B Task 4)', () => {
  it('declares user_settings with PK + FK to auth_users', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE user_settings\s*\([\s\S]*?user_id\s+text\s+PRIMARY KEY\s+REFERENCES\s+auth_users\s*\(\s*user_id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('declares the four CHECK constraints', () => {
    expect(migrationSql).toMatch(/CHECK\s*\(\s*audio_speed\s+BETWEEN\s+50\s+AND\s+200\s*\)/);
    expect(migrationSql).toMatch(/CHECK\s*\(\s*repetitions\s+BETWEEN\s+1\s+AND\s+5\s*\)/);
    expect(migrationSql).toMatch(/CHECK\s*\(\s*text_size\s+IN\s*\(\s*'small'\s*,\s*'default'\s*,\s*'large'\s*,\s*'extraLarge'\s*\)\s*\)/);
    expect(migrationSql).toMatch(
      /CHECK\s*\(\s*sort_order\s+IN\s*\(\s*'curriculum'\s*,\s*'easyToHard'\s*,\s*'hardToEasy'\s*\)\s*\)/,
    );
  });
});

describe('migration 0000_init.sql — collections (Phase B Task 5)', () => {
  it('declares collections with PK + FK to auth_users', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE collections\s*\([\s\S]*?id\s+text\s+PRIMARY KEY[\s\S]*?user_id\s+text\s+NOT NULL\s+REFERENCES\s+auth_users\s*\(\s*user_id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('declares the collections_user_idx secondary index', () => {
    expect(migrationSql).toMatch(/CREATE INDEX collections_user_idx\s+ON\s+collections\s*\(\s*user_id\s*,\s*created_at\s*\)/);
  });

  it('declares collection_items with composite PK', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE collection_items\s*\([\s\S]*?collection_id[\s\S]*?sentence_id[\s\S]*?PRIMARY KEY\s*\(\s*collection_id\s*,\s*sentence_id\s*\)/,
    );
  });

  it('declares collection_items FKs to collections and sentences', () => {
    expect(migrationSql).toMatch(
      /collection_items[\s\S]*?collection_id\s+text\s+NOT NULL\s+REFERENCES\s+collections\s*\(\s*id\s*\)\s+ON DELETE CASCADE/,
    );
    expect(migrationSql).toMatch(
      /collection_items[\s\S]*?sentence_id\s+text\s+NOT NULL\s+REFERENCES\s+sentences\s*\(\s*sentence_id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('declares the unique index on (collection_id, order_index)', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX collection_items_order_idx\s+ON\s+collection_items\s*\(\s*collection_id\s*,\s*order_index\s*\)/,
    );
  });
});

describe('migration 0000_init.sql — unit_progress (Phase B Task 8)', () => {
  it('declares unit_progress with composite PK + FKs to auth_users and units', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE unit_progress\s*\([\s\S]*?user_id\s+text\s+NOT NULL\s+REFERENCES\s+auth_users\s*\(\s*user_id\s*\)\s+ON DELETE CASCADE[\s\S]*?unit_id\s+text\s+NOT NULL\s+REFERENCES\s+units\s*\(\s*unit_id\s*\)\s+ON DELETE CASCADE/,
    );
    expect(migrationSql).toMatch(
      /CREATE TABLE unit_progress\s*\([\s\S]*?PRIMARY KEY\s*\(\s*user_id\s*,\s*unit_id\s*,\s*stage\s*\)/,
    );
  });

  it('declares the unit_progress_user_idx + unit_progress_unit_idx secondary indexes', () => {
    expect(migrationSql).toMatch(/CREATE INDEX unit_progress_user_idx\s+ON\s+unit_progress\s*\(\s*user_id\s*\)/);
    expect(migrationSql).toMatch(/CREATE INDEX unit_progress_unit_idx\s+ON\s+unit_progress\s*\(\s*unit_id\s*\)/);
  });
});