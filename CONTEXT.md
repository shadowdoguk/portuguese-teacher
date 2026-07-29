# Portuguese Teacher — Domain Context (Greenfield)

This document defines the domain vocabulary and key concepts for the
European Portuguese learning platform rebuild at
`shadowdoguk/portuguese-teacher`. Skills and contributors should use
these terms consistently and avoid inventing synonyms.

> The legacy A0–B1 vocabulary (voice-loop tiers, scenario level
> match, SRS injections, affective filter proxy, etc.) does **not**
> apply to this rebuild and is intentionally omitted. ADRs,
> PROGRESS.md, and HANDOFF.md track the rebuild's current state.

## Project in one sentence

A web-based (and later Android) platform that takes an English-speaking
learner from no prior knowledge of European Portuguese through
reviewed A1 and A2 material, powered by a curated six-stage unit loop
and a constrained text-based AI conversation practice. MiniMax AI
infrastructure may be reused via adapter interfaces; no vendor is
locked in until a dedicated European Portuguese evaluation passes.

## Glossary

| Term | Definition |
| --- | --- |
| **Learner** | The end user studying European Portuguese. The platform serves one learner per account in Phase A; the schema supports multiple learners later. |
| **AI Teacher** | The pedagogical agent that explains, prompts, and (in Phase D) converses with the Learner. Backed by a `ConversationAdapter` interface (Phase A: in-memory stub; Phase D: real provider). |
| **Lesson** | A single instructional unit (typically 5–15 min) covering a discrete objective (e.g. "greetings"). A Lesson is composed of a Lesson body (content delivery) plus one or more Practice Items. |
| **Practice Item** | A short interactive activity (flashcard, Listen & Repeat, Active Recall, role-play, etc.) inside a Lesson. Practice Items are the units of self-rating. |
| **Unit** | A thematic cluster of 3–8 Lessons (e.g. "a1-introductions"). Units have an explicit sequence within a Level. Every published Unit fulfils the six-stage loop below. |
| **Six-Stage Unit Loop** | The recommended path through any Unit: **Learn** (core vocabulary) → **Notice** (grammar + pronunciation) → **Shadow** (Listen & Repeat) → **Recall** (Active Recall) → **Apply** (Language Island) → **Communicate** (AI role-play). Stages set recommendation order; learners can open any published stage. |
| **Level** | A CEFR-aligned proficiency stage. Phase A ships A1 and A2. B1 and beyond are deferred. |
| **Curriculum** | The ordered graph of Units mapped to Levels that the platform walks the Learner through. Versioned and atomically published. Only `status: "published"` curriculum serves learner endpoints. |
| **Curriculum Version** | An immutable snapshot of a Level's Units, Lessons, Practice Items, Islands, and scenarios. Identified by `cv_<sha256(level+version+sourceChecksum)[:16]>`. The active version per Level is protected by a partial unique index on `(level) where active = true`. `sourceChecksum` is the SHA-256 hex of the **canonicalized UTF-8 bytes of `manifest.json`** (sorted object keys, fixed whitespace) — never the raw on-disk bytes. `version` is a **per-level contributor-controlled positive integer** (`a1.v1`, `a1.v2`, …); incrementing it without changing content produces a fresh CV-ID and is the human-meaningful handle for releases ("publish v3 of A1"). `version` is a top-level field of `manifest.json`, so it is part of the bytes that sourceChecksum hashes. |
| **Curriculum Source** | A version-controlled JSON manifest under `packages/content/src/sources/<unit-slug>/manifest.json`. Statuses: `draft`, `expert_reviewed`, `audio_reviewed`, `published`. Only `published` sources compile. |
| **Curriculum Repository** | A domain port (`packages/content/src/repository.ts`) for atomic curriculum writes. The Drizzle adapter implementing it lives in `apps/api/src/db/curriculumRepository.ts`. The content package never imports from `apps/api/`; it only consumes this port. |
| **Listen & Repeat** | Practice mode where the learner plays curated `pt-PT` audio, optionally records a shadowing attempt via the device microphone, plays it back, and self-rates 1–5. Mode key in practice APIs: `shadow`. |
| **Active Recall** | Practice mode where the learner sees the English prompt, produces the Portuguese sentence aloud, reveals the curated answer, and self-rates 1–5. Mode key: `recall`. |
| **Practice Rating** | A `(userId, sentenceId, mode)` triple storing the learner's 1–5 rating for a sentence in a single mode. Idempotent upsert keyed by `client_mutation_id`. The PK enforces no double-rating across modes. |
| **Smart Review** | The ordered queue of previously rated sentences (rating 1–4) surfaced for fresh practice. Scoped to sentences in the active CV, optionally intersected with a Unit or Collection the user has open. Ordered by `rating ASC → last_practised_at ASC NULLS FIRST → curriculum_order ASC`. Five-star sentences are excluded by default. No hidden SRS formula in v1. |
| **Filter** | Comma-separated search over sentence text, translation, vocabulary refs, and tags in the active CV. Default matching is OR; an explicit "Match all" switch turns it into AND. Filter scope can additionally be narrowed by Unit (`?unit=<id>`) or Collection (`?collection=<id>`); these apply as AND against the comma-separated text filter. |
| **Mastery** | A sentence is "mastered in mode X" when its rating for that mode is 5. Lowering a rating immediately removes mastery. Denominator for mastery is the published sentence count in the Unit/Level or the collection. |
| **Language Island** | A thematic bundle of dialogues, short stories, or standalone sentences inside a Unit. Backed by the `islands` + `island_sentences` tables. |
| **Conversation Scenario** | A bounded, unit-linked scenario defining setting, roles, learner objective, expected vocabulary and grammar, opening message, completion conditions, correction policy, and feedback rubric. Status must be `published` for the learner surface. |
| **Conversation Session** | A per-learner run of a scenario with `started_at` and optional `completed_at` and `summary`. Backed by `conversation_sessions` + `conversation_messages`. |
| **Provider Adapter** | A swappable interface to an external service. Phase A ships two stubs: `AudioSynthesisAdapter` (text + SSML → `AudioAsset`) and `ConversationAdapter` (`start`, `nextTurn`, `summary`). Phase C implements Azure pt-PT + Polly `Inês` + (optionally) MiniMax audio adapters; Phase D implements the conversation provider. |
| **`ptp_access` Cookie** | HttpOnly, SameSite=Lax, Secure-in-production, 15-minute-TTL cookie carrying the random 32-byte-hex access token (only its SHA-256 hash persists server-side). |
| **`ptp_refresh` Cookie** | HttpOnly, SameSite=Lax, Secure-in-production, 30-day-TTL cookie carrying the random 32-byte-hex refresh token (only its SHA-256 hash persists server-side). Consumed exclusively by `POST /api/auth/refresh`; never authorizes general API access. |
| **Argon2id** | The password-hashing scheme used by the platform. Parameters: `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`. Raw tokens are never persisted; only SHA-256 hashes. |
| **Atomic Publish** | The compile path in `packages/content/src/compile.ts`. Inside a single READ COMMITTED Drizzle transaction the publisher (1) `SELECT id FROM curriculum_versions WHERE level = $1 AND active = true FOR UPDATE` to lock the existing active row (or the predicate space if there is none), (2) `UPDATE` the previous active row to `active = false`, (3) `INSERT` every referenced Unit / Lesson / VocabularyItem / Sentence / Island / Scenario row referencing the new CV, then commits. The partial unique index `(level) where active = true` is a belt-and-braces invariant — correctness rests on the row lock. If the transaction rolls back, no partial state is visible to learners; the previous active pointer remains untouched. |
| **CV Sentence Versions** | The per-(CV, sentence) projection table that lets `practice_ratings` keep a globally-stable `(user_id, sentence_id, mode)` PK while still recording each Curriculum Version's exact Portuguese and English text. `cv_sentence_versions(cv_id, sentence_id, text_pt, text_en, audio_id NULL, text_reviewed_at NULL, audio_reviewed_at NULL)` with PK `(cv_id, sentence_id)`. Reads JOIN through the active CV row. The atomic-publish transaction INSERTs one row per published sentence; ratings follow the globally-stable `sentence_id` and automatically apply to whatever text the active CV currently displays. |
| **CSRF Defense** | State-changing `/api/auth/*` routes (login, refresh, logout) verify `Origin` against an env-pinned allow-list (`AUTH_ALLOWED_ORIGINS`) and reject any request whose origin is not on it with `403 csrf_origin_denied`. `SameSite=Lax` cookies are the second line of defense, not the first. There is no double-submit CSRF token in v1. |
| **Refresh Reuse Compromise** | Any presentation of an already-rotated `ptp_refresh` token is treated as evidence of compromise. One Drizzle transaction invalidates every `auth_sessions` row for the affected `user_id` (`revoked_at = now()`), records a `refresh_reuse_compromise` audit event, and responds `401 refresh_reused`. The user re-authenticates on every device. |
| **Listening Test** | The native-speaker blind scoring of 30–50 utterances per voice candidate. Voice pinning only happens after this passes. Brazilian lexical/prosodic leakage is auto-reject. |
| **Settings** | Per-Learner preferences synced via account: `audioSpeed` (0.5–2×), `repetitions` (1–5), `pauseMs` (fixed list 0–7000), `textSize` (small/default/large/extraLarge), `sortOrder` (curriculum/easyToHard/hardToEasy), `loop` (bool). Synchronised on every change through `PATCH /api/me/settings`; cached client-side for offline-then-sync. Device permission state (mic/notification grants), ephemeral UI state (last-played item, transient toast flags), and on-device microphone recordings stay local and are never replicated. |
| **Collection** | A named ordered set of `collection_items(collection_id, sentence_id, order_index)` references. Practising a sentence inside a Collection routes through the same `(user_id, sentence_id, mode)` ratings table; ratings are global, not per-collection. |
| **Error Envelope** | The API's stable error shape: `{ error: { code: snake_case, message: human-readable, correlationId: uuid } }`. 4xx codes are user-actionable (`validation_failed`, `csrf_origin_denied`, `refresh_reused`, `not_publishable`); 5xx codes reference the correlation ID for ops. Stack traces never leave the server. |
| **Rate Limit** | A per-process sliding-window `Map<key, { count, window_start_ms }>` protected by a mutex. Unauthenticated state-changing routes (`POST /api/auth/login`, `POST /api/auth/refresh`) bucket by client IP (`X-Forwarded-For` first hop when a proxy is in front, else `req.socket.remoteAddress`). Authenticated mutating routes (every other `POST/PATCH/DELETE`) bucket by `auth_sessions.id`. Limits: login `10/min/IP`, refresh `30/min/IP`, mutating `30/min/session`. |
| **Logout Scope** | `POST /api/auth/logout` revokes only the current session row (`auth_sessions.id`), not every session of the user. A future "sign out everywhere" route will revoke all of `user_id`'s sessions in one transaction; it is not part of v1. |
| **Idempotent Publish** | Re-running `pnpm content:compile` (or the fixture variant) with unchanged content recomputes the same CV-ID. The compile transaction uses `ON CONFLICT (id) DO NOTHING` on the `curriculum_versions` insert, exits `0` after a no-op detection, and never advances the active pointer. The error path is reserved for genuine failures (`content_not_publishable` etc.). |
| **Pre-Phase C Audio** | Phase A publishes `cv_sentence_versions` rows with `audio_id NULL` and no `audio_reviewed_at`; the Shadow stage surfaces a "audio coming soon" empty state instead of failing. Phase C back-fills audio rows and runs the listening-test gate per voice. |
| **Cache-Control Discipline** | Curriculum endpoints (`GET /api/curriculum/*`) send `Cache-Control: private, max-age=60` plus an `ETag` derived from `cv_<…>` IDs. Browser caches can re-use a 304 when the CV has not advanced. Rating/event/session/auth endpoints send `Cache-Control: no-store`. |
| **First Publish** | A Level that has never been published has no active CV row. The publish transaction skips the `UPDATE` step and inserts with `active=true`. The partial unique index `(level) where active = true` permits the insert because no other row currently satisfies the predicate. |
| **Recording Policy** | v1 microphone attempts are temporary on-device playback. Recordings are not uploaded or retained. Discarded on replace, on leave, or on session end. |
| **Content Lifecycle** | `draft → expert_reviewed → audio_reviewed → published`. Each transition requires the corresponding human gate. Text or audio changes invalidate the prior review and require re-flow. |
| **Authoring Workflow** | The contributor path for new material. Content contributors edit validated JSON files under `packages/content/src/sources/`; an in-app authoring UI is out of scope for v1. |
| **`/tmp/opencode/planning/`** | The source planning archive imported on 2026-07-22. Reference material only; path-rewritten and toolchain-adapted versions live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. |
| **Greenfield Rebuild** | The active project direction (Session 0, 2026-07-22): the existing Next.js app, seeded A0–B1 curriculum, Prisma schema, ADR 0001–0005, and legacy governance files are scheduled for removal on `chore/remove-legacy`. Nothing of the legacy is ported; only operational patterns are consulted. |

