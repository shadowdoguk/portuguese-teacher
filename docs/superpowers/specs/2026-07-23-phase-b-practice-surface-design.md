# Phase B — Practice Surface on Web

**Date:** 2026-07-23
**Status:** Approved in brainstorming (Session 3)
**Parent phases:** Phase A (foundation, merged), Phase C (audio + Android, not started), Phase D (AI role-play, not started)
**Authoritative spec:** `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
**Authoritative plans (sibling):** `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`, `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md`
**Glossary:** `CONTEXT.md`

## 1. Purpose

This spec covers Phase B of the four-phase release: the web-only
practice surface that lets a single authenticated learner exercise
Shadow (Listen & Repeat) and Active Recall practice modes against
`a1-introductions`, surface a Smart Review queue of previously rated
sentences, navigate the six-stage unit loop via Home, filter and
collect sentences, and persist per-Learner settings across devices.

The §13.3 vertical-slice gate from the rebuild spec spans Phases A–D;
Phase B alone does not satisfy §13.3 (audio is Phase C; AI role-play is
Phase D), but Phase B builds the structural and behavioural foundation
that §13.3 then composes with.

## 2. Out of scope (deferred to Phase C/D/later)

- Audio asset creation, listening-test gate, or `audio_assets` row
  writes. Apply stage's audio playback is a "coming soon" empty state
  per `CONTEXT.md` "Pre-Phase C Audio".
- Capacitor 8 Android wrapper, Android secure-storage transport,
  Android microphone permissions (Phase C). Phase B is web-only;
  Phase A's `requireAuth()` cookie path is the single auth surface.
- AI role-play scenarios, conversation adapter real implementations,
  bounded-context budget, structured summary (Phase D).
- Microphone upload or persistent retention (Recording Policy: local
  only; blob is discarded on navigate-away / unmount / replace).
- `nextUnit` algorithm specifications beyond the rebuild spec's
  §4.2 narrative ("Home presents, in order: 1. the next incomplete
  guided lesson; 2. a Smart Review action when review candidates
  exist; 3. the active A1 or A2 path; 4. shortcuts …").
- "Sign out everywhere" route. Logout is single-session per
  ADR-0002 §3.
- Cross-Curriculum-Version rating re-attestation prompts. ADR-0001
  "Consequences → Rating reuse" decides no re-attestation in v1.

## 3. Six-stage loop in Phase B

The unit loop is recommendation, not lock per rebuild spec §5.2.
Phase B renders the loop as the Home's primary navigation surface
for a single open unit, with explicit empty-state messaging for
stages whose content lands in later phases.

| Stage | Phase B behaviour |
|---|---|
| **1. Learn** | Static reader view of the unit's vocabulary lessons (cards with `text_pt`, `text_en`, gender where applicable, usage notes). Phase B reads from `cv_sentence_versions` joined through the active CV (per ADR-0001 §Consequences). |
| **2. Notice** | Static reader view of the unit's grammar + pronunciation lessons. Same `cv_sentence_versions` read path. |
| **3. Shadow** | Listen & Repeat page. Audio playback is a "coming soon" empty state (Phase B does not write `audio_assets`; see `CONTEXT.md` "Pre-Phase C Audio"). Microphone record/playback is enabled (local-only blob). Self-rate 1–5 → `practice_ratings` row. |
| **4. Recall** | Active Recall page. English prompt first, learner produces aloud (mentally or with mic), reveal the curated answer. Self-rate 1–5 → `practice_ratings` row. |
| **5. Apply** | Language Island reader view. Renders the unit's `islands` + `island_sentences` content. The page never references `audio_id`; audio is out of scope until Phase C. |
| **6. Communicate** | Stub page reading `Conversation Scenario` status from the active CV. Renders "Phase D will add the AI role-play for this scenario" until Phase D lands. Stub does NOT exercise the `ConversationAdapter`; it only displays the scenario metadata. |

`unit_progress(user_id, unit_id, stage)` is written only when a
stage page is **explicitly** marked complete by the learner —
either via a "Mark complete" button on the page (Shadow, Recall,
Apply, Communicate) or an "I've read it" affordance on the static
reader pages (Learn, Notice). A bare navigation does not write
`unit_progress`; the learner must affirm the stage to advance
`nextStageRecommendation`. The "complete" semantics is transition
state, not content mastery — a learner can mark Learn complete
without reading it; Phase D's review can later surface it as a
reminder.

## 4. API surface (Phase B additions)

Phase B adds eight routes on top of Phase A's nine (health × 1, auth ×
4, curriculum × 3, plus the implicit `requireAuth()` middleware).

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/me/settings` | `requireAuth` | – | `{ audioSpeed, repetitions, pauseMs, textSize, sortOrder, loop }` |
| `PATCH` | `/api/me/settings` | `requireAuth` + rate limit | partial settings shape | updated settings row |
| `POST` | `/api/practice/ratings` | `requireAuth` + rate limit | `{ clientMutationId, sentenceId, mode, rating }` idempotent | `{ sentenceId, mode, rating, lastPractisedAt }` |
| `GET` | `/api/practice/queue` | `requireAuth` | `?unit_id=...&mode=shadow\|recall&filter=...&match=all` | `{ items: [{ sentenceId, textPt, textEn, audioId? }] }` |
| `GET` | `/api/practice/review` | `requireAuth` | `?mode=shadow\|recall&limit=50` | `{ items: [...] }` ordered `rating ASC → last_practised_at ASC NULLS FIRST → curriculum_order ASC` |
| `GET` | `/api/collections` | `requireAuth` | – | `{ items: [{ id, name, sentenceCount, createdAt }] }` |
| `POST` | `/api/collections` | `requireAuth` + rate limit | `{ name }` | `{ id, name, sentenceCount: 0, createdAt }` |
| `GET` | `/api/collections/:id` | `requireAuth` | – | `{ id, name, items: [{ orderIndex, sentenceId, textPt, textEn }] }` |
| `POST` | `/api/collections/:id/items` | `requireAuth` + rate limit | `{ sentenceId, orderIndex? }` | updated collection |
| `DELETE` | `/api/collections/:id/items/:sentenceId` | `requireAuth` + rate limit | – | `204` |
| `DELETE` | `/api/collections/:id` | `requireAuth` + rate limit | – | `204` |
| `POST` | `/api/unit-progress/:unitId/:stage` | `requireAuth` + rate limit | `{ status: 'complete' }` | `{ unitId, stage, completedAt }` |

