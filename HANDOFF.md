# Session Handoff

**Snapshot date:** 2026-06-28 (Season 2 closes — 3 new PRs landed: #77, #78, #79)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Season 1 of the Portuguese Teacher build is **complete** (16 foundational PRs
+ 2 Phase-1 hardening PRs). Season 2 has shipped **7 PRs across two
sessions** — Phase 1 closed (#19, #25) and all four Phase 2 state-persistence
+ observability picks are done (#30 SRS, #44 scenarios, #28 telemetry, #12
observability, #46 scenario→SRS injection).

- **25 PRs total** on `main` (16 from Season 1 + #75, #76 + #19, #25, #30, #44
  + #77, #78, #79).
- **502/502 tests green** (`pnpm typecheck` / `pnpm lint` / `pnpm build` all green).
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
  dashboard → review queue (DB-backed, scenario-source-tagged) → proficiency
  assessment → remediation plan → scenarios (DB-backed, scenario-completion
  vocab-injects into SRS).
- **Build-time TTS pipeline**: 38 A0 audio assets emitted + manifest, deterministic
  regeneration via `pnpm assets:tts`, CI check via `pnpm assets:check`.
- **Schema**: Prisma `Curriculum` + `Learner` + `Assessment` + `RemedialAnchor`
  + `Scenario` + `SrsReviewRecord` + `SrsRecallEvent` + `ScenarioCompletion` +
  `ScenarioProgress` + `SrsItemSource` rows; all idempotent via `pnpm seed`.

Season 2 is **closed**. Next picks: **Phase 3 content authoring** (A1/A2/B1
curriculum + #47 ≥100 scenarios — the bulk of the remaining work) or **#31
SRS injection into Unit's Practice Exercise order** (a small Phase 2 holdover).
Then Phase 4 Voice Loop real-world wiring (`#33`/`#35`/`#37`/`#38`/`#39`),
Phase 5 NFRs (`#10`–`#14`), and Phase 6 E2E (`#34`/`#36`/`#48`).

## Season 2 picks shipped in this session (3 PRs)

- **#77 / #28** — Per-recall telemetry backend hookup:
  `src/lib/observability/{sink,aggregate,index}.ts` define a discriminated
  `ObservabilityEvent` union (`srs_recall` \| `voice_loop_latency` \|
  `voice_loop_error` \| `degradation`) + a swappable sink. `GET /api/srs/events`
  reads via `SrsRepository.loadRecentEvents` + the pure `aggregateRecallStats`
  function (today count, easy percent, lifetime total). `RecallStatsTile` on
  `/progress` renders the rolling stat with loading/empty/error states.
  `pnpm load:test` bulk-ingests 5,000 events via `createMany` batches of 500
  + reads back — measured at **~150 ms (~33k/s)** on the current
  SQLite-backed dev DB.
- **#78 / #12** — Observability + graceful degradation:
  `src/lib/minimax/fallbacks.ts` adds `withAsrFallback` / `withLlmFallback` /
  `withTtsFallback` that catch transient `MiniMaxError` (status 0/408/429/5xx),
  emit a `degradation` event, record the service health, and return a
  degraded result. ASR returns `confidence: 0` so the client falls back to
  Web Speech API (Tier 1) or text input (Tiers 2-3); LLM returns a canned
  rule-based response keyed on the user's first word; TTS returns `audio:
  null` so the client renders the teacher utterance as text only.
  `withLatencyMetric` default sink also emits `voice_loop_latency` events
  through the ObservabilitySink. `GET /api/health` + probe endpoints +
  `<DegradationBanner />` + postmortem template.
- **#79 / #46** — SRS injection of scenario vocabulary: new `SrsItemSource`
  model with composite PK on `(learnerId, itemId, sourceScenarioId)`.
  `applyScenarioSources(refs, sourceMap)` pure function merges source tags
  without mutating inputs. `ScenarioRepository.recordCompletion` accepts an
  optional `vocabularyRefs` and upserts one source row per ref.
  `GET /api/srs/state` returns `sources`. Review card renders a "From
  scenario" badge when the current item carries a source; `/progress`
  renders a new `ScenarioOriginsTile` with top-5 distinct scenarios by
  item count.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 25 merge commits; 502/502 tests green |
| `feat/issue-28-srs-recall-telemetry` | merged + deleted |
| `feat/issue-12-observability-and-degradation` | merged + deleted |
| `feat/issue-46-srs-scenario-injection` | merged + deleted |

## Open PRs

None.

## Open issues (Season 2 closed; next: Phase 3 content + #31)

**Phase 2 — small holdover (1 remaining)**
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)

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
- **#48** Adaptive scenario difficulty from Learner profile

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product,
  Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra;
  the data seam ships in #78, the dashboards ship in ops).

## First action for next session

```bash
git checkout main && git pull
# Confirm: 502/502 tests pass; typecheck/lint/build green.
# Pick a Phase 3 content track — the curriculum authoring is the biggest
# remaining block. If authoring is out of scope for the agent, pick #31
# (small, well-specified SRS-into-Practice-Exercise-order change) or one
# of the Phase 4 voice-loop items.
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
| SRS | `src/lib/srs/`, `src/test/srs.test.ts` |
| Placement | `src/lib/placement/`, `src/test/placement.test.ts` |
| Proficiency | `src/lib/assessment/`, `src/test/assessment.test.ts` |
| Affective Filter | `src/lib/affective/`, `src/test/affective-*.test.ts` |
| Scenarios | `src/lib/scenarios/`, `src/test/scenarios-*.test.ts` |
| Anchor routing | `src/lib/curriculum/graph.ts`, `src/test/anchor-routing.test.ts` |
| Observability | `src/lib/observability/`, `src/test/observability-*.test.ts` |
| Degradation fallbacks | `src/lib/minimax/fallbacks.ts`, `src/test/observability-degradation.test.ts` |
| Health + probes | `src/lib/observability/health.ts`, `src/app/api/health/`, `src/app/api/probes/` |
| DegradationBanner | `src/components/layout/DegradationBanner.tsx`, `src/test/degradation-banner.test.tsx` |
| Scenario → SRS injection | `src/lib/srs/enroll-from-curriculum.ts` (`applyScenarioSources`), `src/components/progress/ScenarioOriginsTile.tsx` |
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