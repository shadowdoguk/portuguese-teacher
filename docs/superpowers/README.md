# docs/superpowers/

Cross-link index for the greenfield Portuguese Teacher rebuild. Spec,
plans, and reports live here in dated subfolders so that any session can
orient by reading the youngest file in each. Reading order:

1. **Rebuild spec** (spec): the *what* — the authoritative product shape.
2. **Phase plans** (plans): the *how* — task-bearing plans per phase.
3. **Research reports** (reports): the *why* — primary-source citations
   that back the spec's non-obvious decisions.

## Authoritative artefacts (current)

| Purpose | Path |
|---|---|
| Rebuild spec (canonical) | `specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A — Foundation | `plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Phase A — ADR incorporation | `plans/2026-07-23-phase-a-adr-incorporation.md` |
| Phase B — Practice surface (design) | `specs/2026-07-23-phase-b-practice-surface-design.md` |
| Phase B — Practice surface (plan) | `plans/2026-07-23-phase-b-practice-surface.md` |
| Domain glossary | `../../CONTEXT.md` |
| Living tracker | `../../PROGRESS.md` |
| Session handoff | `../../HANDOFF.md` |

ADRs live at `../adr/` and start at `0001` (the legacy archive in
`legacy/docs/adr/` is **not** the rebuild's source of truth — see the
boundary below).

## Conventions

- Plans are named `YYYY-MM-DD-<topic>.md`. Specs are named
  `YYYY-MM-DD-<topic>-design.md` when paired with a plan.
- Every commit step in a plan is **review-only**. Sessions fire a commit
  only after explicit user authorisation.
- New domain terms land in `CONTEXT.md` in the same change.
- New architectural decisions land in `../adr/<NNNN>-<slug>.md`.

## Boundary against `legacy/`

`legacy/` is **technical reference only**. It is preserved as a read-
only archive at the repo root so operational patterns (CI workarounds,
Docker deployment, provider-integration shapes) can be consulted during
the rebuild. None of the legacy's product, pedagogical, curriculum, or
architectural decisions carry forward. ESLint
`no-restricted-imports` (root `eslint.config.mjs`, amendment Task A1)
enforces the boundary mechanically.

If a future agent is tempted to import something from `legacy/`, they
should treat it as "how we did it before, in a different product" and
lift the **pattern** — not the file.
