# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-28 (Phase 1 + first Phase 2 pick shipped: #19 + #25 + #30 on branches ready for PR review; 432/432 tests green; #28 + #44 + #46 remain in the Season 2 queue)

## Current focus

**Phase 1 hardening closed; Phase 2 state persistence under way.** Every foundational implementation PR is on `main`; #15 + #17 + #19 + #25 + #30 are merged/branched and ready for review. The repo now has 432 tests, typecheck/lint/build all green, two seeded Units-worth of A0 content, the full Voice Loop / SRS / Proficiency / Affective Filter / Conversational Practice / LLM Difficulty Pipeline runtime, the pronunciation calibration + phoneme-distance path, a deterministic TTS asset pipeline emitting 38 A0 audio files, and DB-backed SRS persistence (per-Learner `SrsReviewRecord` + append-only `SrsRecallEvent`). What remains is telemetry wiring (#28), scenario persistence (#44), scenario→SRS injection (#46), content, real-world audio capture/playback, NFRs, and the §10 spec sign-off.

## Recently completed (this session)

| PR | Issue | Title |
| --- | --- | --- |
| #75 | #15 | Placement Lesson integration (AuthProvider, sign-up routing, dashboard status, profile skip-to-level) |
| #76 | #17 | Remedial Anchor routing runtime (gapArea/weight/createdAt schema, `resolveRemediationPlan`, Affective Filter integration, `/progress` UI, `pnpm anchors:suggest`) |
| (open) | #19 | Pronunciation Score phoneme-distance endpoint + ASR-bias free-form path + 10-utterance calibration set + drill per-phoneme UI |
| (open) | #25 | Build-time TTS asset pipeline (`pnpm assets:tts` / `pnpm assets:check`) — 38 A0 assets + manifest |
| (open) | #30 | DB persistence for SRS state — `SrsReviewRecord` + `SrsRecallEvent` Prisma models, `GET /api/srs/state`, `POST /api/srs/recalls`, ReviewQueue swaps localStorage for API |

**Test count:** 391 → **405** → **419** → **448** → **432** (+43 pronunciation, +13 tts-pipeline, +13 srs).

## In progress

- **#19** Pronunciation Score phoneme-distance endpoint — committed on `feat/issue-19-pronunciation-score-endpoint`, branch pushed, PR pending
- **#25** Build-time TTS asset pipeline — committed on `feat/issue-25-tts-asset-pipeline`, branch pushed, PR pending
- **#30** DB persistence for SRS state — committed on `feat/issue-30-srs-db-persistence`, branch pushed, PR pending

## Issues status

### Closed (recent)

- **#15** Placement Lesson integration — via #75 (closed; full sign-up routing, AuthProvider shape, dashboard + profile surface)
- **#17** Remedial Anchor routing — via #76 (closed; `resolveRemediationPlan` with gapArea ordering + Affective scaffolding flag + /progress UI)

### Closed earlier (foundational work)

- **#2**, **#3**, **#4**, **#5**, **#6**, **#7**, **#8**, **#9**, **#15 (runtime)**, **#18**, **#21**, **#23**, **#24**, **#26**, **#40**, **#41**, **#42** — all delivered via PRs #20, #55, #61–#74.

### Open — Season 2 follow-ups (dep-ordered)

**Phase 1 — runtime integration (closed)**
- **#19** ~~Pronunciation Score phoneme-distance endpoint~~ — done on branch, PR pending
- **#25** ~~Build-time TTS asset pipeline using MiniMax TTS mocks~~ — done on branch, PR pending

**Phase 2 — state persistence (depends on #4, #7, #26)**
- **#28** Per-recall telemetry backend hookup (srs_recall events) — depends on #30 + #12
- **#30** ~~DB persistence for SRS state (replace localStorage)~~ — done on branch, PR pending
- **#44** Persist scenario completions to Prisma DB
- **#46** SRS injection of scenario vocabulary into review queue

**Phase 3 — content (the big one — currently 4 of ~30 Units exist)**
- A1 curriculum (8–10 Units, ~50 Lessons, ~25 scenarios)
- A2 curriculum (8–10 Units, ~50 Lessons, ~30 scenarios)
- B1 curriculum (8–10 Units, ~40 Lessons, ~25 scenarios)
- **#47** Expand scenario library to ≥ 100 scenarios
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)