All endpoints honour the error envelope codified in
`CONTEXT.md` "Error Envelope" plus the new codes this plan adds
(see §10). All authenticated routes rate-limit per `auth_sessions.id`
per `CONTEXT.md` "Rate Limit". All `GET /api/curriculum/*`-shaped
responses (`/api/practice/queue`, `/api/practice/review`,
`/api/collections/:id`) inherit the `Cache-Control: private,
max-age=60` + `ETag` discipline added by amendment plan Task A6.

## 5. Domain additions (Phase B surface area)

`@pt/domain` ships four new pure helpers on top of its Phase A
exports (see `CONTEXT.md` "Smart Review", "Filter", "Collection",
"Settings"):

- `buildPracticeQueue(unit, mode, settings, filter?)` →
  `ReadonlyArray<PracticeItem>`. Order respects `settings.sortOrder`
  (`curriculum | easyToHard | hardToEasy`). When `filter` is given,
  every sentence that matches is included; otherwise the entire
  unit's sentences for the active CV.
- `buildReviewQueue(userRatings, sentences, mode, limit)` →
  `ReadonlyArray<PracticeItem>`. Excludes `rating === 5` and
  unrated rows. Orders `rating ASC → last_practised_at ASC NULLS FIRST →
  curriculum_order ASC`. Limit defaults to 50.
- `applyFilter(sentences, filterExpr, matchAll)` →
  `ReadonlyArray<Sentence>`. The expression is comma-separated
  terms with optional `matchAll: true` for AND; the function
  matches each term against `text_pt`, `text_en`, `vocab_refs[]`,
  `grammar_refs[]`, `pronunciation_refs[]`, `island_refs[]`, and
  `tags[]` (case-insensitive substring).
