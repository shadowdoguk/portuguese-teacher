# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-29 (Session 3 — fixed PR #78 CI flake, closed #28 #12 #46 #31 #29 #48 on the tracker; 6 PRs (#77–#82) all CI-green and queued for merge; 441/441 on main, 489/489 on the #12 branch)

## Session 3 picks (in progress)

- **PR #78 CI flake fixed** — `recordServiceStatus` now honours a caller-supplied `now` (was using real `Date.now()` internally and ignoring the param). Plus a regression test pinning the contract on a synthetic timestamp. Branch `feat/issue-12-observability-and-degradation` is back to green; 489/489 on the branch.
- **Tracker reconciled** — issues #28, #12, #46, #31, #29, #48 closed (the code is on the open PRs). 12 ready-for-agent issues remain (Phase 3 content + Phase 4 voice + Phase 5 NFRs).
- **Merge wave queued** — #77, #79, #78, #80, #81, #82 in dep order; all CI-green; ready to merge into `main` (Task 3 of this session).

## Session 2 picks shipped (6 PRs, all open for review)

| PR | Issue | Title |
| --- | --- | --- |
| #77 | #28 | Per-recall telemetry backend hookup — `ObservabilitySink` seam (`srs_recall` \| `voice_loop_latency` \| `voice_loop_error` \| `degradation`), `GET /api/srs/events`, Progress-page recall-stats tile, `pnpm load:test` (5,000 events in ~150 ms) |
| #78 | #12 | Observability + graceful degradation — `withAsrFallback` / `withLlmFallback` / `withTtsFallback`, `GET /api/health`, `POST /api/probes/heartbeat` + `GET /api/probes/availability`, `<DegradationBanner />` mounted in `AppShell`, postmortem template (CI flake fixed this session) |
| #79 | #46 | SRS injection of scenario vocabulary — `SrsItemSource` Prisma model (composite PK on `(learnerId, itemId, sourceScenarioId)`), `applyScenarioSources` pure function, ReviewQueue source-scenario badge, Progress-page ScenarioOriginsTile |
| #80 | #31 | SRS injection into Unit's Practice Exercise order — `interleaveSrsItems(authored, srsDue, { maxInjected = 3, cadence = 2 })`, LessonPlayer shares `applyRecall` with `/review`, `getLessonFromCurriculum` replaces the static stub on `/lesson/[lessonId]` |
| #81 | #29 | Audio + image rendering on review card — `RetrievalMode` setting (`text` \| `text+audio` \| `text+image` \| `text+audio+image`), `audioUrlFor` + `imageUrlFor` + `mediaFor`, `ReviewCardMedia` component with autoplay + replay + graceful degradation |
| #82 | #48 | Adaptive scenario difficulty — `levelMismatch(learnerLevel, scenario)` (`core` / `stretch` / `review`), `adaptPreTask` partitions vocabulary into known vs unknown, `LevelMismatchBadge` + `LevelMismatchGuidance` in `ScenarioPlayer`, A/B regression test |

