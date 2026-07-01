# Session Handoff

**Snapshot date:** 2026-06-30 (Sessions 7 + 8 + 9 closed — PRs #93, #94, #95, #96, #98 all merged into main. **Phase 3 content queue partially closed** (scenario library + A1/A2/B1 seed scaffolding). Main: 874/874 tests + all required CI alarms green.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Three sessions (7 + 8 + 9) landed five PRs on the same working day, closing the entire Phase 4 Voice Loop real-world wiring block + the #47 scenario expansion:

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers. **Merged.**
- **PR #94 / #16** — SC-5 Sampling Buffer infra. **Merged.**
- **PR #95 / #35** — SC-5 sampling-buffer 1 % audio capture hook + opt-out toggle. **Merged.**
- **PR #96** — HANDOFF snapshot (Sessions 7+8). **Merged.**
- **PR #98 / #47** — Scenario library expansion to 100 + ≥ 6 per category. **Merged.**

- **47 PRs total** on `main` (Sessions 1–6: 42 PRs + Sessions 7+8: 4 PRs + Session 9: 1 PR).
- **874/874 tests green on main** + **9/9 axe-core tests** + five required CI alarms on every PR: `pnpm perf:budget`, `pnpm asr:regress`, `pnpm sc5:load-test`, the dedicated `e2e` job (chromium + webkit full projects + firefox-smoke), and the `Test` step (874/874 unit tests).
- **Scenario library now ships 100 pt-PT scenarios** across 10 ScenarioCategories (≥ 6 each), with Lisbon/Porto cultural focus in cultural-norms, A/B harness re-run pin for every CEFR boundary, and A1/A2/B1 curriculum seed scaffolding (2 Units per Level).

## Session 9 pick shipped (1 PR, merged)

- **PR #98 / #47** — Scenario library expansion. 70 new pt-PT scenarios added to `src/lib/scenarios/library.ts`; final distribution: bank-post-office=8, cafe-restaurant=12, cultural-norms=16 (Lisbon/Porto focus), directions=10, doctor=9, greetings-introductions=6, job-interview=9, shopping-bargaining=9, social-plans=10, travelling=11 = **100 total**. Level coverage: A0=4, A1=30, A2=33, B1=33. Zero pt-BR tokens (verified by the existing scenario-library invariant). Sub-level coverage (A2.1/A2.2, B1.1/B1.2) via vocabularyRefs into the existing sub-level vocab tables. A/B harness re-run pins the in-band rate for every CEFR boundary (A0→A1, A1→A2, A2→B1). A1/A2/B1 curriculum seed files (`seed-a1.ts`, `seed-a2.ts`, `seed-b1.ts`) with 2 Units per Level; `prisma/seed.ts` updated to merge all four curricula. Per-route perf budget bumped (130 kB → 140 kB for the app group) to absorb the +16 kB bundle growth from the in-memory SCENARIO_LIBRARY now being 3× the size.

## Sessions 7+8 picks shipped (4 PRs, all merged)

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers.
- **PR #94 / #16** — SC-5 Sampling Buffer infra.
- **PR #95 / #35** — SC-5 audio capture hook + opt-out toggle.
- **PR #96** — HANDOFF snapshot.

## Sessions 7+8+9 housekeeping

- **PROGRESS.md drift fixed thrice** — at Sessions 7, 8, and 9.
- **Webpack + node modules dance** — `path` and `fs/promises` are required at runtime via `(0, eval)("require")` inside `src/lib/sc5/server-recorder.ts`. Static imports trip Next.js' webpack module resolution.
- **jsdom Blob.arrayBuffer polyfill** — `readBlobBytes` in `src/lib/asr/transcribe.ts` falls back to `FileReader.readAsArrayBuffer` for the test env.
- **CI fixes** (Sessions 8):
  - Removed leftover rebase conflict markers from `ci.yml`.
  - Lazy-instantiated `PrismaClient` in `/api/sc5/health`.
  - Marked `/api/sc5/health` as `dynamic = "force-dynamic"`.
  - Added `pnpm exec prisma generate` + `DATABASE_URL=file:./prisma/dev.db` to the E2E job's build + test steps.
- **Per-route budget bump** (Session 9) — `app: 130_000 → 140_000` in `scripts/perf-budget.ts`; `/practice` baseline updated in `.lighthouseci/bundle-baseline.json` from 119,432 → 133,100 bytes. The 5 kB headroom catches future regressions without flapping on every additional scenario.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 874/874 tests + 9/9 axe + perf:budget + asr:regress + sc5:load-test + build all green |
| All Session 7+8+9 branches | merged + deleted |

## Open PRs

_None — all Session 7+8+9 work merged._

## Open issues (3 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 5 — NFRs**
- **#14** Cross-device compatibility smoke tests (foundation laid by #34). Visual regression + device matrix on top of the Playwright E2E foundation.

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product, Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75 % in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra; the data seam shipped in #78, the dashboards ship in ops).
- **Authenticated LHCI runs** for `/dashboard`, `/review`, etc. (needs a learner fixture + cookie). Captured in `docs/perf-budget.md`'s 'Lighthouse CI' section.
- **External legal sign-off** on the SC-5 Sampling Buffer GDPR review (`docs/agents/sc5-gdpr-review.md`).
- **Server-side authoritative SC-5 opt-out** (v1.1 follow-up) — the v1 implementation trusts the client-supplied form field.

## First action for next session

```bash
git checkout main && git pull
# Confirm main is at 874/874 tests + all required CI alarms green.
# Phase 4 + most of Phase 3 are closed. Pick for next session:
#   - #14 cross-device smoke (foundation laid by #34).
# Recommended: #14 — closes the Phase 5 NFRs block. The remaining
# Phase 3 work (additional A1/A2/B1 Units, scenario-to-Unit wiring
# in the DB seed) is a v1.1 follow-up that doesn't block #14.
```

## Key references

| Topic | File / issue |
| --- | --- |
| Domain glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Spec source of truth | [`docs/requirements/portuguese-teacher-requirements.md`](./docs/requirements/portuguese-teacher-requirements.md) |
| Scope amendment (pt-PT, 5 stages, anchors, placement, SC-5) | [`docs/adr/0003-v1-scope-amendment.md`](./docs/adr/0003-v1-scope-amendment.md) |
| Voice Loop architecture (NLU+NLG structured output, Pronunciation Score) | [`docs/adr/0002-voice-loop-architecture.md`](./docs/adr/0002-voice-loop-architecture.md) |
| Pedagogical model (SRS, i+1, TBLT, ICF) | [`docs/adr/0001-pedagogical-model.md`](./docs/adr/0001-pedagogical-model.md) |
| LLM difficulty-control pipeline | [`docs/adr/0004-difficulty-control-pipeline.md`](./docs/adr/0004-difficulty-control-pipeline.md) |
| Scenario library (Session 9) | `src/lib/scenarios/library.ts` (100 scenarios, ≥ 6 per category) |
| A1/A2/B1 curriculum seed (Session 9) | `src/lib/curriculum/seed-a1.ts`, `seed-a2.ts`, `seed-b1.ts` |
| Scenario property tests | `src/test/scenarios-library-property.test.ts` |
| SC-5 Sampling Buffer module + GDPR review | `src/lib/sc5/`, `src/lib/sc5/README.md`, `docs/agents/sc5-gdpr-review.md` |
| SC-5 audio capture hook + opt-out toggle | `src/lib/sc5/recorder.ts`, `src/lib/asr/transcribe.ts`, `src/components/settings/PrivacyControls.tsx` |
| SC-5 SLI event taxonomy | `src/lib/observability/sink.ts` (Sc5SampleObservabilityEvent) |
| Playwright E2E suite (Session 7 AM) | `playwright.config.ts`, `tests/e2e/`, `tests/e2e/README.md` |
| ASR transcribe seam (now SC-5-aware + opt-out-aware) | `src/lib/asr/transcribe.ts`, `src/app/api/asr/transcribe/route.ts` |
| AI client wrappers | `src/lib/minimax/`, `src/test/minimax/` |
| Curriculum model | `src/lib/curriculum/`, `prisma/schema.prisma`, `prisma/seed.ts` |
| Voice Loop | `src/lib/voice-loop/`, `src/test/voice-loop.test.ts` |
| Voice capture (Tier 1+2) | `src/lib/voice-loop/capture.ts`, `src/hooks/useVoiceCapture.ts`, `src/test/voice-capture.test.ts` |
| Teacher audio (Tier 3 — playback) | `src/lib/tts/synthesize.ts`, `src/hooks/useTeacherAudio.ts`, `src/components/practice/TeacherBubble.tsx` |
| Pronunciation Score runtime | `src/lib/voice-loop/pronunciation-{service,runtime,scoring,calibration}.ts`, `src/lib/minimax/pronunciation.ts` |
| ASR regression suite | `src/lib/asr/wer.ts`, `src/lib/asr/simulator.ts`, `scripts/asr-regress.ts`, `scripts/asr-regress-{corpus,baseline}.json` |
| Performance budget alarm | `scripts/perf-budget.ts`, `scripts/perf-budget.test.ts`, `docs/perf-budget.md`, `.lighthouseci/bundle-baseline.json` |
| LHCI workflow | `.github/workflows/lighthouse.yml`, `lighthouserc.json` |
| Admin scripts | `scripts/anchors-suggest.ts`, `scripts/progress-check.mjs`, `scripts/load-test-srs-events.mjs`, `scripts/asr-regress.ts`, `scripts/sc5-load-test.ts`, `scripts/sc5-retention.ts` |
| Project status snapshot | [`README.md` § Status](./README.md#status) |
| Workflow conventions | [`AGENTS.md`](./AGENTS.md) |
| Research synthesis | [`docs/research/language-acquisition-findings.md`](./docs/research/language-acquisition-findings.md) |
| A/B harness report | [`docs/research/difficulty-ab-mock-report.md`](./docs/research/difficulty-ab-mock-report.md) |

## Conventions to honour

- All non-trivial work happens on a feature branch named `feat/issue-<N>-<slug>`
- Use the glossary in `CONTEXT.md` — do not invent synonyms
- The 5-state triage vocabulary + 2 categories apply to every issue
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must all pass before commit
- `pnpm test:a11y` must pass for any UI-affecting change
- `pnpm perf:budget` must pass before commit (CI required check)
- `pnpm asr:regress` must pass before commit (CI required check)
- `pnpm sc5:load-test` must pass before commit (CI required check, Session 7+)
- `pnpm test:e2e:chromium` must pass before commit (CI required check, Session 7+)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change