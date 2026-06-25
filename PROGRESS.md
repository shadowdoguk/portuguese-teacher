# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-25

## Current focus

**Next dep-ordered item:** #8 (Proficiency assessments + Milestone gating) — depends on #2 (PR #22 in review) and #15 (PR opened this session).

## In progress

- **#15 — Placement Lesson at sign-up (above-A0 self-assessment)** — branch `feat/issue-15-placement-lesson` (off `feat/issue-2-curriculum-model`). `PlacementLessonAttempt` extended with `id`, `recommendedStartUnitId`, `confirmedStartUnitId`. `Learner` extended with `currentUnitId?` + `selfAssessedLevel?`. New `src/lib/placement/` module: `selector` (8–12 mixed items, adaptive ±1 sub-level branching on answers), `scoring` (per-skill mastery + unit recommendation), `store` (in-memory attempt log). New `/placement` route (lesson flow + per-skill outcome screen with one-step Unit override). Sign-up captures self-assessment; A0 skips placement and writes `entryUnitId` directly; above-A0 routes to `/placement`. Profile surfaces "Skip to my level" / "Re-take placement" for above-A0 learners. 31 new tests in `src/test/placement.test.ts`; 58/58 total pass; typecheck/lint/build green. Commit `c3165b2`. PR opening pending.
- **#42 — Wire live MiniMax LLM into A/B harness** — branch `feat/issue-42-live-llm-harness` (off `feat/issue-6-llm-difficulty-pipeline`). 197/197 tests pass. **Acceptance run pending MiniMax sandbox creds**.
- **#41 — Expand CEFR level vocabulary fixture** — branch `feat/issue-41-vocab-fixture`. 191/191 tests pass. **PR #51 open**.
- **#40 — Wire `generateAndRerankTurn` into the voice-loop API route** — branch `feat/issue-40-rerank-orchestrator`. 178/178 tests pass. **PR #50 open**.
- **#7 — Conversational Practice UI + scenario library** — branch `feat/issue-7-conversational-practice`. 30 pt-PT scenarios. Follow-ups filed: #44-#48. **PR #49 open**.
- **#6 — LLM difficulty control pipeline (generate → re-rank)** — PR #43 open (against `feat/issue-5-voice-loop`). 128/128 tests pass. Follow-ups filed: #40, #41, #42.
- **#5 — Voice Loop (Tier 1/2/3) end-to-end** — PR #32 open (against `feat/issue-4-srs-scheduler`). 82/82 tests pass. Follow-ups filed: #33-#39.

## Recently completed

| Date | Item | Where |
| --- | --- | --- |
| 2026-06-23 | #1 Bootstrap Next.js + TypeScript app shell | closed; commits `fa53545`, `399a766` |
| 2026-06-23 | #3 MiniMax AI client wrappers (LLM/ASR/TTS) | PR #20 open; branch `feat/issue-3-minimax-wrappers` (commits `fee6798`, `0a96d60`); 22/22 tests pass |
| 2026-06-23 | PROGRESS tracker + HANDOFF + CI drift check | PR #21 (chore/progress-tracker) — folded into PR #22 so PROGRESS.md lands on `main` |

## Issue status

### Closed

- **#1** Bootstrap Next.js + TypeScript app shell

### Open — implementation queue (dep-ordered)

- **#2** Curriculum data model + seed A0 content (pt-PT only) — **PR #22 open (in review)**
- **#4** HLR Spaced Repetition scheduler + review queue
- **#5** Voice Loop (Tier 1/2/3) end-to-end
- **#6** LLM difficulty control pipeline (generate → re-rank)
- **#7** Conversational Practice UI + scenario library (≥ 30 scenarios)
- **#8** Proficiency assessments + Milestone gating
- **#9** Learner profile, dashboard, progress, settings UI
- **#13** ASR accuracy regression test suite

### Open — non-functional (NFR)

- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#14** Cross-device compatibility smoke tests

### Open — new from ADR-0003

- **#15** Placement Lesson at sign-up (above-A0 self-assessment) — depends on #2 — **branch `feat/issue-15-placement-lesson` ready for PR**
- **#16** SC-5 Sampling Buffer infra (production WER sampling) — depends on #5, #13
- **#17** Remedial Anchor routing (curriculum runtime, no DAG back-edges) — depends on #2, #18
- **#18** Affective Filter proxy instrumentation — no strong deps
- **#19** Pronunciation Score phoneme-distance endpoint — depends on #3, #5

### Open — follow-ups from #2 (minimum-viable slice)

- **#23** Author full A0 seed content (≥ 4 Units, ≥ 3 Lessons/Unit, ≥ 1 scenario/Unit) — depends on #2
- **#24** Prisma schema + migration for the curriculum entities — depends on #2
- **#25** Admin script `pnpm seed:a0` — depends on #2, #23, #24
- **#26** Build-time TTS asset pipeline using MiniMax TTS mocks — depends on #2, #3

## PRs

- **#20** MiniMax AI client wrappers (LLM/ASR/TTS) — open, awaiting human review. Merge does not block #2.
- **#22** Curriculum data model + A0 fixture (minimum-viable slice, closes #2) — open, awaiting human review. Brings in `chore/progress-tracker` (commit `c23be34`) so PROGRESS.md is on `main`.
- **Placement Lesson (#15)** — branch `feat/issue-15-placement-lesson` ready; PR opening pending. Stacks off PR #22.

## Decisions log

- **2026-06-25 — Placement Lesson item-pool strategy (#15).** For v1 MVS the placement pool is drawn from the **already-seeded** Curriculum (A0 Units only). The recommendation engine clamps to the **highest seeded level** when self-assessment is above what is currently available (e.g. B1 self-assessment → A0 recommendation). When #23 / #41 / #49 land A1/A2 content, the same selector will pull from those pools automatically — no placement-module change required. Per-skill mastery maps to a recommended Unit at the appropriate level; learners may accept or one-step self-correct to a different seeded Unit.
- **2026-06-23 — ADR-0003 v1 scope amendment.** v1 is **pt-PT only** (pt-BR deferred to v1.1). v1 ladder is **five stages** (A0 → A1 → A2 → B1) with **three Milestones** at level boundaries. Remediation is via **Remedial Anchors** (pointers, not back-edges in the DAG). Above-A0 self-assessments route through a **Placement Lesson**. Production WER sampling uses a separate **SC-5 Sampling Buffer** (ephemeral, opt-in-agnostic). **OAuth sign-in** deferred to v1.1. See `docs/adr/0003-v1-scope-amendment.md`.
- **2026-06-23 — AGENTS.md consolidation.** Three `docs/agents/*.md` files (issue-tracker, triage-labels, domain) folded into `AGENTS.md`.
- **2026-06-23 — MiniMax wrapper contract.** All three wrappers emit a structured latency log (`{type:'minimax_latency', endpoint, durationMs, ok}`) and the contract-smoke test runs them against a local `node:http` server, providing CI coverage until real creds land.

## Blockers

- **§10 sign-off on ADR-0003 + amended requirements doc** — Product, Pedagogy, Engineering leads. Work proceeds in parallel since the spec is captured in code; this gates release, not development.

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