- `nextStageRecommendation(unit, completedStages)` →
  `Stage | null`. Returns the lowest-numbered stage not in
  `completedStages`; if all six are complete returns `null`.
  Stage enum is
  `['learn', 'notice', 'shadow', 'recall', 'apply', 'communicate']`.

All four helpers are pure (no I/O) and test in isolation through
`@pt/domain`'s Vitest suite. No Drizzle / Express types leak in.

## 6. Web routes (Phase B additions)

`apps/web` adds these routes on top of Phase A's three (`/login`,
`/`, `/logout`):

| Path | Element | Auth |
|---|---|---|
| `/units/:unitId` | `UnitPage` shows the six-stage recommendations and shortcuts to vocabulary / islands | `RequireAuth` |
| `/units/:unitId/learn` | `LearnPage` static reader | `RequireAuth` |
| `/units/:unitId/notice` | `NoticePage` static reader | `RequireAuth` |
| `/units/:unitId/shadow` | `ShadowPage` Listen & Repeat (audio "coming soon" empty state, mic record/playback) | `RequireAuth` |
| `/units/:unitId/recall` | `RecallPage` Active Recall | `RequireAuth` |
| `/units/:unitId/apply` | `ApplyPage` Language Island reader (audio "coming soon") | `RequireAuth` |
| `/units/:unitId/communicate` | `CommunicatePage` Phase D stub | `RequireAuth` |
| `/practice/review` | `ReviewPage` Smart Review queue | `RequireAuth` |
| `/practice/filter` | `FilterPage` filter form + results | `RequireAuth` |
| `/collections` | `CollectionsPage` list + create | `RequireAuth` |
| `/collections/:id` | `CollectionDetailPage` add/remove + practice | `RequireAuth` |
| `/settings` | `SettingsPage` per-Learner settings form | `RequireAuth` |

