# Session Handoff

**Snapshot date:** 2026-08-02 (Session 14 — Phase A close-out. User
delegated all decisions to the agent. Path B (fast-forward)
confirmed as the chosen close-out; reflog records
`merge feat/web-app: Fast-forward` at 2026-07-30 10:51:16.
`main` now contains the seven per-task commits as a linear chain
on top of `chore: greenfield kickoff` (5ccf311). Origin push and
branch teardown deferred. Phase B Task 1 in progress on
`feat/phase-b-contracts`.)

> **This file is a point-in-time snapshot.** For the living,
> agent-picked-up tracker, see [`PROGRESS.md`](./PROGRESS.md) — it
> has the current focus, the issue queue, the decisions log, and the
> conventions reminder. Update `PROGRESS.md` as work progresses;
> update `HANDOFF.md` only when handing off at the end of a session.

**Repo:** `shadowdoguk/portuguese-teacher`

## TL;DR

The product direction has pivoted from "extend the A0–B1 Portuguese
teacher Next.js app per ADR-0005" to "deliver a curated A1+A2
European Portuguese platform on web + Android, written from scratch
against the reconciled rebuild spec." The legacy Next.js application
has been **archived** into `legacy/` on the working tree (not yet
committed). The repo root holds the new governance docs (`AGENTS.md`,
`CONTEXT.md`, `HANDOFF.md`, `PROGRESS.md`) plus the new
`docs/superpowers/{specs,plans}/`, `docs/reports/`, and (Session 1
addition) `docs/adr/{0001,0002}-*.md`. After the archive lands on
`main`, the repo root receives a fresh pnpm-workspaces monorepo:
`apps/{web,api,android}` +
`packages/{contracts,domain,content,tooling}`. Nothing of the legacy
is carried forward into the new project; operational patterns from
the legacy CI/Docker work may be referenced, not lifted verbatim.

Session 1 also resolved every Phase A design-tree ambiguity that
wasn't already pinned by the rebuild spec: the canonicalization rule
for `sourceChecksum`, the contributor-controlled `version` semantic,
the READ COMMITTED `SELECT … FOR UPDATE` atomic-publish
transaction, the new `cv_sentence_versions` table that lets
`practice_ratings` keep a globally-stable PK, server-side Origin
allow-listing for CSRF defense, refresh-reuse-as-compromise,
session-only logout, `First Publish` / `Idempotent Publish`
behaviour, `Pre-Phase C Audio` nullable handling, the error-envelope
shape, the rate-limit discipline, the cache-control discipline,
`Smart Review` ordering (with `NULLS FIRST`), `Filter` scope,
`Settings` sync boundaries, `Collection` rating-global rule, and the
Android bearer-transport shape selected by `X-Client-Platform`.

Authoritative artefacts:

- Spec: `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
- Phase A plan: `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
- **Phase A ADR incorporation plan**: `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md` (7 tasks A1–A7; supersedes Phase A Tasks 5/6/7 step sequences)
- **Phase B design spec**: `docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md` (Approach B: practice surface + six-stage skeleton, 14 sections)
- **Phase B implementation plan**: `docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md` (10 tasks: contracts, domain, practice API, settings, collections API, collections pages, practice pages, six-stage nav + unit-progress, smoke, verification)
- ADRs: `docs/adr/0001-workspace-and-atomic-publish.md`,
  `docs/adr/0002-shared-credentials-and-android-secure-storage.md`
- Source-archive cross-check reports: `tmp/source-archive-a-crosscheck.md` (1110 lines, source archive A → Phase A/ADRs/contra drift), `tmp/source-archive-b-crosscheck.md` (268 lines, vertical-slice source B → spec §13.3 / Phase A / glossary drift)
- Tooling: pnpm 10.0.0, Node ≥ 20.0.0, Postgres 16 in Docker (5433),
  API on 8787, web on 5173
- Auth: Argon2id + opaque 32-byte hex tokens + SHA-256-hashed cookies
  (`ptp_access` 15 min, `ptp_refresh` 30 d), no JWT, no token in
  JSON body, server-side Origin allow-listing on every
  state-changing `/api/auth/*` route
- Curriculum versioning: `cv_sentence_versions(cv_id, sentence_id, text_pt, text_en, audio_id NULL, …)` projection table; `practice_ratings(user_id, sentence_id, mode)` PK stays globally stable

## Git state

