# Progress Tracker

A living document. Read this at the start of every session to pick up where the last one left off. Update it whenever an issue transitions state, a branch lands, a decision is made, or a blocker appears or clears.

**Last updated:** 2026-06-27

## Current focus

**Next dep-ordered item:** PR #22 (Curriculum model + A0 fixture) is still in review. #9 (Learner profile/dashboard/settings UI) is ready on `feat/issue-9-learner-ui` and merges to `main` — independent of the stack. **PR #55 open**.

## In progress

- **#9 — Learner profile, dashboard, progress, settings UI** — branch `feat/issue-9-learner-ui` (off `main`). New `src/lib/settings/` module: types, localStorage-backed per-user store, React provider + `useSettings` hook, schema-versioned JSON export, deletion-request store with 30-day window. Extended `Learner` with `nativeLanguage`, `selfAssessmentLevel`, `goals[]`, `currentUnitId`. Replaced placeholder cards on `/dashboard`, `/profile`, `/progress`, `/settings` with real forms (Field/Toggle/Slider/Select/Checkbox primitives). `/placement` integration route added — full Placement Lesson runtime lives in #15; this is the entry-point per ADR-0003 §3.4. Dashboard surfaces weekly-goal progress bar driven by `Settings.weeklyGoalMinutes`. Voice-recording opt-in toggle is **independent** from the SC-5 Sampling Buffer per requirements. CONTEXT.md glossary extended with Settings / Weekly Goal / Voice-Recording Opt-In / Confidence Check-In Opt-In / Account Deletion Request. **52 new tests** across `settings`, `settings-provider`, `settings-form`, `toggle`, `slider`, `select`, `checkbox`, `profile-form`, `dashboard`, `progress`, `placement`, `privacy-controls`. 56/56 total tests pass; typecheck/lint/build green. **PR #55 open**.
- **#8 — Proficiency assessments + Milestone gating** — branch `feat/issue-8-proficiency-assessments` (off `feat/issue-2-curriculum-model`). New `src/lib/assessment/` module: `selector` (15–25 balanced items across listening / reading / writing / speaking; adaptive ±1 sub-level branching on answers), `scoring` (per-skill mastery + overall 0–1; pass at `milestone.passingScore`), `gate` (eligibility, 24h cooldown, post-anchor-exhaustion referral trigger), `store` (in-memory attempts + referrals log). New `/assess/[boundary]` route (assessment flow + pass/fail outcome screen with anchor chain summary + auto-referral on third anchor-exhaustion failure). Dashboard surfaces "Take Milestone" CTA when the Learner's level matches a Milestone's `fromLevel`. Progress page now renders real attempt history + Tutor Referral placeholder. 31 new tests in `src/test/assessment.test.ts`; 58/58 total pass; typecheck/lint/build green. **PR #54 open**.
- **#15 — Placement Lesson at sign-up (above-A0 self-assessment)** — branch `feat/issue-15-placement-lesson` (off `feat/issue-2-curriculum-model`). Review fixes landed (`1cfca6e`): CONTEXT.md glossary entries added; duplicate `PlacementSkill` removed; try/catch + focus management + Escape/outside-click on the Unit override picker; profile/dashboard copy fix; 4 new tests (A0-no-row, override→record, decorated-id stability, pool exhaustion). 62/62 total tests pass. **PR #53 open**. Merge after #22.
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
- **#8** Proficiency assessments + Milestone gating — **PR #54 open**
- **#9** Learner profile, dashboard, progress, settings UI — **PR #55 open**
- **#13** ASR accuracy regression test suite

### Open — non-functional (NFR)

- **#10** Accessibility (WCAG 2.2 AA) audit and fixes
- **#11** Performance budgets + Lighthouse CI
- **#12** Observability + graceful degradation
- **#14** Cross-device compatibility smoke tests

### Open — new from ADR-0003

- **#15** Placement Lesson at sign-up (above-A0 self-assessment) — depends on #2 — **PR #53 open**
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
- **#53** Placement Lesson (#15) — open, awaiting #22.
- **#54** Proficiency assessments (#8) — open, awaiting #22.
- **#55** Learner UI (#9) — open, targets `main` (independent of the stack).

## Decisions log

