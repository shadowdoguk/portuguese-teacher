# Portuguese Teacher — Greenfield Rebuild to European Portuguese Platform

**Date:** 2026-07-22
**Status:** Approved in brainstorming
**Source spec:** `docs/superpowers/specs/2026-07-22-european-portuguese-learning-platform-design.md`
**Source plans:** `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md`
`docs/superpowers/plans/2026-07-22-european-portuguese-foundation-vertical-slice.md`
**Source research:** `docs/reports/european-portuguese-tts-options-july-2026.md`
**Release target:** Curated A1 and A2 European Portuguese for web and Android

## 1. Purpose

Replace the existing Next.js application in this repository with a clean,
focused rebuild of the European Portuguese learning platform. The legacy
tree at the repo root (the Next.js app, its Prisma schema, the seeded
A0–B1 curriculum, scripts, Dockerfile, configs, and the legacy governance
docs) is **archived** into `legacy/` at the start of Phase A and never
touched again. The repo root becomes the new monorepo root. The legacy
is **not built on, ported, or wrapped** — only consulted during the
greenfield rewrite for operational patterns (CI workarounds, Docker
deployment, provider-integration shapes).

The new product takes English-speaking learners from no prior knowledge
through reviewed A1 and A2 material via a six-stage unit loop
(Learn → Notice → Shadow → Recall → Apply → Communicate), with separate
Shadow and Recall ratings, Smart Review built on a simple rating queue
(no hidden SRS in v1), focused filters and collections, and constrained
text AI role-play. Web and Android share one account and one progress
record.

The current Portuguese-learning product, user workflow, accumulated
features, and seeded curriculum are not retained. The existing Drizzle
schema, MiniMax adapters, voice-loop tiers, learner model, and Prisma
deploy story are reference material only. The new Drizzle schema,
contracts, and adapters are written from scratch against this spec.

## 2. Reconciliation against the source planning archive

The source spec and plans were authored against a different application.
Three things change when those plans apply here:

1. **Starting state.** The repo currently contains an unrelated
   application. That entire tree is being archived into `legacy/` at
   the start of Phase A, before any new code lands. Replacing the
   repo root with a fresh pnpm-workspaces monorepo is the first
   concrete step.
2. **Toolchain.** The source plans specify npm workspaces. pnpm is the
   chosen toolchain. Use `pnpm-workspace.yaml` to declare
   `apps/*` and `packages/*` as workspaces and resolve CLI invocations
   via `pnpm --filter @pt/<name>`.
3. **Path references.** Every literal reference to
   `/home/david/shadowdog-dev/projects/image-to-prompt` becomes
   `/home/david/shadowdog-dev/projects/portuguese-teacher`.

Anything in the source spec or plans not covered by this reconciliation
is applied literally. The legacy tree on disk is archived into
`legacy/`; the new stack does not inherit any of its code, configs,
or governance docs.

## 3. Repository layout

```
/home/david/shadowdog-dev/projects/portuguese-teacher/
│
├─ apps/                                    [NEW — Phase A first action]
│   ├─ web/      React 19 + Vite 8 SPA
│   ├─ api/      Express 5 + Drizzle 0.45 + PostgreSQL 16 (Docker) on 8787
│   └─ android/  Capacitor 8 wrapper         [Phase C]
│
├─ packages/                                [NEW — Phase A first action]
│   ├─ contracts/  Zod 4 schemas
│   ├─ domain/     Pure rules
│   ├─ content/    Source JSON + Zod validators + compiler
│   └─ tooling/    Audio + AI conversation adapter interfaces + stubs
│
├─ tool configs (root, Phase A)             [NEW]
│   package.json (CommonJS, devDeps for workspaces)
│   pnpm-workspace.yaml (apps/* + packages/*)
│   pnpm-lock.yaml (Phase A produce)
│   tsconfig.base.json (strict ES2023, composite)
│   eslint.config.mjs (flat config, ignores removed legacy paths)
│   .nvmrc / .npmrc / .editorconfig (Phase A produce)
│   docker-compose.yml (Postgres 16 on 5433)
│   db/docker-entrypoint-initdb.d/01-create-test-db.sql
│   scripts/dev-up.sh, dev-down.sh, test-api.sh
│
└─ tools/                                    [NEW — Phase A first action]
    └─ check-android-prereqs.ts             (Phase C helper, lands now)
```

