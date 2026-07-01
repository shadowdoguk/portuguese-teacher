# Session Handoff

**Snapshot date:** 2026-06-30 (Sessions 7 + 8 + 9 + 10 closed — PRs #93, #94, #95, #96, #98, #100 all merged into main. **Phase 4 closed + Phase 5 NFRs closed.** Main: 880/880 tests + all required CI alarms green.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Four sessions (7 + 8 + 9 + 10) landed six PRs on the same working day, closing the entire Phase 4 Voice Loop real-world wiring block + Phase 3 content expansion + Phase 5 NFRs:

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers. **Merged.**
- **PR #94 / #16** — SC-5 Sampling Buffer infra. **Merged.**
- **PR #95 / #35** — SC-5 audio capture hook + opt-out toggle. **Merged.**
- **PR #96** — HANDOFF snapshot (Sessions 7+8). **Merged.**
- **PR #98 / #47** — Scenario library expansion to 100 + ≥ 6 per category. **Merged.**
- **PR #100 / #14** — Cross-device compatibility smoke tests + visual regression. **Merged.**

- **48 PRs total** on `main` (Sessions 1–6: 42 PRs + Sessions 7+8: 4 PRs + Session 9: 1 PR + Session 10: 1 PR).
- **880/880 tests green on main** + **9/9 axe-core tests** + five required CI alarms on every PR: `pnpm perf:budget`, `pnpm asr:regress`, `pnpm sc5:load-test`, the dedicated `e2e` job (chromium + webkit + firefox-smoke), and the `Test` step.
- **FR-WEB-2 device matrix live** — Playwright config declares 11 projects spanning PR-time smoke (chromium + webkit + firefox-smoke) + nightly matrix (4 desktop + 2 tablet + 2 mobile). The nightly workflow runs the full matrix on `cron: 0 4 * * *` + on `v*` tags.

## Session 10 pick shipped (1 PR, merged)

- **PR #100 / #14** — Cross-device compatibility smoke tests + visual regression. `playwright.config.ts` declares 11 projects: 3 PR-time smoke (chromium, webkit, firefox-smoke) + 8 nightly matrix (4 desktop including best-effort Edge, 2 tablet, 2 mobile). `tests/e2e/smoke-suite.spec.ts` covers sign-up → dashboard → lesson → practice → milestone assessment → settings (5 tests). `tests/e2e/visual-regression.spec.ts` (tagged `@visual`) commits 5 baseline screenshots for the chromium-linux profile at `maxDiffPixelRatio: 0.01`. `.github/workflows/cross-device-smoke.yml` runs the full nightly matrix on `cron: 0 4 * * *` + on `v*` tags + on `workflow_dispatch`, with per-project artifacts. PR-time `e2e` job scoped to `--project=chromium --project=webkit --project=firefox-smoke --grep-invert="@visual"`. Unit tests pin the device matrix (`src/test/e2e-device-matrix.test.ts`).

## Sessions 7+8+9 picks shipped (5 PRs, all merged)

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers.
- **PR #94 / #16** — SC-5 Sampling Buffer infra.
- **PR #95 / #35** — SC-5 audio capture hook + opt-out toggle.
- **PR #96** — HANDOFF snapshot.
- **PR #98 / #47** — Scenario library expansion to 100.

## Sessions 7+8+9+10 housekeeping

- **PROGRESS.md drift fixed** at every session open.
- **Webpack + node modules dance** — `path` and `fs/promises` are required at runtime via `(0, eval)("require")` inside `src/lib/sc5/server-recorder.ts`.
- **jsdom Blob.arrayBuffer polyfill** — `readBlobBytes` in `src/lib/asr/transcribe.ts`.
- **CI fixes** (Session 8):
  - Removed leftover rebase conflict markers from `ci.yml`.
  - Lazy-instantiated `PrismaClient` in `/api/sc5/health`.
  - Marked `/api/sc5/health` as `dynamic = "force-dynamic"`.
  - Added `pnpm exec prisma generate` + `DATABASE_URL=file:./prisma/dev.db` to the E2E job's build + test steps.
- **Per-route budget bump** (Session 9) — `app: 130_000 → 140_000` in `scripts/perf-budget.ts`; `/practice` baseline updated in `.lighthouseci/bundle-baseline.json`.
- **Cross-device matrix** (Session 10) — 11 Playwright projects, 5 baseline screenshots committed to `tests/e2e/visual-regression.spec.ts-snapshots/`, nightly workflow in `.github/workflows/cross-device-smoke.yml`.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 880/880 tests + 9/9 axe + perf:budget + asr:regress + sc5:load-test + build all green |
| All Session 7+8+9+10 branches | merged + deleted |

## Open PRs

_None — all Session 7+8+9+10 work merged._

## Open issues (4 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 3 — content** (residual):
- **#47** scenario expansion → satisfied the ≥ 100 / ≥ 6 per category bar. Remaining v1.1 work: additional A1/A2/B1 Units, scenario-to-Unit wiring in the DB seed.
- A1/A2/B1 curriculum design (no specific issue; tracked in PROGRESS.md).

**Phase 6 — E2E**:
- _(none — #34 + #14 closed the FR-WEB-2 E2E block.)_

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product, Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75 % in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra; the data seam shipped in #78, the dashboards ship in ops).
- **Authenticated LHCI runs** for `/dashboard`, `/review`, etc. (needs a learner fixture + cookie). Captured in `docs/perf-budget.md`'s 'Lighthouse CI' section.
- **External legal sign-off** on the SC-5 Sampling Buffer GDPR review (`docs/agents/sc5-gdpr-review.md`).
- **Server-side authoritative SC-5 opt-out** (v1.1 follow-up).
- **Slack webhook** for the cross-device nightly workflow (DPO to provision).

## First action for next session

```bash
git checkout main && git pull
# Confirm main is at 880/880 tests + all required CI alarms green.
# Phases 4 + 5 are closed; Phase 3 content is mostly satisfied
# (100 scenarios, ≥ 6 per category) but the A1/A2/B1 curriculum
# authoring beyond the minimum-viable 2 Units per Level is a
# v1.1 follow-up. No open Phase 4-6 picks remain.
# Recommended: take a session to audit the codebase, consolidate
# the now-large number of subsystems, and write the next ADR for
# the v1 release (ADR-0005: v1 release scope + readiness).
# Alternatively: pick the next mini-task from the Phase 3 v1.1
# follow-up (additional A1/A2/B1 Units, scenario-to-Unit DB wiring).
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
| Cross-device matrix (Session 10) | `playwright.config.ts`, `tests/e2e/smoke-suite.spec.ts`, `tests/e2e/visual-regression.spec.ts`, `.github/workflows/cross-device-smoke.yml`, `src/test/e2e-device-matrix.test.ts` |
| SC-5 Sampling Buffer module + GDPR review | `src/lib/sc5/`, `src/lib/sc5/README.md`, `docs/agents/sc5-gdpr-review.md` |
| SC-5 audio capture hook + opt-out toggle | `src/lib/sc5/recorder.ts`, `src/lib/asr/transcribe.ts`, `src/components/settings/PrivacyControls.tsx` |
| SC-5 SLI event taxonomy | `src/lib/observability/sink.ts` (Sc5SampleObservabilityEvent) |
| Playwright E2E suite (Session 7) | `playwright.config.ts`, `tests/e2e/`, `tests/e2e/README.md` |
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
- `pnpm sc5:load-test` must pass before commit (CI required check)
- `pnpm test:e2e:chromium` must pass before commit (CI required check, smoke layer)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change