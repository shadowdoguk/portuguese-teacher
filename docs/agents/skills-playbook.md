# Skills Playbook

How superpowers skills are applied across the four delivery phases of
the European Portuguese learning platform. Read alongside
`AGENTS.md`, the domain glossary `CONTEXT.md`, and the per-phase
plans under `docs/superpowers/plans/`.

> **Baseline.** `superpowers:using-superpowers` is loaded for every
> session. Every response below presupposes it. Skip-list and
> anti-rationalisation guidance from `using-superpowers` are not
> repeated here.

## Project phases (the lanes skills run in)

| Phase | Scope | Acceptance gate (per rebuild spec §4) |
|---|---|---|
| **A** Foundation + minimal authenticated web | pnpm-workspaces monorepo after legacy archive · Zod contracts · pure domain rules · Drizzle + Postgres 16 (Docker) · Argon2id auth with opaque hashed cookies · atomic content compiler · audio + conversation adapter interfaces with in-memory stubs in `packages/tooling/` · 2 curriculum endpoints · 1 authenticated React route | `pnpm typecheck` / `lint` / `test` / `build` green · `bash scripts/dev-up.sh` brings up Postgres + API + web · login + `a1-introductions` listing visible |
| **B** Practice surface on web | Listen & Repeat · Active Recall · Smart Review · filters · collections · settings · one A1 unit fully exercises all six stages | One A1 unit passes the spec §13.3 vertical-slice gate |
| **C** Reviewed audio + Android | Azure pt-PT primary · Polly `Inês` fallback · MiniMax only if dedicated evaluation passes · native-speaker listening test · Capacitor 8 wraps `apps/web` · Android uses opaque tokens via per-platform secure-storage adapter · real `AzureAdapter` / `PollyAdapter` / `MiniMaxAdapter` implementations | Voice pinned after listening test · Android e2e passes · audio content-addressed assets served |
| **D** Guided text AI conversation | Real scenario for `a1-introductions` · provider adapter populated · bounded context · structured summary · failure preserves transcript, blocks nothing | Scenario passes locale, level, concision, pt-BR-drift evaluation |

The vertical slice after Phase A (`a1-introductions` end-to-end
across web) matches the spec §13.3 acceptance gate — all six stages,
vocabulary, grammar, pronunciation, sentences, one island, reviewed
audio, Listen & Repeat, Active Recall, Smart Review, search/filter, a
collection, one AI role-play, shared progress on web + physical
Android, automated tests, deployment smoke checks.

Within each phase, four sub-stages repeat:

1. **Pre-implementation** (decide what to build, lock the design)
2. **Plan authoring** (write the implementation plan)
3. **Implementation** (branch → TDD → review)
4. **Reflection** (update trackers, sharpen glossary, request
   review, finish branch)

## Skill × sub-stage matrix

Each cell lists the primary skill plus a short justification. Cells
labeled *"implicit"* mean the discipline is encoded in the chosen
primary skill (e.g. failing-test-first is a property of the task
shapes the writing-plans skill produces; it isn't a separate
load).

