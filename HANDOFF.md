# Session Handoff

**Snapshot date:** 2026-06-29 (Session 5 closed — PR #87 + #88 + #89 all merged into main)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 5 of the Portuguese Teacher build is **fully closed** — the 3-PR wave
(#87 pronunciation endpoint, #88 ASR LM biasing, #89 ASR regression suite)
is on `main`. The morning PR was a stale-branch rebase; the midday + afternoon
PRs were new work. All checks green on main.

- **41 PRs total** on `main** (38 from Sessions 1–4 + #87, #88, #89).
- **721/721 tests green on main** + **9/9 axe-core tests**.
- **Two required CI alarms** on every PR: `pnpm perf:budget` (per-route bundle
  caps, gzipped) + `pnpm asr:regress` (clean WER ≤ 5 %, noisy WER ≤ 10 %, >1 % regression blocked).
- **Voice Loop fully wired in the browser:** Tier 1 Web Speech + Tier 2
  MediaRecorder capture (#33), MiniMax TTS playback (#39), real phoneme-distance
  endpoint (#19), Unit-vocabulary LM biasing on every ASR call (#38),
  low-confidence retry prompt with `role="alert"` (#38), micro-averaged WER
  regression alarm (#13).

## Session 5 picks shipped (3 PRs, all merged)

- **#87 / #19** — Pronunciation Score phoneme-distance endpoint. Rebase of
  the stale `feat/issue-19-pronunciation-score-endpoint` onto current main
  (one PROGRESS.md docs conflict, resolved by adopting main's version +
  fresh Session 5 entry). Surfaced one tsc regression: the branch's
  `withLatencyMetric(endpoint: … | "pronunciation", …)` passed
  `entry.endpoint` into the `voice_loop_latency` event's `stage` field,
  which narrowed to `VoiceLoopStage = "asr" | "llm" | "tts" | "rerank"`
  and rejected the new value. Fixed by extending the union — surgical,
  intent-correct.

- **#88 / #38** — ASR LM biasing per current Unit vocabulary. New
  `unitBiasingVocabulary(unitId, prisma)` in `src/lib/asr/biasing.ts`;
  `AsrTranscribeOptions.hotwords` + `MiniMaxASR` JSON-encodes the biasing
  list onto the multipart form; `transcribeFromForm` gained a
  `resolveBiasing` hook + `biasingApplied` / `biasingSize` response fields;
  `LOW_CONFIDENCE_THRESHOLD = 0.6` exported from `biasing.ts`; new
  `lowConfidence` flag wired to a `role="alert"` retry prompt in
  `PracticeSession`. /practice bundle 119.8 → 120.2 kB gzipped.

- **#89 / #13** — ASR accuracy regression suite (NFR-1). New
  `src/lib/asr/wer.ts` (back-pointer-tracked DP WER math, Unicode-aware
  tokenisation, micro-averaged bucket summary); new `src/lib/asr/simulator.ts`
  (deterministic Mulberry32-seeded pt-PT simulator); `scripts/asr-regress-corpus.json`
  (50 synthetic pt-PT utterances); `scripts/asr-regress-baseline.json`
  (committed WER baseline); `scripts/asr-regress.ts` CLI (exits non-zero on
  >1 % regression or any absolute threshold breach); wired into `ci.yml`
  as a required check. Baseline: clean WER **1.08 %**, noisy WER **4.04 %**.

## Session 5 housekeeping

- **Stale-branch rebase** — `feat/issue-19-pronunciation-score-endpoint`
  was branched off Session 2 (17+ commits of divergence). Single PROGRESS.md
  conflict resolved cleanly; the feature commit applied in one piece.
- **Type-narrowing fix** — the `VoiceLoopStage` extension is a one-character
  edit to a union type. `VoiceLoopStage = "asr" | "llm" | "tts" | "rerank"`
  → `"asr" | "llm" | "tts" | "rerank" | "pronunciation"`.
- **Deterministic simulator** — Mulberry32 + FNV-1a seed = reproducible
  transcripts across runs. No real ASR endpoint required for the regression
  alarm.
- **CI guards doubled** — `perf:budget` (already there from #11) + the new
  `asr:regress`. Both required checks on every PR.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 3 new merge commits this session; 721/721 tests + 9/9 axe + `pnpm perf:budget` + `pnpm asr:regress` + `next build` all green |

## Open PRs

_None — all Session 5 PRs (#87, #88, #89) merged into main._

## Open issues (8 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 3 — content (the bulk)**
- A1 / A2 / B1 curriculum authoring (currently 4 of ~30 Units seeded)
- **#47** Expand scenario library to ≥ 100 scenarios

**Phase 4 — Voice Loop real-world wiring**
- **#37** Pronunciation Score wiring to phoneme-distance endpoint — *now unblocked* (#19 is on main)
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#14** Cross-device compatibility smoke tests
- **#16** SC-5 Sampling Buffer infra

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox tiers
- **#36** Per-stage Voice Loop latency SLI dashboards (observability)

**Subsystems**
- **#45** Real MiniMax TTS audio for scenario briefings

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
- **Real pt-PT audio corpus + live MiniMax creds** for #13's production
  WER feed (the SC-5 Sampling Buffer from #16/#35 is the v1.1 follow-up;
  the v1 slice ships the deterministic simulator).

## First action for next session

```bash
git checkout main && git pull
# Confirm: 721/721 tests + 9/9 axe + pnpm perf:budget + pnpm asr:regress +
# next build all green on main.
# Pick the next Phase 4 item — #37 is now unblocked (depends only on the
# merged #19 endpoint). Or pick a Phase 5 NFR (#14 or #16).
# Recommended: #37 — completes the Phase 4 voice-loop block and uses
# the #19 + #38 seams that just landed.
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
| ASR transcribe + biasing | `src/lib/asr/transcribe.ts`, `src/lib/asr/biasing.ts`, `src/app/api/asr/transcribe/route.ts` |
| Teacher audio (Tier 3 — playback) | `src/lib/tts/synthesize.ts`, `src/hooks/useTeacherAudio.ts`, `src/components/practice/TeacherBubble.tsx` |
| Pronunciation Score runtime | `src/lib/voice-loop/pronunciation-{service,runtime,scoring,calibration}.ts`, `src/lib/minimax/pronunciation.ts` |
| ASR regression suite | `src/lib/asr/wer.ts`, `src/lib/asr/simulator.ts`, `scripts/asr-regress.ts`, `scripts/asr-regress-{corpus,baseline}.json` |
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
| Admin scripts | `scripts/anchors-suggest.ts`, `scripts/progress-check.mjs`, `scripts/load-test-srs-events.mjs`, `scripts/asr-regress.ts` |
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
- `pnpm perf:budget` must pass before commit (CI required check)
- `pnpm asr:regress` must pass before commit (CI required check)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change