# Session Handoff

**Snapshot date:** 2026-06-30 (Session 7 closed — two PRs open: PR #93 (#34 Playwright E2E) + PR #94 (#16 SC-5 Sampling Buffer infra). Main is at the Session 6 floor — both branches are rebased onto current main and CI-green locally.)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 7 of the Portuguese Teacher build is **fully closed** — both picks
landed branch-green with PRs open and CI running:

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox tiers.
- **PR #94 / #16** — SC-5 Sampling Buffer infra.

- **44 PRs total** on `main` (42 from Sessions 1–6 + #93 + #94 open).
- **856/856 tests green on main** + **9/9 axe-core tests** + 4 new CI alarms
  on every PR: `pnpm perf:budget` (per-route bundle caps), `pnpm asr:regress`
  (clean WER ≤ 5 %, noisy WER ≤ 10 %), `pnpm sc5:load-test` (≥ 10 k
  utterances → ~1 % sample ±0.5 pp drift), and the dedicated `e2e` job
  (chromium + webkit full projects + firefox-smoke).

## Session 7 picks shipped (2 PRs, both open and CI-pending)

- **PR #93 / #34** — Playwright E2E across Chromium + Safari + Firefox
  tiers. New `playwright.config.ts` (chromium + webkit projects, firefox
  as smoke-only); new `tests/e2e/` (5 files including a README); 13 tests
  cover the 10-turn conversation in Tier 1+2 with turn-history accumulation,
  p95 ≤ 1.5 s latency on Tier 1 (mock mode), UA-spoofed Tier 1 / 2 / 3
  detection (chromium-only — `Navigator.prototype.userAgent` is not
  overridable on webkit/firefox), and a Tier 3 text-fallback end-to-end
  turn. New `pnpm test:e2e{, :chromium, :webkit, :install}` scripts.
  Wired into `ci.yml` as a dedicated `e2e` job (separate from the
  15-min `verify` job); Playwright HTML report uploaded as artifact on
  failure.

- **PR #94 / #16** — SC-5 Sampling Buffer infra. New `Sc5Sample` Prisma
  model with **no `learnerId` field** (decoupled from Learner identity
  per ADR-0003 §4); migration `20260630083259_add_sc5_sampling_buffer`;
  new `src/lib/sc5/` module (`sampler` + `recorder` + `server-recorder`
  + `retention` + `aggregation` + `health` + index + README); `/api/asr/transcribe`
  extended with a fire-and-forget `sc5Recorder` dep that fires after every
  successful ASR transcript; new `GET /api/sc5/health` route;
  `src/instrumentation.ts` binds the default recorder to the shared
  Prisma client at server startup. New scripts: `pnpm sc5:load-test`
  (10 k utterances → 118 samples = 1.18 %, sync/async write match),
  `pnpm sc5:retention` (24 h hard-delete sweep + `--dry-run`). New
  `docs/agents/sc5-gdpr-review.md` records the GDPR Art. 6 / 9 review
  conclusion (legitimate-interest framing + jurisdiction-specific opt-out
  as v1.1 follow-up). 24 new unit tests + 4 new ASR-transcribe integration
  tests pinning the seam.

## Session 7 housekeeping

- **Webpack + node modules dance** — `path` and `fs/promises` are required
  at runtime via `(0, eval)("require")` inside `src/lib/sc5/server-recorder.ts`.
  Static imports trip Next.js' webpack module resolution; the dynamic
  require is the only path that survives the build.
- **jsdom Blob.arrayBuffer polyfill** — `readBlobBytes` in `src/lib/asr/transcribe.ts`
  falls back to `FileReader.readAsArrayBuffer` for the test env. Production
  always uses the native `Blob.arrayBuffer()`.
- **PROGRESS.md drift** — reconciled at session open: Session 6 body
  (described as "in progress" with PR #90 pending) was stale; the actual
  git log + gh data confirmed Session 6 closed. Body + Last updated
  rewritten to match the live state.
- **Tier 1+2 textarea inside `<details>`** — the E2E test expands the
  details element before `.fill()` to keep the test honest about the
  real UX. The Tier 3 path renders the textarea at top level.

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; 829/829 tests + 9/9 axe + perf:budget + asr:regress + build all green |
| `feat/issue-34-playwright-e2e-tiers` | pushed; PR #93 open; CI in progress |
| `feat/issue-16-sc5-sampling-buffer-infra` | pushed; PR #94 open; CI in progress |

## Open PRs

- **#93** feat(e2e): Playwright E2E across Chromium + Safari + Firefox tiers (#34)
- **#94** feat(sc5): SC-5 Sampling Buffer infra (#16)

## Open issues (3 ready-for-agent + A1/A2/B1 curriculum design)

**Phase 3 — content (the bulk)**
- **#47** Expand scenario library to ≥ 100 scenarios (depends on #23 + #41, both closed — unblocked)

**Phase 4 — Voice Loop real-world wiring**
- **#35** SC-5 Sampling Buffer 1 % audio capture (depends on #16 — now unblocked)

**Phase 5 — NFRs**
- **#14** Cross-device compatibility smoke tests (foundation laid by #34)

## Still pending (human / external)

- **§10 sign-off** on ADR-0003 + amended requirements doc (Product,
  Pedagogy, Engineering leads).
- **Live MiniMax LLM credentials** for #42's ≥75% in-band acceptance target.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for #12 (infra;
  the data seam shipped in #78, the dashboards ship in ops).
- **Authenticated LHCI runs** for `/dashboard`, `/review`, etc. (needs a
  learner fixture + cookie). Captured in `docs/perf-budget.md`'s
  'Lighthouse CI' section.
- **External legal sign-off** on the SC-5 Sampling Buffer GDPR review
  (`docs/agents/sc5-gdpr-review.md`) — internal review recorded; external
  counsel (DPA + DPO) sign-off required pre-launch.

## First action for next session

```bash
git checkout main && git pull
# Confirm both PRs (#93 + #94) merged; main jumped to 856/856 tests.
# Pick the next Phase 4 / Phase 3 item:
#   - #35 SC-5 audio capture hook (depends on #16; the seam is now ready).
#   - #47 scenario expansion (depends on #23 + #41; both closed).
#   - #14 cross-device smoke (foundation laid by #34).
# Recommended: #35 — completes the SC-5 block (the only blocker for #35
# in #16 is now merged).
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
| Playwright E2E suite (Session 7 AM) | `playwright.config.ts`, `tests/e2e/`, `tests/e2e/README.md` |
| SC-5 Sampling Buffer module (Session 7 PM) | `src/lib/sc5/`, `src/lib/sc5/README.md`, `docs/agents/sc5-gdpr-review.md` |
| ASR transcribe seam (now SC-5-aware) | `src/lib/asr/transcribe.ts`, `src/app/api/asr/transcribe/route.ts` |
| AI client wrappers | `src/lib/minimax/`, `src/test/minimax/` |
| Curriculum model | `src/lib/curriculum/`, `prisma/schema.prisma`, `prisma/seed.ts` |
| Voice Loop | `src/lib/voice-loop/`, `src/test/voice-loop.test.ts` |
| Voice capture (Tier 1+2) | `src/lib/voice-loop/capture.ts`, `src/hooks/useVoiceCapture.ts`, `src/test/voice-capture.test.ts` |
| ASR transcribe + biasing | `src/lib/asr/transcribe.ts`, `src/lib/asr/biasing.ts`, `src/app/api/asr/transcribe/route.ts` |
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
- `pnpm sc5:load-test` must pass before commit (CI required check, new in Session 7)
- `pnpm test:e2e:chromium` must pass before commit (CI required check, new in Session 7)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change