# Session Handoff

**Snapshot date:** 2026-06-29 (Session 4 closed — PR #83 + #84 + #85 + #86 all merged into main)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 4 of the Portuguese Teacher build is **fully closed** — the 4-PR wave
(#83 voice capture, #84 a11y, #85 perf budgets + LHCI, #86 real TTS playback)
is on `main`. The merge wave was straightforward for #83/#84 (after the
`transcribeFromForm` route-export-shape fix), required one rebase of #86 onto
the #85 merge tip (PROGRESS.md conflict on the docs), and went out clean.

- **38 PRs total** on `main` (16 Season 1 + #75, #76 + #19, #25, #30, #44
  + #77–#82 from Season 2 + #83, #84, #85, #86 from Season 3/4). **0 open PRs.**
- **638/638 tests green on main** + **9/9 axe-core tests** + the
  `pnpm perf:budget` bundle alarm is a required CI check on every PR.
- **Voice capture + playback live in the browser:** Tier 1 Web Speech + Tier 2
  MediaRecorder capture (issue #33), real MiniMax TTS playback through
  `<TeacherBubble>` (issue #39) with `useTeacherAudio` state machine + manual
  replay button + degraded-state badge with Retry.
- **Performance budgets enforced:** per-route First Load JS caps (100 kB
  public / 110 kB auth / 130 kB app, gzipped) + >10 % regression alarm
  against the committed baseline + Lighthouse CI on every `main` push +
  nightly cron (issue #11).
- **A11y gate in CI:** `pnpm test:a11y` (vitest + axe-core) covers all the
  top-level components plus the new `<TeacherBubble>` and the
  `/accessibility` statement page.

## Session 4 picks shipped (4 PRs, all merged)

- **#83 / #33** — Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio
  capture (merged earlier in session after a `transcribeFromForm` →
  `src/lib/asr/transcribe.ts` route-export-shape fix).
- **#84 / #10** — WCAG 2.2 AA audit + axe-core + accessibility statement.
  `pnpm test:a11y` added, `Card` got a configurable `titleAs` prop, the
  `/accessibility` page now exists, manual audit checklist in
  `docs/a11y/manual-audit-checklist.md`.
- **#85 / #11** — per-route bundle budgets + LHCI on `main` + nightly +
  bundle analyzer. `pnpm perf:budget` reads `.next/app-build-manifest.json`,
  sums gzipped JS+CSS per route, asserts against `PER_ROUTE_BUDGETS`, flags
  >10 % regressions against `.lighthouseci/bundle-baseline.json`. Wired
  into `ci.yml`'s verify job. `.github/workflows/lighthouse.yml` boots
  `pnpm start` and audits the four public top-level routes.
- **#86 / #39** — real MiniMax TTS playback in the browser. New
  `/api/tts/synthesize` route + `synthesizeFromBody` helper in
  `src/lib/tts/synthesize.ts`. `useTeacherAudio` hook with
  `idle → loading → ready → playing → paused → ended` + terminal
  `degraded` / `error` paths. `<TeacherBubble>` renders the utterance,
  autoplays the most recent turn, exposes a manual replay button with a
  state-aware `aria-label`, and surfaces a Retry-able degradation badge
  when MiniMax TTS is down. New `ttsVoice` setting + Settings picker.

## Session 4 housekeeping

- **PR #83 build break fixed** — `transcribeFromForm` extracted from the
  route file into `src/lib/asr/transcribe.ts`. Next.js route files only
  accept `GET`/`POST`/`runtime` + type exports; the extra value export
  passed `tsc` and the test suite but failed `next build`'s route-type
  check. The same pattern was used for `synthesizeFromBody` → `src/lib/tts/`
  on #86.
- **Merge waves** — 4 PRs merged in dep order: #83 → #84 (Season 3 closer)
  → #85 → #86 (one rebase for the PROGRESS.md conflict between #85 and
  #86). Main jumped 558 → 588 → 619 → 638; the LHCI gate fires on the
  next `main` push.
- **Tracker reconciled** — issues #33, #10, #11, #39 all closed on the
  tracker. Open count: 18 → 11.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 4 new merge commits this session; 638/638 tests green + 9/9 axe + `pnpm perf:budget` clean |

## Open PRs

_None — all Season 3/4 PRs (#83, #84, #85, #86) merged into main._

## Open issues (11 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 3 — content (the bulk)**
- A1 / A2 / B1 curriculum authoring (currently 4 of ~30 Units seeded)
- **#47** Expand scenario library to ≥ 100 scenarios

**Phase 4 — Voice Loop real-world wiring**
- **#38** ASR language-model biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring (depends on the #19 endpoint, on a stale branch)
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#13** ASR accuracy regression test suite
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox tiers
- **#36** Per-stage Voice Loop latency SLI dashboards (observability)

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
- **Authenticated LHCI runs** for `/dashboard`, `/review`, etc. (needs a
  learner fixture + cookie). Captured in `docs/perf-budget.md`'s
  'Lighthouse CI' section.

## First action for next session

```bash
git checkout main && git pull
# Confirm: 638/638 tests pass on main + pnpm perf:budget clean +
# pnpm test:a11y clean (9/9).
# Pick the next Phase 3 content track — the curriculum authoring is the
# biggest remaining block. If authoring is out of scope for the agent,
# recommended: #19 (cheapest — just needs a PR for the existing
# feat/issue-19-pronunciation-score-endpoint branch) or #13 ASR accuracy
# regression suite (pairs naturally with #38 LM biasing that's next in
# Phase 4).
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
| Teacher audio (Tier 3 — playback) | `src/lib/tts/synthesize.ts`, `src/hooks/useTeacherAudio.ts`, `src/components/practice/TeacherBubble.tsx`, `src/test/teacher-bubble.test.tsx` |
| ASR transcribe route | `src/app/api/asr/transcribe/route.ts`, `src/lib/asr/transcribe.ts`, `src/test/asr-transcribe-api.test.ts` |
| TTS synthesize route | `src/app/api/tts/synthesize/route.ts`, `src/lib/tts/synthesize.ts`, `src/test/tts-synthesize-api.test.ts` |
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
| Performance budget alarm | `scripts/perf-budget.ts`, `scripts/perf-budget.test.ts`, `docs/perf-budget.md`, `.lighthouseci/bundle-baseline.json` |
| LHCI workflow | `.github/workflows/lighthouse.yml`, `lighthouserc.json` |
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
- `pnpm perf:budget` must pass before commit (now wired into CI as a required check)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change