At the start of Phase A, every file under the legacy tree (Next.js app,
Prisma schema, scripts, Dockerfile, configs, legacy `package.json`/
`pnpm-lock.yaml`/`pnpm-workspace.yaml`, legacy governance docs,
`.lighthouseci/`, `lighthouserc*.json`, `playwright.config.ts`,
`vitest.config.ts`, etc.) is **archived** into `legacy/` before any new
file is added. The archive happens on its own branch as the very first
implementation step in the plan (Task 0).

After the archive lands, the repo root contains the new monorepo
configuration files plus a `legacy/` subtree that holds the preserved
old application. Anything under `legacy/` is read-only reference
material; new code never reaches into it.

## 4. Delivery phases

| Phase | Scope | Acceptance gate |
|---|---|---|
| **A** Foundation + minimal authenticated web page | pnpm-workspaces monorepo at the repo root after legacy archive; Zod contracts; pure domain rules; Drizzle + Postgres 16 (Docker); Argon2id auth with opaque hashed cookies; atomic content compiler; audio + conversation adapter interfaces with in-memory stubs in `packages/tooling/`; 2 curriculum endpoints; 1 authenticated React route | `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` green; `bash scripts/dev-up.sh` brings up Postgres + API + web; login + `a1-introductions` listing visible; workspace test pins CommonJS root, engines, new scripts |
| **B** Practice surface on web | Listen & Repeat, Active Recall, Smart Review, filters, collections, settings; one A1 unit fully exercises all six stages | One A1 unit passes the spec §13.3 vertical-slice gate |
| **C** Reviewed audio + Android | Azure pt-PT primary, Polly `Inês` fallback, MiniMax only if dedicated evaluation passes; native-speaker listening test; Capacitor wraps `apps/web`; Android uses opaque tokens via per-platform secure-storage adapter (ADR-0022 update); real `AzureAdapter`/`PollyAdapter`/`MiniMaxAdapter` implementations land | Voice pinned after listening test; Android e2e passes; audio content-addressed assets served |
| **D** Guided text AI conversation | Real scenario for `a1-introductions`; provider adapter populated; bounded context; structured summary; failure preserves transcript, blocks nothing | Scenario passes locale, level, concision, pt-BR-drift evaluation |

The vertical slice after Phase A (`a1-introductions` end-to-end across
web) matches the spec §13.3 acceptance gate: all six learning stages;
reviewed vocabulary, grammar, pronunciation, sentences, and one Language
Island; approved European Portuguese audio (after Phase C); Listen &
Repeat with settings and temporary microphone record/playback; Active
Recall with reveal and independent rating; Smart Review behaviour;
search/filter and a personal collection; one constrained text AI
role-play; shared progress between desktop web and a physical Android
phone; automated tests and deployment smoke checks passing.

## 5. Curriculum model

### 5.1 Hierarchy

```
Curriculum (versioned, atomic publish)
└── CEFR Level: A1 / A2 (one active version per level, partial unique index)
    └── Unit (e.g. a1-introductions, ordered within level)
        ├── Vocabulary lessons
        ├── Grammar lessons
        ├── Pronunciation lessons
        ├── Example sentences (text_pt, text_en, tags, refs)
        ├── Language Islands (dialogues · short stories · standalone sentences)
        │   └── island_sentences (order_index)
        └── AI conversation scenarios
```

### 5.2 Six-stage unit loop

| Stage | Mode | Practice |
|---|---|---|
| 1. Learn — Core vocabulary | n/a | reading |
| 2. Notice — Grammar and sound | n/a | reading |
| 3. Shadow — Listen & Repeat | shadow | listening + speaking |
| 4. Recall — Active Recall | recall | production |
| 5. Apply — Language Island | n/a | reading + listening |
| 6. Communicate — AI role-play | text conversation | production |

Stages define the recommendation order on Home. Learners can open any
published stage. The Zod schema requires every unit to reference at
least one vocabulary lesson, one grammar lesson, one pronunciation
lesson, one island, one scenario, and at least 12 example sentences —
under-spec units are rejected at validation.

