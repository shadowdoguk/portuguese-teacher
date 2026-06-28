# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-28 (Season 2 closes — Phase 1 + 2 + observability all green; 7 PRs in this session; 502/502 tests green on main)

## Current focus

**Season 2 of Phase 2 is now complete.** Three new PRs landed in this session: **#77 (Per-recall telemetry backend hookup — #28)**, **#78 (Observability + graceful degradation — #12)**, **#79 (SRS injection of scenario vocabulary — #46)**. Together with the earlier Phase 1 picks (#19, #25) and the first two Phase 2 persistence picks (#30 SRS, #44 scenarios), every foundational implementation PR for Phase 1 + 2 is now merged. Repo at **502/502 tests green**, typecheck/lint/build all green. **Next pick (any session):** Phase 3 content authoring (A1 / A2 / B1 curriculum + #47 ≥100 scenarios) — the bulk of the remaining work — or one of the small remaining Phase 2 items (#31 SRS injection into Unit's Practice Exercise order). The Phase 4 Voice Loop real-world wiring, Phase 5 NFRs, and Phase 6 E2E work remain untouched until the content lands.

## Recently completed (this session)

| PR | Issue | Title |
| --- | --- | --- |
| #75 | #15 | Placement Lesson integration (AuthProvider, sign-up routing, dashboard status, profile skip-to-level) |
| #76 | #17 | Remedial Anchor routing runtime (gapArea/weight/createdAt schema, `resolveRemediationPlan`, Affective Filter integration, `/progress` UI, `pnpm anchors:suggest`) |
| #19 (merged) | #19 | Pronunciation Score phoneme-distance endpoint + ASR-bias free-form path + 10-utterance calibration set + drill per-phoneme UI |
| #25 (merged) | #25 | Build-time TTS asset pipeline (`pnpm assets:tts` / `pnpm assets:check`) — 38 A0 assets + manifest |
| #30 (merged) | #30 | DB persistence for SRS state — `SrsReviewRecord` + `SrsRecallEvent` Prisma models, `GET /api/srs/state`, `POST /api/srs/recalls`, ReviewQueue swaps localStorage for API |
| #44 (merged) | #44 | DB persistence for scenario completions — `ScenarioCompletion` + `ScenarioProgress` Prisma models, `GET /api/scenarios`, `POST /api/scenarios/[id]/complete`, ScenarioWorkspace swaps localStorage for API |
| #77 | #28 | Per-recall telemetry backend hookup — `ObservabilitySink` seam (`srs_recall` \| `voice_loop_latency` \| `voice_loop_error` \| `degradation`), `GET /api/srs/events`, Progress-page recall-stats tile, `pnpm load:test` (5,000 events in ~150 ms) |
| #78 | #12 | Observability + graceful degradation — `withAsrFallback` / `withLlmFallback` / `withTtsFallback`, `GET /api/health`, `POST /api/probes/heartbeat` + `GET /api/probes/availability`, `<DegradationBanner />` mounted in `AppShell`, postmortem template |
| #79 | #46 | SRS injection of scenario vocabulary — `SrsItemSource` Prisma model (composite PK on `(learnerId, itemId, sourceScenarioId)`), `applyScenarioSources` pure function, ReviewQueue source-scenario badge, Progress-page ScenarioOriginsTile |

