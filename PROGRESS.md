# Progress Tracker

A living document. Read this at the start of every session to pick up
where the last one left off. Update it whenever an issue transitions
state, a branch lands, a decision is made, or a blocker appears or
clears.

**Last updated:** 2026-07-30 (Session 6 — Task 2 committed
(`feat/contracts-zod-schemas`): `@pt/contracts` workspace published
with Zod 4.4.3 schemas for errors, curriculum (incl. ADR-0001
`cv_sentence_versions` projection), practice, audio, conversation,
and auth (incl. ADR-0002 Argon2id triple lock and web/Android
discriminated-union login/refresh). 665-line test file pins every
top-level schema with positive + negative fixtures. Layering rule
enforced by `exports` map + workspace TS references. Phase A
Tasks 3–9 and amendment Tasks A2–A7 unblocked on top of
`feat/monorepo-root-tooling` HEAD `c31c6cc`.)

## Current focus

**Greenfield rebuild to the European Portuguese learning platform.**

The new project replaces the legacy application at this repo. The
Next.js application, Prisma schema, seeded A0–B1 curriculum,
`pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml`, and all
legacy governance files are **archived** into `legacy/` on a single
chore branch — that archive is **Task 0** of the Phase A
implementation plan. The legacy code is preserved (not deleted) for
reference. After the archive, the repo root receives a fresh
pnpm-workspaces monorepo skeleton: `apps/{web,api,android}` +
`packages/{contracts,domain,content,tooling}` + root tooling files.
Nothing of the legacy system is carried forward into the new code;
only its operational patterns (CI workarounds, Docker deploy story,
provider-integration shapes) are referenced during the rebuild.

## Authoritative artefacts

| Artefact | Path |
|---|---|
| Rebuild spec | `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A plan | `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Phase A ADR incorporation plan | `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md` |
| Phase B design spec | `docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md` |
| Phase B implementation plan | `docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md` |
| Domain glossary | `CONTEXT.md` (rewritten for the new product) |
| Session handoff | `HANDOFF.md` (point-in-time snapshot) |
| ADRs | `docs/adr/0001-workspace-and-atomic-publish.md`, `docs/adr/0002-shared-credentials-and-android-secure-storage.md` (numbering restarts at 0001) |
| Issue tracker | `shadowdoguk/portuguese-teacher` on GitHub |
| Source planning archive | `/tmp/opencode/planning/` (reference only) |

## Session 0 — Greenfield kickoff (2026-07-22)

- **Vision pivoted.** The product direction is no longer "extend the
  A0–B1 Portuguese teacher Next.js app with v1 release gates per ADR-0005."
  It is "deliver a curated A1+A2 European Portuguese platform on web +
  Android, written from scratch against an approved spec."
- **Brainstorm produced the reconciled spec** at
  `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
  (18 sections, 509 lines). Three reconciliations against the source
  planning archive: legacy tree is **archived** into `legacy/`
  rather than deleted; pnpm is the toolchain (replacing the source
  plan's npm); path references point to this repo (`portuguese-teacher`)
  rather than a sibling legacy project.
- **Source planning files brought into the repo.** The original
  planning archive at `/tmp/opencode/planning/` is now inside the
  repo at `docs/superpowers/specs/2026-07-22-european-portuguese-learning-platform-design.md`,
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md`,
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-vertical-slice.md`,
  and `docs/reports/european-portuguese-tts-options-july-2026.md`.
- **Phase A plan written** at
  `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
  (10 tasks incl. Task 0 legacy archive, 4200+ lines). Tasks are
  greenfield-from-scratch — every step is concrete code, file path,
  or shell command. No `pnpm-workspace.yaml`-extension step; the
  workspace file is created fresh at Task 1.
- **Tooling constraints locked.** pnpm 10.0.0, Node ≥ 20.0.0,
  Postgres 16 in Docker on port 5433, API on port 8787, web on 5173.
  ESLint flat config keeps the new monorepo clean. Argon2id +
  opaque-token + HttpOnly cookie auth is the only authentication
  surface in Phase A.
- **Legacy application archived into `legacy/` (working tree).** The
  full Next.js app, Prisma schema, scripts, Dockerfile, configs,
  legacy governance docs, and legacy `docs/{a11y,adr,agents,perf,
  postmortems,requirements,research}/` plus legacy `2026-07-06-*`
  specs/plans are now under `legacy/` on the working tree. Build
  artifacts (`.next/`, `node_modules/`, `tmp/`, `playwright-report/`,
  `.worktrees/`) remain at the top level but are now gitignored. No
  legacy governance file remains at the root — `AGENTS.md`,
  `CONTEXT.md`, `HANDOFF.md`, `PROGRESS.md` at the root are the
  Session-0 rewrites. The legacy versions of those four files are
  inside `legacy/`.