### 5.3 Atomic content compile

```
Edit draft JSON
  → schema + reference validation
  → expert review approval (human gate)
  → TTS generation [Phase C]
  → native-speaker audio review [Phase C]
  → compile immutable curriculum version inside one Drizzle transaction
  → publish manifest; advance single active-version pointer per level
```

Publication fails atomically. Learners continue seeing the previous
complete curriculum version until every step succeeds.

The deterministic version ID is `cv_<sha256(level+version+sourceChecksum)[:16]>`.
The active pointer is protected by a partial unique index on
`(level) where active = true`. The real
`packages/content/src/sources/a1-introductions/manifest.json` stays
`status: "draft"` until a human expert reviewer flips it. Tests use the
synthetic `published` fixture under
`packages/content/src/fixtures/a1-introductions-published/`.

## 6. Practice model

### 6.1 Rating semantics

- 1 = barely recognized or produced
- 2 = significant help required
- 3 = partly secure but hesitant
- 4 = correct with minor hesitation
- 5 = confident and fluent for the mode

`PracticeRating` PK = `(userId, sentenceId, mode)`. Idempotent upsert
keyed by `client_mutation_id`. Mode ∈ {`shadow`, `recall`}.
Mastered-in-mode = rating is 5 for that mode. Lowering a rating
immediately removes mastered status. Denominator for mastery is "all
published sentences in the unit/level" or "sentence references in a
collection". Unit-level progress also records completion of its six
stages.

### 6.2 Smart Review

Unrated excluded. Mode-1-to-4 in selected mode, ordered by
`lowest-rating → oldest last_practised_at → curriculum order`.
Five-star can be included via filter. No decay or hidden SRS formula
in v1.

### 6.3 Filters and collections

Comma-separated terms use OR matching by default. An explicit "Match all"
control switches to AND. Collections are ordered sentence references;
upsert is keyed on `(sentenceId, mode)` so duplicates across
collections don't double-write.

### 6.4 Settings

`audioSpeed` 0.5×–2× · `repetitions` 1–5 · `pauseMs` from a fixed list
(0/500/1000/1500/2000/2500/3000/4000/5000/7000) · `textSize`
small/default/large/extraLarge · `sort`
curriculum/easyToHard/hardToEasy · `loop` on/off. Learning-relevant
settings sync via account; device permission state and temporary
recordings stay local.

### 6.5 Practice session data flow

```
Choose unit / collection / filter
  → API resolves authorized content
  → client builds queue (or receives ordered queue)
  → learner practises locally with stored audio
  → rating optimistically displayed
  → idempotent rating/event write (client_mutation_id)
  → progress + review views update
```

Failed writes are marked pending and retried while the session stays
open. No rating is shown as synchronized until the API acknowledges.

### 6.6 Recording policy

v1 microphone attempts are temporary on-device playback. Recordings are
not uploaded or retained. Discarded when the learner replaces the
recording, leaves the active item, or ends the session. This is the v1
default; opt-in retention is deferred.

## 7. Audio strategy

### 7.1 Provider choice

| Role | Provider | Reason |
|---|---|---|
| Primary | Microsoft Azure Speech pt-PT (voice ID pinned after listening test) | explicit `pt-PT` contract, SSML (`prosody` 0.5–2×, `break`, `phoneme`, `say-as`, `sub`), sentence+word boundaries, batch synthesis, Node SDK, F0 0.5M chars/month |
| Fallback | Amazon Polly `Inês` Neural | explicit `pt-PT`, named neural voice, AWS JS SDK, explicit cache/replay clause |
| Experimental | MiniMax TTS | Existing repo previously integrated MiniMax. Reused behind the same adapter interface. Default only after a dedicated European Portuguese evaluation passes. |
| Excluded | OpenAI TTS, Chirp 3 HD, ElevenLabs | Generic Portuguese, missing SSML contract, or fragile locale provenance |

Source: `docs/reports/european-portuguese-tts-options-july-2026.md`.

### 7.2 Adapter interface (Phase A)

