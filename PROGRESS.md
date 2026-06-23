# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-23

## Current focus

**Next dep-ordered item:** #7 (Conversational Practice UI + scenario library) — depends on #6 (this branch).

## In progress

- **#6 — LLM difficulty control pipeline (generate → re-rank)** — branch `feat/issue-6-llm-difficulty-pipeline` (off `feat/issue-5-voice-loop`). Minimum-viable slice: `src/lib/voice-loop/{difficulty-estimator,level-vocabulary,system-prompt,rerank,ab-corpus,ab-mocks,ab-harness}.ts`; A/B harness writes `tmp/difficulty-ab-report.md`. 128/128 tests pass; typecheck/lint/build green. ADR-0004 ships. Follow-up issues filed: #40 (re-rank orchestrator wiring), #41 (expanded vocab fixture), #42 (live LLM harness acceptance). PR pending push.
- **#5 — Voice Loop (Tier 1/2/3) end-to-end** — PR #32 open (against `feat/issue-4-srs-scheduler`); minimum-viable slice shipped on `feat/issue-5-voice-loop` (commits `56d1ad6` cherry-pick of #3, `ae53cd6` voice loop). 82/82 tests pass; typecheck/lint/build green. Follow-up issues filed: #33 (real audio capture), #34 (Playwright E2E), #35 (SC-5 sampling), #36 (latency SLI dashboards), #37 (Pronunciation Score wiring), #38 (ASR LM biasing), #39 (real TTS playback). Awaiting human review.

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
- **#4** HLR Spaced Repetition scheduler + review queue — **PR #27 open (in review)**
- **#5** Voice Loop (Tier 1/2/3) end-to-end — **PR #32 open (in review)**
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

- **#15** Placement Lesson at sign-up (above-A0 self-assessment) — depends on #2
- **#16** SC-5 Sampling Buffer infra (production WER sampling) — depends on #5, #13
- **#17** Remedial Anchor routing (curriculum runtime, no DAG back-edges) — depends on #2, #18
- **#18** Affective Filter proxy instrumentation — no strong deps
- **#19** Pronunciation Score phoneme-distance endpoint — depends on #3, #5

### Open — follow-ups from #2 (minimum-viable slice)

- **#23** Author full A0 seed content (≥ 4 Units, ≥ 3 Lessons/Unit, ≥ 1 scenario/Unit) — depends on #2
- **#24** Prisma schema + migration for the curriculum entities — depends on #2
- **#25** Admin script `pnpm seed:a0` — depends on #2, #23, #24
- **#26** Build-time TTS asset pipeline using MiniMax TTS mocks — depends on #2, #3

### Open — follow-ups from #4 (minimum-viable slice)

- **#28** DB persistence for SRS state (replace localStorage) — depends on #24, #9
- **#29** Per-recall telemetry backend hookup (srs_recall events) — depends on #12, #28
- **#30** SRS injection into Unit's Practice Exercise order (FR-LP-2) — depends on #4, #17
- **#31** Audio + image rendering on the review card — depends on #4, #26

### Open — follow-ups from #5 (minimum-viable slice)

- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture — depends on #5, #3
- **#34** Playwright E2E tests across Chromium + Safari + Firefox tiers — depends on #5, #33
- **#35** SC-5 Sampling Buffer 1% audio capture (production WER) — depends on #33, #16
- **#36** Per-stage Voice Loop latency SLI dashboards (observability) — depends on #5, #12
- **#37** Pronunciation Score wiring to phoneme-distance endpoint — depends on #5, #19, #38
- **#38** ASR language-model biasing per current Unit vocabulary — depends on #33, #2
- **#39** Real MiniMax TTS playback in the browser (audio out) — depends on #5, #3

### Open — follow-ups from #6 (minimum-viable slice)

- **#40** Wire `generateAndRerankTurn` into the voice-loop API route (Tier 1 + Tier 2) — depends on #6, #42
- **#41** Expand CEFR level vocabulary fixture (A2/B1 granularity + sub-levels) — depends on #6
- **#42** Wire live MiniMax LLM into A/B harness (issue #6 acceptance ≥75% in-band) — depends on #6, #3

## PRs

- **#20** MiniMax AI client wrappers (LLM/ASR/TTS) — open, awaiting human review. Merge does not block #2.
- **#22** Curriculum data model + A0 fixture (minimum-viable slice, closes #2) — open, awaiting human review. Brings in `chore/progress-tracker` (commit `c23be34`) so PROGRESS.md is on `main`.
- **#27** HLR Spaced Repetition scheduler + review queue (minimum-viable slice, closes #4) — open against `feat/issue-2-curriculum-model`; retarget to `main` after #22 merges. 50/50 tests pass.
- **#32** Voice Loop (Tier 1/2/3) end-to-end (minimum-viable slice, closes #5) — open against `feat/issue-4-srs-scheduler`; brings in the #3 MiniMax wrappers from PR #20 via a cherry-pick commit. 82/82 tests pass.

## Decisions log

- **2026-06-23 — ADR-0004 LLM difficulty-control pipeline.** The NLG pipeline runs **generate → re-rank** (per FR-AI-4 / Jin et al. 2026). LLM emits **N=4** candidates in a single structured-output call. A pure-functional lexical-coverage estimator scores each candidate against the Learner's CEFR-level vocabulary and selects the one closest to the i+1 target. **pt-BR dialect defects are a hard filter** (candidates dropped before scoring). A/B harness ships in mock mode for CI regression coverage; live mode lands in #42. See `docs/adr/0004-difficulty-control-pipeline.md`.
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
