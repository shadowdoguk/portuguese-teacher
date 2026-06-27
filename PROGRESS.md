# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-27

## Current focus

**#26 — Prisma schema + migration for the curriculum entities** *(in progress, branch `feat/issue-26-prisma-schema`, PR #59 open)*

- Scope: schema for Level / Unit / Lesson / LessonBody / PracticeExercise / VocabularyItem / GrammarPattern / Scenario / RemedialAnchor / Milestone / Curriculum / Learner (stub) / PlacementLessonAttempt. Dialect defaults to pt-PT for v1 (forward-compatible with v1.1 pt-BR). Initial migration; idempotent seed script mapping A0_CURRICULUM to DB rows; round-trip test that re-asserts curriculum invariants.
- Blocks merge on #2 (curriculum types); once #2 lands, #26 can merge.

**Next up (dep-ordered):**
- **#2** — Curriculum data model + seed A0 content (PR #22 open on `feat/issue-2-curriculum-model`)
- **#4** — HLR Spaced Repetition scheduler (PR #27 open on `feat/issue-4-srs-scheduler`)
- **#23** — `pnpm seed:a0` admin script (unblocked by #26)
- **#30** — DB persistence for SRS state (unblocked by #26)

## In progress

- **#26** Prisma schema + migration for curriculum — branch `feat/issue-26-prisma-schema`, PR #59 open. Local: lint/typecheck/test (30/30)/build all green; round-trip test passes against a fresh SQLite.

## Recently completed

| Date | Item | Where |
| --- | --- | --- |
| 2026-06-27 | CI: drop duplicate pnpm version + bump Node to v22 | merged to `main` (`0a62c6c`, `c674b1e`); re-synced across all 14 open PRs |
| 2026-06-27 | #3 MiniMax wrappers — fix Node 24 / jsdom Blob identity mismatch in TTS test | `feat/issue-3-minimax-wrappers` (`a600247`) |
| 2026-06-27 | #20 MiniMax wrappers — CI passes (PR #20 SUCCESS) | merged-ready |
| 2026-06-27 | #9 Learner profile/dashboard/settings UI — PR open, CI SUCCESS | `feat/issue-9-learner-ui`, PR #55 |
| 2026-06-27 | #57 A/B harness report promoted to docs | `docs/difficulty-ab-baseline`, PR #57 SUCCESS |
| 2026-06-23 | #1 Bootstrap Next.js + TypeScript app shell | closed; commits `fa53545`, `399a766` |
| 2026-06-23 | #3 MiniMax AI client wrappers (LLM/ASR/TTS) | PR #20 open; branch `feat/issue-3-minimax-wrappers`; 22/22 tests pass |

## Issue status

### Closed

- **#1** Bootstrap Next.js + TypeScript app shell

### Open — implementation queue (dep-ordered)

- **#2** Curriculum data model + seed A0 content (pt-PT only) — PR #22
- **#4** HLR Spaced Repetition scheduler + review queue — PR #27
- **#5** Voice Loop (Tier 1/2/3) end-to-end — PR #32
- **#6** LLM difficulty control pipeline (generate → re-rank) — PR #43
- **#7** Conversational Practice UI + scenario library (≥ 30 scenarios) — PR #49
- **#8** Proficiency assessments + Milestone gating — PR #54
- **#9** Learner profile, dashboard, progress, settings UI — PR #55
- **#13** ASR accuracy regression test suite
- **#26** Prisma schema + migration for curriculum — PR #59

### Open — non-functional (NFR)

- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#14** Cross-device compatibility smoke tests

### Open — new from ADR-0003

- **#15** Placement Lesson at sign-up (above-A0 self-assessment) — PR #53; depends on #2
- **#16** SC-5 Sampling Buffer infra (production WER sampling) — depends on #5, #13
- **#17** Remedial Anchor routing (curriculum runtime, no DAG back-edges) — depends on #2, #18
- **#18** Affective Filter proxy instrumentation — PR #58
- **#19** Pronunciation Score phoneme-distance endpoint — depends on #3, #5

### Open — follow-ups from #2 scope split

- **#23** Admin script `pnpm seed:a0` (loads pt-PT content into the dev DB) — unblocked by #26
- **#24** Author full A0 seed content (≥ 4 Units, ≥ 3 Lessons/Unit, ≥ 1 scenario/Unit) — depends on #2
- **#25** Build-time TTS asset pipeline using MiniMax TTS mocks — depends on #2, #3

### Open — SRS subsystem (depends on #4)

- **#28** Per-recall telemetry backend hookup (srs_recall events)
- **#29** Audio + image rendering on the review card (multimodal retrieval)
- **#30** DB persistence for SRS state (replace localStorage) — unblocked by #26
- **#31** SRS injection into Unit's Practice Exercise order (FR-LP-2)

### Open — Voice Loop subsystems (depends on #5)

