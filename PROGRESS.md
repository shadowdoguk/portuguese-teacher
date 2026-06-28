# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-28 (full queue drained — 13 PRs merged, 6 new clean PRs created and merged)

## Current focus

**Implementation queue drained: every foundational PR is now on `main`.** 13 PRs landed in this session, taking the repo from a CI-blocked pre-merge state to a clean main with the entire A0 stack, Voice Loop, SRS, Proficiency, Affective Filter, Conversational Practice, LLM Difficulty Pipeline, and live-harness wiring all merged. Follow-up issues remain for the post-merge hardening (DB persistence, real TTS audio, E2E tests, observability) but no further foundational blockers.

## Recently completed (this session)

| PR | Issue | Title |
| --- | --- | --- |
| #20 | #3 | MiniMax AI client wrappers (LLM/ASR/TTS) |
| #55 | #9 | Learner profile, dashboard, progress, settings UI |
| #61 | (docs) | docs(research): promote mock A/B harness report |
| #62 | #2 | Curriculum data model + A0 fixture |
| #63 | #26 + #23 | Prisma schema + migration + `pnpm seed:a0` admin script |
| #64 | #24 | A0 seed content — Unit A0.4 'Rotina e horas' |
| #65 | #4 | HLR Spaced Repetition scheduler + review queue |
| #66 | #8 | Proficiency assessments + Milestone gating |
| #67 | #15 (partial) | Placement Lesson runtime + tests (AuthProvider wiring deferred) |
| #68 | #18 | Affective Filter proxy instrumentation |
| #69 | #5 | Voice Loop (Tier 1/2/3) end-to-end |
| #70 | #6 | LLM difficulty-control pipeline (generate → re-rank) + ADR-0004 |
| #71 | #41 | Expand CEFR vocab fixture + A1→A2 + A2→B1 corpora |
| #72 | #42 | Wire live MiniMax LLM into A/B harness |
| #73 | #40 | Wire `generateAndRerankTurn` into API route (Tier 1+2) |
| #74 | #7 | Conversational Practice UI + scenario library |

**Test count:** 354/354 green. **Build:** green. **Lint:** clean. **Typecheck:** clean.

## In progress

- **#15 (Placement) — partial delivery.** PR #67 ships the placement runtime (selector, scoring, store, types) + 31 tests. Integration with the post-#9 `AuthProvider` (`setCurrentUnit`, `setConfirmedPlacement`) + the placement page replacement + sign-up routing is a follow-up issue.

## Issues status

### Closed (this session)

- **#2** Curriculum data model + seed A0 content — via #62
- **#3** MiniMax AI client wrappers — via #20
- **#4** HLR Spaced Repetition scheduler — via #65
- **#5** Voice Loop end-to-end — via #69
- **#6** LLM difficulty-control pipeline — via #70
- **#7** Conversational Practice UI + scenario library — via #74
- **#8** Proficiency assessments + Milestone gating — via #66
- **#9** Learner profile/dashboard/settings UI — via #55
- **#15 (partial)** Placement Lesson runtime — via #67 (integration deferred)
- **#18** Affective Filter proxy — via #68
- **#21** PROGRESS tracker — already on main via chore commits; closed
- **#23** `pnpm seed:a0` admin script — via #63
- **#24** Author full A0 seed content — via #64
- **#26** Prisma schema + migration — via #63
- **#40** Wire `generateAndRerankTurn` into API route — via #73
- **#41** Expand CEFR vocab fixture — via #71
- **#42** Wire live MiniMax LLM into A/B harness — via #72

### Open — follow-ups (post-merge hardening)

**Placement integration** (depends on #15 partial):
- **#15** Placement Lesson integration — AuthProvider wiring, page replacement, sign-up routing.

**SRS persistence + integration** (depends on #4):
- **#28** Per-recall telemetry backend hookup (srs_recall events)
- **#29** Audio + image rendering on the review card
- **#30** DB persistence for SRS state (replace localStorage) — now unblocked by #26
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)

**Voice Loop subsystems** (depends on #5):
- **#33** Tier 1 + Tier 2 audio capture
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#35** SC-5 Sampling Buffer 1% audio capture
- **#36** Per-stage Voice Loop latency SLI dashboards
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#38** ASR language-model biasing per current Unit vocabulary
- **#39** Real MiniMax TTS playback in the browser

**Scenarios** (depends on #7):
- **#44** Persist scenario completions to Prisma DB
- **#45** Real MiniMax TTS audio for scenario briefings
- **#46** SRS injection of scenario vocabulary
- **#47** Expand scenario library to ≥ 100 scenarios
- **#48** Adaptive scenario difficulty from Learner profile

**Curriculum** (depends on #2):
- **#17** Remedial Anchor routing (curriculum runtime, no DAG back-edges)
- **#19** Pronunciation Score phoneme-distance endpoint
- **#25** Build-time TTS asset pipeline

**Observability / sampling**:
- **#16** SC-5 Sampling Buffer infra (depends on #5, #13)
- **#13** ASR accuracy regression test suite

**NFRs**:
- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#14** Cross-device compatibility smoke tests

## PRs

### CI SUCCESS (merged this session)

- **#20** MiniMax wrappers · #55 Learner UI · #61 A/B docs · #62 curriculum model · #63 Prisma schema · #64 A0 seed A0.4 · #65 SRS · #66 Proficiency · #67 Placement (partial) · #68 Affective Filter · #69 Voice Loop · #70 Difficulty pipeline · #71 Vocab fixture · #72 Live harness · #73 Rerank orchestrator · #74 Practice UI.

### CI status: clean

All 17 SUCCESS PRs from this session are merged.

## Decisions log

- **2026-06-28 — Scenario schema extended for #7.** Added `category`, `targetLevel`, `preTask`, `expectedTurns`, `vocabularyRefs`, `grammarRefs`, `remedialAnchorRefs`, `passingScore` to the `Scenario` Prisma model + curriculum type + A0 seed. Migration `20260628144146_extend_scenario_fields`. The A0.4 scenario in `seed-a0.ts` was missing these fields; filled in with sensible defaults (social-plans category, A0 target level, "Numbers 1–30 / estar-progressivo" vocabulary refs). PR #74.
- **2026-06-28 — package.json devDep duplicates.** The previous session's force-push sync work accumulated duplicate entries (`tsx`, `prisma`, `@prisma/client` each listed twice). Cleaned up as part of #67 and #72.
- **2026-06-28 — `PlacementLessonAttempt` type extended.** Added `id`, `recommendedStartUnitId`, `confirmedStartUnitId` to match the new placement runtime's needs (the existing `selfAssessedLevel` + `score` are preserved). The DB schema doesn't use this type directly (placement attempts are stored separately). PR #67.
- **2026-06-28 — Cherry-pick strategy for polluted branches.** The previous session's CI fix sync work had stacked merge commits onto every branch, polluting their history with non-functional commits. Rather than try to rebase the polluted branches, this session cherry-picked the unique implementation commits onto clean branches off `main`. Closed the original PRs as superseded and opened new PRs (#61–#74) for review/merge.

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