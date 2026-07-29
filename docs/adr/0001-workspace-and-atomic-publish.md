# Curriculum workspace and atomic publish

The phase-A foundation adopts a single greenfield pnpm-workspace
monorepo (`apps/*` + `packages/*`) with a Drizzle + PostgreSQL 16
backend. Curriculum sources are version-controlled JSON manifests
under `packages/content/src/sources/<unit-slug>/manifest.json`,
compiled into immutable, per-Level Curriculum Versions keyed by a
content-derived ID and advanced through a single active-version
pointer per Level. Four interlocking decisions made this work:

## Decisions

**1. `sourceChecksum` is the SHA-256 hex of the canonicalized UTF-8
bytes of `manifest.json`** (sorted object keys, fixed whitespace) —
never the raw on-disk bytes. Canonicalization makes the CV-ID
reproducible from the same logical content regardless of editor
serialization choices; raw bytes make the ID editor-key-order
dependent and break reviewer discussion.

**2. `version` is a per-Level contributor-controlled positive
integer** (`a1.v1`, `a1.v2`, …), declared as a top-level field of
`manifest.json` and folded into the CV-ID hash. Reviewers can talk
about "publish v3 of A1" without consulting a pipeline clock.

**3. The atomic-publish transaction runs inside one READ COMMITTED
Drizzle transaction** that (a) `SELECT`s the existing active CV row
for the Level `FOR UPDATE`, (b) `UPDATE`s it to `active = false`,
then (c) `INSERT`s the new CV row plus every referenced Unit /
Lesson / VocabularyItem / Island / Scenario / `cv_sentence_versions`
row, and commits. The partial unique index
`(level) where active = true` is invariant; correctness rests on
the row lock.

**4. `practice_ratings` keeps its globally-stable `(user_id,
sentence_id, mode)` PK.** A second table, `cv_sentence_versions
(cv_id, sentence_id, text_pt, text_en, audio_id NULL,
text_reviewed_at NULL, audio_reviewed_at NULL)`, holds the
per-Curriculum-Version text for each sentence. Learners see the
active CV's text on every read; ratings carry forward to whatever
text the active CV currently holds for that sentence ID. The
atomic-publish transaction INSERTs into `cv_sentence_versions`
rather than mutating `sentences` rows in place, so version history
is preserved without breaking rating keys.

## Consequences

- **Global IDs vs CV-scoped rows.** `users`, `units`, `sentences`,
  `curriculum_versions`, and `audio_assets` (content-addressed) carry
  globally-stable IDs. `lessons`, `vocabulary_items`, `islands`,
  `island_sentences`, `conversation_scenarios`, `cv_sentence_versions`,
  and `compiled_assets` are CV-scoped — they exist per Curriculum
  Version and are replaced wholesale when a new CV is published.
- **Concurrency.** Two simultaneous compiles for the same Level
  serialize on the active-CV row. Losers retry after the winner
  commits; their `sourceChecksum` is recomputed against the new
  previous active manifest and gets a fresh CV-ID or fails cleanly
  if the content is identical.
- **Source control is not the runtime.** Runtime always reads from
  the active `curriculum_versions` row and the matching
  `cv_sentence_versions` rows; `manifest.json` is never read at
  request time. Publish is one-way: rollback is "publish a new
  CV", never "edit the active row".
- **Rating reuse.** A learner who rated "Olá" 5★ under A1 v1 sees the
  rating apply to the text of "Olá" under A1 v2 if v2 changed it.
  We surface no re-attestation prompt in v1.