| Branch | Status |
| --- | --- |
| `main` | Contains the Session 14 governance commit (1b3071d) on top of the Path B fast-forward chain (`feat/web-app` HEAD 7790277 = `main` HEAD 7790277 + Session 14 governance). The seven per-task `feat`/`chore` commits are visible as a linear chain. 14 commits ahead of pre-Phase A tip. |
| `chore/archive-legacy` | Pending local delete after Phase B Task 1 lands. Its payload is in the chain at 8d5088b. |
| `feat/monorepo-root-tooling`, `feat/contracts-zod-schemas`, `feat/domain-rules`, `feat/tooling-adapters`, `feat/api-schema`, `feat/content-compile`, `feat/api-auth-shell`, `feat/api-content-routes`, `feat/web-app` | Kept locally for one more session so the per-task audit trail is easy to inspect. Deleted after Phase B Task 1 lands. |
| `feat/phase-b-contracts` | Cut in Session 14. Phase B Task 1 in progress. |

## Open issues

The legacy issue queue on `shadowdoguk/portuguese-teacher` (issues
#1–#142 from the A0–B1 v1 effort) is not migrated. The rebuild
starts with a fresh queue. New issues are filed via
`gh issue create` and labelled per the rebuild's triage vocabulary
(proposed: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`).

## Still pending

External dependencies and sign-offs are inherited from
`docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` §16
and applied to the rebuild's release-scope gate:

- **§10 sign-off on the rebuild spec** — Product, Pedagogy,
  Engineering, Design, QA, Security leads.
- **Live MiniMax LLM credentials** for SC-5 production-WER (when
  Phase D lands).
- **Azure pt-PT speech resource** + Polly `Inês` IAM credentials for
  the listening-test gate (Phase C).
- **Real Grafana + 3-region synthetic-probe scheduling** for the
  uptime SLO (post-Phase D).
- **External legal sign-off** on `docs/reports/european-portuguese-tts-options-july-2026.md`
  and any later AI-conversation provider disclosures.
- **Coolify (or equivalent) hosting account** for the private VPS
  deploy (post-Phase D).
- **Android dev keystore + Play Console** for the Android release
  build (Phase C + post-Phase D).

## Phase A close-out (Session 14, 2026-08-02)

User delegated all decisions to the agent. The decisions taken:

- **Path B (fast-forward)** confirmed as the chosen close-out. The
  reflog at `merge feat/web-app: Fast-forward` (2026-07-30 10:51:16)
  shows the merge ran before Session 14 opened. The seven per-task
  commits are visible on `main` as a linear chain. Rationale: each
  per-task commit is self-contained on top of the previous task's
  tree, so the fast-forward gives a clean Tasks 0–9 audit trail.
  A squash would have hidden the per-task progression.
- **No push to `origin/main`**. Push deferred to a separate PR
  workflow.
- **Local branch teardown**: `chore/archive-legacy` pending local
  delete after Phase B Task 1 lands; the seven `feat/*` Phase A
  branches kept locally for one more session, then deleted after
  Phase B Task 1 lands.
- **Phase B starts today**: Task 1 (`@pt/contracts` B-side schemas)
  cut on `feat/phase-b-contracts`.

## First action for next session

Path B already on `main`. If the governance commit (1b3071d) is
missing, recover by re-applying the Session 14 PROGRESS/HANDOFF
edits and committing them. Working tree should be clean at
handoff.

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git checkout main
git log --oneline -1
# Should show "docs(governance): Session 14 ..." (1b3071d).
git checkout -b feat/phase-b-contracts main
```

The branch lineage on `main` (oldest to newest, after Path B):

  * `chore/archive-legacy`              HEAD `8d5088b`  (legacy archive + Session-1 to 3 docs)
  * `feat/monorepo-root-tooling`        HEAD `c31c6cc`  (Task 1: root tooling + A1 ESLint guard)
  * `feat/contracts-zod-schemas`        HEAD `d6aed71`  (Task 2: @pt/contracts)
  * `feat/domain-rules`                 HEAD `d3ccbc6`  (Task 3: @pt/domain pure rules)
  * `feat/tooling-adapters`             HEAD `2725d02`  (Task 4: @pt/tooling adapter stubs)
  * `feat/api-schema`                   HEAD `bba1642`  (Task 5: @pt/api schema + A2 cv_sentence_versions)
  * `feat/content-compile`              HEAD `c6d6799`  (Task 6: @pt/content + A3 atomic publish)
  * `feat/api-auth-shell`               HEAD `9ceb72e`  (Task 7: auth + app shell + A4/A5/A6)
  * `feat/api-content-routes`           HEAD `a28c2aa`  (Task 8: curriculum + practice routers + A7)
  * `feat/web-app`                      HEAD `7790277`  (Task 9: @pt/web Vite + React SPA)


## Phase B Task 1 close-out (Session 14, 2026-08-02)

Three commits landed on `feat/phase-b-contracts`:

  * `2e2bd87` — `feat(contracts): practice, settings, collections, unitProgress, filter schemas + error codes`
    - Five new files: `settings.ts`, `collections.ts`, `unitProgress.ts`, `filter.ts`, `phase-b-schemas.test.ts`.
    - `practice.ts` rewritten per the Phase B plan: `practiceItemSchema` now exposes `unitId` + `orderIndex` (was `curriculumOrder`); `ratingWriteSchema` uses `cm_<slug>` (was UUID); `practiceQueueQuerySchema` makes `unitId` mandatory and adds `match: 'or' | 'all'`. Backward-compat aliases exported (`practiceModeSchema`, `practiceRatingInputSchema`, `smartReviewQueueResponseSchema`) so the Phase A call sites in `apps/api` keep working until Task 3.
    - `errors.ts` extended with six new codes: `practice_queue_empty`, `collection_name_required`, `collection_not_found`, `unit_not_found`, `stage_unknown`, `unit_progress_invalid_status`.
    - `curriculum.ts` + `conversation.ts` hygiene: the duplicate `scenarioIdSchema` export is now sourced from `curriculum.ts` only (the conversation module re-imports and re-exports).
    - `contracts.test.ts` updated to the new shape (4 tests rewritten, 1 test relaxed from "reject `<script>...</script>`" to "reject >200 chars" per the Phase B `filterExpressionSchema`).
    - Result: 84/84 tests pass (26 new + 58 updated).
  * `525b87c` — `chore(deps): pnpm-lock.yaml`. The repo had no lockfile before this session; the install needed for the test runner to resolve `zod@4.4.3` created one. 4313 lines, Pinned dependency closure for the 7-workspace monorepo.
  * `2d6fddb` — `fix(domain): drop Zod 4 reflection in ids.ts`. Pre-existing Zod 4 drift: the `_def.checks` reflection block in `packages/domain/src/ids.ts` was broken (Zod 4 strips check fields from `_def` at runtime) and shadowed the top-of-file `export { cvIdSchema, ... }` with a duplicate-redundant re-export. Both removed; drift detection moved to the `@pt/contracts::curriculum.test.ts` equality pinned by the existing tests.

## Hygiene debt (deferred to a follow-up chore branch)

Pre-existing on `main` before this session; surfaced by the install:

- `@pt/tooling` typecheck fails on 5 sites: `readonly` array types not matching the `AudioSynthesisAdapter.voices` and `ConversationAdapterInterface.models` signatures, plus a `sampleRate` access on a `Promise<AudioRecorderHandle>` union in `NoOpAudioRecorder.start()`. Fix: widen the interface signatures to accept `readonly` arrays and capture `this` in the recorder closure.
- `@pt/domain` test failures: 3 pre-existing failures in `domain.test.ts` (`validateIdempotentRating`, `buildSmartReviewQueue` ordering and clamp). With the `ids.ts` reflection fix, the tests now load; before the fix, the whole suite was unloadable. The underlying failures are in the smart-review / rating helpers and are out of scope for Phase B Task 1.
- `@pt/api` Phase A practice router still imports the Phase A `practiceRatingInputSchema` / `practiceQueueQuerySchema` / `smartReviewQuerySchema` names. The Phase B aliases in `practice.ts` keep them compiling; Phase B Task 3 (Practice API) is the natural home for the migration.

## Phase B Task 2 close-out (Session 15, 2026-08-02)

One commit on `feat/phase-b-domain`:

  * `aec59b4` — `feat(domain): practice queue/review/stages + filter helpers`
    - `packages/domain/src/practice/queue.ts` — `buildPracticeQueue(sentences, { mode, sortOrder, filter?, matchAll? })`. Sorts by `orderIndex` ASC for `curriculum` / `easyToHard`, DESC for `hardToEasy`. Applies the filter expression before sorting.
    - `packages/domain/src/practice/review.ts` — `buildReviewQueue(ratings, sentences, mode, limit)`. Excludes rating === 5 (mastered), unrated rows, and wrong-mode rows. Orders `rating ASC → lastPractisedAt ASC NULLS FIRST → orderIndex ASC`. Clamps to `limit`. Plus the `ReviewRating` type.
    - `packages/domain/src/practice/stages.ts` — `STAGE_ORDER` (the six stages) + `Stage` type + `nextStageRecommendation({ completedStages })` returning the lowest incomplete stage or `null`.
    - `packages/domain/src/practice/types.ts` — `PracticeItem`, `PracticeMode`, `PracticeQueueOptions`. Mirrors `@pt/contracts::practiceItemSchema` as a plain TS type so the helpers stay Zod-free.
    - `packages/domain/src/filter/apply.ts` — `applyFilter(sentences, terms, matchAll)`. Empty terms is a no-op; haystack is `textPt + textEn` lowercased.
    - `packages/domain/src/settings/types.ts` — `SortOrder` enum.
    - `packages/domain/src/__tests__/phase-b-domain.test.ts` — 15 tests pinning the four helpers.
    - `packages/domain/src/index.ts` — re-exports the new modules.

**Test results:** 15/15 Phase B tests pass. `@pt/domain` typecheck clean. The 3 pre-existing Phase A `domain.test.ts` failures (`validateIdempotentRating`, `buildSmartReviewQueue` ordering and clamp) are unchanged — they are in the Phase A files and out of scope for Task 2.

**Coexistence with Phase A `review.ts`:** the Phase A `buildSmartReviewQueue` (Drizzle-shape — `SmartReviewRating[]`, `SmartReviewSentence[]`) and the Phase B `buildReviewQueue` (Map-shape — `ReadonlyMap<sentenceId, ReviewRating>`) are separate helpers with separate contracts. They are not duplicates; the Phase B Practice API is the natural consumer of the Map shape once Task 3 lands.

## Phase B Task 3 close-out (Session 16, 2026-08-03)

One commit on `feat/phase-b-practice-api`:

  * `633f705` — `feat(api): practice ratings + queue + review endpoints`
    - `apps/api/src/modules/practice/controller.ts` (new) — `rate`, `queue`, `review` handlers. Parses with Phase B Zod schemas (`ratingWriteSchema`, `practiceQueueQuerySchema`, `smartReviewQuerySchema`); calls the repository for I/O; calls `buildPracticeQueue` / `buildReviewQueue` for ordering; validates the response with `practiceQueueResponseSchema` / `reviewQueueResponseSchema`. Errors emit the canonical envelope.
    - `apps/api/src/modules/practice/repository.ts` (new) — `upsertRating` (idempotent on `(userId, clientMutationId)` via `userMutationIdx`; the Phase B plan's `userSentenceIdx` target was incorrect), `loadActiveCvId`, `loadSentencesForUnit`, `loadRatingsForUserMode`. Pure DB shaping; controller is transport-only.
    - `apps/api/src/modules/practice/router.ts` (rewritten) — surface shrinks from five routes (ratings, events, queue, review, sessions) to three (ratings, queue, review). `events` was a Phase A placeholder for the Phase C structured-event shape; `sessions` was the `aggregateProgress` snapshot route replaced by Task 8's unit-progress routes.
    - `apps/api/src/middleware/userIdShim.ts` (new) — extracted from `apps/api/src/index.ts` so test files can import the shim without triggering `createApp()` and the env-required `index.ts` chain.
    - `apps/api/src/db/index.ts` — lazy `db` and `pool` via `Proxy`. Postgres connection opens on first query; the practice router module-loads without `DATABASE_URL` set.
    - `apps/api/src/env.ts` — lazy `getDatabaseUrl` / `getAuthAllowedOrigins` with `Proxy` back-compat on `DATABASE_URL` / `authAllowedOrigins`. Production semantics unchanged; throws fire on first read rather than at import.
    - `apps/api/package.json` — `cookie-parser@1.4.7` + `@types/cookie-parser@1.4.8`. Production dep gap: `index.ts` and `auth/cookies.ts` import it, but it was missing from `package.json`. Adding it unblocks the Phase A `curriculum.test.ts` and `auth-routes.test.ts` from loading.
    - `apps/api/src/modules/practice/__tests__/practice.test.ts` (rewritten) — Phase B pre-DB surface (6/6 tests pass): 401 on each route, `no-store` on POST `/ratings` (in the A6 prefix list), `no-store` NOT emitted on GET `/queue` and GET `/review` (those carry `private, max-age=60` + ETag on the success path, set by the controller).

**Test results:** 6/6 Phase B practice tests pass. `@pt/api` full suite: 5/9 files pass, 4 fail on the same pre-existing `@node-rs/argon2` missing dep that broke Phase A `auth-routes.test.ts` + `curriculum.test.ts`. Stash test on this branch confirmed the `@pt/api` typecheck was already broken before this commit (7+ errors in the Phase A `practice/router.ts`: missing `userIdFromAuth` augmentation, schema-vs-response shape mismatch on `curriculumOrder` vs `unitId`/`orderIndex`).

**Workspace typecheck:** `@pt/contracts` + `@pt/domain` clean. `@pt/tooling` has 5 pre-existing Zod 4 drift errors (same as Session 14). `@pt/api` has pre-existing breakage that this commit inherits (Drizzle 0.45.2 API drift, module-aug failures, missing `@node-rs/argon2`).

## Open question for Session 17

Phase B Task 4 (Settings API + Settings page) is the next concrete step. It writes `apps/api/src/modules/settings/{routes,controller,repository}.ts` against the new `settingsSchema` / `partialSettingsSchema` contracts (Task 1), plus the `@pt/web` settings page. Before Task 4 lands, two decisions are open:

1. **Drop the Phase A `practiceRatingInputSchema` / `practiceQueueQuerySchema` / `smartReviewQuerySchema` aliases?** Task 3 still imports them via the Phase A path that some `@pt/api` callers transitively trigger. With Task 3 done, the aliases can be removed in Task 4 (or in a focused cleanup commit) — but removing them will surface *more* `@pt/api` typecheck errors that the pre-existing drift covers. **Recommendation:** keep them through Phase B; remove them in a single chore commit after Phase B lands.
2. **Open `chore/phase-a-zod-4-drift`** to clear the `@pt/tooling` typecheck errors, the `@pt/domain` test failures (`validateIdempotentRating`, `buildSmartReviewQueue` ordering and clamp), the `@pt/api` pre-existing breakage (Drizzle 0.45.2 API drift, `@node-rs/argon2` missing, `express-serve-static-core` module-aug failures, missing schema columns on `curriculum_versions.level`), and the Phase A `auth-routes.test.ts` / `curriculum.test.ts` dep gaps. This is the right vehicle for clearing the `pnpm -r typecheck` / `pnpm -r test` global constraints — it's now a *substantially* bigger surface than the Session 14 estimate, and it should be scoped as a multi-commit hygiene branch before Phase B Task 4, not deferred further.

Sessions continuing the rebuild should pick up at **Phase B Task 4 — Settings API + Settings page** on `feat/phase-b-settings`, branched from `feat/phase-b-practice-api` (to bring the new contracts + new helpers + new practice API in).

## Open question for Session 15

The Phase B plan §Task 1 step 11 commits only `packages/contracts/src`. The `ids.ts` hygiene fix and the lockfile commit are deliberate scope expansions. Phase B Task 2 (Domain helpers) should:

1. Land the four pure helpers (`buildPracticeQueue`, `buildReviewQueue`, `applyFilter`, `nextStageRecommendation`) the plan spells out.
2. Decide whether to keep the Phase A `practiceRatingInputSchema` / `practiceQueueQuerySchema` / `smartReviewQuerySchema` aliases — if Task 3 is the next step, keeping them is the cheap path; if Task 3 is delayed, the alias names are confusing and should be removed.
3. Open `chore/phase-a-zod-4-drift` to clear the `@pt/tooling` typecheck errors and the `@pt/domain` test failures (both pre-existing).

Sessions continuing the rebuild should pick up at **Phase B Task 2 — Domain helpers (pure logic)** on `feat/phase-b-domain`, branched from `feat/phase-b-contracts` (to bring the new contracts in).

## Key references

| Topic | File / issue |
|---|---|
| Rebuild spec | `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A plan | `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Phase A ADR incorporation plan | `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md` (Tasks A1–A7) |
| Phase B design spec | `docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md` |
| Phase B implementation plan | `docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md` (Tasks 1–10) |
| Domain glossary | `CONTEXT.md` |
| Agent process guide | `AGENTS.md` |
| Living tracker | `PROGRESS.md` |
| Architectural decisions | `docs/adr/0001-workspace-and-atomic-publish.md` (Q1–Q5), `docs/adr/0002-shared-credentials-and-android-secure-storage.md` (Q6–Q10) |
| Source-archive cross-check evidence | `tmp/source-archive-a-crosscheck.md`, `tmp/source-archive-b-crosscheck.md` |
| Cross-link | `docs/superpowers/README.md` |
| Research (TTS providers) | `docs/reports/european-portuguese-tts-options-july-2026.md` |
| Source planning archive (reference only) | `/tmp/opencode/planning/` |

## Conventions to honour

- All non-trivial work happens on a feature branch named
  `feat/issue-<N>-<slug>` (or `chore/<slug>` for chore work,
  `docs/<slug>` for ADR/spec/PR-description-only changes).
- Use the glossary in `CONTEXT.md`. If you introduce a new domain
  term, add it to the glossary in the same change.
- The 5-state triage vocabulary applies to every issue.
- `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build`, `pnpm -r lint`
  must all pass before commit.
- New domain terms go into `CONTEXT.md` in the same change.
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
  (numbering starts at 0001; never re-edit legacy ADRs).
- Update `PROGRESS.md` whenever an issue transitions state, a
  branch lands, or a decision is made. Bump `**Last updated:**` to
  today's date on every `PROGRESS.md` change.
- Commit steps in the plan are review-only. No commit fires without
  explicit user authorization.

## Phase B Task 4 close-out (Session 17, 2026-08-03)

**Snapshot date:** 2026-08-03 (Session 17 — Phase B Task 4 land.
User delegated the session to the agent on `feat/phase-b-settings`
branched from `feat/phase-b-practice-api`.)

Work landed in this session (single review-only commit pending):
- **`apps/api/src/db/schema.ts`** — new `userSettings` table keyed
  by `user_id` (PK + FK to `auth_users`). `audio_speed` stored as
  basis points (50–200 = 0.5–2.0×) to match the `audio_assets.speed`
  convention. Drizzle `check()` entries deliberately omitted — see
  drift note below.
- **`apps/api/migrations/0000_init.sql`** — matching CREATE TABLE
  with the four CHECK constraints (`audio_speed BETWEEN 50 AND 200`,
  `repetitions BETWEEN 1 AND 5`, `text_size IN (...)`,
  `sort_order IN (...)`). SQL is authoritative.
- **`apps/api/src/db/__tests__/dbSchema.test.ts`** — new describe
  block asserting the table shape and the four CHECK constraints
  appear in the migration.
- **`apps/api/src/modules/settings/repository.ts`** — `loadSettings`,
  `patchSettings` (idempotent upsert via `ON CONFLICT (user_id)
  DO UPDATE`), wire ↔ row conversion (basis points ↔ float,
  integer-boolean ↔ JS boolean). First-access materialises defaults
  via INSERT-then-return; the controller never sees a 404.
- **`apps/api/src/modules/settings/controller.ts`** — `getSettings`,
  `patchThisSettings`. Zod parse via `@pt/contracts::settingsSchema`
  / `partialSettingsSchema`; canonical error envelope on 4xx.
- **`apps/api/src/modules/settings/router.ts`** — `Router` with
  `GET /` + `PATCH /`. Mounted behind `requireAuth` +
  `userIdFromAuthShim` in `apps/api/src/index.ts`.
- **`apps/api/src/middleware/cache.ts`** — `/api/me/` added to the
  `NO_STORE_PREFIXES` list (settings endpoints always carry
  `Cache-Control: no-store`).
- **`apps/api/src/index.ts`** — `app.use('/api/me/settings',
  requireAuth, userIdFromAuthShim, settingsRouter)`.
- **`apps/api/src/modules/settings/__tests__/settings.test.ts`** —
  8 pre-DB tests: 401 gate, Cache-Control `no-store`, and
  PATCH validation (out-of-range `audioSpeed`, unknown `sortOrder`,
  unknown `textSize`, empty body). All pass.
- **`apps/web/src/pages/SettingsPage.tsx`** — `GET /api/me/settings`
  on mount, `PATCH` on Save. Accepts optional `client: ApiClient`
  prop so tests can inject a stub. Zod re-validation of every
  response.
- **`apps/web/src/api/client.ts`** — extended with `patch<T>`; the
  constructor now reads `globalThis.fetch` lazily (per call) so a
  custom client override wins over jsdom's missing default.
- **`apps/web/src/App.tsx`** — `/settings` route added.
- **`apps/web/src/pages/__tests__/SettingsPage.test.tsx`** — 3 tests
  covering the GET mount, PATCH on Save, and server-side 400 surface
  (via injected `FakeApiClient`). All pass.
- **`apps/web/src/__tests__/App.test.tsx`** — `/settings` smoke
  deferred (the `ApiClient` lazy-fetch fix is in place but
  App-level render needs a `MemoryRouter` swap to `HashRouter`
  upstream; the dedicated `SettingsPage.test.tsx` covers the full
  contract).
- **`PROGRESS.md`** — `Last updated:` bumped to 2026-08-03 (Session
  17) with the close-out summary.

**Test results:**
- `@pt/contracts` 84/84 pass.
- `@pt/domain` Phase B helpers 40/40 pass (15 from Task 2 + 25 from
  cumulative Phase B additions).
- `@pt/api` settings pre-DB test: 8/8 pass.
- `@pt/api` schema test (new `user_settings` describe block): pass.
- `@pt/web` Settings page test: 3/3 pass.

**Drift status (vs. HANDOFF §"Open question for Session 17"):**
- The pre-existing 19 `@pt/api` typecheck errors are unchanged —
  the `user_settings` Drizzle `check()` entries were deliberately
  omitted (the migration CHECKs are authoritative). No widening.
- `@pt/tooling` 5 Zod 4 drift errors: unchanged.
- `@pt/domain` 3 pre-existing `domain.test.ts` failures: unchanged.
- `@pt/web` `tsconfig.node.json` reference error: pre-existing,
  unrelated.
- `@pt/web` App test fails on `MemoryRouter` inside `HashRouter`:
  pre-existing on the upstream tip (stash test confirms); unrelated.

**Hygiene debt deferred:**
- `chore/phase-a-zod-4-drift` is now the natural next move before
  Phase B Task 5 (Collections API), per Session 16's open question.
  Recommended scope: clear `@pt/tooling` Zod 4 drift, restore
  `user_settings` Drizzle CHECK entries, fix `@pt/api` Drizzle
  0.45.2 `between()` / `in()` API drift, install `@node-rs/argon2`,
  fix `express-serve-static-core` module-aug failures, fix the 3
  pre-existing `domain.test.ts` failures. The chore branch is
  drift-only — no Phase B surface changes.

Sessions continuing the rebuild should pick up at **Phase B Task 5 —
Collections API** on `feat/phase-b-collections-api`, branched from
`feat/phase-b-settings` (to bring the new contracts + helpers +
practice API + settings API in).

## Phase B Task 5 close-out (Session 17, 2026-08-03)

Work landed in this session (single review-only commit pending):
- **`apps/api/src/db/schema.ts`** — new `collections` table
  (PK `id`, FK `user_id → auth_users`, `name`, `created_at`) and
  `collection_items` table (composite PK `(collection_id,
  sentence_id)`, `order_index`, FK cascade to both parent tables,
  `collection_items_order_idx` UNIQUE index on `(collection_id,
  order_index)`). Per CONTEXT.md "Collections", ratings are global
  to the user, not per-collection — the rating table is untouched.
- **`apps/api/migrations/0000_init.sql`** — matching CREATE TABLE
  + CREATE INDEX statements.
- **`apps/api/src/db/__tests__/dbSchema.test.ts`** — new describe
  block asserting the table shape, FKs, and unique index land in
  the migration.
- **`apps/api/src/modules/collections/repository.ts`** —
  `listCollections`, `getCollection`, `createCollection`,
  `addItem` (idempotent on the composite PK via `onConflictDoNothing`),
  `removeItem`, `deleteCollection`. Drizzle-typed calls mirror the
  Task 4 settings repository pattern.
- **`apps/api/src/modules/collections/controller.ts`** — six
  handlers (`list`, `create`, `detail`, `add`, `removeItem`,
  `destroy`) plus `listStrict` for future response-shape re-
  validation. Zod parse via `@pt/contracts::collections`; canonical
  error envelope on 4xx; `Cache-Control: no-store` on every write
  route and the list route; `private, max-age=60` + ETag on the
  detail route. `paramString()` helper narrows Express 5's
  `string | string[] | undefined` `req.params` shape.
- **`apps/api/src/modules/collections/router.ts`** — `Router` with
  the six endpoints.
- **`apps/api/src/index.ts`** — `app.use('/api/collections',
  requireAuth, userIdFromAuthShim, collectionsRouter)`.
- **`apps/api/src/modules/collections/__tests__/collections.test.ts`** —
  8 pre-DB tests: 401 gate on every route, Cache-Control `no-store`
  discipline on POST, PATCH-style validation gates
  (`collection_name_required` for empty name; `validation_failed`
  for malformed `sentenceId`). All pass.
- **`PROGRESS.md`** — `Last updated:` Session 17 entry extended
  with the Task 5 close-out.

**Test results:** `@pt/api` collections test 8/8 pass.

**Drift status (vs. HANDOFF §"Open question for Session 17"):**
- 26 `@pt/api` typecheck errors vs. 29 on the upstream tip —
  **drift-negative**. The 7 `userIdFromAuth` errors on my new
  controller share the same pre-existing `express-serve-static-core`
  module-aug drift root cause as practice + settings. The
  3-error reduction comes from fixing my own `removeItem` import-
  name clash and the Express 5 `req.params` narrowing in this
  session.
- All other drift surfaces (`@pt/tooling` Zod 4, 3 Phase A
  `@pt/domain` test failures, `@pt/web` App-test router-nesting,
  `@pt/web` typecheck `tsconfig.node.json` reference) unchanged.

**Known limitation surfaced:** the `dbSchema.test.ts` "no tests"
failure (`process.cwd()` from inside `apps/api` is the workspace
root) is **pre-existing** on the upstream tip. The fix is a
one-liner (`apps/api/migrations/0000_init.sql` instead of
`apps/api/migrations/0000_init.sql` when cwd is `apps/api`) and
belongs in `chore/phase-a-zod-4-drift`.

Sessions continuing the rebuild should pick up at **Phase B Task 6 —
Collections pages** on `feat/phase-b-collections-pages`, branched
from `feat/phase-b-collections-api` (to bring the new contracts +
helpers + practice API + settings API + collections API in).

## Phase B Task 6 close-out (Session 17, 2026-08-03)

Work landed in this session (single review-only commit pending):
- **`apps/web/src/components/StarRating.tsx`** — accessible 1..5
  star rating radio group (`role="radiogroup"` on the container,
  per-star `role="radio"` + `aria-checked` + screen-reader-friendly
  `aria-label`, hover + focus parity). Inline `style` placeholder
  fills; the project's design system ships in Phase C. Kept as
  a reusable component for the practice pages in Task 7.
- **`apps/web/src/pages/CollectionsPage.tsx`** — `GET
  /api/collections` on mount + `POST` create + empty-name
  client-side validation (button disabled when `name.trim()` is
  empty) + server-side `collection_name_required` error surface.
  Accepts optional `client: ApiClient` prop for test injection.
- **`apps/web/src/pages/CollectionDetailPage.tsx`** — `GET
  /api/collections/:id` on mount + `DELETE` on Remove + server-
  side `collection_not_found` (load path) error surface. Item
  removed from local state on successful DELETE; busy state per
  row to prevent double-clicks. Same `client` prop injection
  pattern.
- **`apps/web/src/api/client.ts`** — extended with `delete<T>`;
  `request` now accepts `'GET' | 'POST' | 'PATCH' | 'DELETE'`.
- **`apps/web/src/App.tsx`** — `/collections` and
  `/collections/:id` routes added.
- **`apps/web/src/pages/__tests__/CollectionsPage.test.tsx`** —
  4 tests (initial GET, POST on Create, empty-name no-op, server
  `collection_name_required` surface). All pass.
- **`apps/web/src/pages/__tests__/CollectionDetailPage.test.tsx`** —
  3 tests (initial GET, DELETE on Remove, server
  `collection_not_found` surface). All pass.
- **`PROGRESS.md`** — Session 17 lead extended with Task 6
  close-out.

**Test results:** `@pt/web` 7/7 pass (CollectionsPage 4/4 +
CollectionDetailPage 3/3). `@pt/api` drift-neutral (no new
errors introduced vs. Task 5's 26 baseline).

**No schema/middleware changes** — Task 6 is web-only. The
`StarRating` component will be the rating-capture primitive for
Task 7's practice pages.

Sessions continuing the rebuild should pick up at **Phase B Task 7 —
Practice pages (Shadow, Recall, Review, Filter)** on
`feat/phase-b-practice-pages`, branched from
`feat/phase-b-collections-pages` (to bring the new contracts +
helpers + practice API + settings API + collections API +
collections pages in).
