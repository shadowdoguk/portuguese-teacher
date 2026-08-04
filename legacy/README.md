# legacy/

This directory holds the **archived** previous version of this project —
the A0–B1 Next.js + Prisma application that lived at this repo before
Session 0 of 2026-07-22. It is preserved on disk as reference material
only.

## What this archive is for

**Technical reference only.** When you hit a problem the new stack must
solve (e.g. a Docker build gotcha, a CI workaround, a Drizzle query
against a partial unique index, an Argon2id parameter choice that
matches the legacy deployment, a specific test setup), you may open
files in `legacy/` to see how it was done there. The pattern, the
parameter, the build flag — those are reusable.

## What this archive is NOT for

**Do not import design.** The product model, the curriculum model, the
six-stage unit loop, the Affective Filter proxy, the voice-loop tier
detection, the SRS scheduler, the scenario level-match logic, the
lesson-material library, the pronunciation scoring formula, the
MiniMax adapter shapes, the legacy `docs/adr/0001-*.md`–`0005-*.md`
decisions, the legacy `CONTEXT.md` glossary entries — these are
**the legacy's** choices, and they do not carry forward to the new
build.

If the rebuild spec (`docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`)
or the Phase A plan
(`docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`)
explicitly references a legacy pattern, follow the rebuild spec.
Otherwise, treat the legacy as "how we did it before, badly, in a
different product."

## Hard rules

- `apps/{web,api,android}`, `packages/{contracts,domain,content,tooling}`,
  and any new monorepo workspace **must not import** from `legacy/`.
  ESLint `no-restricted-imports` enforces this; the rule ships with
  the greenfield toolchain in Task 1 of the Phase A plan.
- New domain terms, ADRs, and architectural decisions do not get
  pulled from the legacy. The rebuild's ADR counter restarts at
  `0001`; the legacy ADRs are kept only as historical reading.
- ESLint, typecheck, lint, and tests must run green without ever
  reading a file under `legacy/`.

## Layout reminder

```
legacy/
├── src/             ← Next.js app (App Router, React 18)
├── prisma/          ← Prisma schema, migrations, SQLite DB
├── tests/e2e/       ← Playwright suite
├── scripts/         ← Node CLI scripts (perf budget, ASR regress, etc.)
├── Dockerfile       ← Production build image
├── docs/            ← Legacy docs including ADRs 0001–0005
│   ├── adr/         ← 0001-pedagogical-model.md … 0005-v1-release-scope-and-readiness.md
│   ├── a11y/, agents/, perf/, postmortems/, requirements/, research/
│   └── superpowers/
│       ├── specs/   ← Legacy `2026-07-06-*` specs
│       └── plans/   ← Legacy `2026-07-06-*` plans
├── public/          ← Legacy TTS audio assets (Azure MiniMax, mp3)
├── package.json     ← Legacy root manifest
├── pnpm-workspace.yaml ← Legacy workspace globs
└── README.md, AGENTS.md, HANDOFF.md, PROGRESS.md, CONTEXT.md  ← Legacy governance (NOT the rebuild's)
```

The rebuild's own governance docs (`AGENTS.md`, `HANDOFF.md`,
`PROGRESS.md`, `CONTEXT.md`) live at the repo root, NOT in `legacy/`.