`packages/tooling/src/audio/` exposes
`AudioSynthesisAdapter.synthesize(text, ssml, opts) → AudioAsset`. Phase A
ships the interface + an in-memory stub. Phase C implements
`AzureAdapter`, `PollyAdapter`, `MiniMaxAdapter`. Slowed variants
(0.75×, 1.0×, 1.5×) are pre-rendered when runtime playback degrades —
decided by the listening test.

### 7.3 Generation pipeline

```
Validate published Portuguese text + SSML
  → generate normal-speed + slowed variants if needed
  → save immutable, content-addressed audio files
  → record provider / locale / voice / engine / SSML version /
    checksum / date
  → run native-speaker audio review
  → publish content manifest only after both expert + audio reviews pass
```

Files are content-addressed so changing text/voice/SSML produces a new
asset rather than silently replacing an approved one. TTS credentials
stay server-side.

### 7.4 Listening test gate

At least two native pt-PT reviewers blindly score 30–50 items per voice
candidate on accent authenticity, vowel reduction, sibilants, `lh`/`nh`,
clitics, questions, numbers, naturalness, word accuracy, normal+slowed
quality. Voices with Brazilian lexical/prosodic leakage are rejected.
The test must pass before any production voice is pinned.

## 8. AI conversation

- Provider access through `packages/tooling/src/conversation/adapter.ts`
  exporting `ConversationAdapter` with `start(scenario, learnerContext)`,
  `nextTurn(sessionId, learnerInput)`, `summary(sessionId)`. Phase A
  declares the interface only.
- MiniMax is the first candidate because it was previously integrated.
  Default only after a dedicated European Portuguese evaluation passes
  (locale adherence, level cap, correction concision, refusal to drift
  into pt-BR). Provider choice is not locked in.
- Scenarios live in `conversation_scenarios` with `unit_id`, `slug`,
  `objective`, `setting`, `roles`, `expected_vocab[]`,
  `expected_grammar[]`, `opening_message`, `completion_conditions`,
  `correction_policy`, `feedback_rubric`, `status: 'published'`. The
  Zod schema rejects `status !== 'published'` for learner endpoints.
- Context sent to the provider is bounded to scenario vocabulary +
  recent turns + concise progress. Full curriculum and unrelated
  personal data are not sent.
- Provider failure preserves the transcript, offers retry, and does not
  block unrelated learning. First release is text-only.

## 9. Authentication

- Argon2id with `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`.
- Access token: 32 random bytes hex, 15-minute TTL. Refresh token:
  32 random bytes hex, 30-day TTL.
- Only SHA-256 hashes stored in `auth_sessions`
  (`access_token_hash`, `refresh_token_hash`). Raw tokens travel
  exclusively in `Set-Cookie` headers. No JWT. No token in JSON body.
  No `localStorage`.
- Cookies `ptp_access` + `ptp_refresh`: `HttpOnly`, `SameSite=Lax`,
  `Secure` in production, `Path=/`. The refresh cookie is consumed
  **only** by `POST /api/auth/refresh`; it never authorizes general
  API access.
- Refresh rotation: one Drizzle transaction — find row by refresh hash,
  validate, mint replacement, revoke old with `rotated_to`, commit.
- Rate limits: `POST /api/auth/login` 10/min/IP,
  `POST /api/auth/refresh` 30/min/IP, every mutating route incl.
  logout 30/min/user.
- `GET /api/auth/session` returns the stored
  `auth_sessions.access_expires_at`, not `Date.now() + TTL`.
  `requireAuth()` reads only the unexpired access cookie.
- One seeded owner account locally. No public registration on the VPS
  deploy.

Phase C adds an Android bearer-token transport on the same opaque
tokens via `@aparajita/capacitor-secure-storage`, recorded as an update
to `docs/adr/0022-shared-credentials-and-android-secure-storage.md`.

## 10. Android (Phase C)

- Capacitor 8 wraps the built Vite app. Same React code, same
  `apps/web` bundle. Capacitor plugins for microphone permissions,
  temporary file storage, and secure token storage.
- Touch targets, gestures, focus behaviour, and layouts are tested
  explicitly on Android via Playwright device emulation + a real-device
  smoke test before Phase C ships.
