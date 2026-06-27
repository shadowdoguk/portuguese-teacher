# Session Handoff

**Snapshot date:** 2026-06-27
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

A session-blocker on CI (duplicate pnpm `version` + deprecated Node 20) has been fixed. All 14 open PRs have been re-synced to `main` and CI is re-running. #3 / #9 / #57 PRs are already SUCCESS; #22 / #21 are next to clear. A new branch `feat/issue-26-prisma-schema` (#26, Prisma schema + migration) is ready for review.

## Today's progress

- **Fixed CI** (`c674b1e`, `0a62c6c` on `main`)
  - Removed duplicate pnpm version in workflow
  - Bumped Node 20 → 22 (Node 20 deprecated on github runners 2025-09-19)
  - Re-synced all 14 PR branches to pick up both fixes
- **Fixed PR #20** (`a600247`) — TTS Blob identity mismatch under Node 24 + jsdom. TTS now re-wraps the response body so callers always get the global `Blob`. Local: lint/typecheck/test (22/22)/build all pass.
- **#26 Prisma schema** (`feat/issue-26-prisma-schema`, PR #59)
  - Schema for all 12 curriculum entities; dialect defaults to pt-PT
  - Initial migration applied cleanly to a fresh SQLite
  - Idempotent seed script that maps A0_CURRICULUM → DB rows
  - Round-trip test (3/3) re-asserts counts, dialect, entry unit, and curriculum indexing
  - Local: lint/typecheck/test (30/30)/build all pass
- **Updated PROGRESS.md** — all 41 open issues now listed; drift check passes
- **PR #55, #57, #20** are SUCCESS on CI

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; ahead of `origin/main` by 2 commits (CI fixes) |
| `feat/issue-3-minimax-wrappers` | 3 commits; PR #20 SUCCESS (post-TTS fix) |
| `feat/issue-2-curriculum-model` | 2 commits; PR #22 CI re-running |
| `feat/issue-4-srs-scheduler` | PR #27 CI re-running |
| `feat/issue-5-voice-loop` | PR #32 CI re-running |
| `feat/issue-6-llm-difficulty-pipeline` | PR #43 CI re-running |
| `feat/issue-7-conversational-practice` | PR #49 CI re-running |
| `feat/issue-40-rerank-orchestrator` | PR #50 CI re-running |
| `feat/issue-41-vocab-fixture` | PR #51 CI re-running |
| `feat/issue-42-live-llm-harness` | PR #52 CI re-running |
| `feat/issue-15-placement-lesson` | PR #53 CI re-running |
| `feat/issue-8-proficiency-assessments` | PR #54 CI re-running |
| `feat/issue-9-learner-ui` | PR #55 SUCCESS |
| `docs/progress-learner-ui` | PR #56 CI re-running |
| `docs/difficulty-ab-baseline` | PR #57 SUCCESS |
| `chore/progress-tracker` | PR #21 CI re-running (PROGRESS now complete) |
| `feat/issue-26-prisma-schema` | new branch, PR #59 CI queued |

## Open PRs

See [PROGRESS.md → PRs](./PROGRESS.md#prs) for the live list.

Highlights:
- **#20** SUCCESS — MiniMax wrappers, awaiting human review
- **#55** SUCCESS — Learner UI
- **#57** SUCCESS — A/B harness report
- **#22, #27, #32, #43, #49-54, #56, #58** — CI re-running after CI fixes
- **#59** — new; #26 Prisma schema

## Open issues (next action starts here)

The implementation queue is dep-ordered and tracked in [PROGRESS.md](./PROGRESS.md#open--implementation-queue-dep-ordered). Most concrete blocker today: **#2 must merge first** before #26 / #23 / #30 / #44 can land.

## Still pending (human)

- **§10 sign-off** on ADR-0003 + amended requirements doc — Product, Pedagogy, Engineering leads. Work can proceed in parallel since the spec is captured in code.
- **PR review queue** — #20 / #55 / #57 are SUCCESS and ready to merge once reviewed. Reviewers should land in this order so dependent PRs can rebase:
  1. **#20** (#3 MiniMax wrappers) — most foundational
  2. **#55** (#9 Learner UI)
  3. **#57** (docs A/B harness)
  4. **#22** (#2 curriculum data model) — unblocks #4, #5, #7, #8, #15, #17, #26
  5. **#59** (#26 Prisma schema) — unblocks #23, #30, #44

## Key references

| Topic | File / issue |
| --- | --- |
| Domain glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Spec source of truth | [`docs/requirements/portuguese-teacher-requirements.md`](./docs/requirements/portuguese-teacher-requirements.md) |
| Scope amendment (pt-PT, 5 stages, anchors, placement, SC-5) | [`docs/adr/0003-v1-scope-amendment.md`](./docs/adr/0003-v1-scope-amendment.md) |
| Voice Loop architecture (NLU+NLG structured output, Pronunciation Score) | [`docs/adr/0002-voice-loop-architecture.md`](./docs/adr/0002-voice-loop-architecture.md) |
| Pedagogical model (SRS, i+1, TBLT, ICF) | [`docs/adr/0001-pedagogical-model.md`](./docs/adr/0001-pedagogical-model.md) |
| AI client wrappers | `src/lib/minimax/`, `src/test/minimax/` |
| Curriculum model | `src/lib/curriculum/`, `prisma/schema.prisma`, `prisma/seed.ts` |
| Project status snapshot | [`README.md` § Status](./README.md#status) |
| Workflow conventions | [`AGENTS.md`](./AGENTS.md) |
| Research synthesis | [`docs/research/language-acquisition-findings.md`](./docs/research/language-acquisition-findings.md) |

## Conventions to honour

- All non-trivial work happens on a feature branch named `feat/issue-<N>-<slug>`
- Use the glossary in `CONTEXT.md` — do not invent synonyms
- The 5-state triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) + 2 categories (`bug`, `enhancement`) apply to every issue
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must all pass before commit
- One logical unit per commit; commit messages match the repo style (`feat(scope): ...`, `docs+code: ...`, `chore: ...`)
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change

## First action for a new session

```bash
git checkout main && git pull
# CI should now be green on PR #20, #55, #57 (SUCCESS).
# Review PR #20 first (MiniMax wrappers are foundational).
# Then #22 (curriculum data model) — once it merges, rebase #59 onto main.
```
