# Session Handoff

**Snapshot date:** 2026-07-01 (Session 12 closed — PR #109 (SrsService consolidation, issue #104) squash-merged to `main` at `0606e2d`. Production image `portuguese-teacher:0606e2d` (1.63 GB) built + smoke-tested end-to-end. Main: 916/916 tests + lint + typecheck + Playwright E2E + build all clean. Budget cap bumped 140→145 kB for /practice — Next lazy-loaded AuthProvider + SettingsProvider; the page chunk itself grew by ~46 bytes gzipped.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 12 closes the architecture audit's top candidate (#104): the SRS pipeline
consolidated into a single `SrsService` and shipped to main + production image.

- **PR #109** — `feat(srs): consolidate pipeline into a single SrsService (#104)`. New `src/lib/srs/service.ts` (SrsService), `SrsRepository.applyRecall` split into `writeRecord` + `appendEvent`, `POST /api/srs/sources` route + `ScenarioPlayer` mount hook (closes the "Learner drops mid-scenario" gap), `ScenarioRepository.recordCompletion` delegates to `SrsService.recordScenarioSources`. Dead code swept: `gradeFromString`, `upsertRecords`, `inferKindFromId` (with the `grammar-` prefix leak), the duplicate `isRecallGrade`. Route handlers slimmed: recalls 118→45, state 46→23, events 60→42, sources 0→53. 36 new tests (916/916).
- **Production image** `portuguese-teacher:0606e2d` (1.63 GB, +0.02 GB vs `2c589b8`) built + smoke-tested end-to-end: cold-boot Prisma 8 migrations applied, Next.js ready in 84 ms, `/api/observability/sli?window=1h` returns HTTP 200, every page (`/`, `/dashboard`, `/review`, `/practice`) returns 200. Awaiting push to the production registry per the Session 6 motion.
- **Session 11 PRs still open** — #102 (Recent mistakes tile), #103 (ADR-0005 v1 release scope & readiness), #107 (wire 46 library scenarios to A1/A2/B1 Unit seeds). All branch-green from Session 11, awaiting review/merge.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 916/916 tests + lint + typecheck + Playwright E2E + build all green; merge commit `0606e2d` |
| `feat/issue-104-srs-service-consolidation` | merged + deleted (squash into `0606e2d`) |
| `feat/dashboard-recent-mistakes` | PR #102 open — 902/902 tests green |
| `docs/adr-0005-v1-release-scope` | PR #103 open — doc-only |
| `feat/scenarios-extended-a1a2b1` | PR #107 open — 889/889 tests green |
| `docs/session-11-handoff` | PR #108 open — session close-out |
| All Session 7-11 branches | merged + deleted |

## Open PRs

- **#102** feat(dashboard): Recent mistakes tile (FR-WEB-4 #3) — Session 11
- **#103** docs(adr): ADR-0005 v1 release scope and readiness — Session 11
- **#107** feat(curriculum): wire 46 library scenarios to A1/A2/B1 Unit seeds — Session 11
- **#108** docs(handoff): Session 11 closed — Session 11

## Open issues (2 ready-for-agent v1.1 backlog)

- **#105** Per-Learner persistence (architecture audit #2 candidate; also closes 5 hard-coded `"demo-learner"` strings + dashboard numbers that don't update + SC-5 opt-out that's client-trusted)
- **#106** Telemetry seam clean-up (architecture audit #3 candidate; inverts `withLatencyMetric` dependency arrow + wires LLM graceful-degradation per ADR-0002)

## Still pending (human / external — now tracked as ADR-0005 release gates)

- **§10 sign-off on ADR-0005** — Product, Pedagogy, Engineering, Design, QA, Security leads. Engineering sign-off is auto-ticked by today's branch-green merge.
- **Live MiniMax LLM credentials** for the production WER acceptance run (SC-5 weekly aggregation).
- **Authenticated LHCI runs** for `/dashboard`, `/review`, `/practice` — needs a Learner fixture + cookie.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for SC-2 / NFR-3 ≥ 95 % monthly uptime.
- **External legal sign-off** on `docs/agents/sc5-gdpr-review.md`.
- **Slack webhook** for the cross-device nightly workflow.
- **Production image push** — `portuguese-teacher:0606e2d` built + tagged locally. Awaiting user push to the production registry per Session 6 motion.
- **Server-side authoritative SC-5 opt-out** (v1.1 follow-up).
- **Authenticated Learner fixture** — 5 hard-coded `"demo-learner"` strings block per-Learner persistence (v1.1 issue #105).

## First action for next session

```bash
git checkout main && git pull
# Confirm main is at 916/916 tests + all required CI alarms green.
# Push portuguese-teacher:0606e2d to the production registry (if not yet pushed).
# Merge PRs #102, #103, #107, #108 if approved (or address review comments).
# Pick from the v1.1 backlog:
#   - #105 Per-Learner persistence (5 hard-coded "demo-learner" strings)
#   - #106 Telemetry seam clean-up (inverts withLatencyMetric dependency)
# Recommended: take #105 first — #104 just landed and #105 closes the
# dashboard numbers-that-don't-update + SC-5 opt-out-client-trusted gaps that
# ride on the same auth surface.
# Alternatively: pick from the v1.1 'additional A1/A2/B1 Units' backlog
# (the 50 remaining library scenarios reference Unit IDs the seeds
# haven't authored yet — a1-2-mercearia, a2-1-compras, etc.).
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
| **v1 release scope & readiness (Session 11)** | [`docs/adr/0005-v1-release-scope-and-readiness.md`](./docs/adr/0005-v1-release-scope-and-readiness.md) |
| **SRS Service (Session 12)** | `src/lib/srs/service.ts` (new), `src/lib/srs/repository.ts` (split), `src/app/api/srs/sources/route.ts` (new), `src/components/practice/ScenarioPlayer.tsx` (mount hook), `src/lib/scenarios/repository.ts` (delegation) |
| **SRS Service tests (Session 12)** | `src/test/srs-service.test.ts` (21), `src/test/srs-sources-api.test.ts` (9), `src/test/srs-repository-split.test.ts` (4), `src/test/scenario-adaptive.test.tsx` (+2) |
| Dashboard Recent mistakes tile (Session 11) | `src/components/dashboard/RecentMistakesTile.tsx`, `src/app/api/dashboard/recent-mistakes/route.ts`, `src/lib/dashboard/recent-mistakes.ts` |
| Library scenarios wired to A1/A2/B1 Unit seeds (Session 11) | `src/lib/curriculum/scenarios-extended.ts` |
| Architecture audit (Session 11) | `/tmp/architecture-review-2026-07-01.html` (out-of-repo per skill convention) |
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
| **Production image (Session 12)** | `portuguese-teacher:0606e2d` (1.63 GB; built + smoke-tested; awaiting user push) |
| **Production image (Session 6)** | `portuguese-teacher:2c589b8` (1.61 GB; previous deploy) |

## Conventions to honour

- All non-trivial work happens on a feature branch named `feat/issue-<N>-<slug>` (or `docs/<slug>` for ADR-only branches)
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