- Local development: Linux runs the API + Postgres + Vite. Android
  test device connects to the API over the trusted local network with
  a debug-only network-security configuration whitelisting the dev
  endpoint.

## 11. Deployment seams

- `docker-compose.yml` runs Postgres 16 on `localhost:5433` with a
  healthcheck. Init script
  `db/docker-entrypoint-initdb.d/01-create-test-db.sql` creates
  `pt_a1_test` once on first container start.
- `scripts/dev-up.sh` resolves the repo root, brings up Postgres, runs
  migrations, seeds the owner, compiles the synthetic fixture. Single
  command to start local dev.
- `scripts/test-api.sh` resolves the repo root, brings up Postgres,
  migrates the test database, runs
  `NODE_ENV=test pnpm --filter apps/api test`.
- `apps/api/src/cli/compile-content.ts` is a thin wrapper over the
  content package: `pnpm content:compile` refuses `draft` sources and
  exits non-zero with `content_not_publishable`;
  `pnpm content:compile:fixture` compiles the synthetic `published`
  fixture.
- `tools/check-android-prereqs.ts` fails loudly when Java < 21 or no
  Android SDK. Invoked by `pnpm prereq:android` whenever a Phase C task
  is in flight.
- `apps/api/vitest.globalSetup.ts` and `vitest.setup.ts` set
  `process.env.NODE_ENV = 'test'` before any app module loads.
  `apps/api/src/test/db.ts` truncates tables on every test run — never
  `DROP DATABASE` on a live pool. Tests run against a dedicated
  `pt_a1_test` Postgres database; development and production never
  read or write the test database.
- Production target: Dockerized API + web + Postgres deployed
  privately through Coolify on the VPS. HTTPS required. Provider and
  database secrets come from Coolify env. Backups cover the database,
  reviewed content manifests, and generated audio metadata + assets.

## 12. Persistence (Phase A tables)

Drizzle table names and stable ID prefixes:

| Table | ID prefix | Purpose |
|---|---|---|
| `users` | `usr_` | single seeded owner |
| `auth_sessions` | `sess_` | only token hashes; no JWT |
| `user_settings` | n/a | 1 row per user |
| `curriculum_versions` | `cv_` | partial unique on `(level) where active = true` |
| `units` | `unit_` | ordered within level |
| `lessons` | `les_` | kind ∈ {vocabulary, grammar, pronunciation} |
| `vocabulary_items` | `voc_` | linked to lesson |
| `sentences` | `sen_` | with tags and refs |
| `islands` | `isl_` | dialogue/story/standalone |
| `island_sentences` | n/a | composite PK `(island_id, sentence_id)` |
| `conversation_scenarios` | `scn_` | status must be `published` for learner surface |
| `audio_assets` | `aud_` | Phase C writes rows |
| `practice_ratings` | n/a | PK `(user_id, sentence_id, mode)`, check (1..5) |
| `practice_events` | `pe_` | per-event telemetry |
| `practice_sessions` | `psess_` | session metadata |
| `collections` | `col_` | named ordered sets |
| `collection_items` | n/a | composite PK `(collection_id, sentence_id)` |
| `conversation_sessions` | `csess_` | per-session metadata |
| `conversation_messages` | `cmsg_` | per-message persistence |
| `unit_progress` | `up_` | PK `(user_id, unit_id, stage)` |
| `compiled_assets` | n/a | Phase C; unique on `audio_id` |

