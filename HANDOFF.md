# Session Handoff

**Snapshot date:** 2026-06-30 (Sessions 7 + 8 closed — PRs #93, #94, #95, #96 all merged into main. **Phase 4 queue is closed.** Main: 866/866 tests + all required CI alarms green.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Two sessions (7 + 8) landed four PRs on the same working day, closing the entire Phase 4 Voice Loop real-world wiring block:

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers. **Merged.**
- **PR #94 / #16** — SC-5 Sampling Buffer infra. **Merged.**
- **PR #95 / #35** — SC-5 sampling-buffer 1 % audio capture hook + opt-out toggle. **Merged.**
- **PR #96** — HANDOFF snapshot. **Merged.**

- **46 PRs total** on `main` (Sessions 1–6: 42 PRs + Session 7: 2 PRs + Session 8: 2 PRs).
- **866/866 tests green on main** + **9/9 axe-core tests** + four required CI alarms on every PR: `pnpm perf:budget`, `pnpm asr:regress`, `pnpm sc5:load-test`, and the dedicated `e2e` job (chromium + webkit full projects + firefox-smoke).
- **Voice Loop SC-5 path is fully wired end-to-end** (server + client): `/api/asr/transcribe` calls the recorder fire-and-forget after every successful transcript. `Settings.sc5OptOut` propagates from PrivacyControls → PracticeSession → route. The recorder emits one of four `sc5_sample` events (`sampled` / `skipped` / `opt-out` / `failed`) for SLI visibility.

## Sessions 7 + 8 picks shipped (3 PRs + 1 docs PR, all merged)

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers. 13 tests in 3 projects (chromium + webkit full, firefox-smoke). Dedicated `e2e` CI job. `tests/e2e/README.md` documents the setup.
- **PR #94 / #16** — SC-5 Sampling Buffer infra. `Sc5Sample` Prisma model (no `learnerId`); `src/lib/sc5/` module (sampler + recorder + server-recorder + retention + aggregation + health + index + README); `/api/asr/transcribe` extended with fire-and-forget `sc5Recorder`; `GET /api/sc5/health`; `pnpm sc5:load-test` (10 k utterances → 118 samples = 1.18 %); `docs/agents/sc5-gdpr-review.md`. 24 new tests + 4 ASR-transcribe integration tests.
- **PR #95 / #35** — SC-5 sampling-buffer 1 % audio capture hook + opt-out toggle. `Settings.sc5OptOut` (default false); `PrivacyControls` SC-5 card with toggle + status pill; `Sc5Recorder.enqueue(blob)` accepts per-call `optOut?: boolean`; `Sc5SampleObservabilityEvent` extends `ObservabilityEvent` with four outcomes; PracticeSession appends `sc5OptOut="1"` to multipart form. 10 new tests pin the 1000-utterance → 10 samples acceptance (fixture pinned to `u-621..u-1620`) and the four-event SLI taxonomy.

## Sessions 7 + 8 housekeeping

- **PROGRESS.md drift fixed twice** — Session 6 body was stale when Session 7 opened; Session 7 → Session 8 transitions also cleaned up.
- **Webpack + node modules dance** — `path` and `fs/promises` are required at runtime via `(0, eval)("require")` inside `src/lib/sc5/server-recorder.ts`. Static imports trip Next.js' webpack module resolution.
- **jsdom Blob.arrayBuffer polyfill** — `readBlobBytes` in `src/lib/asr/transcribe.ts` falls back to `FileReader.readAsArrayBuffer` for the test env.
- **CI fixes** (Session 8):
  - Removed leftover rebase conflict markers from `ci.yml` (snuck past merge resolution in PR #93).
  - Lazy-instantiated `PrismaClient` in `/api/sc5/health` to match the pattern used by `/api/asr/transcribe` and `/api/scenarios/*`.
  - Marked `/api/sc5/health` as `dynamic = "force-dynamic"` so Next.js skips the prerender pass (the route queries the live database, which is not safe at build time when the dev.db file may not exist in CI).
  - Added `pnpm exec prisma generate` + `DATABASE_URL=file:./prisma/dev.db` to the E2E job's build + test steps so the instrumentation hook can resolve `@prisma/client` at build time.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 866/866 tests + 9/9 axe + perf:budget + asr:regress + sc5:load-test + build all green |
| All Session 7+8 branches | merged + deleted |

## Open PRs

_None — all Session 7+8 work merged._

## Open issues (3 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 3 — content (the bulk)**
- **#47** Expand scenario library to ≥ 100 scenarios (depends on #23 + #41, both closed — unblocked)

**Phase 5 — NFRs**
- **#14** Cross-device compatibility smoke tests (foundation laid by #34)

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product, Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75 % in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra; the data seam shipped in #78, the dashboards ship in ops).
- **Authenticated LHCI runs** for `/dashboard`, `/review`, etc. (needs a learner fixture + cookie). Captured in `docs/perf-budget.md`'s 'Lighthouse CI' section.
- **External legal sign-off** on the SC-5 Sampling Buffer GDPR review (`docs/agents/sc5-gdpr-review.md`) — internal review recorded; external counsel (DPA + DPO) sign-off required pre-launch.
- **Server-side authoritative SC-5 opt-out** (v1.1 follow-up) — the v1 implementation trusts the client-supplied form field; a future Settings persistence layer makes the flag authoritative on the server too. Captured in `docs/agents/sc5-gdpr-review.md`.

## First action for next session

```bash
git checkout main && git pull
# Confirm main is at 866/866 tests + all required CI alarms green.
# Phase 4 is closed. Picks for next session:
#   - #47 scenario expansion (depends on #23 + #41, both closed; unblocked).
#   - #14 cross-device smoke (foundation laid by #34).
# Recommended: #47 — heavy on content authoring but unblocked; finishing
# Phase 3 unblocks the A1/A2/B1 curriculum pipeline that the rest of
# the platform depends on.
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
| SC-5 Sampling Buffer module + GDPR review | `src/lib/sc5/`, `src/lib/sc5/README.md`, `docs/agents/sc5-gdpr-review.md` |
| SC-5 audio capture hook + opt-out toggle (Session 8) | `src/lib/sc5/recorder.ts`, `src/lib/asr/transcribe.ts`, `src/components/settings/PrivacyControls.tsx` |
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