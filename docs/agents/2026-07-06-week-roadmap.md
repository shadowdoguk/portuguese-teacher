# Session 23+ Roadmap — Week of 2026-07-06

**Owner:** Autonomous agent
**Goal:** Close the only open issue (#105) + ship the small hygiene wins. v1.1 backlog content work deferred.
**Status:** Plan only — execution begins in the next session that picks this up.

## TL;DR

| Day | Branch | What | Why |
| --- | --- | --- | --- |
| 1 | `feat/issue-105-pr2-provider-consolidation` | Provider consolidation (Auth + Settings + Affective → one `learnerState.ts` Provider) | Closes 2 of 4 hydration-lifecycle issues from the issue body + the "auth switching carries wrong affective baseline" bug |
| 2 | `feat/issue-105-pr3-weekly-streak-writers` | Prisma migration + `Learner.weeklyMinutes` / `streakDays` writers + lesson-completion hook + Dashboard reads | Closes 3 of 4 issues in #105 (dashboard numbers that don't update + drop-off funnel computability) |
| 3 | `feat/issue-105-pr3-weekly-streak-writers` (continue) + branch `feat/issue-105-pr4-server-side-sc5-opt-out` | Finish PR #3 → start PR #4 | Sequencing |
| 4 | `feat/issue-105-pr4-server-side-sc5-opt-out` | Server-side authoritative `sc5OptOut` gate keyed on auth cookie + per-Learner row | Closes the privacy-critical surface the GDPR review leaned on; requires PR #1 (`useLearnerId`) merged |
| 5 | `feat/lhci-authenticated-fixture` | Authenticated Learner fixture for LHCI's `/dashboard`, `/review`, `/practice` runs | Unblocks ADR-0005 §2 external dependency "Authenticated LHCI runs" — was #2 of 4 in the v1 release readiness checklist |
| 5 (parallel) | `feat/tier-b-hygiene` | 5 small hygiene wins (see Tier B section below) | Independent of the #105 vertical; cleans lint, removes dead code, and removes the act() warning surface |

## Why this order

- **#105 PR #2 first** because it touches the same files the agent just shipped PR #1 against (`src/lib/auth/AuthProvider.tsx`, `src/lib/settings/`, `src/lib/affective/`) — context is fresh, blast radius is bounded, the existing 1023-test suite is the verification gate.
- **PRs #3 and #4 next** because they're the remaining #105 slices and #4 cannot land before PR #1's `useLearnerId` hook is on main.
- **LHCI fixture** is small but unblocks an ADR-0005 release gate. The 5th day has slack for it.
- **Tier B hygiene** runs in parallel on a separate branch; cherry-picks into main weekly.

## What this does NOT include (deferred)

- **Content work** (additional A1/A2/B1 Units, 24 unscaffolded scenarios wiring, a1-2-mercearia → b1-3-cultura seeds). Self-contained but content-heavy (~3–4 days minimum). Defer until #105 ships.
- **The 5 external dependencies** that gate v1 GA per ADR-0005 §2:
  1. Live MiniMax LLM credentials (sandbox-to-prod bridge)
  2. Authenticated LHCI runs (this roadmap covers it via Day 5)
  3. Grafana + 3-region synthetic-probe workers
  4. Slack webhook for cross-device nightly
  5. External legal sign-off on `docs/agents/sc5-gdpr-review.md`
- **Production image push** to the registry (Session 22 ended with the local build, not pushed).
- **§10 sign-off** coordination with the 6 named roles.

## Tier A — The #105 vertical (4 PRs)

Each slice is independently revertable. Each requires its own brainstorming → spec → plan → execute cycle (the `docs/superpowers/specs/` and `docs/superpowers/plans/` workflow per `AGENTS.md`).

### PR #2 — Provider consolidation

**Issue body excerpt (#105 §1.4):**

> Three Provider contexts hydrate from localStorage on different lifecycles. Settings re-hydrates on user change; Affective does not. A Learner switching accounts in the same browser gets the wrong affective baseline.

**Acceptance:**
- New `src/lib/auth/learnerState.tsx` (or `src/lib/learner/`) Provider that wraps Auth + Settings + Affective behind one shared hydration lifecycle.
- Hydration keyed on the `portuguese-teacher:auth` cookie + `portuguese-teacher:user` `localStorage` (existing `AuthProvider` source of truth).
- All three sub-Providers collapse into hooks that read from the single `learnerState` context.
- The existing `useAuth()` / `useSettings()` / `useAffective()` hooks become thin wrappers around `useLearnerState()` for back-compat — or update the call sites; pick whichever lands the smaller diff.
- Tests pin: user-switch hydrates Affective baseline (currently broken), Settings hydrate once on user change (already works), 1023 existing tests stay green.

**Files touched:**
- `src/lib/auth/AuthProvider.tsx` — split into `learnerState` core + auth-only facet
- `src/lib/settings/SettingsProvider.tsx` — same
- `src/lib/affective/` (one file most likely) — same
- New `src/lib/learner/LearnerStateProvider.tsx` (or `learnerState.tsx`)
- Plus call sites affected by hook signature changes

**Risks:**
- Blast radius: the 1023 tests cover most consumers but Playwright E2E cross-page auth flows may surface issues (e.g. /profile, /dashboard re-hydration timing). Have `@playwright/test` ready.

### PR #3 — weeklyMinutes + streakDays writers + Dashboard reads

**Issue body excerpt (#105 §1.2):**

> `Learner.weeklyMinutes` and `Learner.streakDays` are never incremented. Dashboard's Weekly Goal progress bar always renders 0%; the streak line always shows the initial value.

**Acceptance:**
- `Learner.weeklyMinutes` increments on every completed lesson exercise (settled via session timer to avoid double-counting on quick revisits).
- `Learner.streakDays` increments once per calendar day where minutes > 0; resets on skip-days.
- New `LessonMinutesRecorded` event-log table (Prisma migration + model).
- Dashboard "Weekly Goal" tile and "Streak" tile read from the server query, not static defaults.
- Feature-flagged: `WRITES_WEEKLY_MINUTES=0` (default) keeps prod on the static 0; `=1` enables the migration + writers.
- Tests pin: 5 new tests around the half-life math + concurrent-write handling; Dashboard unit tests pin the per-Learner numbers flow.

**Files touched:**
- `prisma/schema.prisma` (new `LessonMinutesRecorded` model + migration)
- `src/lib/lesson/minutes.ts` (new pure function)
- `src/lib/srs/` or `src/lib/dashboard/` (writer service)
- `src/components/dashboard/DashboardClient.tsx` (queries)
- `src/app/api/dashboard/recent-mistakes/route.ts` (similar pattern)
- Prisma migration file

**Risks:**
- Touches the prod schema. Run `prisma migrate dev` locally to validate, then `prisma migrate deploy` against `portuguese-teacher:latest` in the staging pipeline.
- If the feature flag is wrong, double-counting on lesson revisits. Mitigate with session-timer + at-most-once-per-day writer.

### PR #4 — Server-side authoritative `sc5OptOut` gate

**Issue body excerpt (#105 §1.3):**

> `sc5OptOut` is client-trusted. A Learner can edit `localStorage["portuguese-teacher:settings:<id>"]` and bypass the SC-5 buffer. The GDPR review (`docs/agents/sc5-gdpr-review.md`) concluded SC-5 was legitimate-interest-eligible *because of* the per-Learner opt-out.

**Acceptance:**
- `Learner` row gains `sc5OptOut Boolean @default(false)` column (Prisma migration).
- `/api/asr/transcribe` route reads `learnerId` from the auth cookie (not the client form field), looks up `sc5OptOut` server-side, ignores the client-supplied value.
- Client-side `Settings.sc5OptOut` remains a UI surface but becomes advisory — the server is the source of truth.
- `/api/sc5/health` surfaces the audit count of "opted-out per server but not per client" (or vice versa) for v1.1 follow-up.
- Tests pin: setting `sc5OptOut=true` server-side suppresses recording; the client cannot override (fuzz the client form field with mismatched values; verify server ignores).

**Files touched:**
- `prisma/schema.prisma` (new column + migration)
- `src/app/api/asr/transcribe/route.ts` (read from cookie, lookup learner, ignore client form field)
- `src/lib/asr/transcribe.ts` (no more client-supplied `sc5OptOut` dep; take Learner row from server)
- `src/lib/sc5/recorder.ts` (unchanged; the gate moves upstream)

**Risks:**
- Privacy-critical. The fix must be a clean cut; the existing client-supplied path is a v1 known issue (`docs/agents/sc5-gdpr-review.md` calls this out).
- The auth cookie work (PR #133) is the prereq. Confirm before starting.

## Tier B — Hygiene wins

Five small independent commits, can land on one branch or be split.

### B.1 — Sweep console.* in lib / component / app code

**Files:** `src/lib/`, `src/components/`, `src/app/` — 7 sites identified by grep:
- `src/lib/observability/sink.ts` (intentional? confirm) — skip if intentional
- Other 6: route through the `ObservabilitySink` (ADR-0002 canonical seam) or remove if dead.

**Verification:** `grep -rn '\bconsole\.' src/lib src/components src/app --include="*.ts" --include="*.tsx" | grep -v ".test."` returns only intentional sinks.

### B.2 — Remove dead `handleGrade` in `PracticeSession.tsx`

**Issue:** `handleGrade` is defined at line 188 but no UI invokes it. Either wire a real grade UI or remove the dead code.

**Recommendation:** Wire the UI. The voice-loop turn page should expose "Again / Hard / Good / Easy" buttons after each turn (matches the SRS `RECALL_GRADES` contract). This is what the user does after a free-form turn.

If wiring is too large a slice for Tier B, **just remove** the dead `handleGrade` + the `practice-session.test.tsx` smoke test, and file a follow-up issue to wire the buttons.

### B.3 — Fix the eslint-disable in `ReviewCardMedia.tsx`

**File:** `src/components/review/ReviewCardMedia.tsx:48` has `eslint-disable-next-line @next/next/no-img-element`.

**Recommendation:** Swap `<img>` for `next/image` with a remote-pattern allowlist for the asset CDN. If the asset URL is local-only, this becomes a one-liner.

### B.4 — Tighten the act() warning in `lesson-player.test.tsx`

**Issue:** Vitest emits React 18 act() warnings on `lesson-player.test.tsx` per Session 22's Task 2 run output. The tests still pass but the warnings are noise.

**Recommendation:** Wrap the `render(withAuth(...))` call in `act()` or use `await screen.findBy*` instead of `screen.getBy*` + manual waits. Trivial fix.

### B.5 — Cross-file dead-code sweep

While the 5 components are fresh, look for any helpers / types / fixture functions that the changes made unreachable. Specifically:
- `useLearnerId` -> `useAuth().user?.id` — is the previous "demo-learner" check pattern duplicated anywhere else (e.g. SSR routes, middleware draft)?
- The shared helper `src/test/auth-helpers.tsx` — any test that should now use it but doesn't?

## Day 5 — Authenticated LHCI Learner fixture

**Goal:** Unblock the "Authenticated LHCI runs for /dashboard, /review, /practice" row in ADR-0005 §2.

**Files touched:**
- `lighthouserc.json` or `.lighthouserc/authenticated.cjs` — add a second workflow target that signs in a fixture Learner before navigation.
- `tests/fixtures/authenticated-learner.ts` — new helper (parallel to `src/test/auth-helpers.tsx` but for Playwright).
- `.github/workflows/lighthouse.yml` — duplicate the LHCI job with the auth fixture.

**Acceptance:**
- `pnpm lhci:authenticated` runs the `/dashboard`, `/review`, `/practice` pages with a signed-in cookie.
- Reports upload as a separate artifact on the nightly cron.
- Aggregated metrics surface alongside the unauthenticated baseline in `.lighthouseci/`.

## Verification gates for every PR

Per `AGENTS.md` and the Session 22 close-out:

- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — green (1023+ tests; same threshold as Session 22 baseline)
- `pnpm build` — green
- `pnpm perf:budget` — green
- `pnpm test:a11y` — green
- `pnpm asr:regress` — green (1.08%/4.04% baseline unchanged)
- Playwright E2E — green (no new flakes beyond the assess-404 fix already on PR #142)

## Cross-cutting decisions for the executor

1. **Sequencing**: PR #2 first (same files as PR #1, context fresh). PR #3 next (needs Prisma migration; carries prod risk). PR #4 last (privacy-critical, needs cookie work from #133 + useLearnerId from PR #1).
2. **Branching strategy**: one branch per PR, all branch names under `feat/issue-<N>-<slug>`. Reuse the `feat/issue-105-per-learner-persistence` umbrella naming.
3. **External review points**:
   - Privacy: PR #4 needs an explicit "the server is the source of truth" decision per `docs/agents/sc5-gdpr-review.md`. Document the change in CONTEXT.md's `Voice-Recording Opt-In` entry.
   - Schema: PR #3's `LessonMinutesRecorded` table needs to match the existing `SrsReviewRecord` / `SrsRecallEvent` style for consistency.
4. **When to call for user help**: if any of these require external access (live LLM credentials, prod DB, Grafana), stop and ask. Otherwise proceed.

## References

- [#105 issue body](https://github.com/shadowdoguk/portuguese-teacher/issues/105) — the 4 sub-issues, each maps to a PR
- [PR #142](https://github.com/shadowdoguk/portuguese-teacher/pull/142) — PR #1 (`useLearnerId` hook); prerequisite for PRs #2 / #3 / #4
- [PR #134](https://github.com/shadowdoguk/portuguese-teacher/pull/134) — #133, the auth cookie work; prerequisite for PR #4
- [Session 22 handoff](./../PROGRESS.md) (`PROGRESS.md` — Session 22 section) — close-out of PR #142 and the assess-404 test fix
- [ADR-0005 §1 v1.1 backlog](./../adr/0005-v1-release-scope-and-readiness.md) — confirms Tier A closes the only open issue and unblocks one of the GA release gates
- [sc5-gdpr-review.md](./sc5-gdpr-review.md) — the GDPR posture PR #4 has to honour