Routing uses `react-router` 7 (already in Phase A's stack). Server
state uses `@tanstack/react-query` 5 with cache `staleTime: 30s` for
`/api/curriculum/*` and `0` for `/api/practice/ratings`,
`/api/collections/*`, `/api/me/settings` writes.

## 7. Settings sync

Per `CONTEXT.md` "Settings". `user_settings.user_id` is the only key.
All settings write through `PATCH /api/me/settings` with optimistic
display and a 30-second client cache for offline-then-sync. Settings
columns: `audioSpeed (0.5–2.0)`, `repetitions (1–5)`, `pauseMs (one
of 0/500/1000/1500/2000/2500/3000/4000/5000/7000)`, `textSize
(small/default/large/extraLarge)`, `sortOrder
(curriculum/easyToHard/hardToEasy)`, `loop (bool)`. Default row is
created on first `GET` if missing.

## 8. Filter semantics

Per `CONTEXT.md` "Filter". Comma-separated terms use OR by default.
Explicit `?match=all` switches to AND. Each term matches against the
sentence's `text_pt`, `text_en`, joined `vocab_items.name`,
`grammar_lessons.name`, `pronunciation_lessons.name`, and `tags[]` —
case-insensitive substring. The filter endpoint accepts the same
expression plus optional `unit_id` / `collection_id` parameters that
apply as AND against the comma-separated text filter. Server enforces
the limit (200 sentences) and returns a cursor when exceeded (Phase
A returns the first 200 inline; the cursor pass is an artifact of
Phase B's larger datasets).

## 9. Collections

Per `CONTEXT.md` "Collection". `collection_items(collection_id,
sentence_id, order_index)` is the join table. Adding an existing
sentence to a collection is idempotent (PK conflict on `(collection_id,
sentence_id)` is treated as a no-op). Practising a sentence inside a
collection routes through the same `(user_id, sentence_id, mode)`
ratings table — ratings are global, not per-collection.

## 10. Error envelope additions

Extend `errorCodeSchema` with Phase B codes:

```
'practice_queue_empty',
'collection_name_required',
'collection_not_found',
'unit_not_found',
'stage_unknown',
'unit_progress_invalid_status',
```

These remain snake_case, user-actionable 4xx codes. The envelope
shape stays `{ error: { code, message, correlationId } }`.

## 11. Concurrency, cache, rate limit

Phase B inherits `CONTEXT.md` "Rate Limit" (per-IP for unauthenticated,
per-`auth_sessions.id` for authenticated) and "Cache-Control
Discipline". The new endpoints are all authenticated mutating or
read-through-curriculum, so:

- `POST /api/practice/ratings`, `POST /api/collections`,
  `POST /api/collections/:id/items`, `DELETE …`,
  `POST /api/unit-progress/...` — `Cache-Control: no-store`,
  rate limit `30/min/session`.
- `GET /api/practice/queue`, `GET /api/practice/review`,
  `GET /api/collections/:id` — `Cache-Control: private,
  max-age=60` + `ETag`.
- `GET /api/collections`, `GET /api/me/settings`,
  `PATCH /api/me/settings` — `Cache-Control: no-store` (private,
  learner-specific, never cached by intermediaries).

## 12. Test strategy

Phase B inherits Phase A's contract-test + integration-test discipline
(`@pt/contracts` Zod, `apps/api/__tests__` Vitest supertest, `apps/web`
React Testing Library). Four new test surfaces:

- **Domain tests.** `buildPracticeQueue`, `buildReviewQueue`,
  `applyFilter`, `nextStageRecommendation`. Pure-function tests with
  coverage of empty / null / out-of-range / tie-breaking edge cases.
- **Practice API integration.** Idempotency on the same
  `clientMutationId`, review-queue ordering with NULL `last_practised_at`
  surfacing first, `unit_progress` PK conflict tolerance.
- **Collection integration.** Idempotent add, name uniqueness,
  cascade-on-delete (collections cascade to items but not to
  ratings).
- **Web acceptance.** Vitest + jsdom rendering the six-stage
  navigation for `a1-introductions`, Shadow page microphone
  mock using `MediaRecorder` polyfill, recall reveal flow.

Phase B's vertical-slice smoke test runs the synthetic
`a1-introductions-published` fixture through every stage and asserts
`@pt/domain::nextStageRecommendation` advances correctly.

## 13. Acceptance gate (Phase B exit)

Phase B is "done" when **all** of the following pass on the
green-field monorepo (Phase A merged + Phase B implemented):

1. `pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm -r
   build` is green.
2. `bash scripts/dev-up.sh` brings up Postgres + API + web; the
   owner logs in and lands on Home.
3. Home for the seeded user lists `a1-introductions` as the active
   unit with the six stages rendered in order; the unit has a
   "Continue" affordance pointing at the lowest-numbered incomplete
   stage.
4. The unit's Shadow page renders an audio "coming soon" empty
   state, allows microphone record + playback (local-only),
   accepts a 1–5 self-rating, and writes a row to
   `practice_ratings`.
5. The unit's Recall page accepts a 1–5 self-rating with reveal
   before submit and writes a row to `practice_ratings`.
6. The Smart Review page surfaces a previously rated (1–4)
   sentence for `a1-introductions` ordered by rating then oldest
   last-practised.
7. Filter with `?q=dar,João` returns sentences containing either;
   `?q=dar,João&match=all` returns sentences containing both (or
   empty if none do).
8. A collection can be created, given a name, and a sentence added
   to it; the sentence's rating row is unaffected.
9. Settings page edits `audioSpeed` and `pauseMs`; a hard refresh
   on the same browser restores the same values; signing in on a
   second browser applies the same values.
10. The ESLint `no-restricted-imports` rule still rejects any import
    from `legacy/`.

When all ten pass, Phase C can begin (Azure audio + Android).

## 14. Future phases (no Phase B work)

Phase C consumes Phase B's audio "coming soon" placeholder and
replaces it with content-addressed `audio_assets` rows; Capaci­tor
wraps the same `apps/web` bundle for Android.

Phase D replaces the Communicate stub page with a real
`ConversationAdapter`-backed scenario for `a1-introductions`,
bounded context per the rebuild spec §8, structured summary per
§7.

Neither phase changes the Phase B file structure; they add new
modules and route handlers, leaving Phase B's components untouched.