- **No commits yet.** Every commit step in the plan is review-only and
  fires only after explicit user authorization.

## Session 1 — Phase A decision-tree grind (2026-07-23)

- **`grill-with-docs` session** (`/grilling` + `/domain-modeling`)
  walked the Phase A design tree from top to bottom. The user answered
  the first five atomic-publish questions interactively, then handed
  the rest of the branches (auth CSRF + refresh reuse + logout scope;
  Smart Review / Filter / Settings / Collections; idempotent publish;
  error envelope; rate-limit discipline; cache control; pre-Phase C
  audio; Android bearer transport) to be auto-resolved with the
  recommended answer for each.
- **`docs/adr/0001-workspace-and-atomic-publish.md`** drafted:
  `sourceChecksum` = canonicalized UTF-8 bytes of `manifest.json`;
  `version` is per-Level contributor-controlled; atomic-publish
  transaction runs at READ COMMITTED with `SELECT … FOR UPDATE` →
  UPDATE → INSERT; `cv_sentence_versions` table added so
  `practice_ratings` keeps a globally-stable PK while CV text
  revisions are preserved.
- **`docs/adr/0002-shared-credentials-and-android-secure-storage.md`**
  drafted: CSRF defense is server-side Origin allow-listing on every
  state-changing `/api/auth/*` route; refresh reuse triggers
  `user_id`-wide revocation in one transaction with a
  `refresh_reuse_compromise` audit event and `401 refresh_reused`;
  logout revokes only the current session row; Android uses the same
  opaque tokens as `Authorization: Bearer <token>` with the refresh
  stored under `@aparajita/capacitor-secure-storage`, selected
  through an `X-Client-Platform` header.
- **`CONTEXT.md` sharpened**: added `CV Sentence Versions`,
  `CSRF Defense`, `Refresh Reuse Compromise`, `Logout Scope`,
  `Idempotent Publish`, `Pre-Phase C Audio`, `Error Envelope`,
  `Rate Limit`, `Cache-Control Discipline`, `First Publish`;
  tightened `Smart Review` ordering with `NULLS FIRST`,
  `Settings` sync scope, `Filter` scope, and `Collection`
  rating-global rule.
- **Implementation gate unchanged.** No code from Session 1 lands
  until the legacy archive (Task 0) commits. All subsequent Phase A
  tasks reference ADRs 0001–0002 as ground truth.

## Session 2 — Phase A amendment plan + source-archive cross-check (2026-07-23)

- **`docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md`**
  drafted (7 tasks, ~1085 lines) to fold ADR-0001 + ADR-0002 decisions
  into buildable Phase A code. The plan supersedes only the affected
  Task 5/6/7 step sequences in the parent plan; Tasks 0–4 + 8–9
  remain authoritative.
- **Source-archive cross-check** dispatched two parallel research
  agents (general-purpose) that read
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md`
  (5312 lines) and
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-vertical-slice.md`
  against the rebuild spec, the parent Phase A plan, ADRs 0001/0002,
  and `CONTEXT.md`. Reports saved to
  `tmp/source-archive-a-crosscheck.md` (1110 lines) and
  `tmp/source-archive-b-crosscheck.md` (268 lines).
- **Drift uncovered** (resolved by the amendment plan):
  - ADR-0001 §1 contradicted source archive `JSON.stringify(manifest)`
    sourceChecksum → **canonicalized UTF-8 bytes with sorted keys**.
  - ADR-0001 §3 extended the source archive's `deactivateLevel` API
    with an explicit `SELECT … FOR UPDATE` row lock.
  - ADR-0001 §4 introduced a `cv_sentence_versions` projection table;
    parent Phase A kept text on `sentences` with `curriculum_version_id`
    FK — **schema disagreement resolved by amendment Task A2**.
  - ADR-0002 §1 added `AUTH_ALLOWED_ORIGINS` Origin allow-list CSRF
    defense to a project that previously had `SameSite=Lax` only.
  - ADR-0002 §2 added refresh-reuse compromise handling to a project
    whose `rotateSession` had no rotation-detection branch.
  - ADR-0002's Android bearer transport replaced the source archive's
    "API also returns the tokens in the JSON body" with a
    `X-Client-Platform`-keyed response shape.
  - `status` columns typed `text` instead of the declared
    `content_status` PG enum.
  - ESLint `no-restricted-imports` for `legacy/` paths missing from
    Phase A's flat-config snippet (rebuild spec §16 requires it).
  - `dbSchema.test.ts` asserted tables and partial unique index but
    not the `CHECK (rating BETWEEN 1 AND 5)` constraint.
