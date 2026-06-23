# Português

> An AI-driven Portuguese language teacher that takes learners from absolute beginner (A0) to conversational fluency (B1).

Built with **Next.js 14**, **TypeScript**, and **Tailwind**. Powered by the **MiniMax AI suite**.

## Quickstart

```bash
pnpm install
pnpm dev
```

The home page renders at <http://localhost:3000>.

## Routes

Per the requirements doc ([docs/requirements/portuguese-teacher-requirements.md](./docs/requirements/portuguese-teacher-requirements.md) §3.4):

| Route | Surface |
| --- | --- |
| `/` | Marketing landing |
| `/sign-up`, `/log-in` | Auth |
| `/dashboard` | Today's plan, streak, queue |
| `/lesson/[lessonId]` | Lesson player placeholder |
| `/practice` | Conversational practice entry point |
| `/review` | SRS review queue |
| `/progress` | Per-skill mastery and milestones |
| `/profile` | Learner profile and dialect |
| `/settings` | Voice, feedback, accessibility, data |

## Scripts

```bash
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest run
pnpm format       # Prettier write
```

## Architecture

See [docs/adr/0001-pedagogical-model.md](./docs/adr/0001-pedagogical-model.md) for the pedagogical model (SRS + comprehensible input + TBLT + AI tutor) and [docs/adr/0002-voice-loop-architecture.md](./docs/adr/0002-voice-loop-architecture.md) for the tier-aware voice loop.

## Status

**v1 scope** (per [ADR-0003](docs/adr/0003-v1-scope-amendment.md), 2026-06-23):

- **pt-PT only** (Brazilian Portuguese deferred to v1.1).
- **Five-stage CEFR ladder** A0 → A1 → A2 → B1 with **three Milestones**.
- Curriculum is a DAG; remediation is via **Remedial Anchors**, not back-edges.
- Above-A0 self-assessments route through a **Placement Lesson** at sign-up.
- Production ASR-WER sampling uses a separate **SC-5 Sampling Buffer** (≤ 24 h,
  not part of opt-in recordings).
- **OAuth sign-in deferred** to v1.1; v1 is email + password only.

**Bootstrap** (issue #1) is complete — `pnpm dev`, `pnpm build`, `pnpm test`,
`pnpm typecheck`, and `pnpm lint` all pass; all FR-WEB-4 routes exist.

**Implementation backlog**: issues #2–#14, queued in dependency order
([#3 MiniMax wrappers](https://github.com/shadowdoguk/portuguese-teacher/issues/3)
→ #2 curriculum model → #4 HLR scheduler → #5 voice loop → #6 LLM re-rank →
#7 scenario library → #8 milestone gating → #9 UI surfaces → #13 ASR
regression → #10/#11/#12/#14 non-functional). Some are stale after
ADR-0003 (see issue bodies: #2 dialect enum, #8 milestone count, #9
dialect picker, #13 corpus).

**Missing issues** (added by ADR-0003, not yet filed): Placement Lesson at
sign-up, SC-5 Sampling Buffer infra, Remedial Anchor routing, Affective
Filter proxy instrumentation, Pronunciation Score phoneme-distance endpoint.

## Conventions

The repo follows the workspace conventions in [AGENTS.md](./AGENTS.md):

- Domain language lives in [CONTEXT.md](./CONTEXT.md).
- Architectural decisions live under [docs/adr/](./docs/adr/).
- Issues are tracked on GitHub Issues and labelled with the five-role triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).