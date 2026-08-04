## Agent skills

### Project state — greenfield rebuild (Session 0, 2026-07-22)

This repository is in the middle of a greenfield rebuild. The legacy
Next.js application (and its accompanying `prisma/`, `scripts/`,
`Dockerfile`, root `package.json`, root `pnpm-lock.yaml`, root
`pnpm-workspace.yaml`, `tests/e2e/`, `playwright.config.ts`,
`vitest.config.ts`, `lighthouserc*`, `.lighthouseci/`, the entire
legacy `docs/` tree except `docs/superpowers/`, the legacy
`AGENTS.md`/`HANDOFF.md`/`PROGRESS.md`/`CONTEXT.md`, and the legacy
`docs/adr/*.md`) is being **archived** into `legacy/` on a single
chore branch — that archive is **Task 0** of the Phase A
implementation plan. As of Session 0, the archive is staged in the
working tree (legacy files moved into `legacy/`; new governance at
the root). It awaits the first commit on `chore/archive-legacy`.

If you are reading this on disk and `legacy/` is empty (or absent),
the greenfield archive has not yet landed. Do not modify any legacy
file in place; either start the archive yourself on
`chore/archive-legacy`, or wait for the next session to begin Task 0.

The authoritative artefacts that drive the rebuild are:

- Spec: `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
- Phase A plan: `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
- Source planning archive: `docs/superpowers/specs/2026-07-22-european-portuguese-learning-platform-design.md`
  + `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md`
  + `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-vertical-slice.md`
- Research: `docs/reports/european-portuguese-tts-options-july-2026.md`
- ADR counter restarts at `0001` after the legacy archive

### Session start

At the **start of every session**, before opening an issue or touching code:

1. Read [`PROGRESS.md`](./PROGRESS.md) — the living tracker. It has the current focus, the in-progress branch/PR, the issue queue, the decisions log, and the conventions reminder.
2. Skim [`HANDOFF.md`](./HANDOFF.md) — the point-in-time snapshot from the previous session. It tells you what landed, what's queued, what's still pending.
3. Read [`CONTEXT.md`](./CONTEXT.md) — domain glossary and conventions. Use the glossary terms; don't invent synonyms.
4. Skim [`docs/adr/`](./docs/adr/) — existing architectural decisions. Surface relevant ADRs in any plan rather than re-deciding.
5. Read the rebuild spec and the latest phase plan under `docs/superpowers/`.
6. `git checkout main && git pull` and `git status` — confirm what is on disk matches what PROGRESS.md claims. If `legacy/` is empty or absent, the greenfield archive has not landed; begin Task 0 before anything else.
7. If the legacy tree has been archived into `legacy/`, the canonical `pnpm progress:check` script may need to be re-introduced by the Phase A plan; otherwise skip it during the rebuild phase.

A new session that ignores this list will start with stale assumptions and will duplicate work or contradict the decisions log.



### Issue tracker

GitHub Issues at `shadowdoguk/portuguese-teacher`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles with default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root, `docs/adr/` for ADRs. See `docs/agents/domain.md`.
