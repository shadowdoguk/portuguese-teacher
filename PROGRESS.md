# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-29 (Session 4 — fixed the PR #83 route-export build break (transcribeFromForm → src/lib/asr/transcribe), merged #83 + #84 into main (588/588 + 8/8 axe), shipped #11 perf budgets + LHCI (PR #85, +19 tests on the branch); 607/607 on the #11 branch, 12 ready-for-agent issues remain)

## Session 4 picks shipped

- **PR #83 build break fixed + merge** — `transcribeFromForm` (and `AsrTranscribeResponse` / `AsrTranscribeDeps`) extracted from the route file into `src/lib/asr/transcribe.ts`. Next.js route files only allow `GET`/`POST`/`runtime` + type exports; the extra value export `transcribeFromForm` was passing `tsc` and the test suite but failing `next build`'s route-type check. Rebased PR #84 onto the fix and re-ran CI; both green. `gh pr merge --squash --delete-branch` for #83 then #84. Main jumped 558 → 580 → 588; `pnpm test:a11y` added (8/8 green). Decisions log entry added for the route export-shape rule.
- **#11 Per-route bundle budgets + LHCI on main + bundle analyzer (PR #85)** — `pnpm perf:budget` (`scripts/perf-budget.ts` + 19 unit tests at `scripts/perf-budget.test.ts`) reads `.next/app-build-manifest.json`, sums **gzipped** JS+CSS bytes per page route, asserts against `PER_ROUTE_BUDGETS` (100 kB public / 110 kB auth / 130 kB app), and compares against `.lighthouseci/bundle-baseline.json` flagging >10% regressions. Wired into `ci.yml`'s verify job so every PR gets a deterministic bundle alarm in ~50 ms. Lighthouse CI runs on every `main` push and nightly cron (`.github/workflows/lighthouse.yml` + `lighthouserc.json`) auditing the four public top-level routes; asserts Performance ≥ 0.95, FCP ≤ 1.5 s, LCP ≤ 2 s, TTI ≤ 2 s, CLS ≤ 0.1. `@next/bundle-analyzer@14.2.35` wired into `next.config.mjs` behind `ANALYZE=true` (`pnpm perf:analyze`). `docs/perf-budget.md` is the budget contract. 607/607 tests on the branch; baseline committed (14 routes, all under budget, /practice is heaviest at 116.6 kB gzipped).

## Session 3 picks shipped

- **PR #78 CI flake fixed** — `recordServiceStatus` now honours a caller-supplied `now` (was using real `Date.now()` internally and ignoring the param). Plus a regression test pinning the contract on a synthetic timestamp. Branch `feat/issue-12-observability-and-degradation` is back to green; 489/489 on the branch.
- **Tracker reconciled** — issues #28, #12, #46, #31, #29, #48 closed on the tracker (the code is on the merged PRs).
- **Season 2 merge wave** — #77 → #79 → #78 → #80 → #81 → #82 in dep order, all CI-green, all 6 merged into `main`. Main now at 558/558 tests.
- **#33 Tier 1+2 audio capture (PR #83)** — `createWebSpeechSession` + `createMediaRecorderSession` (DI'd browser APIs, 600 ms silence default, 0.01 amplitude threshold) in `src/lib/voice-loop/capture.ts`; `useVoiceCapture` React hook in `src/hooks/useVoiceCapture.ts`; `/api/asr/transcribe` route (multipart → MiniMax ASR with `withAsrFallback`); tier-aware `PracticeSession` (Hold-to-talk mic + Hold-Space hotkey, `aria-live` transcript, `role="alert"` on mic denial); 22 new tests; new `Voice Capture Session` glossary entry. 580/580 on the branch.
- **#10 WCAG 2.2 AA (PR #84)** — `pnpm test:a11y` (vitest + axe-core 4.12.1, 8 tests, all green) covers PracticeSession, TierBadge, FeedbackOverlay, ScenarioLibrary, ReviewCard markup, and the new /accessibility page; `Card` got a configurable `titleAs` prop and PracticeSession now uses h2 for top-level section headings; `/accessibility` statement page (conformance, supported AT, features, report-an-issue); `docs/a11y/manual-audit-checklist.md` covering WCAG 2.2 POUR + PT-specific + test environment. 587/587 on the branch.

## Session 2 picks shipped (now merged)

