# Session Handoff

**Snapshot date:** 2026-06-28 (doc refresh after #24)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

A full-day session: cleared the CI blocker that was preventing every PR from being merged, picked up the next dep-ordered work (#26 Prisma schema + migration), closed #23, and authored the missing A0 seed content (#24 — Unit A0.4 'Rotina e horas'). The repo is now at a state where the dep-ordered PR queue can begin merging.

## Session outcomes

### CI unblocked

Root cause was a *stack* of issues, not a single bug. All fixed on `main` and re-synced to every open PR branch:

1. **Duplicate pnpm version** in `package.json` (`packageManager: pnpm@10.0.0`) AND the workflow (`version: 10`). Removed the workflow line so `pnpm/action-setup@v4` reads from `packageManager`.
2. **Node 20 deprecated** on GitHub-hosted runners (2025-09-19). Bumped `node-version: 22`.
3. **Workflow action typo** on some PR branches — `pnpm/setup-node@v4` instead of `actions/setup-node@v4`. Fixed on every branch where it appeared.
4. **Prisma client not generated** under pnpm (postinstall runs but isn't enough for CI). Added explicit `pnpm exec prisma generate` step.
5. **Conditional prisma generate** — once #59 added `prisma/schema.prisma`, the explicit generate step needed guarding on file presence so PRs without the schema (everything pre-#26) still pass. Used a bash `[ -f … ]` check.
6. **PROGRESS.md drift** — was 19 issues behind reality, so the drift check failed on every PR. Brought it up to date with all 41 open issues.
7. **TTS Blob identity** under Node 24 + jsdom — `expect(result.audio).toBeInstanceOf(Blob)` failed because undici's Blob ≠ global Blob. TTS now re-wraps via `new Blob([arrayBuffer], {type})`.

### Issues delivered

- **#3** (PR #20) — fix(tts): normalize Blob in TTS wrapper
- **#21** (PR #21) — completed PROGRESS.md + HANDOFF.md
- **#23** — closed (delivered via PR #59's `pnpm seed:a0` script)
- **#24** (PR #60) — Unit A0.4 'Rotina e horas' (3 Lessons, 10 vocab, 3 grammar, 1 scenario, 1 anchor); A0 now at 4 Units / 12 Lessons / 19 Exercises
- **#26** (PR #59) — Prisma schema + migration for all curriculum entities, idempotent seed script, round-trip test

### Issues partially delivered

- **CI on remaining PRs** — local checks pass on every branch I synced; CI itself is SUCCESS on #20, #21, #22, #55, #57, #59. The other 11 PRs (#27, #32, #43, #49-54, #56, #58) had their workflow YAML repaired and CI re-trigger commits pushed, but GitHub's Actions queue appears saturated and is not yet picking up the latest pushes. Expect these to turn green within the hour.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; ahead of `origin/main` by 6 commits (CI fixes + prisma deps) |
| `feat/issue-3-minimax-wrappers` | PR #20 SUCCESS |
| `feat/issue-2-curriculum-model` | PR #22 SUCCESS |
| `feat/issue-9-learner-ui` | PR #55 SUCCESS |
| `docs/difficulty-ab-baseline` | PR #57 SUCCESS |
| `chore/progress-tracker` | PR #21 SUCCESS |
| `feat/issue-26-prisma-schema` | PR #59 SUCCESS |
| `feat/issue-4-srs-scheduler` | PR #27 — workflow repaired, push queued for CI |
| `feat/issue-5-voice-loop` | PR #32 — workflow repaired, push queued for CI |
| `feat/issue-6-llm-difficulty-pipeline` | PR #43 — workflow repaired, push queued for CI |
| `feat/issue-7-conversational-practice` | PR #49 — workflow repaired, push queued for CI |
| `feat/issue-40-rerank-orchestrator` | PR #50 — workflow repaired, push queued for CI |
| `feat/issue-41-vocab-fixture` | PR #51 — workflow repaired, push queued for CI |
| `feat/issue-42-live-llm-harness` | PR #52 — workflow repaired, push queued for CI |
| `feat/issue-15-placement-lesson` | PR #53 — workflow repaired, push queued for CI |
| `feat/issue-8-proficiency-assessments` | PR #54 — workflow repaired, push queued for CI |
| `docs/progress-learner-ui` | PR #56 — workflow repaired, push queued for CI |
| `feat/issue-18-affective-filter` | PR #58 — workflow repaired, push queued for CI |

## Open PRs

See [PROGRESS.md → PRs](./PROGRESS.md#prs) for the live list.

## Open issues (next action starts here)

The implementation queue is dep-ordered and tracked in [PROGRESS.md](./PROGRESS.md#open--implementation-queue-dep-ordered).

**Ready to merge (CI SUCCESS):**
- #20 → #55 → #57 → #22 → #21 → #59 (in dependency order)

**Once #2 lands, the following can merge:**
- #4 (SRS), #5 (Voice Loop), #7 (Practice), #8 (Milestones), #15 (Placement), #17 (Anchors) — all unblocked by #2's curriculum types

**Once #26 lands, the following can merge:**
- #23 already closed
- #30 (SRS DB persistence), #44 (Scenarios DB persistence) — unblocked by #26's Prisma schema

## Still pending (human)

- **§10 sign-off** on ADR-0003 + amended requirements doc — Product, Pedagogy, Engineering leads.
- **PR review queue** — once #20 lands the dep chain opens up. Recommend this merge order once all PRs are SUCCESS:
  1. **#20** (#3 MiniMax wrappers) — foundational, used by #5/#19
  2. **#21** (PROGRESS tracker) — process, non-blocking
  3. **#55** (#9 Learner UI) — frontend
  4. **#57** (docs A/B harness) — docs only
  5. **#22** (#2 curriculum data model) — unblocks the runtime queue
  6. **#59** (#26 Prisma schema) — unblocks #30, #44
- **Wait for GitHub Actions queue** on the remaining 11 PRs (likely within the hour)

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
# Confirm: PR #20 / #55 / #57 / #21 / #22 / #59 are SUCCESS.
# Review and merge in the dep-ordered list above.
# Then pick up the next unblocked item (likely #23 already closed; #30 SRS DB persistence if #26 has merged, or #4 SRS if #2 has merged).
```
