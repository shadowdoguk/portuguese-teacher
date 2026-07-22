# Progress Tracker

A living document. Read this at the start of every session to pick up
where the last one left off. Update it whenever an issue transitions
state, a branch lands, a decision is made, or a blocker appears or
clears.

**Last updated:** 2026-07-22 (greenfield rebuild — Session 0
kickoff + legacy archive in working tree)

## Current focus

**Greenfield rebuild to the European Portuguese learning platform.**

The new project replaces the legacy application at this repo. The
Next.js application, Prisma schema, seeded A0–B1 curriculum,
`pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml`, and all
legacy governance files are **archived** into `legacy/` on a single
chore branch — that archive is **Task 0** of the Phase A
implementation plan. The legacy code is preserved (not deleted) for
reference. After the archive, the repo root receives a fresh
pnpm-workspaces monorepo skeleton: `apps/{web,api,android}` +
`packages/{contracts,domain,content,tooling}` + root tooling files.
Nothing of the legacy system is carried forward into the new code;
only its operational patterns (CI workarounds, Docker deploy story,
provider-integration shapes) are referenced during the rebuild.

## Authoritative artefacts

| Artefact | Path |
|---|---|
| Rebuild spec | `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A plan | `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Domain glossary | `CONTEXT.md` (rewritten for the new product) |
| Session handoff | `HANDOFF.md` (point-in-time snapshot) |
| ADRs | `docs/adr/0001-…`, `0002-…` (numbering restarts at 0001) |
| Issue tracker | `shadowdoguk/portuguese-teacher` on GitHub |
| Source planning archive | `/tmp/opencode/planning/` (reference only) |

## Session 0 — Greenfield kickoff (2026-07-22)

- **Vision pivoted.** The product direction is no longer "extend the
  A0–B1 Portuguese teacher Next.js app with v1 release gates per ADR-0005."
  It is "deliver a curated A1+A2 European Portuguese platform on web +
  Android, written from scratch against an approved spec."
- **Brainstorm produced the reconciled spec** at
  `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
  (18 sections, 509 lines). Three reconciliations against the source
  planning archive: legacy tree is **archived** into `legacy/`
  rather than deleted; pnpm is the toolchain (replacing the source
  plan's npm); path references point to this repo (`portuguese-teacher`)
  rather than a sibling legacy project.
- **Source planning files brought into the repo.** The original
  planning archive at `/tmp/opencode/planning/` is now inside the
  repo at `docs/superpowers/specs/2026-07-22-european-portuguese-learning-platform-design.md`,
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md`,
  `docs/superpowers/plans/2026-07-22-european-portuguese-foundation-vertical-slice.md`,
  and `docs/reports/european-portuguese-tts-options-july-2026.md`.
- **Phase A plan written** at
  `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
  (10 tasks incl. Task 0 legacy archive, 4200+ lines). Tasks are
  greenfield-from-scratch — every step is concrete code, file path,
  or shell command. No `pnpm-workspace.yaml`-extension step; the
  workspace file is created fresh at Task 1.
- **Tooling constraints locked.** pnpm 10.0.0, Node ≥ 20.0.0,
  Postgres 16 in Docker on port 5433, API on port 8787, web on 5173.
  ESLint flat config keeps the new monorepo clean. Argon2id +
  opaque-token + HttpOnly cookie auth is the only authentication
  surface in Phase A.
- **Legacy application archived into `legacy/` (working tree).** The
  full Next.js app, Prisma schema, scripts, Dockerfile, configs,
  legacy governance docs, and legacy `docs/{a11y,adr,agents,perf,
  postmortems,requirements,research}/` plus legacy `2026-07-06-*`
  specs/plans are now under `legacy/` on the working tree. Build
  artifacts (`.next/`, `node_modules/`, `tmp/`, `playwright-report/`,
  `.worktrees/`) remain at the top level but are now gitignored. No
  legacy governance file remains at the root — `AGENTS.md`,
  `CONTEXT.md`, `HANDOFF.md`, `PROGRESS.md` at the root are the
  Session-0 rewrites. The legacy versions of those four files are
  inside `legacy/`.
- **No commits yet.** Every commit step in the plan is review-only and
  fires only after explicit user authorization.

## Decisions log

- **2026-07-22 — Greenfield rebuild replaces the A0–B1 v1 effort.**
  The legacy Next.js app, ADRs 0001–0005, v1 release-scope governance,
  and accumulated `PROGRESS.md` history are not carried into the new
  project. The legacy is preserved verbatim under `legacy/` for
  **technical reference only** — never for design, pedagogy,
  curriculum shape, the six-stage loop, the Affective Filter proxy,
  the SRS scheduler, the voice-loop tier detection, or any product-
  or pedagogy-shaped decision. `legacy/README.md` codifies this
  boundary for future agents browsing the archive. The existing
  `shadowdoguk/portuguese-teacher` GitHub repository is reused as the
  host (per user direction), but every file path and toolchain entry
  is reset. The reference spec lives at
  `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`.
- **2026-07-22 — pnpm 10.0.0 + Node ≥ 20.0.0 + Postgres 16 in Docker
  is the greenfield toolchain.** Locked at the bottom of Task 1.
- **2026-07-22 — Tools/ADRs use the rebuild numbering scheme.**
  ADR `0001` covers workspace + atomic publish; ADR `0002` covers
  shared credentials + Android secure storage.

## Issues status

Issue tracker: `shadowdoguk/portuguese-teacher` on GitHub.

> The legacy tracker state (issues #1–#142 from the A0–B1 v1 effort)
> is not migrated. The rebuild effort starts with a fresh issue
> queue. Open or triage-vocabulary decisions live in
> `AGENTS.md` and the rebuild spec.

## First action for next session

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git status
git log --oneline -10
# Read PROGRESS.md (this file), HANDOFF.md, CONTEXT.md,
# docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md,
# docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md.
# Then begin Task 0 on a fresh branch: chore/remove-legacy.
```

Sessions continuing the rebuild should pick up at **Task 0** of the
Phase A plan unless `PROGRESS.md` records further progress.