| PR | Issue | Title |
| --- | --- | --- |
| #77 | #28 | Per-recall telemetry backend hookup — `ObservabilitySink` seam (`srs_recall` \| `voice_loop_latency` \| `voice_loop_error` \| `degradation`), `GET /api/srs/events`, Progress-page recall-stats tile, `pnpm load:test` (5,000 events in ~150 ms) |
| #78 | #12 | Observability + graceful degradation — `withAsrFallback` / `withLlmFallback` / `withTtsFallback`, `GET /api/health`, `POST /api/probes/heartbeat` + `GET /api/probes/availability`, `<DegradationBanner />` mounted in `AppShell`, postmortem template (CI flake fixed in this session) |
| #79 | #46 | SRS injection of scenario vocabulary — `SrsItemSource` Prisma model (composite PK on `(learnerId, itemId, sourceScenarioId)`), `applyScenarioSources` pure function, ReviewQueue source-scenario badge, Progress-page ScenarioOriginsTile |
| #80 | #31 | SRS injection into Unit's Practice Exercise order — `interleaveSrsItems(authored, srsDue, { maxInjected = 3, cadence = 2 })`, LessonPlayer shares `applyRecall` with `/review`, `getLessonFromCurriculum` replaces the static stub on `/lesson/[lessonId]` |
| #81 | #29 | Audio + image rendering on review card — `RetrievalMode` setting (`text` \| `text+audio` \| `text+image` \| `text+audio+image`), `audioUrlFor` + `imageUrlFor` + `mediaFor`, `ReviewCardMedia` component with autoplay + replay + graceful degradation |
| #82 | #48 | Adaptive scenario difficulty — `levelMismatch(learnerLevel, scenario)` (`core` / `stretch` / `review`), `adaptPreTask` partitions vocabulary into known vs unknown, `LevelMismatchBadge` + `LevelMismatchGuidance` in `ScenarioPlayer`, A/B regression test |