**Test count:** 391 → **405** → **419** → **448** → **432** → **441** → **462** (#28 +21) → **488** (#12 +26) → **502** (#46 +14).

## In progress

_None — Season 2 picks 5–7 all shipped. Pick up content authoring (Phase 3) or #31 SRS injection into Unit's Practice Exercise order next._

## Issues status

### Closed (recent)

- **#15** Placement Lesson integration — via #75 (closed; full sign-up routing, AuthProvider shape, dashboard + profile surface)
- **#17** Remedial Anchor routing — via #76 (closed; `resolveRemediationPlan` with gapArea ordering + Affective scaffolding flag + /progress UI)
- **#19** Pronunciation Score endpoint — via #19 (closed; phoneme-distance endpoint + ASR-bias free-form path + 10-utterance calibration + per-phoneme UI)
- **#25** TTS asset pipeline — via #25 (closed; `pnpm assets:tts` / `pnpm assets:check` + 38 A0 assets + deterministic manifest)
- **#28** Per-recall telemetry backend — via #77 (closed; `ObservabilitySink` seam + `GET /api/srs/events` + Progress tile + `pnpm load:test`)
- **#30** SRS DB persistence — via #30 (closed; `SrsReviewRecord` + `SrsRecallEvent` models + `GET /api/srs/state` + `POST /api/srs/recalls` + ReviewQueue swap)
- **#44** Scenario DB persistence — via #44 (closed; `ScenarioCompletion` + `ScenarioProgress` models + `GET /api/scenarios` + `POST /api/scenarios/[id]/complete` + ScenarioWorkspace swap)
- **#12** Observability + graceful degradation — via #78 (closed; `with*Fallback` wrappers + `GET /api/health` + probe endpoints + `<DegradationBanner />` + postmortem template)
- **#46** SRS injection of scenario vocabulary — via #79 (closed; `SrsItemSource` model + `applyScenarioSources` + ReviewQueue source badge + Progress ScenarioOriginsTile)

### Closed earlier (foundational work)

- **#2**, **#3**, **#4**, **#5**, **#6**, **#7**, **#8**, **#9**, **#15 (runtime)**, **#18**, **#21**, **#23**, **#24**, **#26**, **#40**, **#41**, **#42** — all delivered via PRs #20, #55, #61–#74.

### Open — Season 2 follow-ups (dep-ordered)

**Phase 1 — runtime integration (closed)**
- **#19** ~~Pronunciation Score phoneme-distance endpoint~~ — done, PR merged
- **#25** ~~Build-time TTS asset pipeline using MiniMax TTS mocks~~ — done, PR merged

**Phase 2 — state persistence (closed)**
- **#28** ~~Per-recall telemetry backend hookup (srs_recall events)~~ — done, PR #77 merged
- **#30** ~~DB persistence for SRS state (replace localStorage)~~ — done, PR #30 merged
- **#44** ~~Persist scenario completions to Prisma DB~~ — done, PR #44 merged
- **#46** ~~SRS injection of scenario vocabulary into review queue~~ — done, PR #79 merged

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
- **#12** ~~Observability + graceful degradation~~ — done, PR #78 merged
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra (depends on #5, #13)

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards
- **#48** Adaptive scenario difficulty from Learner profile

**Open — SRS + Scenarios + Voice Loop subsystems (also still open)**
- **#29** Audio + image rendering on the review card (multimodal retrieval)
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)
- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture
- **#35** SC-5 Sampling Buffer 1% audio capture (production WER)
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#38** ASR language-model biasing per current Unit vocabulary
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#45** Real MiniMax TTS audio for scenario briefings
- **#47** Expand scenario library to ≥ 100 scenarios

**Open — design / spec**
- **#17** ~~Remedial Anchor routing~~ — done via #76
- **#19** ~~Pronunciation Score phoneme-distance endpoint~~ — done via #19
- **#25** ~~Build-time TTS asset pipeline~~ — done via #25

## PRs

### Merged this session
- **#75** Placement Lesson integration
- **#76** Remedial Anchor routing runtime
- **#19** Pronunciation Score phoneme-distance endpoint
- **#25** Build-time TTS asset pipeline
- **#30** SRS DB persistence
- **#44** Scenario completion persistence
- **#77** Per-recall telemetry backend hookup (#28)
- **#78** Observability + graceful degradation (#12)
- **#79** SRS injection of scenario vocabulary (#46)

### Merged earlier (foundational)
- **#20** MiniMax wrappers · **#55** Learner UI · **#61** A/B docs · **#62** curriculum model · **#63** Prisma schema · **#64** A0 seed A0.4 · **#65** SRS · **#66** Proficiency · **#67** Placement runtime · **#68** Affective Filter · **#69** Voice Loop · **#70** Difficulty pipeline · **#71** Vocab fixture · **#72** Live harness · **#73** Rerank orchestrator · **#74** Practice UI.

## Decisions log

- **2026-06-28 — Anchor-routing `visited` set is per-path, dedup at output.** `resolveRemediationPlan` walks the anchor graph using a fresh `Set` per recursion so sibling branches (e.g. A→B and A→C→B) don't poison each other; an `emittedUnits` set dedupes the flat step list. Property test (`never revisits a Unit within a single chain`) verifies this on the post-50-anchor curriculum. PR #76.
- **2026-06-28 — Observability seam split from #12.** The SRS recall sink (`RecallSink` in `src/lib/srs/storage.ts`) is wrapped by a new `ObservabilitySink` in `src/lib/observability/sink.ts`. The new seam carries a discriminated `ObservabilityEvent` union (`srs_recall` | `latency` | `error` | `degradation`) so #12's real pipeline can replace the console fallback without touching call sites. Branch `feat/issue-28-srs-recall-telemetry`, work in progress.
- **2026-06-28 — Affective Filter proxy wired into Anchor routing.** When `affectiveFilterScore` ≥ `affectiveHighThreshold` (default 70), every step in the remediation plan carries `scaffolded: true` so the AI Teacher can soften its tone and add extra scaffolding on top of the canonical re-presentation. Assessment page now passes `computeScore()` from `useAffective()` into `buildAssessmentOutcome`. PR #76.
- **2026-06-28 — `RemedialAnchor` schema extended for issue #17.** Added `gapArea` (`"vocab" | "grammar" | "pronunciation" | "fluency"`), `weight` (0..1), `createdAt`. New migration `20260628154739_extend_remedial_anchor`. Prisma model + `seed.ts` + `prisma-roundtrip.test.ts` updated. PR #76.
- **2026-06-28 — Placement Lesson integration.** `AuthProvider` gained `setCurrentUnit` + `confirmPlacement` + `latestPlacementAttempt`; `Learner` gained `placementAttempts[]`. Sign-up captures self-assessment and routes A0 → `/dashboard`, above-A0 → `/placement`. Placement page drives the full adaptive runner (start → items → outcome → accept/override/retake). Dashboard surfaces a "Placement pending" CTA or "Starting from" Unit card. Profile shows the latest attempt + a "Jump straight to a Unit" grid. PR #75.
- **2026-06-28 — Pronunciation Score splits drill vs free-form paths.** Drill mode (`practiceMode === "drill"` + `targetPhrase`) calls the MiniMax phoneme-distance endpoint with a 1.5 s p95 budget (`Promise.race` fallback to ASR bias on timeout); free-form weights ASR word-level confidence against the active Level's vocabulary set; `VoiceLoopTurn` gained `pronunciationPerPhoneme` + `pronunciationSource`. The 10-utterance native-speaker calibration set runs lazily on first use (singleton `PronunciationRuntime`), logs baseline offset, falls back to 0 when the endpoint is unreachable. `FeedbackOverlay` replaced the bare score number with an accessible `role="progressbar"` bar plus a per-phoneme breakdown for drill mode plus a "Source:" indicator. Branch `feat/issue-19-pronunciation-score-endpoint`, PR pending.
- **2026-06-28 — TTS asset pipeline + manifest + CI check.** New `pnpm assets:tts` walks every vocabulary item (pt or examplePt), grammar example, and lesson audio block; runs the MiniMax TTS wrapper (mock by default); writes `public/assets/tts/{unitId}/{assetId}.mp3` + `manifest.json` (version / dialect / voiceId / generatedAt / assets[]). Deterministic IDs keep the same input producing the same filename; explicit `audioAssetId` overrides the default. `TextBlock` audio gained an inline `text` field; `GrammarPattern.example` gained optional `audioAssetId`. `pnpm assets:check` fails the build on orphan references. 38 A0 assets emitted. Branch `feat/issue-25-tts-asset-pipeline`, PR pending.
- **2026-06-28 — SRS persistence moves off localStorage.** New `SrsReviewRecord` + `SrsRecallEvent` Prisma models, migration `20260628171919_add_srs_review_record_recall_event`. `createSrsRepository(prisma)` exposes `loadState` / `upsertRecords` / `applyRecall` / `loadRecentEvents`; the half-life math stays authoritative in `@/lib/srs/scheduler.applyRecall` and the repo persists the resulting record + emits the event row. `GET /api/srs/state?learnerId=…` returns the persisted `SrsState`; `POST /api/srs/recalls` validates the request, auto-enrolls an item on first call when pt/gloss/unitId are provided, applies the recall server-side, and returns the updated record + queue diff. `ReviewQueue` swapped `loadPersisted` / `savePersisted` for these endpoints; loading + grading are async with `srs-error` surfaces for the failure path. Branch `feat/issue-30-srs-db-persistence`, PR pending.
- **2026-06-28 — Scenario completions move off localStorage.** New `ScenarioCompletion` + `ScenarioProgress` Prisma models, migration `20260628172719_add_scenario_completion_progress`. `createScenarioRepository(prisma)` exposes `loadSnapshot` / `recordCompletion` / `loadHistory`; `recordCompletion` writes the append-only event row + upserts the denormalised `bestStars`/`attempts` row in one Prisma transaction. `GET /api/scenarios?learnerId=…` returns the snapshot; `POST /api/scenarios/[id]/complete` validates passed/stars(0..3)/turnsTaken, persists, and returns the updated progress. `ScenarioWorkspace` swapped `loadSnapshot`/`saveSnapshot` for these endpoints; completion updates the local state optimistically + reconciles via the response, with a `scenario-error` surface for the failure path. Branch `feat/issue-44-scenario-completion-persistence`, PR pending.
- **2026-06-28 — ObservabilitySink seam + per-recall telemetry pipeline (#28).** `src/lib/observability/{sink,aggregate,index}.ts` defines a discriminated `ObservabilityEvent` union (`srs_recall` \| `voice_loop_latency` \| `voice_loop_error` \| `degradation`) + a swappable sink. `GET /api/srs/events?learnerId=…&limit=…` reads via `SrsRepository.loadRecentEvents` + the pure `aggregateRecallStats` function (today count, easy percent, lifetime total). `RecallStatsTile` on `/progress` renders the rolling stat with loading/empty/error states. `pnpm load:test` bulk-ingests 5,000 events via `createMany` batches of 500 + reads back — measured at **~150 ms (~33k/s)** on the current SQLite-backed dev DB. PR #77.
- **2026-06-28 — Graceful-degradation fallbacks split by service (#12).** `src/lib/minimax/fallbacks.ts` adds `withAsrFallback` / `withLlmFallback` / `withTtsFallback` that catch transient `MiniMaxError` (status 0/408/429/5xx), emit a `degradation` event, record the service health, and return a degraded result. ASR returns `confidence: 0` so the client falls back to Web Speech API (Tier 1) or text input (Tiers 2-3); LLM returns a canned rule-based response keyed on the user's first word; TTS returns `audio: null` so the client renders the teacher utterance as text only. `withLatencyMetric` default sink now also emits `voice_loop_latency` events through the ObservabilitySink (in addition to the JSON console line). PR #78.
- **2026-06-28 — Health + probe endpoints + DegradationBanner (#12).** `src/lib/observability/health.ts` is an in-memory service health log + 30-day history; `GET /api/health` rolls up the worst case; `GET /api/probes/availability?windowMs=…` and `POST /api/probes/heartbeat` are the SC-2/SC-5 measurement seam. `<DegradationBanner />` polls every 30 s; `role="status"` when degraded, `role="alert"` when any service is down; silently suppresses on fetch failure. `docs/postmortems/TEMPLATE.md` is the structure every P0/P1 should fill in within 24 h. **Real Grafana + 60 s × 3-region probe scheduling are infra, deferred.** PR #78.
- **2026-06-28 — Scenario vocabulary enters SRS via composite source tags (#46).** New `SrsItemSource` model with composite PK on `(learnerId, itemId, sourceScenarioId)` so the same item can be tagged from multiple scenarios. `applyScenarioSources(refs, sourceMap)` pure function merges source tags onto reviewable refs without mutating inputs. `ScenarioRepository.recordCompletion` now accepts an optional `vocabularyRefs` and upserts one `SrsItemSource` row per ref. `GET /api/srs/state` returns `sources: [{ itemId, sourceScenarioId }]`. Review card renders a "From scenario" badge when the current item carries a source; `/progress` renders a new `ScenarioOriginsTile` with top-5 distinct scenarios by item count. PR #79.

## Blockers

- **§10 sign-off on ADR-0003 + amended requirements doc** — Product, Pedagogy, Engineering leads. Work proceeds in parallel since the spec is captured in code; this gates release, not development.
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target (ADR-0004 §8). Sandbox creds provisioning blocks the production-WER acceptance run; the harness + CLI are wired and tested with mocks.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 — infra (Prometheus + OTLP exporter + k8s CronJob or external region scheduler). The data seam ships in #78; the dashboards and scheduling ship in ops.

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