# Session Handoff

**Snapshot date:** 2026-06-23
**Repo:** `shadowdoguk/portuguese-teacher`
**Branch at handoff:** `main` (clean) · `feat/issue-3-minimax-wrappers` (2 commits ahead, PR open)

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

The v1 spec is coherent. ADR-0003 narrowed scope to **pt-PT only**, **five-stage CEFR ladder** (A0 → A1 → A2 → B1), and **three Milestones** at the level boundaries. The implementation backlog is triaged: 1 closed, 6 amended for ADR-0003, 7 kept as-is, 5 new issues filed. **#3 (MiniMax AI client wrappers)** is implemented on a feature branch and waiting on PR review. **#2 (Curriculum data model + A0 seed)** is the next dep-ordered item.

## Git state

| Branch | Status | Latest commit |
| --- | --- | --- |
| `main` | clean, 1 commit ahead of `origin/main` | `399a766 docs+code: v1 scope amendment (ADR-0003)` |
| `feat/issue-3-minimax-wrappers` | clean, 2 commits, **PR #20 open** | `0a96d60 feat(ai): add latency metric + contract smoke test for MiniMax wrappers` |

`main` is published; `feat/issue-3-minimax-wrappers` is published and has a PR open against `main`.

## Open PRs

- **#20** — *MiniMax AI client wrappers (LLM/ASR/TTS) — closes #3*. Two commits, 5 files changed, 22/22 tests pass, build green. Awaiting human review.

## Open issues (next action starts here)

**#2** — *Curriculum data model + seed A0 content (pt-PT only)* — **ready-for-agent**, assigned to nobody. This is the recommended starting point for a new session.

Minimum-viable slice (recommended for one session):

- TypeScript types: `Level`, `Unit`, `Lesson`, `LessonBody`, `PracticeExercise`, `VocabularyItem`, `GrammarPattern`, `Scenario`, `RemedialAnchor`, `Milestone`, `PlacementLessonAttempt`
- In-memory curriculum graph (no DB, no Prisma) with the 5-stage ladder and 3 Milestones
- `resolveAnchors(unitId)` runtime — anchors resolve at runtime; canonical DAG stays acyclic
- A handful of A0 fixture Units to exercise the schema
- Tests: graph reachability, Remedial Anchor acyclicity
- Branch: `feat/issue-2-curriculum-model`
- This unblocks #4, #5, #7, #8, #15, #17

Full scope (multi-day; file as a follow-up): Prisma migration, real A0 seed content authored (4+ Units, 3+ Lessons/Unit, scenarios), TTS asset pipeline at build time, `pnpm seed:a0` script.

**Dependency-ordered queue** (once #2 lands):
`#2` → `#4` (HLR scheduler) → `#5` (Voice Loop) → `#6` (LLM re-rank) → `#7` (scenario library) → `#8` (Milestone gating) → `#9` (UI surfaces) → `#13` (ASR regression) → `#10`/`#11`/`#12`/`#14` (NFR tests)

The 5 new issues from ADR-0003 (`#15`–`#19`) have their own dep graph and can be picked up alongside or after the main queue.

## Still pending (human)

- **§10 sign-off** on ADR-0003 + amended requirements doc — Product, Pedagogy, Engineering leads. Work can proceed in parallel since the spec is captured in code.
- **PR #20 review and merge** — blocks the new session's `main` from including the MiniMax wrappers until merged. Independent of #2 work.

## Key references

| Topic | File / issue |
| --- | --- |
| Domain glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Spec source of truth | [`docs/requirements/portuguese-teacher-requirements.md`](./docs/requirements/portuguese-teacher-requirements.md) |
| Scope amendment (pt-PT, 5 stages, anchors, placement, SC-5) | [`docs/adr/0003-v1-scope-amendment.md`](./docs/adr/0003-v1-scope-amendment.md) |
| Voice Loop architecture (NLU+NLG structured output, Pronunciation Score) | [`docs/adr/0002-voice-loop-architecture.md`](./docs/adr/0002-voice-loop-architecture.md) |
| Pedagogical model (SRS, i+1, TBLT, ICF) | [`docs/adr/0001-pedagogical-model.md`](./docs/adr/0001-pedagogical-model.md) |
| AI client wrappers (current PR) | `src/lib/minimax/`, `src/test/minimax/` |
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
gh issue view 2                    # re-read the body (it was amended for ADR-0003)
git checkout -b feat/issue-2-curriculum-model
# implement the minimum-viable slice; commit; push; open PR
```