## Key concepts

### Pedagogical model

The platform follows a curated, multi-modal practice loop:
**Learn → Notice → Shadow → Recall → Apply → Communicate**. Smart
Review surfaces the learner's weakest previously rated sentences.
Settings (speed, repetitions, pause, sort order, looping, text size)
persist across devices through the shared account.

### Curriculum lifecycle

Curriculum sources are version-controlled JSON validated by Zod and
compiled into immutable `curriculum_versions` rows. The compile
transaction is atomic; a partial unique index prevents two active
versions per Level. Expert review then audio review then publication
are the human gates; only `published` material reaches the learner.

### Variants

**v1 supports pt-PT (European Portuguese) only.** All Lessons, audio,
the AI Teacher's voice, vocabulary, and orthography are pt-PT-locked.
Cross-dialect contamination is a defect. pt-BR is deferred indefinitely.

### Recording policy

v1 microphone attempts are temporary on-device playback. Recordings
are not uploaded or retained. Discarded on replace, on leave, or on
session end. Opt-in retention is deferred.

## Conventions for contributors

- Use the glossary terms above when writing issues, ADRs, or code
  identifiers.
- When introducing a new domain term, add it to this glossary in the
  same change.
- Don't invent synonyms for existing terms (e.g. don't call a
  "Lesson" an "exercise" or "module"; don't call a "Practice Item"
  a "task").
- Pedagogical claims must cite the research document; product claims
  must cite the rebuild spec
  (`docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`).
- Argument-named ports use the `CurriculumRepository`,
  `AudioSynthesisAdapter`, and `ConversationAdapter` interfaces.
  Concrete implementations live in `apps/api/src/db` and
  `apps/api/src/providers` (Phase C/D), not in shared packages.
- Cookie names are `ptp_access` and `ptp_refresh`. Token names are
  random 32-byte hex strings; their persisted form is the SHA-256
  hex hash.
