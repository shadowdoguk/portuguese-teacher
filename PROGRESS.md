# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-27 (session end + doc refresh)

## Current focus

**Six PRs CI-SUCCESS and ready to merge; remaining 11 PRs re-pushed with conditional prisma step; awaiting Actions queue.**

- **CI SUCCESS now** (re-run after conditional `prisma generate` step landed): #20, #21, #22, #55, #57, #59.
- **Pushed, awaiting Actions trigger**: #27, #32, #43, #49, #50, #51, #52, #53, #54, #56, #58. Each has the conditional fix and an empty trigger commit; local `lint/typecheck/test/build` are green on every branch.
- Recommended merge order: **#20 → #55 → #57 → #22 → #21 → #59**, then the dep-ordered queue (#4, #5, #7, #8, #15, #17) unblocked by #2.

**Next up (dep-ordered, after the SUCCESS PRs land):**
- **#4** — HLR Spaced Repetition scheduler (depends on #2)
- **#5** — Voice Loop (depends on #2)
- **#7** — Conversational Practice UI (depends on #2, #5)
- **#30** — SRS DB persistence (depends on #9 + #26)
- **#23** — CLOSED (delivered via PR #59)

## In progress

_(none — all in-progress work landed this session; awaiting reviewer on the SUCCESS PRs)_

## Recently completed

| Date | Item | Where |
| --- | --- | --- |
| 2026-06-27 | CI: conditional `prisma generate` step (skips on PRs without schema) | `main` (`a4a...`); re-synced across all 14 PRs |
| 2026-06-27 | CI: explicit `prisma generate` step (postinstall is not enough under pnpm) | `main` (`61588c4`) |
| 2026-06-27 | chore(deps): add prisma + tsx devDeps + `onlyBuiltDependencies` allowlist | `main` (`b6932cb`) |
| 2026-06-27 | **#23 CLOSED** — `pnpm seed:a0` script (delivered via PR #59) | PR #59 |
| 2026-06-27 | **#26** Prisma schema + migration for curriculum (PR #59 SUCCESS) | `feat/issue-26-prisma-schema`, PR #59 |
| 2026-06-27 | CI: drop duplicate pnpm version + bump Node to v22 | `main` (`0a62c6c`, `c674b1e`); re-synced across all 14 open PRs |
| 2026-06-27 | #21 PROGRESS.md completed (19 missing issues added) | PR #21 SUCCESS |
| 2026-06-27 | #3 MiniMax wrappers — fix Node 24 / jsdom Blob identity mismatch in TTS test | PR #20 SUCCESS (`a600247`) |
| 2026-06-27 | #9 Learner profile/dashboard/settings UI | PR #55 SUCCESS |
| 2026-06-27 | #57 A/B harness report promoted to docs | PR #57 SUCCESS |
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

- **#24** Author full A0 seed content (≥ 4 Units, ≥ 3 Lessons/Unit, ≥ 1 scenario/Unit) — depends on #2
- **#25** Build-time TTS asset pipeline using MiniMax TTS mocks — depends on #2, #3

### Closed this session

- **#23** Admin script `pnpm seed:a0` (loads pt-PT content into the dev DB) — closed; delivered via PR #59 (the Prisma schema PR also includes the idempotent seed script, migration-status check, row-count summary, and elapsed-time output that #23's acceptance required). README's Quickstart now documents the migrate → seed → dev flow.

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

### CI SUCCESS (ready to merge, dep-ordered)

- **#20** MiniMax AI client wrappers — SUCCESS, foundational
- **#21** PROGRESS tracker / HANDOFF snapshot / CI drift check — SUCCESS, process
- **#55** Learner profile/dashboard/settings UI — SUCCESS, frontend
- **#57** docs(research): A/B harness report — SUCCESS, docs
- **#22** Curriculum data model + A0 fixture — SUCCESS, unblocks #4/#5/#7/#8/#15/#17
- **#59** Prisma schema + migration for curriculum — SUCCESS, unblocks #30/#44; closes #23

### CI re-running (workflow repaired this session, push queued)

- **#27** HLR Spaced Repetition scheduler + review queue — depends on #2
- **#32** Voice Loop (Tier 1/2/3) end-to-end — depends on #2
- **#43** LLM difficulty-control pipeline (generate → re-rank) — depends on #5
- **#49** Conversational Practice UI + scenario library — depends on #5
- **#50** Wire generateAndRerankTurn into API route — depends on #5
- **#51** Expand CEFR vocab fixture + add A1→A2 and A2→B1 corpora — depends on #2
- **#52** Wire live MiniMax LLM into A/B harness — depends on #6
- **#53** Placement Lesson at sign-up — depends on #2
- **#54** Proficiency assessments + Milestone gating — depends on #2
- **#56** docs(progress): mark #9 PR open — docs
- **#58** feat(pedagogy): Affective Filter proxy instrumentation — depends on #2/#18

## Decisions log

- **2026-06-27 — CI: conditional `prisma generate`.** After PR #59 added the schema, the explicit `prisma generate` step needed guarding on `prisma/schema.prisma` presence so PRs without the schema (i.e. everything pre-#26) still pass. Replaced the `if:` guard with a bash `[ -f … ]` check that all PR branches now carry.
- **2026-06-27 — CI: drop duplicate pnpm version in workflow.** `package.json` declares `packageManager: pnpm@10.0.0` AND the workflow also set `version: 10`. Removed the workflow's explicit version so `pnpm/action-setup@v4` reads from `packageManager`. Commit `c674b1e` on `main`; re-synced to all open PR branches.
- **2026-06-27 — CI: bump Node to v22.** v20 is deprecated on GitHub-hosted runners (2025-09-19). Bumped `node-version: 20` → `22` on `main` (`0a62c6c`); re-synced to all open PR branches.
- **2026-06-27 — CI: add explicit `prisma generate` step.** `pnpm install --frozen-lockfile` does not generate the Prisma client in CI (postinstall is skipped). Added a dedicated step. Commit `61588c4` on `main`; re-synced to all open PR branches.
- **2026-06-27 — chore(deps): add prisma + tsx.** `package.json` + `pnpm-lock.yaml` on `main` now carry `@prisma/client`, `prisma`, `tsx` as devDeps, plus `pnpm.onlyBuiltDependencies` allowlist so the postinstall runs. Commit `b6932cb`.
- **2026-06-27 — fix(tts): normalize audio Blob.** Node 24 + jsdom produces a `Blob` whose constructor identity differs from the global `Blob` imported in vitest tests. TTS now re-wraps the response body via `new Blob([arrayBuffer], {type})` so the returned object is always the global `Blob`. PR #20 (`a600247`).
- **2026-06-27 — DB: SQLite for dev, Postgres for prod.** Schema uses only portable types and string-encoded JSON so the provider swap is just a `provider` + `url` change. Singleton `Curriculum` row keyed `pt-PT-v1`; v1.1 will add a second row for pt-BR without a schema migration. PR #59.
- **2026-06-27 — Seed script enforces migration parity.** `prisma/seed.ts` runs `prisma migrate status` first and fails loudly with a non-zero exit code if migrations are pending or the DB is unreachable. Output includes row-count summary + elapsed time. PR #59 closes #23.
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