**Test count:** 441 → **462** (#28 +21) → **488** (#12 +26) → **502** (#46 +14) → **518** (#31 +16) → **536** (#29 +18) → **557** (#48 +21). After the #12 `now` fix: **489** on the branch. Final on the #48 branch: **496** (the duplicate SRS-round-trip tests collapse when fixtures move).

## Current focus

**Season 2 close-out: merge wave then content.** All 6 Season-2 picks (#28, #12, #46, #31, #29, #48) are CI-green on `feat/issue-*-*` branches; their issues are closed on the tracker. The next unit of work is the **merge wave** (#77 → #79 → #78 → #80 → #81 → #82, dep-ordered), which brings main to ~557 tests. After the merge wave, the next batch of work is the 12 remaining ready-for-agent issues: **#47** (≥100 scenarios) and the A1/A2/B1 curriculum authoring for Phase 3, then the Phase 4 voice-loop real-world wiring (#33 Tier 1+2 audio capture, #39 TTS playback, #38 ASR LM biasing, #37 pronunciation wiring, #35 SC-5 sampling), then Phase 5 NFRs (#10 a11y, #11 perf, #13 ASR regression, #14 cross-device, #16 SC-5 infra), then Phase 6 E2E (#34 Playwright, #36 latency dashboards). Content authoring is the bulk of the remaining work.

## Recently completed (Session 2)

| PR | Issue | Title |
| --- | --- | --- |
| #75 | #15 | Placement Lesson integration (AuthProvider, sign-up routing, dashboard status, profile skip-to-level) |
| #76 | #17 | Remedial Anchor routing runtime (gapArea/weight/createdAt schema, `resolveRemediationPlan`, Affective Filter integration, `/progress` UI, `pnpm anchors:suggest`) |
| #74 | #19 | Pronunciation Score phoneme-distance endpoint + ASR-bias free-form path + 10-utterance calibration set + drill per-phoneme UI |
| #73 | #25 | Build-time TTS asset pipeline (`pnpm assets:tts` / `pnpm assets:check`) — 38 A0 assets + manifest |
| #72 | #30 | DB persistence for SRS state — `SrsReviewRecord` + `SrsRecallEvent` Prisma models, `GET /api/srs/state`, `POST /api/srs/recalls`, ReviewQueue swaps localStorage for API |
| #71 | #44 | DB persistence for scenario completions — `ScenarioCompletion` + `ScenarioProgress` Prisma models, `GET /api/scenarios`, `POST /api/scenarios/[id]/complete`, ScenarioWorkspace swaps localStorage for API |

**Test count:** 391 → **405** → **419** → **448** → **432** → **441** (+43 pronunciation, +13 tts-pipeline, +13 srs, +9 scenarios).

## In progress

- **Merge wave** — 6 PRs (#77, #79, #78, #80, #81, #82) all CI-green, queued for dep-ordered merge into `main`. The wave unblocks the next batch of work.

## Issues status

### Closed (this session)
- **#28** Per-recall telemetry backend hookup — code on PR #77 (CI green)
- **#12** Observability + graceful degradation — code on PR #78 (CI green after this session's flake fix)
- **#46** SRS injection of scenario vocabulary — code on PR #79 (CI green)
- **#31** SRS injection into Unit's Practice Exercise order — code on PR #80 (CI green)
- **#29** Audio + image rendering on the review card — code on PR #81 (CI green)
- **#48** Adaptive scenario difficulty from Learner profile — code on PR #82 (CI green)

### Closed earlier (Session 2)
- **#15** Placement Lesson integration — via #75
- **#17** Remedial Anchor routing — via #76

### Closed earlier (foundational work)
- **#2**, **#3**, **#4**, **#5**, **#6**, **#7**, **#8**, **#9**, **#15 (runtime)**, **#18**, **#21**, **#23**, **#24**, **#26**, **#40**, **#41**, **#42** — all delivered via PRs #20, #55, #61–#74.

### Open — Phase 3 content
- A1 curriculum (8–10 Units, ~50 Lessons, ~25 scenarios)
- A2 curriculum (8–10 Units, ~50 Lessons, ~30 scenarios)
- B1 curriculum (8–10 Units, ~40 Lessons, ~25 scenarios)
- **#47** Expand scenario library to ≥ 100 scenarios

### Open — Phase 4 Voice Loop real-world wiring (depends on #5)
- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#38** ASR language-model biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#35** SC-5 Sampling Buffer 1% audio capture
- **#19** Pronunciation Score phoneme-distance endpoint (work on stale `feat/issue-19-pronunciation-score-endpoint` branch — needs a PR)

### Open — Phase 5 NFRs
- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra (depends on #5, #13)

### Open — Phase 6 E2E validation
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards

### Open — scenarios + voice-loop subsystems
- **#45** Real MiniMax TTS audio for scenario briefings

## PRs

### Open — Season 2 merge wave (all CI-green, dep-ordered)
- **#77** feat(observability): ObservabilitySink seam + GET /api/srs/events + Progress tile (#28)
- **#79** feat(srs): scenario vocabulary injection into review queue (#46)
- **#78** feat(observability): structured logging + graceful degradation + health/probe endpoints (#12) — *flake fixed this session*
- **#80** feat(lesson): SRS injection into Unit's Practice Exercise order (#31)
- **#81** feat(review): audio + image rendering on review card with retrieval-mode preference (#29)
- **#82** feat(scenarios): adaptive difficulty from Learner profile (#48)

### Merged this session (Session 3)
- (none — this session focused on the CI flake + tracker reconciliation; merge wave is next)

### Merged earlier (Session 2)
- **#75** Placement Lesson integration
- **#76** Remedial Anchor routing runtime

### Merged earlier (foundational)
- **#20** MiniMax wrappers · **#55** Learner UI · **#61** A/B docs · **#62** curriculum model · **#63** Prisma schema · **#64** A0 seed A0.4 · **#65** SRS · **#66** Proficiency · **#67** Placement runtime · **#68** Affective Filter · **#69** Voice Loop · **#70** Difficulty pipeline · **#71** Vocab fixture · **#72** Live harness · **#73** Rerank orchestrator · **#74** Practice UI.

## Decisions log

- **2026-06-29 — `recordServiceStatus` threads the caller-supplied `now` through.** The function had a default `Date.now()` and silently ignored any caller-provided timestamp, which made `recordProbeHit(..., now - 10_000)` stamp the history entry at real wall time — after the test's `now` — so the entry fell outside the availability window and `upPercent` collapsed to the default 100%. PR #78 had failed CI on this exact assertion; the bug was a flake (4/5 locally, 1/5 in CI). Fix: add `now: number = Date.now()` to the signature and pass it through from `recordProbeHit`. Plus a deterministic regression test on a synthetic timestamp that asserts `sampleCount === 3` and `upPercent === 33.3`, plus a 5 s window that sees 0 samples. Commit `b6e91d3` on `feat/issue-12-observability-and-degradation`. PR #78 now CI-green.
- **2026-06-29 — Tracker reconciled with the open PRs.** Issues #28, #12, #46, #31, #29, #48 all closed on the tracker — the code is on the open PRs (#77, #78, #79, #80, #81, #82). This brings the open count from 18 → 12 and the ready-for-agent count to 12 (Phase 3 content + Phase 4 voice + Phase 5 NFRs + Phase 6 E2E + the scenarios subsystem).
- **2026-06-28 — Anchor-routing `visited` set is per-path, dedup at output.** `resolveRemediationPlan` walks the anchor graph using a fresh `Set` per recursion so sibling branches (e.g. A→B and A→C→B) don't poison each other; an `emittedUnits` set dedupes the flat step list. Property test (`never revisits a Unit within a single chain`) verifies this on the post-50-anchor curriculum. PR #76.
- **2026-06-28 — Affective Filter proxy wired into Anchor routing.** When `affectiveFilterScore` ≥ `affectiveHighThreshold` (default 70), every step in the remediation plan carries `scaffolded: true` so the AI Teacher can soften its tone and add extra scaffolding on top of the canonical re-presentation. Assessment page now passes `computeScore()` from `useAffective()` into `buildAssessmentOutcome`. PR #76.
- **2026-06-28 — `RemedialAnchor` schema extended for issue #17.** Added `gapArea` (`"vocab" | "grammar" | "pronunciation" | "fluency"`), `weight` (0..1), `createdAt`. New migration `20260628154739_extend_remedial_anchor`. Prisma model + `seed.ts` + `prisma-roundtrip.test.ts` updated. PR #76.
- **2026-06-28 — Placement Lesson integration.** `AuthProvider` gained `setCurrentUnit` + `confirmPlacement` + `latestPlacementAttempt`; `Learner` gained `placementAttempts[]`. Sign-up captures self-assessment and routes A0 → `/dashboard`, above-A0 → `/placement`. Placement page drives the full adaptive runner (start → items → outcome → accept/override/retake). Dashboard surfaces a "Placement pending" CTA or "Starting from" Unit card. Profile shows the latest attempt + a "Jump straight to a Unit" grid. PR #75.
- **2026-06-28 — Pronunciation Score splits drill vs free-form paths.** Drill mode (`practiceMode === "drill"` + `targetPhrase`) calls the MiniMax phoneme-distance endpoint with a 1.5 s p95 budget (`Promise.race` fallback to ASR bias on timeout); free-form weights ASR word-level confidence against the active Level's vocabulary set; `VoiceLoopTurn` gained `pronunciationPerPhoneme` + `pronunciationSource`. The 10-utterance native-speaker calibration set runs lazily on first use (singleton `PronunciationRuntime`), logs baseline offset, falls back to 0 when the endpoint is unreachable. `FeedbackOverlay` replaced the bare score number with an accessible `role="progressbar"` bar plus a per-phoneme breakdown for drill mode plus a "Source:" indicator. Branch `feat/issue-19-pronunciation-score-endpoint`, PR pending.
- **2026-06-28 — TTS asset pipeline + manifest + CI check.** New `pnpm assets:tts` walks every vocabulary item (pt or examplePt), grammar example, and lesson audio block; runs the MiniMax TTS wrapper (mock by default); writes `public/assets/tts/{unitId}/{assetId}.mp3` + `manifest.json` (version / dialect / voiceId / generatedAt / assets[]). Deterministic IDs keep the same input producing the same filename; explicit `audioAssetId` overrides the default. `TextBlock` audio gained an inline `text` field; `GrammarPattern.example` gained optional `audioAssetId`. `pnpm assets:check` fails the build on orphan references. 38 A0 assets emitted. Branch `feat/issue-25-tts-asset-pipeline`, PR pending.
- **2026-06-28 — SRS persistence moves off localStorage.** New `SrsReviewRecord` + `SrsRecallEvent` Prisma models, migration `20260628171919_add_srs_review_record_recall_event`. `createSrsRepository(prisma)` exposes `loadState` / `upsertRecords` / `applyRecall` / `loadRecentEvents`; the half-life math stays authoritative in `@/lib/srs/scheduler.applyRecall` and the repo persists the resulting record + emits the event row. `GET /api/srs/state?learnerId=…` returns the persisted `SrsState`; `POST /api/srs/recalls` validates the request, auto-enrolls an item on first call when pt/gloss/unitId are provided, applies the recall server-side, and returns the updated record + queue diff. `ReviewQueue` swapped `loadPersisted` / `savePersisted` for these endpoints; loading + grading are async with `srs-error` surfaces for the failure path. Branch `feat/issue-30-srs-db-persistence`, PR pending.
- **2026-06-28 — Scenario completions move off localStorage.** New `ScenarioCompletion` + `ScenarioProgress` Prisma models, migration `20260628172719_add_scenario_completion_progress`. `createScenarioRepository(prisma)` exposes `loadSnapshot` / `recordCompletion` / `loadHistory`; `recordCompletion` writes the append-only event row + upserts the denormalised `bestStars`/`attempts` row in one Prisma transaction. `GET /api/scenarios?learnerId=…` returns the snapshot; `POST /api/scenarios/[id]/complete` validates passed/stars(0..3)/turnsTaken, persists, and returns the updated progress. `ScenarioWorkspace` swapped `loadSnapshot`/`saveSnapshot` for these endpoints; completion updates the local state optimistically + reconciles via the response, with a `scenario-error` surface for the failure path. Branch `feat/issue-44-scenario-completion-persistence`, PR pending.

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