| Skill | Phase A | Phase B | Phase C | Phase D |
|---|---|---|---|---|
| **brainstorming** | Already used for the rebuild spec (Session 0). Reserved for any new feature scope that lands inside Phase A (e.g. "sourceChecksum length" might have been a brainstorm if not already drilled). | First new-feature creation. Use before every `feat/issue-<N>` that introduces a fresh surface (filters & collections, settings). | Listening test gate design, Capacitor 8 plugin verification, Android token transport — each is a separate brainstorm. | MiniMax-vs-OpenAI conversational model evaluation is a brainstorm, not a one-question drill. |
| **grill-with-docs** + **domain-modeling** | Used in Session 1 to walk the Phase A decision tree and draft ADRs 0001 / 0002. Use again when a Phase A task surfaces ambiguities the plan didn't resolve (the amendment plan A1–A7 is one such pass; context-modeling refined the glossary alongside). | Use at the start of Phase B to drill any undecided branch of the practice surface — e.g. five-point vs three-point self-rating, smart-review tie-break specifics, settings-scope edge cases. | Same — drill the listening-test scoring rubric and the Android-bearer transport's edge cases that surface here for the first time. | Same — drill the conversation-context budget, scenario scaffolding, summary rubric. |
| **research** | Cross-checked the two source-archive plans against the rebuild spec + ADRs + glossary (Session 2). The artefacts live at `tmp/source-archive-a-crosscheck.md` and `tmp/source-archive-b-crosscheck.md`. Use again whenever a decision needs a primary-source citation. | When Phase B introduces a third-party library (e.g. audio playback in browser, IndexedDB for offline island bundles) and the decision turns on a fact in the current docs. | Azure / Polly / MiniMax SDK capability verification, listener-test rubric references, Capacitor plugin landscape. | MiniMax conversational-product evaluation, evaluation-corpus construction, prompt-injection threat models. |
| **writing-plans** | Authored `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` (parent) and `2026-07-23-phase-a-adr-incorporation.md` (A1–A7 amendment). Author every future task-bearing plan in `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` per AGENTS.md governance. | Phase B plan (`2026-07-23`-or-later `phase-b-practice-surface.md`). | Phase C plan (`phase-c-audio-and-android.md`). | Phase D plan (`phase-d-ai-conversation.md`). |
| **dispatching-parallel-agents** | Used in Session 2 for the two source-archive cross-check reads. Use for any two-plus independent investigations or implementations. | Independent feature area slices (e.g. filters web page + filter API contract in parallel). | Independent capability sub-tasks (Azure research + Capacitor 8 verification + listening-test rubric in parallel). | Independent sub-tasks (provider research + scenario authoring in parallel). |
| **using-git-worktrees** | Triggered before any new feature branch. Task 0 begins by branching from `main`; the plan recommends working on a fresh branch (`chore/archive-legacy`). Each subsequent Phase A task should land on its own branch off `chore/archive-legacy`. | Each Phase B task lands on its own branch. | Each Phase C task lands on its own branch. | Each Phase D task lands on its own branch. |
| **test-driven-development** | *Implicit.* Every task in the parent Phase A plan and the amendment plan ships a failing test first (Task 2/3/4 of the amendment plan embody this explicitly). Use with every new task. | Same. | Same — listening-test results must be reproducible from a recorded fixture; automated UI runs must rerun on every commit. | Same — provider responses must be replayed from recorded fixtures when running offline; structured-summary assertions must validate against a golden corpus. |
| **executing-plans** *or* **subagent-driven-development** | Either may run Task A1–A7 once Task 0 lands. Inline execution gives you real-time control; subagent-driven gives you parallelism + clean reviews per task. | Same per Phase B task. | Same per Phase C task. | Same per Phase D task. |
| **systematic-debugging** | Triggered when a TypeScript build breaks, a Drizzle migration fails, an atomic-publish transaction throws, an auth integration test fails. Use BEFORE proposing a fix. | Same — practice-flow bugs (rating upsert, smart-review ordering, filter regex collision). | Same — Capacitor plugin quirks, Azure SDK retries, list-test scoring disagreements. | Same — provider response validation, prompt-injection survivability. |
| **verification-before-completion** | Triggered before every "task green / ready to commit" claim. Run the actual commands (`pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm -r build`) and read the output before claiming green. The Phase A Global Constraints pin this discipline anyway: "Commit steps are review-only. No commit fires without explicit user authorization." | Same before each Phase B task claim. | Same before each Phase C task claim. | Same before each Phase D task claim. |
| **requesting-code-review** | Triggered when a phase plan completes — i.e. when all its tasks are green and the branch is ready to land. Use `code-review` skill's request flow with two parallel reviews (Standards and Spec). | Same. | Same. | Same. |
| **receiving-code-review** | Triggered when review feedback arrives (Standards review, Spec review, or external PR feedback). Do not performatively agree; verify each suggestion against the project's glossary, ADRs, and CONSTRAINTS before implementing. | Same. | Same. | Same. |
| **finishing-a-development-branch** | Triggered after a branch has been merged (or decided not to merge) and the corresponding PROGRESS.md / HANDOFF.md entries are written. | Same. | Same. | Same. |
| **resolving-merge-conflicts** | Triggered when `git rebase` or `git merge` produces a conflict. Use the dedicated skill workflow rather than ad-hoc resolution. | Same. | Same. | Same. |
| **domain-modeling** (standalone) | Triggered whenever a new domain term is introduced or an existing one is sharpened. The Session 1 walk of the Phase A decision tree added 10 terms to `CONTEXT.md` (e.g. `CSRF Defense`, `Refresh Reuse Compromise`, `Idempotent Publish`, `Cache-Control Discipline`). | Triggered whenever Phase B introduces a new concept (e.g. `Practice Event`, `Filter Scope`, `Collection Item`). | Same. | Same. |
| **improve-codebase-architecture** | Use for a periodic architecture-hardening pass — usually mid-phase, after several tasks ship and the seams are visible. | Same. | Same. | Same. |
| **wayfinder** | Reserved for sessions that explicitly plan work larger than one agent-session can hold. Currently out of scope — Phase A is small enough to plan + execute in a single session when work concentrates. | Same. | Same. | Same. |

