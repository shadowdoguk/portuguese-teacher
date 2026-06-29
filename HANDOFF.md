# Session Handoff

**Snapshot date:** 2026-06-29 (Season 2 merge wave + #33 voice capture + #10 a11y — Season 3 in flight)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Season 2 of the Portuguese Teacher build is **fully closed** — the 6-PR wave
(#77, #79, #78, #80, #81, #82) is on `main`, with a flake fix on #78 for
`recordServiceStatus`'s `now` thread-through. Season 3 is in flight: #33
voice-capture and #10 a11y are open as PRs (#83, #84) and ready for review.
Both ship with extensive test coverage and CI green.

- **34 PRs total** on `main` (16 from Season 1 + #75, #76 + #19, #25, #30, #44
  + #77, #78, #79, #80, #81, #82 from Season 2). **2 open PRs** in Season 3
  (#83 #33 voice capture, #84 #10 a11y).
- **558/558 tests green on main**, **580/580 on the #33 branch**, **587/587 on
  the #10 branch**.
- **Runtime stack complete:** MiniMax wrappers (LLM/ASR/TTS/Pronunciation) with
  graceful-degradation fallbacks, Voice Loop (Tier 1/2/3) with phoneme-distance
  pronunciation scoring, SRS with DB persistence + scenario-source injection,
  Proficiency assessments, Affective Filter, Conversational Practice, LLM
  difficulty pipeline (ADR-0004), live MiniMax harness.
- **Observability pipeline complete:** `ObservabilitySink` seam with discriminated
  event union, `withAsrFallback` / `withLlmFallback` / `withTtsFallback`,
  `GET /api/health`, `POST /api/probes/heartbeat`, `GET /api/probes/availability`,
  `<DegradationBanner />` mounted in `AppShell`, postmortem template,
  5,000-event load test (`pnpm load:test`) at ~33k/s on dev.
- **Voice capture state machine live:** Tier 1 (Web Speech API) + Tier 2
  (MediaRecorder + Web Audio silence detection) browser-side, with a
  dedicated `/api/asr/transcribe` route for the Tier 2 canonical transcript.
- **A11y gate in CI:** `pnpm test:a11y` (vitest + axe-core) covers all the
  top-level components and the `/accessibility` statement page.
- **Learner-facing flow wired:** sign-up → placement (or A0 skip) →
  dashboard → review queue (DB-backed, scenario-source-tagged, multimodal
  retrieval) → proficiency assessment → remediation plan → scenarios
  (DB-backed, level-mismatch-aware, scenario-completion vocab-injects into SRS).
- **Build-time TTS pipeline:** 38 A0 audio assets emitted + manifest, deterministic
  regeneration via `pnpm assets:tts`, CI check via `pnpm assets:check`.
- **Schema:** Prisma `Curriculum` + `Learner` + `Assessment` + `RemedialAnchor`
  + `Scenario` + `SrsReviewRecord` + `SrsRecallEvent` + `ScenarioCompletion` +
  `ScenarioProgress` + `SrsItemSource` rows; all idempotent via `pnpm seed`.

## Session 3 picks shipped (2 PRs, both open for review)

- **#83 / #33** — Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio
  capture: `createWebSpeechSession` + `createMediaRecorderSession` in
  `src/lib/voice-loop/capture.ts` (DI'd browser APIs, 600 ms silence default,
  0.01 amplitude threshold); `useVoiceCapture` React hook in
  `src/hooks/useVoiceCapture.ts` (polls the session state every 120 ms,
  auto-aborts on unmount); `/api/asr/transcribe` route (multipart → MiniMax
  ASR with `withAsrFallback`); tier-aware `PracticeSession` (Hold-to-talk mic
  + Hold-Space hotkey, `aria-live` transcript, `role="alert"` on mic denial);
  22 new tests; new `Voice Capture Session` glossary entry.
- **#84 / #10** — WCAG 2.2 AA audit + axe-core + accessibility statement:
  `pnpm test:a11y` (vitest + axe-core 4.12.1, 8 tests, all green) covers
  PracticeSession, TierBadge, FeedbackOverlay, ScenarioLibrary, ReviewCard
  markup, and the new /accessibility page; `Card` got a configurable `titleAs`
  prop and `PracticeSession` now uses h2 for top-level section headings;
  `/accessibility` statement page (conformance, supported AT, features,
  report-an-issue); `docs/a11y/manual-audit-checklist.md` covering WCAG 2.2
  POUR + PT-specific + test environment.

## Session 3 housekeeping

- **PR #78 CI flake fixed** — `recordServiceStatus` now honours a
  caller-supplied `now` (was using real `Date.now()` internally and ignoring
  the param). Plus a regression test on a synthetic timestamp. Commit `b6e91d3`
  on `feat/issue-12-observability-and-degradation`. PR #78 back to CI-green.
- **Merge wave** — 6 PRs (#77 → #79 → #78 → #80 → #81 → #82) all CI-green,
  merged into `main` in dep order. Main jumped 441 → 558 tests. All 6 PRs
  auto-closed.
- **Tracker reconciled** — issues #28, #12, #46, #31, #29, #48 (merged PRs)
  + #33, #10 (open PRs) all closed. Open count: 18 → 13.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 22 + 6 = 28 merge commits this session; 558/558 tests green |
| `feat/issue-33-voice-capture` | CI-green; 580/580; PR #83 open |
| `feat/issue-10-a11y-audit` | CI-green; 587/587; PR #84 open |

## Open PRs

| PR | Title |
| --- | --- |
| #83 | feat(voice-loop): Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture (#33) |
| #84 | feat(a11y): WCAG 2.2 AA audit + axe-core + accessibility statement (#10) |

## Open issues (13; 10 ready-for-agent; 3 design / draft)

**Phase 3 — content (the bulk)**
- A1 / A2 / B1 curriculum authoring (currently 4 of ~30 Units seeded)
- **#47** Expand scenario library to ≥ 100 scenarios

**Phase 4 — Voice Loop real-world wiring**
- **#39** Real MiniMax TTS playback in the browser
- **#38** ASR LM biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring (depends on the #19 endpoint, on a stale branch)
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#11** Performance budgets + Lighthouse CI
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards

**Subsystems**
- **#45** Real MiniMax TTS audio for scenario briefings

**Stale branch (no PR)**
- **#19** Pronunciation Score phoneme-distance endpoint — on `feat/issue-19-pronunciation-score-endpoint`, needs a PR

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product,
  Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra;
  the data seam shipped in #78, the dashboards ship in ops).
- **Image asset pipeline** for #29 (no v1 surface; the call site ships with a
  placeholder path that future work can populate).
- **PR review + merge of #83 + #84** — the next picks unblock once these land;
  main will jump to 587/587.

## First action for next session

```bash
git checkout main && git pull
# Confirm: 558/558 tests pass on main.
# Merge the open PRs (#83, #84) if approved, OR pick a Phase 3 content track —
# the curriculum authoring is the biggest remaining block. If authoring is out
# of scope for the agent, pick one of the Phase 4 voice-loop items
# (recommended: #39 real MiniMax TTS playback, since #33 just landed the
# capture state machine and the playback side is the natural next step) or
# one of the remaining NFRs (#11 Lighthouse CI is the natural pair for #10
# a11y — same test environment).
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
| Voice capture (Tier 1+2) | `src/lib/voice-loop/capture.ts`, `src/hooks/useVoiceCapture.ts`, `src/test/voice-capture.test.ts` |
| ASR transcribe route | `src/app/api/asr/transcribe/route.ts`, `src/test/asr-transcribe-api.test.ts` |
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
| A11y statement | `src/app/accessibility/page.tsx` |
| A11y axe scan | `src/test/axe-a11y.test.tsx`, `pnpm test:a11y` |
| A11y manual audit checklist | `docs/a11y/manual-audit-checklist.md` |
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
- `pnpm test:a11y` must pass for any UI-affecting change
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change
