# ADR 0005 — v1 Release Scope and Readiness

**Status:** Accepted
**Date:** 2026-07-01
**Deciders:** Product, Pedagogy lead, Engineering lead, Design lead, QA lead, Security
**Related:** [`CONTEXT.md`](../../CONTEXT.md), [`docs/requirements/portuguese-teacher-requirements.md`](../requirements/portuguese-teacher-requirements.md), [`ADR-0001`](0001-pedagogical-model.md), [`ADR-0002`](0002-voice-loop-architecture.md), [`ADR-0003`](0003-v1-scope-amendment.md), [`ADR-0004`](0004-difficulty-control-pipeline.md)

## Context

The v1 requirements document (`docs/requirements/portuguese-teacher-requirements.md`) describes a 736-line spec covering 11 functional requirements (FR-AI-1…6, FR-LP-1…6, FR-CP-1…6, FR-WEB-1…6, FR-DATA-1…3), 8 non-functional requirements (NFR-1…8), 5 success criteria (SC-1…5), and a 6-step testing protocol (§6.1-6.8). The platform's engineering work has landed 100+ PRs across 17 subsystems (Sessions 1–10). The repo is at **880 unit tests + 9 axe tests + 5 required CI alarms + 13 E2E tests + LHCI on main**, all green. Phase 4 (Voice Loop real-world wiring) and Phase 5 (NFRs) are closed in PROGRESS.md.

But the project has no consolidated statement of what v1 *actually ships* — what's complete, what's deferred, what gates release, and what work remains. The HANDOFF snapshot flagged this as the recommended next-session action. Without an explicit release-scope ADR, the gap between "engineering is done" and "release is signed off" is invisible: §10 of the requirements doc lists six sign-off roles that have no defined acceptance criteria, and four external dependencies are tracked as ad-hoc TODOs in PROGRESS.md §Blockers rather than as release gates.

## Decision

We adopt the following **v1 release scope and readiness checklist** as the single source of truth for "is v1 GA?" — engineering completes when the checklist is fully ticked, and sign-off roles execute against this checklist rather than re-reading the requirements document.

### 1. What ships in v1 GA

#### In scope (v1.0 launch surface)

