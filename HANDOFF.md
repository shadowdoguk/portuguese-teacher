# Session Handoff

**Snapshot date:** 2026-06-28 (Season 2 closes — 6 PRs in this session: #77 #78 #79 #80 #81 #82)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Season 1 of the Portuguese Teacher build is **complete** (16 foundational PRs
+ 2 Phase-1 hardening PRs). Season 2 has shipped **10 PRs across two
sessions** — Phase 1 closed (#19, #25), the four Phase 2 state-persistence +
observability picks are done (#30 SRS, #44 scenarios, #28 telemetry, #12
observability, #46 scenario→SRS injection), and the three small holdovers are
done (#31 SRS into Lesson, #29 audio/image on review card, #48 adaptive
scenario difficulty).

- **28 PRs total** on `main` (16 from Season 1 + #75, #76 + #19, #25, #30, #44
  + #77, #78, #79, #80, #81, #82).
- **441/441 tests green on main**; **496/496 on the #48 feature branch**
  (the +55 across the session live on the open feature branches).
- **Runtime stack complete**: MiniMax wrappers (LLM/ASR/TTS/Pronunciation) with
  graceful-degradation fallbacks, Voice Loop (Tier 1/2/3) with phoneme-distance
  pronunciation scoring, SRS with DB persistence + scenario-source injection,
  Proficiency assessments, Affective Filter, Conversational Practice, LLM
  difficulty pipeline (ADR-0004), live MiniMax harness.
- **Observability pipeline complete**: ObservabilitySink seam with discriminated
  `ObservabilityEvent` union, `withLatencyMetric` → sink, `GET /api/health`,
  `POST /api/probes/heartbeat`, `GET /api/probes/availability`,
  `<DegradationBanner />` mounted in `AppShell`, postmortem template, 5,000-event
  load test (`pnpm load:test`) at ~33k/s on dev.
- **Learner-facing flow wired**: sign-up → placement (or A0 skip) →
  dashboard → review queue (DB-backed, scenario-source-tagged, multimodal
  retrieval) → proficiency assessment → remediation plan → scenarios
  (DB-backed, level-mismatch-aware, scenario-completion vocab-injects into SRS).
- **Build-time TTS pipeline**: 38 A0 audio assets emitted + manifest, deterministic
  regeneration via `pnpm assets:tts`, CI check via `pnpm assets:check`.
- **Schema**: Prisma `Curriculum` + `Learner` + `Assessment` + `RemedialAnchor`
  + `Scenario` + `SrsReviewRecord` + `SrsRecallEvent` + `ScenarioCompletion` +
  `ScenarioProgress` + `SrsItemSource` rows; all idempotent via `pnpm seed`.

Season 2 is **closed**. Next picks: **Phase 3 content authoring** (A1/A2/B1
curriculum + #47 ≥100 scenarios — the bulk of the remaining work). Then
Phase 4 Voice Loop real-world wiring (`#33`/`#35`/`#37`/`#38`/`#39`),
Phase 5 NFRs (`#10`–`#14`), and Phase 6 E2E (`#34`/`#36`).

## Season 2 picks shipped in this session (6 PRs)

- **#77 / #28** — Per-recall telemetry backend hookup:
  `src/lib/observability/{sink,aggregate,index}.ts` define a discriminated
  `ObservabilityEvent` union (`srs_recall` \| `voice_loop_latency` \|
  `voice_loop_error` \| `degradation`) + a swappable sink. `GET /api/srs/events`
  reads via `SrsRepository.loadRecentEvents` + the pure `aggregateRecallStats`
  function. `RecallStatsTile` on `/progress`. `pnpm load:test` at ~33k/s.
- **#78 / #12** — Observability + graceful degradation: `withAsrFallback` /
  `withLlmFallback` / `withTtsFallback`; `GET /api/health` + probe endpoints +
  `<DegradationBanner />` + `docs/postmortems/TEMPLATE.md`.
- **#79 / #46** — SRS injection of scenario vocabulary: new `SrsItemSource`
  model with composite PK; `applyScenarioSources` pure function; review card
  "From scenario" badge; `/progress` `ScenarioOriginsTile`.
- **#80 / #31** — SRS injection into Unit's Practice Exercise order:
  `interleaveSrsItems(authored, srsDue, { maxInjected = 3, cadence = 2 })`; new
  `LessonPlayer` that renders the lesson body + blocks + authored exercises
  with SRS reviews interleaved (≤ 3 per Lesson, per FR-LP-2); shares
  `applyRecall` with `/review` so state stays in sync.
- **#81 / #29** — Audio + image rendering on review card: `RetrievalMode`
  setting (`text` \| `text+audio` \| `text+image` \| `text+audio+image`,
  default `text+audio`); `audioUrlFor` / `imageUrlFor` / `mediaFor` helpers
  (audio uses the real `/assets/tts/{unitId}/{assetId}.mp3` from #25;
  image uses the placeholder `/assets/img/{unitId}/{assetId}.svg`); new
  `<ReviewCardMedia>` with autoplay + replay button + graceful degradation;
  Settings UI selector.
- **#82 / #48** — Adaptive scenario difficulty: `levelMismatch(learnerLevel,
  scenario)` returns `core` / `stretch` / `review` with signed distance;
  `adaptPreTask` partitions vocabulary into known vs unknown via the SRS
  state; `LevelMismatchBadge` + `LevelMismatchGuidance` mounted in
  `ScenarioPlayer`; A/B regression test walks every (Learner, Scenario)
  combination across the four CEFR levels.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 22 merge commits; 441/441 tests green |
| `feat/issue-28-srs-recall-telemetry` | merged + deleted |
| `feat/issue-12-observability-and-degradation` | merged + deleted |
| `feat/issue-46-srs-scenario-injection` | merged + deleted |
| `feat/issue-31-srs-into-lesson-order` | open as PR #80 |
| `feat/issue-29-review-card-media` | open as PR #81 |
| `feat/issue-48-adaptive-scenario-difficulty` | open as PR #82 |

## Open PRs

| PR | Title |
| --- | --- |
| #77 | feat(observability): ObservabilitySink seam + GET /api/srs/events + Progress tile (#28) |
| #78 | feat(observability): structured logging + graceful degradation + health/probe endpoints (#12) |
| #79 | feat(srs): scenario vocabulary injection into review queue (#46) |
| #80 | feat(lesson): SRS injection into Unit's Practice Exercise order (#31) |
| #81 | feat(review): audio + image rendering on review card with retrieval-mode preference (#29) |
| #82 | feat(scenarios): adaptive difficulty from Learner profile (#48) |

## Open issues (Season 2 closed; next: Phase 3 content + remaining NFRs)

**Phase 3 — content (the bulk)**
- A1 / A2 / B1 curriculum authoring (currently 4 of ~30 Units seeded)
- **#47** Expand scenario library to ≥ 100 scenarios

**Phase 4 — Voice Loop real-world wiring**
- **#33** Tier 1 + Tier 2 audio capture
- **#39** Real MiniMax TTS playback in the browser
- **#38** ASR LM biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring (uses #19 endpoint — already wired)
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#10** Accessibility (WCAG 2.2 AA)
- **#11** Performance budgets + Lighthouse CI
- **#13** ASR accuracy regression test suite
- **#14** Cross-device smoke tests
- **#16** SC-5 Sampling Buffer infra

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product,
  Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra;
  the data seam ships in #78, the dashboards ship in ops).
- **Image asset pipeline** for #29 (no v1 surface; the call site ships with a
  placeholder path that future work can populate).
- **PR review + merge** of #77–#82 — these are the new frontier; merging them
  brings main to 496+ tests.

## First action for next session

```bash
git checkout main && git pull
# Confirm: 441/441 tests pass on main.
# Merge the open PRs (#77–#82) if approved, OR pick a Phase 3 content track —
# the curriculum authoring is the biggest remaining block. If authoring is out
# of scope for the agent, pick one of the Phase 4 voice-loop items or one of
# the remaining NFRs (#10, #11, #13, #14).
```

## Key references

| Topic | File / issue |
| --- | --- |
| Domain glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Spec source of truth | [`docs/requirements/portuguese-teacher-requirements.md`](./docs/requirements/portuguese-teacher-requirements.md) |
| Scope amendment (pt-PT, 5 stages, anchors, placement, SC-5) | [`docs/adr/0003-v1-scope-amendment.md`](./docs/adr/0003-v1-scope-amendment.md) |
| Voice Loop architecture (NLU+NLG structured output, Pronunciation Score) | [`docs/adr/0002-voice-loop-architecture.md`](./docs/adr/0002-voice-loop-architecture.md) |
| Pedagogical model (SRS, i+1, TBLT, ICF) | [`docs/adr/0001-pedagogical-model.md`](./docs/adr/0001-pedagogical-model.md) |
| LLM difficulty-control pipeline | [`docs/adr/0004-difficulty-control-pipeline.md`](./docs/adr/0004-difficulty-control-pipeline.md) |
| AI client wrappers | `src/lib/minimax/`, `src/test/minimax/` |
| Curriculum model | `src/lib/curriculum/`, `prisma/schema.prisma`, `prisma/seed.ts` |
| Voice Loop | `src/lib/voice-loop/`, `src/test/voice-loop.test.ts` |
| SRS | `src/lib/srs/`, `src/test/srs*.test.ts` |
| Lesson player + SRS interleaving | `src/lib/lesson/player.ts`, `src/components/lesson/LessonPlayer.tsx` |
| Review card + media | `src/lib/srs/media.ts`, `src/components/review/ReviewCardMedia.tsx` |
| Settings + retrieval mode | `src/lib/settings/retrieval.ts` |
| Placement | `src/lib/placement/`, `src/test/placement.test.ts` |
| Proficiency | `src/lib/assessment/`, `src/test/assessment.test.ts` |
| Affective Filter | `src/lib/affective/`, `src/test/affective-*.test.ts` |
| Scenarios | `src/lib/scenarios/`, `src/test/scenarios-*.test.ts` |
| Scenario adaptive difficulty | `src/lib/scenarios/adaptive.ts`, `src/components/practice/LevelMismatchBadge.tsx` |
| Anchor routing | `src/lib/curriculum/graph.ts`, `src/test/anchor-routing.test.ts` |
| Observability | `src/lib/observability/`, `src/test/observability-*.test.ts` |
| Degradation fallbacks | `src/lib/minimax/fallbacks.ts`, `src/test/observability-degradation.test.ts` |
| Health + probes | `src/lib/observability/health.ts`, `src/app/api/health/`, `src/app/api/probes/` |
| DegradationBanner | `src/components/layout/DegradationBanner.tsx`, `src/test/degradation-banner.test.tsx` |
| Postmortem template | [`docs/postmortems/TEMPLATE.md`](./docs/postmortems/TEMPLATE.md) |
| Admin scripts | `scripts/anchors-suggest.ts`, `scripts/progress-check.mjs`, `scripts/load-test-srs-events.mjs` |
| Project status snapshot | [`README.md` § Status](./README.md#status) |
| Workflow conventions | [`AGENTS.md`](./AGENTS.md) |
| Research synthesis | [`docs/research/language-acquisition-findings.md`](./docs/research/language-acquisition-findings.md) |
| A/B harness report | [`docs/research/difficulty-ab-mock-report.md`](./docs/research/difficulty-ab-mock-report.md) |

## Conventions to honour

- All non-trivial work happens on a feature branch named `feat/issue-<N>-<slug>`
- Use the glossary in `CONTEXT.md` — do not invent synonyms
- The 5-state triage vocabulary + 2 categories apply to every issue
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must all pass before commit
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change