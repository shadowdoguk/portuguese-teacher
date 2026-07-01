# Session Handoff

**Snapshot date:** 2026-07-01 (Session 11 closed — 3 PRs opened: #102 (Dashboard Recent mistakes tile / FR-WEB-4 #3), #103 (ADR-0005 v1 release scope & readiness), #107 (wire 46 library scenarios to A1/A2/B1 Unit seeds). Tracker reconciled: closed 5 stale open issues that already shipped in Sessions 7-10. Architecture audit produced `/tmp/architecture-review-2026-07-01.html` + 3 v1.1 backlog issues.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 11 lands three features + an architecture audit on the day v1 readiness becomes formalised:

- **PR #102** — Dashboard "Recent mistakes" tile (FR-WEB-4 #3). The dashboard previously had 4 tiles (next lesson, SRS due, weekly goal, streak) but no recent mistakes — the requirements §3.4 #3 call was unsatisfied. 22 new tests, 880 → 902.
- **PR #103** — ADR-0005 v1 release scope & readiness. The single source of truth for "is v1 GA?": 28 in-scope rows with evidence refs + 11 explicit v1.1 deferrals + the §10 sign-off checklist + 5 external dependencies + 4 ops items. Reframes the 4 PROGRESS.md §Blockers items as named release gates.
- **PR #107** — Wire 46 library scenarios to A1/A2/B1 Unit seeds. The in-memory `SCENARIO_LIBRARY` carries 100 scenarios; only 4 were in the DB. This slice wires the 4 Unit IDs the A1/A2/B1 seed files declare. DB scenario count: 4 → 50.
- **Architecture audit** (out-of-repo at `/tmp/architecture-review-2026-07-01.html`) — 6 areas of architectural friction surfaced; 3 candidates prioritised into v1.1 backlog issues (#104 + #105 + #106).

- **51 PRs total** on `main` (Sessions 1-6: 42 PRs + Sessions 7-8: 4 PRs + Session 9: 1 PR + Session 10: 1 PR + Session 11: 3 PRs awaiting review/merge).
- **889/889 tests green on main** + **9/9 axe-core tests** + five required CI alarms on every PR: `pnpm perf:budget`, `pnpm asr:regress`, `pnpm sc5:load-test`, the dedicated `e2e` job (chromium + webkit + firefox-smoke), and the `Test` step.
- **FR-WEB-4 device matrix live** — Playwright config declares 11 projects spanning PR-time smoke + nightly matrix. The nightly workflow runs the full matrix on `cron: 0 4 * * *` + on `v*` tags.

## Session 11 pick shipped (3 PRs, all open)

- **PR #102** — Dashboard "Recent mistakes" tile. New `src/lib/dashboard/recent-mistakes.ts` pure aggregator (filters `SrsRecallEvent` rows to `grade='again'` over a window default 7 days / max 90, groups by `itemId`, joins to `VocabularyItem` / `GrammarPattern`, sorts by lapses desc then recency, caps at limit default 5 / max 25). New `GET /api/dashboard/recent-mistakes` route. New `<RecentMistakesTile>` component (status machine `loading → ready | empty | error`). Dashboard layout reshuffled: RecentMistakesTile replaces the old SRS tile in the top grid; SRS moves into the bottom 3-card row alongside weekly goal + streak; stage card gets its own row. 22 new tests (13 unit + 4 API integration + 3 component + 1 dashboard + 1 dashboard-route added in earlier draft). 880 → 902 tests.
- **PR #103** — `docs/adr/0005-v1-release-scope-and-readiness.md`. §1 What ships in v1 GA — 28 in-scope rows with evidence refs + 11 explicit v1.1 deferrals with plans. §2 Readiness checklist — single source of truth for "is v1 GA?". §3 Success criteria coverage. §4 Traceability update. §5 Consequences including "engineering work for v1 is essentially done; remaining queue is content + external deps".
- **PR #107** — Wire 46 library scenarios to A1/A2/B1 Unit seeds. New `src/lib/curriculum/scenarios-extended.ts` derives the wiring from the source-of-truth `SCENARIO_LIBRARY` by filtering on Unit ID whitelist (no duplication). The 4 seeded A1/A2/B1 Unit IDs (`a1-1-viagens`, `a1-2-alimentacao`, `a2-1-rotina-trabalho`, `b1-1-gastronomia`) account for 46 of the remaining 96 library scenarios. 9 new tests pinning the wiring.

## Session 11 housekeeping

- **Architecture audit** (out-of-repo per `improve-codebase-architecture` skill convention) — `/tmp/architecture-review-2026-07-01.html`. 5 subsystems walked: SRS pipeline, Voice Loop + observability seam, scenario + lesson + curriculum + placement flow, MiniMax wrapper layer, settings + auth + dashboard surfaces. 6 areas of architectural friction surfaced. Top 3 candidates ranked by (impact × cost): **#104 `SrsService` consolidation** (Strong, lowest cost); **#105 Per-Learner persistence** (Strong, medium cost, includes 5 hard-coded `"demo-learner"` strings); **#106 Telemetry seam clean-up** (Strong, medium cost).
- **Tracker reconciliation** — closed 5 stale open issues (#14, #16, #34, #35, #47) that already shipped in Sessions 7-10. Tracker is now clean (0 → 3 open after today's 3 v1.1 backlog issues were opened).
- **DB scenario count** — 4 → 50 after PR #107 lands. `pnpm seed` writes the new scenarios against the dev DB.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 889/889 tests + 9/9 axe + perf:budget + asr:regress + sc5:load-test + build all green |
| `feat/dashboard-recent-mistakes` | PR #102 open — 902/902 tests green |
| `docs/adr-0005-v1-release-scope` | PR #103 open — doc-only |
| `feat/scenarios-extended-a1a2b1` | PR #107 open — 889/889 tests green |
| All Session 7-10 branches | merged + deleted |

## Open PRs

- **#102** feat(dashboard): Recent mistakes tile (FR-WEB-4 #3) — Session 11
- **#103** docs(adr): ADR-0005 v1 release scope and readiness — Session 11
- **#107** feat(curriculum): wire 46 library scenarios to A1/A2/B1 Unit seeds — Session 11

## Open issues (3 ready-for-agent v1.1 backlog)

- **#104** Consolidate SRS pipeline into a single `SrsService` (architecture audit top candidate)
- **#105** Per-Learner persistence (architecture audit #2 candidate; also closes 5 hard-coded `"demo-learner"` strings)
- **#106** Telemetry seam clean-up (architecture audit #3 candidate; inverts `withLatencyMetric` dependency arrow + wires LLM graceful-degradation per ADR-0002)

## Still pending (human / external — now tracked as ADR-0005 release gates)

- **§10 sign-off on ADR-0005** — Product, Pedagogy, Engineering, Design, QA, Security leads.
- **Live MiniMax LLM credentials** for the production WER acceptance run.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for SC-2 / NFR-3 ≥ 95 % monthly uptime.
- **Authenticated LHCI runs** for `/dashboard`, `/review`, `/practice` — needs a Learner fixture + cookie.
- **External legal sign-off** on `docs/agents/sc5-gdpr-review.md`.
- **Slack webhook** for the cross-device nightly workflow.
- **Server-side authoritative SC-5 opt-out** (v1.1 follow-up).
- **Authenticated Learner fixture** — 5 hard-coded `"demo-learner"` strings block per-Learner persistence (v1.1 issue #105).

## First action for next session

```bash
git checkout main && git pull
# Confirm main is at 889/889 tests + all required CI alarms green.
# Merge PRs #102, #103, #107 if approved (or address review comments).
# Pick from the v1.1 backlog:
#   - #104 SrsService consolidation (highest leverage, lowest cost)
#   - #105 Per-Learner persistence (5 hard-coded "demo-learner" strings)
#   - #106 Telemetry seam clean-up (inverts withLatencyMetric dependency)
# Recommended: take #104 first — it's the lowest cost + highest leverage
# deepening opportunity, and it unblocks the SRS data backbone for the
# dashboard, scenario tag pipeline, and review queue.
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
| **Dashboard Recent mistakes tile (Session 11)** | `src/components/dashboard/RecentMistakesTile.tsx`, `src/app/api/dashboard/recent-mistakes/route.ts`, `src/lib/dashboard/recent-mistakes.ts` |
| **Library scenarios wired to A1/A2/B1 Unit seeds (Session 11)** | `src/lib/curriculum/scenarios-extended.ts` |
| **Architecture audit (Session 11)** | `/tmp/architecture-review-2026-07-01.html` (out-of-repo per skill convention) |
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