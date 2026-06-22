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

Issue [\#1](https://github.com/shadowdoguk/portuguese-teacher/issues/1) — bootstrap app shell. Issues [\#2–#14](https://github.com/shadowdoguk/portuguese-teacher/issues) queue the implementation phases.

## Conventions

The repo follows the workspace conventions in [AGENTS.md](./AGENTS.md):

- Domain language lives in [CONTEXT.md](./CONTEXT.md).
- Architectural decisions live under [docs/adr/](./docs/adr/).
- Issues are tracked on GitHub Issues and labelled with the five-role triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).