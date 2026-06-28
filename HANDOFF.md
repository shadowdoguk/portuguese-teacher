# Session Handoff

**Snapshot date:** 2026-06-28 (Season 1 wrapped — 18 PRs merged; Phase 1 hardening shipped)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Season 1 of the Portuguese Teacher build is **complete**. Over two sessions
the repo went from a CI-blocked bootstrap to a clean `main` with:

- **18 PRs merged** (16 foundational + 2 Phase-1 hardening).
- **405/405 tests green** (`pnpm typecheck` / `pnpm lint` / `pnpm build` all green).
- **A0 curriculum seeded**: 4 Units / 12 Lessons / 19 Exercises / 23 vocab / 4 scenarios.
- **Runtime stack complete**: MiniMax wrappers, Voice Loop (Tier 1/2/3),
  SRS, Proficiency assessments, Affective Filter, Conversational Practice,
  LLM difficulty pipeline (ADR-0004), live MiniMax harness.
- **Learner-facing flow wired**: sign-up → placement (or A0 skip) →
  dashboard → review queue → proficiency assessment → remediation plan.
- **Schema**: Prisma `Curriculum` + `Learner` + `Assessment` + `RemedialAnchor`
  + `Scenario` rows; all idempotent via `pnpm seed`.

Season 2 starts now. The remaining work is: 2 more Phase-1 items
(`#19` Pronunciation endpoint, `#25` TTS asset pipeline), state
persistence (`#28`/`#30`/`#44`/`#46`), the bulk content authoring (A1/A2/B1
+ `#47` ≥100 scenarios), real-world audio capture/playback (`#33`/`#35`/`#37`/`#38`/`#39`),
NFRs (`#10`–`#14`), and E2E validation (`#34`/`#36`/`#48`).

## Season 1 outcomes

### Foundational work (session-1, 16 PRs)

Closed PRs covering 14 distinct issues:
- #20/#3 — MiniMax AI client wrappers (LLM/ASR/TTS)
- #55/#9 — Learner profile, dashboard, progress, settings UI
- #61 (docs) — promote mock A/B harness report from tmp/ to docs/
- #62/#2 — Curriculum data model + A0 fixture
- #63/#26 + #23 — Prisma schema + migration + `pnpm seed:a0` admin script
- #64/#24 — A0 seed content (Unit A0.4 'Rotina e horas')
- #65/#4 — HLR Spaced Repetition scheduler + review queue
- #66/#8 — Proficiency assessments + Milestone gating
- #67/#15 (partial) — Placement Lesson runtime + tests
- #68/#18 — Affective Filter proxy instrumentation
- #69/#5 — Voice Loop (Tier 1/2/3) end-to-end
- #70/#6 — LLM difficulty-control pipeline + ADR-0004
- #71/#41 — Expand CEFR vocab fixture + A1→A2 + A2→B1 corpora
- #72/#42 — Wire live MiniMax LLM into A/B harness
- #73/#40 — Wire `generateAndRerankTurn` into API route
- #74/#7 — Conversational Practice UI + scenario library

### Phase-1 hardening (session-2, 2 PRs)

- **#75/#15** — Placement Lesson integration: AuthProvider shape
  (`setCurrentUnit`, `confirmPlacement`, `latestPlacementAttempt`),
  sign-up form captures self-assessment + routes above-A0 to
  `/placement`, full adaptive runner on the placement page (start →
  items → outcome → accept/override/retake), dashboard "Placement
  pending" CTA + "Starting from" Unit card, profile "Jump straight to
  a Unit" grid + latest-attempt display.
- **#76/#17** — Remedial Anchor routing runtime:
  `resolveRemediationPlan(unitId, { learnerMastery, maxDepth,
  affectiveFilterScore })` returns the ordered anchor chain filtered by
  gap-area weakness × anchor weight, capped at `maxDepth` (default 5),
  deduped at the output level; Affective Filter scaffolding flag at
  HIGH score; `/progress` UI surfaces the chain for failed Milestones;
  `pnpm anchors:suggest <unitId>` admin script; 14 new property tests
  including a 50-anchor content-team pass that stays acyclic and
  terminates in ≤ 5 steps.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 18 new merge commits; 405/405 tests green |
| All `-clean` branches | merged + deleted via `--delete-branch` |
| Original polluted branches | closed as superseded, branches deleted |

## Open PRs

None.

## Open issues (Season 2 starts here)

**Phase 1 — runtime integration (2 remaining of 4)**
- **#19** Pronunciation Score phoneme-distance endpoint (depends on #3 + #5)
- **#25** Build-time TTS asset pipeline using MiniMax TTS mocks (depends on #2 + #3)

**Phase 2 — state persistence (depends on #4, #7, #26)**
- **#28** Per-recall telemetry backend hookup
- **#30** DB persistence for SRS state (replace localStorage)
- **#44** Persist scenario completions to Prisma DB
- **#46** SRS injection of scenario vocabulary

**Phase 3 — content (the bulk)**
- A1 / A2 / B1 curriculum authoring (currently 4 of ~30 Units seeded)
- **#47** Expand scenario library to ≥ 100 scenarios
- **#31** SRS injection into Unit's Practice Exercise order

**Phase 4 — Voice Loop real-world wiring**
- **#33** Tier 1 + Tier 2 audio capture
- **#39** Real MiniMax TTS playback in the browser
- **#38** ASR LM biasing per current Unit vocabulary
- **#37** Pronunciation Score wiring
- **#35** SC-5 Sampling Buffer 1% audio capture

**Phase 5 — NFRs**
- **#10** Accessibility (WCAG 2.2 AA)
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#13** ASR accuracy regression test suite
- **#14** Cross-device smoke tests
- **#16** SC-5 Sampling Buffer infra

**Phase 6 — E2E validation**
- **#34** Playwright E2E across Chromium + Safari + Firefox
- **#36** Per-stage Voice Loop latency SLI dashboards
- **#48** Adaptive scenario difficulty

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product,
  Pedagogy, Engineering leads).
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
| Anchor routing | `src/lib/curriculum/graph.ts`, `src/test/anchor-routing.test.ts` |
| Admin scripts | `scripts/anchors-suggest.ts`, `scripts/progress-check.mjs` |
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

## First action for Season 2

```bash
git checkout main && git pull
# Confirm: 405/405 tests pass; typecheck/lint/build green.
# Pick up #19 (Pronunciation Score phoneme-distance endpoint) to finish
# Phase 1 — only #19 + #25 remain after that, then move into Phase 2
# state persistence (#30 is the cleanest next pick).
```