# Session Handoff

**Snapshot date:** 2026-07-30 (Session 8 — Task 4 committed on
`feat/tooling-adapters`: `@pt/tooling` workspace published with
adapter interfaces (audio synthesis, conversation, recorder) plus
in-memory stubs only; `selectAdapters()` factory for boot-time
env-driven selection Phase C/D will swap in. Phase A Tasks 5–9 and
amendment Tasks A2–A7 unblocked on top of `feat/domain-rules` HEAD
`d3ccbc6`.)

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
`docs/superpowers/{specs,plans}/`, `docs/reports/`, and (Session 1
addition) `docs/adr/{0001,0002}-*.md`. After the archive lands on
`main`, the repo root receives a fresh pnpm-workspaces monorepo:
`apps/{web,api,android}` +
`packages/{contracts,domain,content,tooling}`. Nothing of the legacy
is carried forward into the new project; operational patterns from
the legacy CI/Docker work may be referenced, not lifted verbatim.

Session 1 also resolved every Phase A design-tree ambiguity that
wasn't already pinned by the rebuild spec: the canonicalization rule
for `sourceChecksum`, the contributor-controlled `version` semantic,
the READ COMMITTED `SELECT … FOR UPDATE` atomic-publish
transaction, the new `cv_sentence_versions` table that lets
`practice_ratings` keep a globally-stable PK, server-side Origin
allow-listing for CSRF defense, refresh-reuse-as-compromise,
session-only logout, `First Publish` / `Idempotent Publish`
behaviour, `Pre-Phase C Audio` nullable handling, the error-envelope
shape, the rate-limit discipline, the cache-control discipline,
`Smart Review` ordering (with `NULLS FIRST`), `Filter` scope,
`Settings` sync boundaries, `Collection` rating-global rule, and the
Android bearer-transport shape selected by `X-Client-Platform`.

Authoritative artefacts:

- Spec: `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md`
- Phase A plan: `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`
- **Phase A ADR incorporation plan**: `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md` (7 tasks A1–A7; supersedes Phase A Tasks 5/6/7 step sequences)
- **Phase B design spec**: `docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md` (Approach B: practice surface + six-stage skeleton, 14 sections)
- **Phase B implementation plan**: `docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md` (10 tasks: contracts, domain, practice API, settings, collections API, collections pages, practice pages, six-stage nav + unit-progress, smoke, verification)
- ADRs: `docs/adr/0001-workspace-and-atomic-publish.md`,
  `docs/adr/0002-shared-credentials-and-android-secure-storage.md`
- Source-archive cross-check reports: `tmp/source-archive-a-crosscheck.md` (1110 lines, source archive A → Phase A/ADRs/contra drift), `tmp/source-archive-b-crosscheck.md` (268 lines, vertical-slice source B → spec §13.3 / Phase A / glossary drift)
- Tooling: pnpm 10.0.0, Node ≥ 20.0.0, Postgres 16 in Docker (5433),
  API on 8787, web on 5173
- Auth: Argon2id + opaque 32-byte hex tokens + SHA-256-hashed cookies
  (`ptp_access` 15 min, `ptp_refresh` 30 d), no JWT, no token in
  JSON body, server-side Origin allow-listing on every
  state-changing `/api/auth/*` route
- Curriculum versioning: `cv_sentence_versions(cv_id, sentence_id, text_pt, text_en, audio_id NULL, …)` projection table; `practice_ratings(user_id, sentence_id, mode)` PK stays globally stable

## Git state

| Branch | Status |
| --- | --- |
| `main` | Working tree still carries every Session 0–3 doc/Session 1–2 ADR/Session 2 plan/Session 3 plan as uncommitted working-tree changes. No `git add` / `git commit` was authorised. |
| `chore/archive-legacy` | Not yet cut. Task 0 starts by branching from `main`. |
| Feature branches for Tasks 2–9 / A1–A7 / Phase B Tasks 1–9 | Not yet cut. |

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

Tasks 0, 1, 2, 3, and 4 are **done** as of Session 8 on 2026-07-30.
The legacy tree is archived at `chore/archive-legacy` HEAD `8d5088b`;
root tooling on `feat/monorepo-root-tooling` HEAD `c31c6cc`;
`@pt/contracts` on `feat/contracts-zod-schemas` HEAD `d6aed71`;
`@pt/domain` on `feat/domain-rules` HEAD `d3ccbc6`;
`@pt/tooling` is published on `feat/tooling-adapters` with adapter
interfaces (audio synthesis, conversation, recorder) plus in-memory
stubs only; `selectAdapters()` factory for boot-time env-driven
selection Phase C/D will swap in. Phase A Tasks 5–9 and amendment
Tasks A2–A7 are now unblocked.

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git checkout feat/tooling-adapters
git pull --ff-only
git status
# Read PROGRESS.md, this file, CONTEXT.md, the spec, the Phase A
# plan, and the Phase A ADR incorporation plan.

# Task 5 (Drizzle schema) is the natural next step:
# apps/api/src/db — Drizzle 0.45.2 schema with all Phase A tables
# (curriculum_versions, units, sentences, islands, scenarios,
# practice_ratings, auth_users, auth_sessions, audio_assets,
# cv_sentence_versions, content_status enum). Bundles amendment
# Task A2: cv_sentence_versions projection + content_status enum.
# Cut a feature branch off feat/tooling-adapters.
git checkout -b feat/api-schema

# Per the Phase A plan's Global Constraints, every commit step is
# review-only — no commit fires without explicit user authorisation.
```

Sessions continuing the rebuild should pick up at **Task 5** of the
Phase A plan unless `PROGRESS.md` records further state.

## Key references

| Topic | File / issue |
|---|---|
| Rebuild spec | `docs/superpowers/specs/2026-07-22-portuguese-teacher-rebuild.md` |
| Phase A plan | `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md` |
| Phase A ADR incorporation plan | `docs/superpowers/plans/2026-07-23-phase-a-adr-incorporation.md` (Tasks A1–A7) |
| Phase B design spec | `docs/superpowers/specs/2026-07-23-phase-b-practice-surface-design.md` |
| Phase B implementation plan | `docs/superpowers/plans/2026-07-23-phase-b-practice-surface.md` (Tasks 1–10) |
| Domain glossary | `CONTEXT.md` |
| Agent process guide | `AGENTS.md` |
| Living tracker | `PROGRESS.md` |
| Architectural decisions | `docs/adr/0001-workspace-and-atomic-publish.md` (Q1–Q5), `docs/adr/0002-shared-credentials-and-android-secure-storage.md` (Q6–Q10) |
| Source-archive cross-check evidence | `tmp/source-archive-a-crosscheck.md`, `tmp/source-archive-b-crosscheck.md` |
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