**Test count:** 441 → **462** (#28 +21) → **488** (#12 +26) → **502** (#46 +14) → **518** (#31 +16) → **536** (#29 +18) → **557** (#48 +21). After the #12 `now` fix: **489** on the branch. Final on the #48 branch: **496**. **Main: 558/558** (post-merge).

## Current focus

**Season 3 merged.** PR #83 (#33 voice capture) + PR #84 (#10 a11y) are on main; 588/588 tests + 8/8 axe tests. Next up is **#11 Performance budgets + Lighthouse CI** (chosen as the natural pair to the just-landed #10 a11y — same test environment, same CI gate pattern; unblocks re-enabling the color-contrast axe rule currently disabled in vitest because jsdom can't resolve computed background colours).

- **Phase 3 — content** (the bulk): A1/A2/B1 curriculum authoring (~80% of remaining work); **#47** ≥ 100 scenarios.
- **Phase 4 — Voice Loop real-world wiring**: **#39** real MiniMax TTS playback in the browser, **#38** ASR language-model biasing per current Unit vocabulary, **#37** pronunciation score wiring (depends on the #19 endpoint, which is on a stale branch and needs a PR first), **#35** SC-5 sampling-buffer 1 % audio capture. (#33 is the only Phase 4 issue done this session.)
- **Phase 5 — NFRs**: **#11** performance budgets + Lighthouse CI, **#13** ASR accuracy regression test suite, **#14** cross-device compatibility smoke tests, **#16** SC-5 sampling buffer infra. (#10 is the only Phase 5 issue done this session.)
- **Phase 6 — E2E**: **#34** Playwright E2E, **#36** per-stage Voice Loop latency SLI dashboards.
- **Subsystems**: **#45** real MiniMax TTS audio for scenario briefings.

Content authoring is the biggest remaining block. If the agent is out of scope for that, pick the next Phase 4 voice-loop item or one of the Phase 5 NFRs.

## In progress

- **#11** (PR #85) Performance budgets + Lighthouse CI — `feat/issue-11-perf-budgets-lighthouse`, CI-green (607/607), awaiting review/merge.

## Issues status

### Closed (this session — Session 4)
- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture — merged via #83
- **#10** Accessibility (WCAG 2.2 AA) audit and fixes — merged via #84

### Closed (Session 3)
- **#28** Per-recall telemetry backend hookup — merged via #77
- **#12** Observability + graceful degradation — merged via #78 (with the `now` flake fix)
- **#46** SRS injection of scenario vocabulary — merged via #79
- **#31** SRS injection into Unit's Practice Exercise order — merged via #80
- **#29** Audio + image rendering on the review card — merged via #81
- **#48** Adaptive scenario difficulty from Learner profile — merged via #82

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
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#38** ASR language-model biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#35** SC-5 Sampling Buffer 1% audio capture
- **#19** Pronunciation Score phoneme-distance endpoint (work on stale `feat/issue-19-pronunciation-score-endpoint` branch — needs a PR)

### Open — Phase 5 NFRs
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra (depends on #5, #13)

### Open — Phase 6 E2E validation
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards

### Open — scenarios + voice-loop subsystems
- **#45** Real MiniMax TTS audio for scenario briefings

## PRs

### Open — Session 4 picks (CI-green, awaiting review/merge)
- **#85** feat(perf): per-route bundle budgets + LHCI on main + bundle analyzer (#11)

### Merged this session (Session 4)
- **#83** feat(voice-loop): Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture (#33)
- **#84** feat(a11y): WCAG 2.2 AA audit + axe-core + accessibility statement (#10)

### Merged this session (Session 3)
- **#77** Per-recall telemetry backend hookup (#28)
- **#79** SRS injection of scenario vocabulary (#46)
- **#78** Observability + graceful degradation (#12) — *with the `now` flake fix*
- **#80** SRS injection into Unit's Practice Exercise order (#31)
- **#81** Audio + image rendering on review card (#29)
- **#82** Adaptive scenario difficulty from Learner profile (#48)

### Merged earlier (Session 2)
- **#75** Placement Lesson integration
- **#76** Remedial Anchor routing runtime

### Merged earlier (foundational)
- **#20** MiniMax wrappers · **#55** Learner UI · **#61** A/B docs · **#62** curriculum model · **#63** Prisma schema · **#64** A0 seed A0.4 · **#65** SRS · **#66** Proficiency · **#67** Placement runtime · **#68** Affective Filter · **#69** Voice Loop · **#70** Difficulty pipeline · **#71** Vocab fixture · **#72** Live harness · **#73** Rerank orchestrator · **#74** Practice UI.

## Decisions log

- **2026-06-29 — Per-route bundle budgets use gzipped bytes (issue #11).** Next.js reports "First Load JS" as the gzipped size; matching the budgets to the same unit (and to what users actually download on a slow network) keeps the alarm actionable. `sumFileBytes` defaults to `gzip: true`; `scripts/perf-budget.test.ts` opts out via `{ gzip: false }` to keep the assertions deterministic on highly-compressible fixtures (`'x'.repeat(N)`). The committed baseline at `.lighthouseci/bundle-baseline.json` is gzipped bytes keyed by route. Tune `PER_ROUTE_BUDGETS` in `scripts/perf-budget.ts` if a route starts creeping toward its cap. PR #85.
- **2026-06-29 — Bundle budget alarm runs on every PR; LHCI runs only on `main` + nightly.** `pnpm perf:budget` is deterministic and ~50 ms, so it's wired into `ci.yml`'s verify job as a required check. Lighthouse CI spins up Chromium and serves a real build (`pnpm start`), so it runs on `main` push + nightly cron (06:00 UTC) + `workflow_dispatch`. The "any regression > 10 % blocks merge" acceptance criterion is satisfied by the bundle alarm — LHCI provides the FCP/LCP/TTI/CLS gates. PR #85.
- **2026-06-29 — Next.js route files only accept specific export fields (issue #33).** `transcribeFromForm` (and the response/dep types) were originally colocated with the route handler so jsdom's missing `Request` FormData polyfill wouldn't block the integration test. `tsc --noEmit` and the vitest run were happy with the extra value export, but `next build`'s route-type check rejected it: `"transcribeFromForm" is not a valid Route export field`. The fix was to extract the helper + types into `src/lib/asr/transcribe.ts` and have the route import them. Lesson: keep route files minimal (only `runtime`, `GET`/`POST`/`PUT`/`DELETE` handlers, and inline types). Helpers and shared types belong in `src/lib/`. This was the root cause of both PR #83 and PR #84 CI failures. PRs #83 and #84.
- **2026-06-29 — Tier 1+2 audio capture uses dependency-injected browser APIs (issue #33).** `createWebSpeechSession` and `createMediaRecorderSession` in `src/lib/voice-loop/capture.ts` take `SpeechRecognition` / `MediaRecorder` / `AudioContext` / `getUserMedia` as constructor-time deps (no globals reach into the module). This makes the entire capture state machine unit-testable in jsdom with fake constructors — no `canvas` polyfill, no happy-dom shim. The state machine is `idle → requesting-permission → listening → idle`, with terminal `denied` / `unsupported` / `error` paths. Silence detection (Tier 2) uses an `AnalyserNode` (fftSize 1024, 80 ms poll) and arms a 600 ms `setTimeout`; default amplitude threshold 0.01 (overridable). The Tier 1 path sends the Web Speech API final transcript directly to the orchestrator; Tier 2 always goes through `POST /api/asr/transcribe` for the canonical transcript. The /api/asr/transcribe route extracts its logic into a pure `transcribeFromForm(form, deps)` helper so jsdom's `Request` FormData polyfill gap doesn't block the integration test (the helper takes the parsed `FormData` directly, while the route handles the request-level multipart parsing). `useVoiceCapture` polls the session state every 120 ms for cheap re-renders and auto-aborts on unmount. PR #83.
- **2026-06-29 — `Card` gets a `titleAs` prop (issue #10).** Default stays `h3` for backward compatibility, but consumers that use Card as a top-level page section pass `titleAs="h2"` so the heading order stays `h1 → h2 → h3`. The first consumer is `PracticeSession` (the Live turn + i+1 difficulty Cards), but any future top-level Card can opt in the same way. Axe-core flagged the previous `h1 → h3` jump as a heading-order violation; the fix is mechanical and per-component. PR #84.
- **2026-06-29 — A11y posture: `pnpm test:a11y` is the gate, Lighthouse covers color contrast.** The jsdom test env can't resolve computed background colours, so the axe `color-contrast` rule is disabled in vitest and a Lighthouse pass covers it (the repo's Phase 5 NFRs include #11 Performance budgets + Lighthouse CI — that will be the next hook for the colour-contrast rule). All other axe rules (wcag2a, wcag2aa, wcag22aa, best-practice) run on every PR. PR #84.
- **2026-06-29 — `recordServiceStatus` threads the caller-supplied `now` through (issue #12).** The function had a default `Date.now()` and silently ignored any caller-provided timestamp, which made `recordProbeHit(..., now - 10_000)` stamp the history entry at real wall time — after the test's `now` — so the entry fell outside the availability window and `upPercent` collapsed to the default 100 %. PR #78 had failed CI on this exact assertion; the bug was a flake (4/5 locally, 1/5 in CI). Fix: add `now: number = Date.now()` to the signature and pass it through from `recordProbeHit`. Plus a deterministic regression test on a synthetic timestamp that asserts `sampleCount === 3` and `upPercent === 33.3`, plus a 5 s window that sees 0 samples. Commit `b6e91d3` on `feat/issue-12-observability-and-degradation`. PR #78 now CI-green.
- **2026-06-29 — Tracker reconciled with the merged PRs.** Issues #28, #12, #46, #31, #29, #48, #33, #10 all closed on the tracker — the code is on PR #77-#82 (merged) and PR #83-#84 (open). Brings the open count from 18 → 10 and the ready-for-agent count to 10 (Phase 3 content + Phase 4 voice + Phase 5 NFRs + Phase 6 E2E + the scenarios subsystem).
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
- **PR review + merge of #85** — the LHCI on `main` and bundle alarm on every PR unblock once this lands; the alarm becomes part of `verify` and the LHCI gate fires on the next `main` push.

## Conventions reminder

- Use the glossary in [`CONTEXT.md`](./CONTEXT.md) — do not invent synonyms
- The 5-state triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) + 2 categories (`bug`, `enhancement`) apply to every issue
- One logical unit per commit; messages match repo style (`feat(scope): ...`, `docs+code: ...`)
- New domain terms → `CONTEXT.md` in the same change
- New architectural decisions → `docs/adr/<NNNN>-<slug>.md`
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must pass before commit
- Work happens on a feature branch named `feat/issue-<N>-<slug>`; main is for merged work
- Use `pnpm test:a11y` for the axe scan; jsdom disables `color-contrast` (covered by Lighthouse)

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