## Decision-flow cheatsheet

When the user asks for something, walk down this tree before responding:

1. **Is it a new feature, component, or behaviour change?**
   → `brainstorming` first.
2. **Does it touch an existing glossary term, ADR, or seed a new one?**
   → `grill-with-docs` (or just `domain-modeling` for additive terms).
3. **Will the implementation span more than one task / more than one file?**
   → `writing-plans` (save to `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`).
4. **Has a plan been written and we're about to start coding?**
   → `using-git-worktrees` (before branching)
   → either `executing-plans` (inline, real-time control) or
     `subagent-driven-development` (parallel, review-driven).
5. **Have we hit a bug or an unexpected behaviour?**
   → `systematic-debugging` BEFORE proposing a fix.
6. **Are we about to claim a task / phase / project is done?**
   → `verification-before-completion` first — run the actual
     commands, read the output, only then assert.
7. **Did a plan complete?**
   → `requesting-code-review` (two parallel sub-reviews) before merging.
8. **Did a reviewer post feedback?**
   → `receiving-code-review` before implementing.
9. **Did a merge / branch finish?**
   → `finishing-a-development-branch`.
10. **Did two independent threads of work open up?**
    → `dispatching-parallel-agents`.
11. **Is the work larger than one session can hold?**
    → `wayfinder`.

## Conventions to honour throughout

- **No auto-commits.** Per Phase A Global Constraints and the rebuild
  spec: every commit step is review-only. Skills should never call
  `git commit` without explicit user authorisation.
- **Plan authority.** Once a plan lands at
  `docs/superpowers/plans/<file>.md`, that file owns the task
  sequence until the next plan supersedes it. ADRs at
  `docs/adr/<NNNN>-<slug>.md` lock decisions; the plan references
  them but does not re-litigate them.
- **Glossary first.** When introducing a new domain term, edit
  `CONTEXT.md` in the same change. When creating a new ADR, list it
  in `PROGRESS.md` and `HANDOFF.md` in the same change.
- **Session bookkeeping.** Update `PROGRESS.md` whenever a task
  transitions state, a branch lands, a decision is made, or a
  blocker appears / clears. Bump `**Last updated:**` to today's
  date on every change.
- **Skill rationalisation warning.** When a skill feels overkill,
  the rule is to invoke it anyway — the cost is lower than the
  cost of skipping it. Rationalising "this is just a quick fix"
  is the red flag, not the excuse to skip.

## Skill inventory (loaded in this repo)

Listed alphabetically with their role in this project:

- `brainstorming` — every new feature.
- `code-review` — periodic + branch-finishing audits.
- `context7` — library / framework docs lookup.
- `dispatching-parallel-agents` — parallel research / implementation.
- `domain-modeling` — glossary + ADR discipline.
- `executing-plans` — inline implementation of a written plan.
- `finishing-a-development-branch` — branch-merge ceremony.
- `grill-me` / `grill-with-docs` — alternative-grilling forms
  (cross-check variants available).
- `improve-codebase-architecture` — periodic depth.
- `receiving-code-review` — review feedback intake.
- `requesting-code-review` — pre-merge review dispatch.
- `research` — primary-source investigation.
- `resolving-merge-conflicts` — `git rebase` / `git merge` recovery.
- `site-quality-auditor` / `webapp-testing` — web-app audits (use
  in Phase B / C).
- `subagent-driven-development` — parallel implementation of a
  written plan.
- `systematic-debugging` — bug triage.
- `task-management` — local task CLI if needed.
- `tdd` / `test-driven-development` — failing-test-first discipline.
- `using-git-worktrees` — branch isolation.
- `using-superpowers` — baseline, every session.
- `verification-before-completion` — pre-claim evidence.
- `wayfinder` — multi-session planning.
- `writing-plans` — implementation plan authoring.
- `writing-skills` — only when modifying this list itself.