**Phase 4 — Voice Loop real-world wiring (depends on #5)**
- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#38** ASR language-model biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra (depends on #5, #13)

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards
- **#48** Adaptive scenario difficulty from Learner profile

**Open — SRS + Scenarios + Voice Loop subsystems (also still open)**
- **#28** Per-recall telemetry backend hookup (srs_recall events)
- **#29** Audio + image rendering on the review card (multimodal retrieval)
- **#30** DB persistence for SRS state (replace localStorage) — unblocked by #26
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)
- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture
- **#35** SC-5 Sampling Buffer 1% audio capture (production WER)
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#38** ASR language-model biasing per current Unit vocabulary
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#44** Persist scenario completions to Prisma DB
- **#45** Real MiniMax TTS audio for scenario briefings
- **#46** SRS injection of scenario vocabulary into review queue
- **#47** Expand scenario library to ≥ 100 scenarios

**Open — design / spec**
- **#17** ~~Remedial Anchor routing~~ — done via #76
- **#19** Pronunciation Score phoneme-distance endpoint — still open
- **#25** Build-time TTS asset pipeline — still open

## PRs

### Merged this session
- **#75** Placement Lesson integration
- **#76** Remedial Anchor routing runtime

### Merged earlier (foundational)
- **#20** MiniMax wrappers · **#55** Learner UI · **#61** A/B docs · **#62** curriculum model · **#63** Prisma schema · **#64** A0 seed A0.4 · **#65** SRS · **#66** Proficiency · **#67** Placement runtime · **#68** Affective Filter · **#69** Voice Loop · **#70** Difficulty pipeline · **#71** Vocab fixture · **#72** Live harness · **#73** Rerank orchestrator · **#74** Practice UI.

## Decisions log

