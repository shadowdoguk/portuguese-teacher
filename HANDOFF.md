# Session Handoff

**Snapshot date:** 2026-07-22 (Session 0 — greenfield rebuild kickoff)

> **This file is a point-in-time snapshot.** For the living,
> agent-picked-up tracker, see [`PROGRESS.md`](./PROGRESS.md) — it
> has the current focus, the issue queue, the decisions log, and the
> conventions reminder. Update `PROGRESS.md` as work progresses;
> update `HANDOFF.md` only when handing off at the end of a session.

**Repo:** `shadowdoguk/portuguese-teacher`

## TL;DR

The product direction has pivoted from "extend the A0–B1 Portuguese
teacher Next.js app per ADR-0005" to "deliver a curated A1+A2
European Portuguese platform on web + Android, written from scratch
against the reconciled rebuild spec." The legacy Next.js application
has been **archived** into `legacy/` on the working tree (not yet
committed). The repo root holds the new governance docs (`AGENTS.md`,
`CONTEXT.md`, `HANDOFF.md`, `PROGRESS.md`) plus the new
`docs/superpowers/{specs,plans}/` and `docs/reports/`. After the
archive lands on `main`, the repo root receives a fresh
pnpm-workspaces monorepo: `apps/{web,api,android}` +
`packages/{contracts,domain,content,tooling}`. Nothing of the legacy
is carried forward into the new project; operational patterns from
the legacy CI/Docker work may be referenced, not lifted verbatim.

Authoritative artefacts:

- Spec: `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
- Phase A plan: `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
- Tooling: pnpm 10.0.0, Node ≥ 20.0.0, Postgres 16 in Docker (5433),
  API on 8787, web on 5173
- Auth: Argon2id + opaque 32-byte hex tokens + SHA-256-hashed cookies
  (`ptp_access` 15 min, `ptp_refresh` 30 d), no JWT, no token in JSON
  body

## Git state

| Branch | Status |
| --- | --- |
| `main` | Clean. No new commits in Session 0 — every change (the four doc rewrites, the new spec/plan, the source planning archive, and the legacy archive into `legacy/`) is a working-tree change awaiting first commit by the next session. |
| `chore/archive-legacy` | Not yet cut. Task 0 starts by branching from `main`. |
| Feature branches for Tasks 2–9 | Not yet cut. |

## Open issues

The legacy issue queue on `shadowdoguk/portuguese-teacher` (issues
#1–#142 from the A0–B1 v1 effort) is not migrated. The rebuild
starts with a fresh queue. New issues are filed via
`gh issue create` and labelled per the rebuild's triage vocabulary
(proposed: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`).

## Still pending

External dependencies and sign-offs are inherited from
`docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` §16
and applied to the rebuild's release-scope gate:

- **§10 sign-off on the rebuild spec** — Product, Pedagogy,
  Engineering, Design, QA, Security leads.
- **Live MiniMax LLM credentials** for SC-5 production-WER (when
  Phase D lands).
- **Azure pt-PT speech resource** + Polly `Inês` IAM credentials for
  the listening-test gate (Phase C).
- **Real Grafana + 3-region synthetic-probe scheduling** for the
  uptime SLO (post-Phase D).
- **External legal sign-off** on `docs/reports/european-portuguese-tts-options-july-2026.md`
  and any later AI-conversation provider disclosures.
- **Coolify (or equivalent) hosting account** for the private VPS
  deploy (post-Phase D).
- **Android dev keystore + Play Console** for the Android release
  build (Phase C + post-Phase D).

## First action for next session

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git status
# The Session 0 changes — doc rewrites, the new spec/plan, the source
# planning archive, and the legacy archive into legacy/ — are all
# working-tree changes awaiting first commit. Begin by either:

# (A) Cutting chore/archive-legacy and bundling the legacy archive
#     with the new doc rewrites as one chore commit, OR
# (B) Committing the Session 0 doc rewrites on a separate docs
#     commit first, then running Task 0's archive on a follow-up
#     chore commit.

# Read PROGRESS.md, this file, CONTEXT.md, the spec, the plan.
# Then begin Task 0 (legacy archive) of the Phase A plan.
git checkout -b chore/archive-legacy
# Verify: legacy/ should contain the legacy tree; top-level files
# should match the new monorepo root.
ls legacy/
ls
# Continue from there per the Phase A plan.
```

Sessions continuing the rebuild should pick up at **Task 0** unless
`PROGRESS.md` records further state.

## Key references

| Topic | File / issue |
|---|---|
| Rebuild spec | `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A plan | `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Domain glossary | `CONTEXT.md` |
| Agent process guide | `AGENTS.md` |
| Living tracker | `PROGRESS.md` |
| Architectural decisions | `docs/adr/0001-workspace-and-atomic-publish.md`, `docs/adr/0002-shared-credentials-and-android-secure-storage.md` |
| Cross-link | `docs/superpowers/README.md` |
| Research (TTS providers) | `docs/reports/european-portuguese-tts-options-july-2026.md` |
| Source planning archive (reference only) | `/tmp/opencode/planning/` |

## Conventions to honour

- All non-trivial work happens on a feature branch named
  `feat/issue-<N>-<slug>` (or `chore/<slug>` for chore work,
  `docs/<slug>` for ADR/spec/PR-description-only changes).
- Use the glossary in `CONTEXT.md`. If you introduce a new domain
  term, add it to the glossary in the same change.
- The 5-state triage vocabulary applies to every issue.
- `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build`, `pnpm -r lint`
  must all pass before commit.
- New domain terms go into `CONTEXT.md` in the same change.
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
  (numbering starts at 0001; never re-edit legacy ADRs).
- Update `PROGRESS.md` whenever an issue transitions state, a
  branch lands, or a decision is made. Bump `**Last updated:**` to
  today's date on every `PROGRESS.md` change.
- Commit steps in the plan are review-only. No commit fires without
  explicit user authorization.