- **#33** Tier 1 (Web Speech API) + Tier 2 (MediaRecorder) audio capture
- **#34** Playwright E2E tests across Chromium + Safari + Firefox tiers
- **#35** SC-5 Sampling Buffer 1% audio capture (production WER)
- **#36** Per-stage Voice Loop latency SLI dashboards (observability)
- **#37** Pronunciation Score wiring to phoneme-distance endpoint
- **#38** ASR language-model biasing per current Unit vocabulary
- **#39** Real MiniMax TTS playback in the browser (audio out)
- **#40** Wire generateAndRerankTurn into voice-loop API route — PR #50
- **#41** Expand CEFR level vocabulary fixture (A2/B1 granularity) — PR #51
- **#42** Wire live MiniMax LLM into A/B harness (issue #6 acceptance) — PR #52

### Open — Scenarios (depends on #7)

- **#44** Persist scenario completions to Prisma DB
- **#45** Real MiniMax TTS audio for scenario briefings
- **#46** SRS injection of scenario vocabulary into review queue
- **#47** Expand scenario library to ≥ 100 scenarios across full curriculum
- **#48** Adaptive scenario difficulty from Learner profile

### Closed (referenced in recent decisions)

- **#3** MiniMax AI client wrappers (LLM/ASR/TTS) — implemented; PR #20 open

## PRs

- **#20** MiniMax AI client wrappers — open, CI SUCCESS, awaiting review
- **#21** PROGRESS tracker / HANDOFF snapshot / CI drift check — open, blocked on PROGRESS completeness (this file)
- **#22** Curriculum data model + A0 fixture — open
- **#27** HLR Spaced Repetition scheduler + review queue — open
- **#32** Voice Loop (Tier 1/2/3) end-to-end — open
- **#43** LLM difficulty-control pipeline (generate → re-rank) — open
- **#49** Conversational Practice UI + scenario library — open
- **#50** Wire generateAndRerankTurn into API route — open
- **#51** Expand CEFR vocab fixture + add A1→A2 and A2→B1 corpora — open
- **#52** Wire live MiniMax LLM into A/B harness — open
- **#53** Placement Lesson at sign-up — open
- **#54** Proficiency assessments + Milestone gating — open
- **#55** Learner profile/dashboard/settings UI — open, CI SUCCESS
- **#56** docs(progress): mark #9 PR open — open
- **#57** docs(research): A/B harness report — open, CI SUCCESS
- **#58** feat(pedagogy): Affective Filter proxy instrumentation — open
- **#59** Prisma schema + migration for curriculum — open

## Decisions log

- **2026-06-27 — CI: drop duplicate pnpm version in workflow.** `package.json` declares `packageManager: pnpm@10.0.0` AND the workflow also set `version: 10`. Removed the workflow's explicit version so `pnpm/action-setup@v4` reads from `packageManager`. Commit `c674b1e` on `main`; re-synced to all open PR branches.
- **2026-06-27 — CI: bump Node to v22.** v20 is deprecated on GitHub-hosted runners (2025-09-19). Bumped `node-version: 20` → `22` on `main` (`0a62c6c`); re-synced to all open PR branches.
- **2026-06-27 — fix(tts): normalize audio Blob.** Node 24 + jsdom produces a `Blob` whose constructor identity differs from the global `Blob` imported in vitest tests. TTS now re-wraps the response body via `new Blob([arrayBuffer], {type})` so the returned object is always the global `Blob`. PR #20 (`a600247`).
- **2026-06-27 — DB: SQLite for dev, Postgres for prod.** Schema uses only portable types and string-encoded JSON so the provider swap is just a `provider` + `url` change. Singleton `Curriculum` row keyed `pt-PT-v1`; v1.1 will add a second row for pt-BR without a schema migration. PR #59.
- **2026-06-23 — ADR-0003 v1 scope amendment.** v1 is **pt-PT only** (pt-BR deferred to v1.1). v1 ladder is **five stages** (A0 → A1 → A2 → B1) with **three Milestones** at level boundaries. Remediation is via **Remedial Anchors** (pointers, not back-edges in the DAG). Above-A0 self-assessments route through a **Placement Lesson**. Production WER sampling uses a separate **SC-5 Sampling Buffer** (ephemeral, opt-in-agnostic). **OAuth sign-in** deferred to v1.1. See `docs/adr/0003-v1-scope-amendment.md`.
- **2026-06-23 — AGENTS.md consolidation.** Three `docs/agents/*.md` files (issue-tracker, triage-labels, domain) folded into `AGENTS.md`.
- **2026-06-23 — MiniMax wrapper contract.** All three wrappers emit a structured latency log (`{type:'minimax_latency', endpoint, durationMs, ok}`) and the contract-smoke test runs them against a local `node:http` server, providing CI coverage until real creds land.

## Blockers

- **§10 sign-off on ADR-0003 + amended requirements doc** — Product, Pedagogy, Engineering leads. Work proceeds in parallel since the spec is captured in code; this gates release, not development.
- **#21 PROGRESS tracker merge** — blocked until this file is complete (now true); CI drift check now passes on `chore/progress-tracker`.
- **#2 merge first** — #26 (and downstream #23/#30/#44) cannot merge until the curriculum types land.

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
