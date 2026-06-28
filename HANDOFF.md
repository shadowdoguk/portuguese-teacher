# Session Handoff

**Snapshot date:** 2026-06-28 (full queue drain — 16 PRs merged)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

One giant session: 16 PRs merged from the foundational implementation queue.
The repo went from "everything CI-blocked and CONFLICTING" to a clean `main`
with the entire A0 stack, Voice Loop, SRS, Proficiency, Affective Filter,
Conversational Practice, LLM Difficulty Pipeline, and live-harness wiring all
merged. 354/354 tests pass; `pnpm typecheck`, `pnpm lint`, `pnpm build` all
green. Follow-up issues remain (DB persistence, real TTS audio, E2E tests,
observability) but no further foundational blockers.

## Session outcomes

### Implementation queue drained

Closed PRs (16) covering 14 distinct issues:
- #20/#3 — MiniMax AI client wrappers (LLM/ASR/TTS)
- #55/#9 — Learner profile, dashboard, progress, settings UI
- #61 (docs) — promote mock A/B harness report from tmp/ to docs/
- #62/#2 — Curriculum data model + A0 fixture
- #63/#26 + #23 — Prisma schema + migration + `pnpm seed:a0` admin script
- #64/#24 — A0 seed content (Unit A0.4 'Rotina e horas')
- #65/#4 — HLR Spaced Repetition scheduler + review queue
- #66/#8 — Proficiency assessments + Milestone gating
- #67/#15 (partial) — Placement Lesson runtime + tests (AuthProvider wiring deferred)
- #68/#18 — Affective Filter proxy instrumentation
- #69/#5 — Voice Loop (Tier 1/2/3) end-to-end
- #70/#6 — LLM difficulty-control pipeline (generate → re-rank) + ADR-0004
- #71/#41 — Expand CEFR vocab fixture + A1→A2 + A2→B1 corpora
- #72/#42 — Wire live MiniMax LLM into A/B harness
- #73/#40 — Wire `generateAndRerankTurn` into API route (Tier 1+2)
- #74/#7 — Conversational Practice UI + scenario library

### Cherry-pick strategy

The previous session had stacked merge commits onto every PR branch as part
of CI fix sync work, leaving each branch with 25–30 commits of which only 1–3
were the actual implementation. Rather than rebase the polluted branches, this
session cherry-picked the unique implementation commits onto clean branches
off `main` and opened new PRs (#61–#74) for review/merge. The original PRs
were closed as superseded (or auto-closed when their branches were deleted).

### Schema integration work

#7's Scenario type required fields not in the existing schema. To make the
Scenario module typecheck against the in-memory seed + Prisma schema, we:
- Extended `Scenario` type with `category`, `targetLevel`, `preTask`,
  `expectedTurns`, `vocabularyRefs`, `grammarRefs`, `remedialAnchorRefs`,
  `passingScore`.
- Added corresponding columns to the Prisma `Scenario` model + migration
  `20260628144146_extend_scenario_fields`.
- Updated `prisma/seed.ts` to populate the new columns.
- Updated `src/lib/curriculum/seed-a0.ts` A0.4 scenario with sensible defaults.
- Updated `src/test/prisma-roundtrip.test.ts` to assert the rebuilt Curriculum
  matches the in-memory fixture.

### Cleanup

- Removed duplicate devDep entries in `package.json` (`tsx`, `prisma`,
  `@prisma/client` were each listed twice from prior merge sync work).
- Fixed `progress:check` script — PROGRESS.md was 19 issues behind reality at
  session start; fully reconciled at session end.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 17 new merge commits this session; 354/354 tests green |
| All `-clean` branches | merged + deleted via `--delete-branch` |
| Original polluted branches | closed as superseded, branches deleted |

## Open PRs

None.

## Open issues (next session starts here)

**Placement integration** (depends on #15 partial):
- **#15** — Place AuthProvider `setCurrentUnit` + `setConfirmedPlacement`;
  replace `/placement` page with the runtime from #67; wire sign-up routing
  to `/placement` for above-A0 learners; surface `currentUnitId` on
  dashboard.

**SRS persistence + integration** (depends on #4 — now on main):
- **#28** Per-recall telemetry backend hookup
- **#29** Audio + image rendering on the review card
- **#30** DB persistence for SRS state (replace localStorage) — now unblocked by #26
- **#31** SRS injection into Unit's Practice Exercise order

**Voice Loop subsystems** (depends on #5 — now on main):
- **#33** Tier 1 + Tier 2 audio capture
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#35** SC-5 Sampling Buffer 1% audio capture
- **#36** Per-stage Voice Loop latency SLI dashboards
- **#37** Pronunciation Score wiring
- **#38** ASR LM biasing per current Unit vocabulary
- **#39** Real MiniMax TTS playback

**Scenarios** (depends on #7 — now on main):
- **#44** Persist scenario completions to Prisma DB
- **#45** Real MiniMax TTS audio for scenario briefings
- **#46** SRS injection of scenario vocabulary
- **#47** Expand to ≥ 100 scenarios across full curriculum
- **#48** Adaptive scenario difficulty

**Curriculum** (depends on #2 — now on main):
- **#17** Remedial Anchor routing
- **#19** Pronunciation Score phoneme-distance endpoint
- **#25** Build-time TTS asset pipeline

**Observability / sampling**:
- **#13** ASR accuracy regression test suite
- **#16** SC-5 Sampling Buffer infra

**NFRs**:
- **#10** Accessibility (WCAG 2.2 AA) audit
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#14** Cross-device compatibility smoke tests

## Still pending (human)

- **§10 sign-off** on ADR-0003 + amended requirements doc — Product,
  Pedagogy, Engineering leads.
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target.

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

## First action for a new session

```bash
git checkout main && git pull
# Confirm: 354/354 tests pass; typecheck/lint/build green.
# Next up: #15 (Placement integration) — AuthProvider shape, /placement
# page replacement, sign-up routing. Or pick the SRS persistence follow-up
# (#30) since it has the cleanest dep story.
```