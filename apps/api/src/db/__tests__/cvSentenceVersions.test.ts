// Tests for the cv_sentence_versions projection (amendment Task A2).
//
// Per amendment A2 step 1: assert the migration declares the table
// with composite PK; assert it carries text_pt, text_en, audio_id
// columns (audio_id is nullable per CONTEXT.md "Pre-Phase C Audio");
// assert FKs to curriculum_versions and sentences. Per A2 step 7
// the test passes alongside dbSchema.test.ts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor on `import.meta.url` (same pattern as dbSchema.test.ts)
// so the migration path is cwd-independent. Three `..` segments
// walk `__tests__/` → `db/` → `src/` → `api/migrations/`.
const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(
  join(here, '..', '..', '..', 'migrations', '0000_init.sql'),
  'utf8',
);

describe('cv_sentence_versions table (amendment Task A2)', () => {
  it('declares the table with composite PK (cv_id, sentence_id)', () => {
    expect(migrationSql).toMatch(
      /CREATE TABLE cv_sentence_versions\s*\([^)]*cv_id[^)]*sentence_id[^)]*PRIMARY KEY\s*\(\s*cv_id\s*,\s*sentence_id\s*\)/,
    );
  });

  it('carries text_pt, text_en, audio_id columns', () => {
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*text_pt\s+text\s+NOT NULL/);
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*text_en\s+text\s+NOT NULL/);
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*audio_id\s+text/);
  });

  it('audio_id is nullable (Pre-Phase C Audio)', () => {
    // Either: `audio_id text NULL` or `audio_id text` without NOT NULL.
    // We assert at least one of those shapes matches.
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*audio_id\s+text(?:\s+NULL)?(?![^)]*NOT NULL)/);
  });

  it('text_reviewed_at and audio_reviewed_at are nullable timestamptz', () => {
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*text_reviewed_at\s+timestamptz(?:\s+NULL)?(?![^)]*NOT NULL)/);
    expect(migrationSql).toMatch(/cv_sentence_versions[^)]*audio_reviewed_at\s+timestamptz(?:\s+NULL)?(?![^)]*NOT NULL)/);
  });

  it('FK cv_id REFERENCES curriculum_versions(id) ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(
      /cv_sentence_versions[^)]*cv_id\s+text\s+NOT NULL\s+REFERENCES\s+curriculum_versions\s*\(\s*id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('FK sentence_id REFERENCES sentences(sentence_id) ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(
      /cv_sentence_versions[^)]*sentence_id\s+text\s+NOT NULL\s+REFERENCES\s+sentences\s*\(\s*sentence_id\s*\)\s+ON DELETE CASCADE/,
    );
  });

  it('FK audio_id REFERENCES audio_assets(audio_id) ON DELETE SET NULL', () => {
    expect(migrationSql).toMatch(
      /cv_sentence_versions[^)]*audio_id\s+text\s+NULL\s+REFERENCES\s+audio_assets\s*\(\s*audio_id\s*\)\s+ON DELETE SET NULL/,
    );
  });

  it('declares an index on cv_id for projection lookups', () => {
    expect(migrationSql).toMatch(
      /CREATE INDEX cv_sentence_versions_cv_id_idx\s+ON\s+cv_sentence_versions\s*\(\s*cv_id\s*\)/,
    );
  });
});