- **2026-06-28 — Anchor-routing `visited` set is per-path, dedup at output.** `resolveRemediationPlan` walks the anchor graph using a fresh `Set` per recursion so sibling branches (e.g. A→B and A→C→B) don't poison each other; an `emittedUnits` set dedupes the flat step list. Property test (`never revisits a Unit within a single chain`) verifies this on the post-50-anchor curriculum. PR #76.
- **2026-06-28 — Affective Filter proxy wired into Anchor routing.** When `affectiveFilterScore` ≥ `affectiveHighThreshold` (default 70), every step in the remediation plan carries `scaffolded: true` so the AI Teacher can soften its tone and add extra scaffolding on top of the canonical re-presentation. Assessment page now passes `computeScore()` from `useAffective()` into `buildAssessmentOutcome`. PR #76.
- **2026-06-28 — `RemedialAnchor` schema extended for issue #17.** Added `gapArea` (`"vocab" | "grammar" | "pronunciation" | "fluency"`), `weight` (0..1), `createdAt`. New migration `20260628154739_extend_remedial_anchor`. Prisma model + `seed.ts` + `prisma-roundtrip.test.ts` updated. PR #76.
- **2026-06-28 — Placement Lesson integration.** `AuthProvider` gained `setCurrentUnit` + `confirmPlacement` + `latestPlacementAttempt`; `Learner` gained `placementAttempts[]`. Sign-up captures self-assessment and routes A0 → `/dashboard`, above-A0 → `/placement`. Placement page drives the full adaptive runner (start → items → outcome → accept/override/retake). Dashboard surfaces a "Placement pending" CTA or "Starting from" Unit card. Profile shows the latest attempt + a "Jump straight to a Unit" grid. PR #75.
- **2026-06-28 — Pronunciation Score splits drill vs free-form paths.** Drill mode (`practiceMode === "drill"` + `targetPhrase`) calls the MiniMax phoneme-distance endpoint with a 1.5 s p95 budget (`Promise.race` fallback to ASR bias on timeout); free-form weights ASR word-level confidence against the active Level's vocabulary set; `VoiceLoopTurn` gained `pronunciationPerPhoneme` + `pronunciationSource`. The 10-utterance native-speaker calibration set runs lazily on first use (singleton `PronunciationRuntime`), logs baseline offset, falls back to 0 when the endpoint is unreachable. `FeedbackOverlay` replaced the bare score number with an accessible `role="progressbar"` bar plus a per-phoneme breakdown for drill mode plus a "Source:" indicator. Branch `feat/issue-19-pronunciation-score-endpoint`, PR pending.
- **2026-06-28 — TTS asset pipeline + manifest + CI check.** New `pnpm assets:tts` walks every vocabulary item (pt or examplePt), grammar example, and lesson audio block; runs the MiniMax TTS wrapper (mock by default); writes `public/assets/tts/{unitId}/{assetId}.mp3` + `manifest.json` (version / dialect / voiceId / generatedAt / assets[]). Deterministic IDs keep the same input producing the same filename; explicit `audioAssetId` overrides the default. `TextBlock` audio gained an inline `text` field; `GrammarPattern.example` gained optional `audioAssetId`. `pnpm assets:check` fails the build on orphan references. 38 A0 assets emitted. Branch `feat/issue-25-tts-asset-pipeline`, PR pending.
- **2026-06-28 — SRS persistence moves off localStorage.** New `SrsReviewRecord` + `SrsRecallEvent` Prisma models, migration `20260628171919_add_srs_review_record_recall_event`. `createSrsRepository(prisma)` exposes `loadState` / `upsertRecords` / `applyRecall` / `loadRecentEvents`; the half-life math stays authoritative in `@/lib/srs/scheduler.applyRecall` and the repo persists the resulting record + emits the event row. `GET /api/srs/state?learnerId=…` returns the persisted `SrsState`; `POST /api/srs/recalls` validates the request, auto-enrolls an item on first call when pt/gloss/unitId are provided, applies the recall server-side, and returns the updated record + queue diff. `ReviewQueue` swapped `loadPersisted` / `savePersisted` for these endpoints; loading + grading are async with `srs-error` surfaces for the failure path. Branch `feat/issue-30-srs-db-persistence`, PR pending.

## Blockers

- **§10 sign-off on ADR-0003 + amended requirements doc** — Product, Pedagogy, Engineering leads. Work proceeds in parallel since the spec is captured in code; this gates release, not development.
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target (ADR-0004 §8). Sandbox creds provisioning blocks the production-WER acceptance run; the harness + CLI are wired and tested with mocks.

## Conventions reminder

- Use the glossary in [`CONTEXT.md`](./CONTEXT.md) — do not invent synonyms
- The 5-state triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) + 2 categories (`bug`, `enhancement`) apply to every issue
- One logical unit per commit; messages match repo style (`feat(scope): ...`, `docs+code: ...`)
- New domain terms → `CONTEXT.md` in the same change
- New architectural decisions → `docs/adr/<NNNN>-<slug>.md`
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must pass before commit
- Work happens on a feature branch named `feat/issue-<N>-<slug>`; main is for merged work

## Update discipline

Update this file when:
- An issue moves into or out of **In progress** / **Next** / **Recently completed**
- A new issue is filed
- A decision is captured (add a line to **Decisions log**)
- A blocker appears or clears
- The **Current focus** changes
- **Bump `**Last updated:**` to today's date on every change** — the drift check uses it.

## Drift check

`pnpm progress:check` (a small Node script at `scripts/progress-check.mjs`) compares PROGRESS.md against the live issue tracker and fails if:
- Any open issue is missing from PROGRESS.md's queue
- `**Last updated:**` is more than 14 days old

It runs in CI on every push to `main` and every PR. If you change the issue tracker without updating PROGRESS.md (or vice versa), CI will fail — fix one or the other.

To run locally: `pnpm progress:check` (needs `gh auth login` first). Override the staleness threshold with `PROGRESS_STALE_AFTER_DAYS=N`.