- **Phase A → Phase B drift** (logged as out-of-scope for the
  amendment plan):
  - `@pt/domain::Recorder` is too thin (Phase B/C need
    `MediaRecorder` adapter).
  - `@pt/domain::buildConversationContext` drops source archive's
    `maxChars` budget (Phase D needs this).
  - `@pt/domain::buildReviewQueue` tie-break on `orderIndex` is
    different from the source archive's `sentenceId`; `CONTEXT.md`
    pins `curriculum_order` as the third tie-break.
  - `@pt/domain::summarizeUnit`/`summarizeLevel` returns stage counts
    and averaged percent; source archive returns per-mode mastery
    aggregates; `CONTEXT.md` "Mastery" mandates per-mode mastery.
  - `@pt/domain::addCollectionItem` is a `string[]`; source archive
    uses `{ sentenceId, orderIndex, addedAt }`.
- **`a1-introductions` content assumptions are fully aligned** across
  source archive, rebuild spec, parent Phase A plan, and `CONTEXT.md`.
  Authoritative counts: ≥1 each of vocabulary/grammar/pronunciation
  lesson, ≥1 island, ≥1 scenario, ≥12 sentences; `status: "draft"`
  until a human expert reviewer flips it.
- **Implementation gate unchanged**. No code from Session 2 lands
  until Task 0 (legacy archive) commits. The amendment plan is the
  next agent's first concrete work after Task 0–4 finish.

## Session 3 — Phase B brainstorm + design spec + plan (2026-07-23)