## 13. Endpoints (Phase A only)

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/health` | none | – | `{ status, version, dbOk }` |
| `POST` | `/api/auth/login` | none; rate limit 10/min/IP | `{ email, password }` | Set-Cookie `ptp_access` (15m) + `ptp_refresh` (30d). JSON body: `{ accessExpiresAt, refreshExpiresAt, user }`. No raw tokens in body. |
| `POST` | `/api/auth/refresh` | refresh cookie only; rate limit 30/min/IP | – | Set-Cookie rotates both tokens. JSON body: `{ accessExpiresAt, refreshExpiresAt, user }`. |
| `POST` | `/api/auth/logout` | rate limit 30/min/user; either cookie | – | `204`. Revokes session, clears both cookies. |
| `GET` | `/api/auth/session` | `requireAuth` (access cookie only) | – | `{ user, accessExpiresAt }` where `accessExpiresAt` is the stored value, not `Date.now() + TTL`. |
| `GET` | `/api/curriculum` | `requireAuth` | – | `{ active: { level, versionId }, levels: [...] }` |
| `GET` | `/api/curriculum/levels/:levelId` | `requireAuth` | – | `{ id, units: [...] }` |
| `GET` | `/api/curriculum/units/:unitId` | `requireAuth` | – | `{ id, lessons, sentences, islands, scenarios, progress }` |

## 14. Web routes (Phase A only)

| Path | Element | Auth |
|---|---|---|
| `/login` | `LoginPage` (no `localStorage`, empty default email) | none |
| `/` | `HomePage` (lists `a1-introductions`) | `RequireAuth` |
| `/logout` | redirect helper | n/a |

## 15. Out of scope (deferred)

These are explicitly not part of the redesign. Any flip from deferred
to in-scope requires a separate brainstorm.

- General-purpose unrestricted AI chat.
- Live voice conversation with AI.
- Automated pronunciation scoring.
- Permanent storage or upload of learner voice recordings.
- Android offline lesson downloads (seams only, not UI).
- Native iOS.
- Learner-imported custom content.
- Public registration, subscriptions, payments, multi-tenant
  administration.
- CEFR promotion based on unique-word thresholds.
- B1, B2, C1, C2 content.

## 16. Verification

### Phase A — required green

- `pnpm typecheck` (every workspace), `pnpm lint`, `pnpm test`,
  `pnpm build` (every workspace).
- `pnpm dev` brings up Postgres + API + web on one command.
- Login form visible. Owner signs in. Home page lists
  `a1-introductions`.
- Workspace test pins CommonJS root, engines, new scripts.
- Content compile test pins deterministic version ID + atomic publish
  against the synthetic fixture.
- Auth integration tests pin cookie issuance, refresh rotation,
  logout revocation, rate limits.
- ESLint `no-restricted-imports` rule excludes any path under
  `legacy/` so new code cannot accidentally depend on archived code
  (defence in depth).

### Full redesign — success criteria

1. An English-speaking beginner can follow a clear path through complete,
   reviewed A1+A2 material.
2. Learner can always identify the next recommended lesson and freely
   browse alternatives.
3. Shadow and Recall practice are fast, understandable, and
   independently tracked.
4. Smart Review reliably surfaces the weakest-rated sentences.
5. European Portuguese text and audio pass expert/native-speaker
   review with no silent Brazilian Portuguese fallback.
6. Web and Android show the same account progress after sync.
7. Android touch, playback, microphone record/playback, and
   permissions work on physical devices.
8. AI role-play stays constrained to the selected scenario and gives
   useful, level-appropriate feedback.
9. Failure in TTS, AI, or connectivity does not corrupt progress or
   block unrelated learning.
10. Implementation is composed of bounded modules rather than
    monolithic files.

## 17. Governance for future sessions

- `docs/superpowers/specs/` is the canonical home for future
  specifications. Specs follow the `YYYY-MM-DD-<topic>-design.md`
  convention.
- `docs/superpowers/plans/` is the canonical home for future
  implementation plans, derived from specs via the writing-plans
  skill.
- `docs/adr/` keeps growing with new ADRs (e.g. `0001` for workspace
  + atomic publish, `0002` for shared credentials and Android secure
  storage). The rebuild starts the ADR numbering for the new stack;
  legacy ADRs that previously lived under `docs/adr/` are archived
  into `legacy/docs/adr/` before Phase A implementation starts.
- `PROGRESS.md` is the living tracker. It logs the archive commit,
  Phase A task branches, decisions, and blockers as work progresses.
- `HANDOFF.md` is the point-in-time snapshot updated at the end of
  every session.
- `CONTEXT.md` is the domain glossary for the new product
  (CEFR A1/A2 European Portuguese learning platform).
- `AGENTS.md` is the agent process guide — session-start checklist,
  triage vocab, GitHub-issue conventions — and points future sessions
  at this spec and the plan.
- `legacy/` holds the archived Next.js application. New code never
  imports from it; the eslint `no-restricted-imports` rule makes this
  a build-time guarantee.