- **2026-06-27 — Learner UI ships to `main` independently (#9).** The four FR-WEB-4 surfaces (profile, dashboard, progress, settings) are foundational and read from a stable Learner contract. They use the existing `AuthProvider` for Learner state and a new per-user `SettingsProvider` (localStorage keyed by Learner ID) for preferences. When PR #22 lands and the Curriculum module is on `main`, the dashboard / progress surfaces will pick up real Unit / Milestone data with no UI change required — the existing `deriveReviewDue`, `deriveSkillMastery`, and `NEXT_LESSON_BY_LEVEL` helpers degrade gracefully when modules are absent. The Placement Lesson integration route (`/placement`) is the entry-point per ADR-0003 §3.4 — the full runtime ships in #15.
- **2026-06-27 — Settings persistence key strategy (#9).** Per-Learner localStorage key `portuguese-teacher:settings:${learnerId}`. Default settings restored on sign-out; `clearSettings(userId)` is exposed for the account-deletion flow but not auto-invoked (Learner-initiated only).
- **2026-06-27 — Data export schema version (#9).** Export payload tagged `schema: "portuguese-teacher/export"` and `schemaVersion: 1`. Includes Learner profile, Settings, optional `attempts` and `referrals` arrays, and the current `deletionRequested` record. Future versions can migrate.
- **2026-06-27 — Voice-recording opt-in is independent of SC-5 (#9).** The `voiceRecordingOptIn` toggle (default off) only gates explicit retention of stored recordings — it does **not** affect the SC-5 Sampling Buffer, which is always on for the 1% production-WER sample and is governed by the SC-5 PRD (issue #16). Two separate code paths; one Learner-facing toggle.
- **2026-06-27 — `progress:check` is now a graceful no-op (#55).** Previously the CI step would fail on every PR that targets `main` because `pnpm progress:check` didn't exist on the base. The new `scripts/progress-check.mjs` returns success when `PROGRESS.md` is absent (and runs the full check when present + `GH_TOKEN` is set). This unblocks every PR that opens against `main` ahead of the `chore/progress-tracker` (#21) merge.
- **2026-06-25 — Placement Lesson item-pool strategy (#15).** For v1 MVS the placement pool is drawn from the **already-seeded** Curriculum (A0 Units only). The recommendation engine clamps to the **highest seeded level** when self-assessment is above what is currently available (e.g. B1 self-assessment → A0 recommendation). When #23 / #41 / #49 land A1/A2 content, the same selector will pull from those pools automatically — no placement-module change required. Per-skill mastery maps to a recommended Unit at the appropriate level; learners may accept or one-step self-correct to a different seeded Unit.
- **2026-06-25 — Proficiency Assessment skill set (#8).** The Assessment engine uses four skills (listening / reading / writing / speaking) per FR-LP-5, but the existing `PracticeExerciseKind` only spans seven kinds. The mapping is: `flashcard → reading`, `fill-in → writing`, `listen-and-repeat → listening`, `role-play → speaking`, `free-response → writing`, `pronunciation-drill → listening`, `scenario-turn → speaking`. When #23 lands the full content authoring, this mapping is the contract for assessment pool selection. The Milestone's `passingScore` is 0–1 (consistent with the placement score); the requirements doc says "0–100" but the codebase uses 0–1 throughout (placement already ships that way), and "≥ 75" maps to `passingScore: 0.75` which matches the existing seed.
- **2026-06-25 — Referral trigger condition (#8).** Per ADR-0003 §5, the referral is triggered after **three failures following Remedial Anchor exhaustion**, not after three raw failures. The `countAttemptsForBoundary` helper counts only `failedAfterAnchorExhaustion` (i.e., attempts where `recommendedAnchorUnitIds.length === 0`, meaning the runtime could not produce any anchor for the gap areas). Earlier failures — where the engine has remediation candidates — do not count toward the trigger. This matches the issue body's *"after Remedial Anchor exhaustion"* qualifier.
- **2026-06-23 — ADR-0003 v1 scope amendment.** v1 is **pt-PT only** (pt-BR deferred to v1.1). v1 ladder is **five stages** (A0 → A1 → A2 → B1) with **three Milestones** at level boundaries. Remediation is via **Remedial Anchors** (pointers, not back-edges in the DAG). Above-A0 self-assessments route through a **Placement Lesson**. Production WER sampling uses a separate **SC-5 Sampling Buffer** (ephemeral, opt-in-agnostic). **OAuth sign-in** deferred to v1.1. See `docs/adr/0003-v1-scope-amendment.md`.
- **2026-06-23 — AGENTS.md consolidation.** Three `docs/agents/*.md` files (issue-tracker, triage-labels, domain) folded into `AGENTS.md`.
- **2026-06-23 — MiniMax wrapper contract.** All three wrappers emit a structured latency log (`{type:'minimax_latency', endpoint, durationMs, ok}`) and the contract-smoke test runs them against a local `node:http` server, providing CI coverage until real creds land.

## Blockers

- **§10 sign-off on ADR-0003 + amended requirements doc** — Product, Pedagogy, Engineering leads. Work proceeds in parallel since the spec is captured in code; this gates release, not development.
- **PR #22 CI** — the Lint · Typecheck · Test · Build check has been failing since 2026-06-23 with a transient setup-node resolution error. Branch has been rebased locally and the workflow file is correct (`actions/setup-node@v4`); needs a re-run or a maintainer re-trigger. Until then PR #22 / #53 / #54 are blocked from merging. #9 (#55) does not depend on this stack.

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

The script is a graceful no-op when `PROGRESS.md` is absent from the branch — so PRs targeting `main` before `chore/progress-tracker` (#21) merges do not break.

To run locally: `pnpm progress:check` (needs `gh auth login` first). Override the staleness threshold with `PROGRESS_STALE_AFTER_DAYS=N`.