- **`/grilling` + `brainstorming` + `writing-plans` skills** ran end to end on Phase B. The user picked Approach B (Practice surface + six-stage skeleton) from three alternatives.
- **`docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md`** drafted (292 lines, 14 sections). Self-review sharpened the `unit_progress` "complete" semantics from auto-render to explicit learner affirmation. User-approved.
- **`docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md`** drafted (2347 lines, 10 tasks). Per the writing-plans skill format with file map, global constraints, TDD-shaped steps, and review-only commit checkpoints.
- **Self-review fixed:**
  - Replaced one "brevity elided" placeholder in Task 7 Step 8 with full test code for Recall/Review/Filter.
  - Replaced two "analogous to Learn" placeholders in Task 8 with full code for Notice and Apply.
  - Added a missing `/api/curriculum/sentences?filter=...&match=...` endpoint to Task 7 (the Filter page referenced it but the plan didn't ship it).
  - Replaced Task 8's inline "find first incomplete stage" loop with the existing `nextStageRecommendation` helper from `@pt/domain`.
  - Fixed `MicRecorder.tsx` blob-URL cleanup bug (calling `URL.createObjectURL` instead of `URL.revokeObjectURL`).
- **Phase B scope locked:**
  - 12 new endpoints: settings × 2; practice × 3 (ratings, queue, review); collections × 6; unit-progress × 1; curriculum filter × 1.
  - 8 new web routes: Unit, Learn, Notice, Shadow, Recall, Apply, Communicate, Review, Filter, Collections, CollectionDetail, Settings (12 entries; some shared).
  - 4 new pure domain helpers: `buildPracticeQueue`, `buildReviewQueue`, `applyFilter`, `nextStageRecommendation`.
  - Audio playback reserved for Phase C — shadow surfaces `<AudioComingSoon />`; AI role-play reserved for Phase D — Communicate page reads scenario metadata only.
- **Phase B acceptance gate codified** (§13 of the design spec, Task 10 of the plan): §13.3-equivalent criteria for the practice surface alone (audio and Android are Phase C; AI is Phase D).
- **Implementation gate still unchanged.** No code from Session 3 lands until Phase A + amendment plan ship.

## Decisions log

- **2026-07-22 — Greenfield rebuild replaces the A0–B1 v1 effort.**
  The legacy Next.js app, ADRs 0001–0005, v1 release-scope governance,
  and accumulated `PROGRESS.md` history are not carried into the new
  project. The legacy is preserved verbatim under `legacy/` for
  **technical reference only** — never for design, pedagogy,
  curriculum shape, the six-stage loop, the Affective Filter proxy,
  the SRS scheduler, the voice-loop tier detection, or any product-
  or pedagogy-shaped decision. `legacy/README.md` codifies this
  boundary for future agents browsing the archive. The existing
  `shadowdoguk/portuguese-teacher` GitHub repository is reused as the
  host (per user direction), but every file path and toolchain entry
  is reset. The reference spec lives at
  `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`.
- **2026-07-22 — pnpm 10.0.0 + Node ≥ 20.0.0 + Postgres 16 in Docker
  is the greenfield toolchain.** Locked at the bottom of Task 1.
- **2026-07-22 — Tools/ADRs use the rebuild numbering scheme.**
  ADR `0001` covers workspace + atomic publish; ADR `0002` covers
  shared credentials + Android secure storage.
- **2026-07-23 — Grilling session** (`grill-with-docs` + `domain-modeling`).
  Walked the Phase A decision tree and locked:
  - **`sourceChecksum` is the SHA-256 hex of the canonicalized UTF-8 bytes of `manifest.json`** (sorted keys, fixed whitespace).
  - **`version` is a per-Level contributor-controlled positive integer** declared as a top-level field of `manifest.json` and folded into the CV-ID hash.
  - **Atomic-publish transaction runs at READ COMMITTED** with `SELECT … FOR UPDATE` on the previous active CV row, then UPDATE→INSERT. Partial unique index is belt-and-braces.
  - **`cv_sentence_versions(cv_id, sentence_id, text_pt, text_en, audio_id NULL, …)` table** preserves per-CV text history while `practice_ratings(user_id, sentence_id, mode)` keeps a globally-stable PK and ratings carry across CV text revisions.
  - **CSRF defense is server-side Origin allow-listing** on every state-changing `/api/auth/*` route. `SameSite=Lax` is the second line, not the first.
  - **Refresh-token reuse is treated as compromise**: full `user_id` revocation in one transaction, audit row, `401 refresh_reused`.
  - **Logout scope = current session only**; "sign out everywhere" is deferred.
  - **Idempotent re-publish** uses `ON CONFLICT (id) DO NOTHING` and exits `0` when the CV-ID recomputes to an existing row.
  - **Pre-Phase C audio is nullable** on `cv_sentence_versions.audio_id`; the Shadow stage surfaces a "coming soon" empty state, no 500.
  - **Error envelope shape** is `{ error: { code, message, correlationId } }`; 4xx codes are user-actionable, 5xx references the correlation ID.
  - **Rate-limit discipline** uses in-memory sliding windows; per-IP for unauthenticated, per-`auth_sessions.id` for authenticated mutating routes.
  - **Cache-Control**: curriculum reads `private, max-age=60` + `ETag`; rating/event/session/auth routes `no-store`.
  - **First publish** skips the UPDATE step and INSERTs with `active=true`; the partial unique index permits the insert.
  - **`Smart Review`** orders `rating ASC → last_practised_at ASC NULLS FIRST → curriculum_order ASC` over the active CV, optionally intersected by a Unit or Collection.
  - **Filter scope** = sentences in the active CV; comma-separated terms use OR by default; an explicit "Match all" switches to AND; Unit / Collection parameters apply as AND.
  - **Settings sync** = per-Learner server-side for every column; the only client-local state is device permission grants, ephemeral UI flags, and on-device recordings.
  - **Collections** route through the same ratings table; ratings are global to the user, not per-collection.
  - **Android bearer transport** (Phase C): same opaque tokens over `Authorization: Bearer <token>`, refresh stored with `@aparajita/capacitor-secure-storage`, request header `X-Client-Platform` selects cookie-vs-bearer response shape.
  - ADR `0001` captures decisions 1–4; ADR `0002` captures the auth/CSRF/refresh-reuse/Android-bearer cluster. CONTEXT.md absorbs the rest as glossary refinements.

## Issues status

Issue tracker: `shadowdoguk/portuguese-teacher` on GitHub.

> The legacy tracker state (issues #1–#142 from the A0–B1 v1 effort)
> is not migrated. The rebuild effort starts with a fresh issue
> queue. Open or triage-vocabulary decisions live in
> `AGENTS.md` and the rebuild spec.

## First action for next session

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git status
git log --oneline -10
# Read PROGRESS.md (this file), HANDOFF.md, CONTEXT.md,
# docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md,
# docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md.
# Then begin Task 0 on a fresh branch: chore/remove-legacy.
```

Sessions continuing the rebuild should pick up at **Task 0** of the
Phase A plan unless `PROGRESS.md` records further progress.