| Area | Status | Evidence |
| --- | --- | --- |
| pt-PT dialect only | ✅ shipped | ADR-0003 §1; `Dialect = "pt-PT"` literal in `src/lib/auth/types.ts:1` |
| Five-stage ladder (A0 → A1 → A2 → B1) with 3 Milestones | ✅ shipped | ADR-0003 §2; `Milestone.boundary ∈ {A0-A1, A1-A2, A2-B1}` in `prisma/schema.prisma:185` |
| Curriculum DAG + Remedial Anchors (no back-edges) | ✅ shipped | ADR-0003 §3; `RemedialAnchor` Prisma model + `resolveRemediationPlan` |
| A0 curriculum (4 Units, ≥ 8 Lessons, 4 scenarios in DB) | ✅ shipped | `prisma/seed.ts` + `src/lib/curriculum/seed-a0.ts` |
| A1 / A2 / B1 curriculum (2 Units per Level, minimum-viable) | ✅ shipped (v1 slice) | `seed-a1.ts`, `seed-a2.ts`, `seed-b1.ts` — 2 Units each with 1 lesson stub + empty vocab/grammar arrays; full content is a v1.1 follow-up |
| Scenario library ≥ 100 scenarios, ≥ 6 per category | ✅ shipped | PR #98; `src/lib/scenarios/library.ts` |
| SC-5 Sampling Buffer infra (1% sample, ≤ 24 h retention, no `learnerId`) | ✅ shipped | PR #94 + PR #95; `src/lib/sc5/`; `docs/agents/sc5-gdpr-review.md` |
| Placement Lesson at sign-up | ✅ shipped | PR #75; `src/app/(app)/placement/page.tsx` + `PlacementLessonAttempt` Prisma model |
| Sign-up email + password (no OAuth) | ✅ shipped | ADR-0003 §6; `src/app/(auth)/sign-up/page.tsx` |
| Voice Loop real-world wiring (Tier 1+2+3 capture, ASR, LLM, TTS) | ✅ shipped | PRs #83 + #87 + #88 + #92; `src/lib/voice-loop/` |
| Pronunciation Score (drill endpoint + free-form ASR-bias) | ✅ shipped | PRs #87 + #88 + #90; `src/lib/voice-loop/pronunciation-*.ts` |
| ASR accuracy regression suite (NFR-1 gate, synthetic baseline) | ✅ shipped | PR #89; `src/lib/asr/{wer,simulator}.ts`; baseline 1.08 % clean / 4.04 % noisy |
| SRS persistence (DB, not localStorage) | ✅ shipped | PR #74; `SrsReviewRecord` + `SrsRecallEvent` Prisma models |
| Scenario completion persistence | ✅ shipped | PR #76; `ScenarioCompletion` + `ScenarioProgress` Prisma models |
| SRS injection into review queue + Lesson exercise order | ✅ shipped | PRs #79 + #80 |
| Adaptive scenario difficulty (level mismatch + scaffolded pre-task) | ✅ shipped | PR #82; `adaptPreTask` + `LevelMismatchBadge` |
| Audio + image rendering on review card | ✅ shipped | PR #81 |
| Per-recall telemetry + observability + graceful degradation | ✅ shipped | PRs #77 + #78 |
| Voice Loop SLI dashboards + p95 latency alert | ✅ shipped | PR #91 |
| Privacy controls (data export + deletion request + SC-5 opt-out toggle) | ✅ shipped | `src/components/settings/PrivacyControls.tsx`; `src/lib/settings/export.ts` |
| Affective Filter proxy (internal signal, drives AI teacher tone) | ✅ shipped | `src/lib/affective/` |
| Weekly Goal + Streak + Stage cards on dashboard | ✅ shipped | `src/components/dashboard/DashboardClient.tsx` |
| Recent mistakes tile on dashboard (FR-WEB-4 #3) | ✅ shipped | PR #102; `src/components/dashboard/RecentMistakesTile.tsx` |
| Accessibility (WCAG 2.2 AA) — axe-core gate + statement page | ✅ shipped | PR #84; `pnpm test:a11y` (9/9); `/accessibility` page |
| Per-route bundle budgets + LHCI on `main` | ✅ shipped | PR #85; `pnpm perf:budget` |
| Browser support matrix (Chromium / Webkit / Firefox tiers) | ✅ shipped | PR #93 + PR #100; `playwright.config.ts` (11 projects) + nightly matrix |
| Cross-device compatibility smoke tests | ✅ shipped | PR #100; `tests/e2e/smoke-suite.spec.ts` + `cross-device-smoke.yml` |
| Production Dockerfile + Prisma migrate-on-start | ✅ shipped | Session 6 close-out; `Dockerfile` at commit `2c589b8` |

#### Deferred to v1.1

| Area | Why deferred | Plan |
| --- | --- | --- |
| **pt-BR dialect** | pt-PT is the v1 launch dialect per ADR-0003 §1. Adding pt-BR doubles TTS + ASR + content QA work, and the CAPLE vs CELPE-Bras external assessment is jurisdiction-locked. | Schema already forward-compatible (`dialect: String` column, `Dialect = "pt-PT"` literal is the only constraint). v1.1 adds a Brazil region + pt-BR TTS voice + pt-BR content pass. |
| **OAuth sign-in (Google / Apple)** | Third-party redirect + account-merging + token rotation is unjustified at v1 launch volume. ADR-0003 §6 defers it. | Auth provider is `AuthProvider`-based with a seam at `mockSignIn` / `mockSignUp`; swap to NextAuth in v1.1. |
| **Native iOS / Android apps** | v1 is web-only per requirements §1.3. | PWA-ready (responsive web app already ships mobile breakpoints; cross-device matrix tests cover iPad + iPhone). Native apps are a v1.1+ feasibility study per requirements §9.2. |
| **Live human-tutor marketplace** | Requirements §9.5 + FR-LP-5 say "out of scope for v1 product but trackable in the data model." The data model is in place (`tutorReferral` placeholder + 3-fail trigger). | Marketplace integration is a v2+ effort. |
| **Additional A1 / A2 / B1 curriculum content** | The v1 minimum-viable 2 Units per Level ships with stubs (1 lesson each, empty vocab/grammar arrays). The 100-scenario library covers all 10 categories. | v1.1 expands the seed files to 8-10 Units per Level per requirements §3.2 FR-LP-1. |
| **Scenario-to-Unit DB wiring beyond A0** | The 4 A0 scenarios are in the DB. After PR #107, all 6 seeded A1/A2/B1 Unit IDs are wired to library scenarios (a1-1-viagens, a1-2-alimentacao, a2-1-rotina-trabalho, a2-2-viagens-saude, b1-1-gastronomia, b1-2-servicos) — DB scenario count 4 → 80. The remaining 24 library scenarios reference Unit IDs the A1/A2/B1 seeds haven't authored yet (a1-2-mercearia, a1-3-roupa, a1-4-familia, a1-5-rotinas, a2-1-compras, a2-2-restaurante, a2-3-banco, a2-4-sociais, b1-1-emprego, b1-2-sociais, b1-3-cultura, …). | v1.1 expands the seed files to author those additional Unit IDs. |
| **Live MiniMax LLM credentials + production WER acceptance run** | Sandbox creds are provisioned; live creds need a sandbox-to-prod credential bridge. | Ops ticket: provision live creds + schedule the SC-5 acceptance run against the held-out reference ASR pipeline. |
| **Authenticated LHCI runs for `/dashboard`, `/review`, etc.** | Needs a Learner fixture + cookie; the seam is captured in `docs/perf-budget.md`'s 'Lighthouse CI' section. | v1.1 wires the auth cookie + the Learner fixture in the LHCI config. |
| **Real Grafana + 60 s × 3-region synthetic-probe scheduling** | The endpoint + data model ship (`POST /api/probes/heartbeat`); the scheduler doesn't. | Ops ticket: provision Grafana + 3-region probe workers. |
| **Server-side authoritative SC-5 opt-out** | v1 ships a client-side opt-out toggle + the per-Learner SC-5 surface. A server-side authoritative gate is a GDPR follow-up. | v1.1 routes the opt-out through `/api/sc5/health` + a per-IP/cookie gate. |
| **C1 / C2 curriculum** | v1 ceiling is B1. | v2+ content team staffing plan. |

### 2. v1 release readiness checklist

This is the single source of truth for "is v1 GA?" Each row is signed by the named role. The checklist is run weekly during the v1 stabilisation period and once at the GA decision.

#### Engineering readiness

- [x] All v1 functional requirements (FR-AI-1…6, FR-LP-1…6, FR-CP-1…6, FR-WEB-1…6, FR-DATA-1…3) have an implementation path or an explicit deferral note above.
- [x] All v1 non-functional requirements (NFR-1…8) have an implementation path or an explicit deferral note above.
- [x] Test suite green at GA cut: unit + 9/9 axe + 13 E2E + LHCI on `main` (current main is 950/950 unit after PRs #102, #107, #109 — the count at GA cut will be whatever the mainline sits at, the readiness criterion is *green* not a fixed number).
- [x] Five required CI alarms green on `main`: `pnpm perf:budget`, `pnpm asr:regress`, `pnpm sc5:load-test`, `pnpm test:e2e`, `Test` step.
- [x] ASR regression baseline committed: clean WER 1.08 %, noisy WER 4.04 %.
- [x] Per-route bundle budgets enforced; no route exceeds its cap.
- [x] Production Dockerfile verified end-to-end (`GET /api/observability/sli?window=1h` returns 200 in the `portuguese-teacher:2c589b8` image).
- [x] Privacy posture reviewed: `docs/agents/sc5-gdpr-review.md` documents the GDPR Art. 6 / 9 conclusion for SC-5 (legitimate-interest framing + jurisdiction-specific opt-out as v1.1 follow-up).

#### Product + Pedagogy sign-off

- [ ] §10 of the requirements doc signed by **Product owner**, **Pedagogy lead**, **Engineering lead**, **Design lead**, **QA lead**, **Security**.
- [ ] CAPLE B1 external assessment path reviewed with the assessment partner; quarterly cadence locked.
- [ ] User satisfaction measurement plan reviewed: post-lesson rating + NPS survey (30-day, 90-day) + drop-off funnel per Unit.

#### External dependencies

- [ ] Live MiniMax LLM credentials provisioned for production WER acceptance run (`#42` ≥ 75 % in-band target).
- [ ] Authenticated Learner fixture + cookie for LHCI's `/dashboard`, `/review`, `/practice` runs.
- [ ] Grafana + 3-region synthetic-probe workers scheduled at 60 s intervals (drives NFR-3 ≥ 95 % monthly uptime measurement).
- [ ] Slack webhook for `cross-device-smoke` nightly workflow (DPO to provision).
- [ ] External legal sign-off on `docs/agents/sc5-gdpr-review.md` (DPA + Art. 6 / 9 review).

#### Operations readiness

- [ ] Status page published with the SC-5 + MiniMax service health surfaces.
- [ ] Incident response runbook drafted (the postmortem template at `docs/postmortems/`).
- [ ] GDPR Art. 30 record of processing activities filed.
- [ ] LGPD Art. 30 record of processing activities filed (Brazil data; pt-PT-only v1 has no Brazilian region but the file is a precondition for the future pt-BR launch — Art. 37 DPO designation tracked separately as part of the pt-BR go-to-market).

### 3. Success criteria coverage

| SC | Definition | Coverage |
| --- | --- | --- |
| SC-1 | ≥ 90 % of curriculum completers demonstrate B1 proficiency (CAPLE) | Quarterly measurement plan; first run scheduled Q4 2026. |
| SC-2 | ≥ 95 % monthly platform availability | Synthetic probes at 60 s × 3 regions → Grafana → SC-2 dashboard. The probe-scheduling infra is the only blocker. |
| SC-3 | Average post-lesson rating ≥ 4.3 / 5.0, NPS ≥ +30, ≤ 5 % Unit drop-off | In-app rating + NPS surfaces ship in v1; measurement plan runs from GA. |
| SC-4 | Pronunciation Score trajectory ≥ +10 / Unit over first 10 Units; SRS retention ≥ 70 % at 30-day; Milestone first-attempt pass ≥ 60 % | All measurable from the existing `SrsRecallEvent` + `VoiceLoopLatencySample` + pronunciation telemetry; dashboards ship in v1. |
| SC-5 | Production WER ≤ 5 % on 1 % sampled utterances, measured weekly | SC-5 Sampling Buffer + `scripts/sc5-aggregation.ts` ship in v1; weekly aggregation runs from GA; the held-out reference ASR pipeline is the live-credentials dependency. |

### 4. Traceability update

The requirements doc's §8 Traceability matrix maps every FR / NFR to a research source and a design source (ADR). With this ADR the table gains two rows:

| Requirement | Research source | Design source |
| --- | --- | --- |
| FR-WEB-4 #3 dashboard "recent mistakes" | — | ADR-0005 (this document) |
| §10 sign-off process | — | ADR-0005 §2 (this document) |

## Consequences

1. **Engineering work for v1 is essentially done.** The remaining work is content (additional A1/A2/B1 Units, scenario-to-Unit wiring) and external dependencies (live creds, LHCI fixtures, Grafana, legal sign-off). The engineering queue for the v1 GA cut is empty; new picks go into the v1.1 queue.
2. **The §10 sign-off roles gain a concrete acceptance surface.** Today §10 lists six roles with no defined acceptance criteria. The §2 checklist above is the criteria. The sign-off process is now *"tick every box in §2 of ADR-0005"*, not *"re-read the 736-line requirements doc"*.
3. **External blockers are visible.** The four external dependencies (live creds, LHCI cookie, Grafana, legal) are tracked as release gates in §2, not as ad-hoc TODOs in PROGRESS.md §Blockers.
4. **v1.1 has a clear roadmap.** The deferred items in §1 form the v1.1 backlog. The first three (additional A1/A2/B1 Units, scenario-to-Unit wiring, authenticated LHCI) are content + infra and are trackable in PROGRESS.md.
5. **Single source of truth.** PROGRESS.md and HANDOFF.md both reference this ADR by number for "what ships in v1" — they no longer need to enumerate the surface themselves.