# Issue #105 PR #3 Design — Learner.weeklyMinutes + streakDays writers + Dashboard reads

**Date:** 2026-07-06
**Status:** Draft — execution deferred to a future session
**Branch:** `feat/issue-105-pr3-weekly-streak-writers` (already created, no commits yet)
**Depends on:** PR #143 (`useLearnerId` + Provider consolidation) on main

## Why this PR

Issue #105 §1.2:

> `Learner.weeklyMinutes` and `Learner.streakDays` are never incremented. Dashboard's Weekly Goal progress bar always renders 0%; the streak line always shows the initial value. Requirements §6.7 (drop-off funnel per Unit) is non-computable because the per-Learner minutes are static.

The Dashboard's "Weekly Goal" tile always reads 0% (because `user.weeklyMinutes` stays at 0) and the streak always reads the initial value (because `user.streakDays` is never touched). The drop-off funnel §6.7 needs per-Learner minutes-over-time, which the static 0 makes impossible.

## Key design decision — localStorage writers (not DB)

The Prisma `Learner` model (`prisma/schema.prisma:204`) has only `id`, `externalRef`, `createdAt` and the placement-attempts relation. It does **not** have `weeklyMinutes` / `streakDays` / `level` / `currentUnitId` columns.

The `Learner` fields the Dashboard reads (including `weeklyMinutes`, `streakDays`) are stored in **`portuguese-teacher:user`** localStorage as part of the `Learner` TypeScript shape, hydrated by `AuthProvider`.

**Decision for v1 of PR #3: localStorage writers.** No Prisma migration, no schema change. The writers sit alongside `AuthProvider.persist()` and update the same `portuguese-teacher:user` JSON. Same-module, same-shape; no DB roundtrip; no schema risk.

**Why not DB?**
- Cross-device sync is a separate concern (§6.7 drop-off funnel needs it, but a lesson-completion writer doesn't).
- A Prisma migration in this PR bundles two concerns together — they should split.
- DB persistence + sync is larger; defer to a future PR (call it "Per-Learner persistence to DB — sync").
- v1 of PR #3 makes the Dashboard numbers move, which is what users see.

## What PR #3 changes

### 1. New module: `src/lib/learner/progress.ts`

Pure functions for the increment math (no side effects, easy to test):

```ts
// patchWeeklyMinutes(current, incrementMinutes) -> updated Learner
//   - Adds `incrementMinutes` to current.weeklyMinutes (clamped at >= 0).
//   - Returns a new Learner object with the field updated.

// patchStreakDays(current, now) -> updated Learner
//   - If the last-active date (from `portuguese-teacher:active:<learnerId>`)
//     is yesterday → increment streakDays by 1.
//   - If the same calendar day → keep streakDays unchanged.
//   - If a gap > 1 day → reset streakDays to 1.
//   - Always update "last active" to today.
//   - Returns a new Learner object.
//
// recordActiveDate(learnerId): void (writes `portuguese-teacher:active:<id>`).
```

### 2. Lesson-completion hook in `LessonPlayer.tsx`

When `authoredCompleted === authoredTotal` and the lesson wasn't previously marked complete in this session, fire `useLearnerProgress().onLessonComplete(lesson.estimatedMinutes)`. The hook:
- Reads the active Learner from `useLearnerState()`.
- Calls `patchWeeklyMinutes` + `patchStreakDays` on the unified Learner shape.
- Persists back to `portuguese-teacher:user` (the `AuthProvider.persist` write).
- Records the active-date.

### 3. New hook: `useLearnerProgress()`

Lives in `src/lib/learner/progress.tsx`. Exposes:
- `onLessonComplete(incrementMinutes: number)` — updates weekly + streak + active-date.
- `weeklyMinutes`, `streakDays` — exposed for components that don't subscribe to the whole Learner.

Reading happens through `useLearnerState()` already; the hook is the write side.

### 4. Dashboard wiring

The Dashboard already reads `user.weeklyMinutes` and `user.streakDays` from `useAuth()`. After PR #3 the values actually move. The Dashboard's existing tile layout stays; no UI change.

### 5. Tests

- `src/test/learner-progress.test.ts` — pure-function tests for `patchWeeklyMinutes` and `patchStreakDays`. ~12 tests covering:
  - Patch adds correctly (no clamping needed for non-negative).
  - Patch is cumulative across calls.
  - Streak first-ever call → 1 day.
  - Streak same-day repeat → unchanged.
  - Streak next-day → +1.
  - Streak after 2-day gap → reset to 1.
  - Streak after 7-day gap → reset to 1.
  - `recordActiveDate` is idempotent for the same day.
- `src/test/lesson-completion-writer.test.tsx` — integration test that mounts LessonPlayer, exercises all authored items, asserts the `portuguese-teacher:user` localStorage value has updated weeklyMinutes + streakDays.
- Optionally: `src/test/dashboard-numbers.test.tsx` — render DashboardClient with a Learner seeded to non-zero values, assert the Weekly Goal tile shows the right percentage.

### 6. Files touched

| File | Status | Purpose |
| --- | --- | --- |
| `src/lib/learner/progress.ts` | **Create** | Pure functions (`patchWeeklyMinutes`, `patchStreakDays`, `recordActiveDate`). |
| `src/lib/learner/progress.tsx` | **Create** | `useLearnerProgress()` hook + `LessonCompletionTracker` component. |
| `src/components/lesson/LessonPlayer.tsx` | **Modify** | Mount `LessonCompletionTracker` (or fire inline) when `authoredCompleted === authoredTotal`. |
| `src/lib/auth/AuthProvider.tsx` | **Modify** (small) | Expose `setUser` / `patchUser` helper that the writer uses to persist. |
| `src/components/dashboard/DashboardClient.tsx` | **No change** | Already reads `user.weeklyMinutes` and `user.streakDays` — the values just need to move. |
| `src/test/learner-progress.test.ts` | **Create** | 12 pure-function tests. |
| `src/test/lesson-completion-writer.test.tsx` | **Create** | Integration test. |
| `src/test/dashboard-numbers.test.tsx` | **Create** (optional) | Dashboard tile reading test. |

### 7. Acceptance criteria

- `pnpm test` shows +12 minimum (the progress pure-function tests).
- `grep -rn '"streakDays":\s*0\b' src/lib/auth/__tests__/fixtures.ts` style fixture: existing fixtures with `streakDays: 0` / `weeklyMinutes: 0` start state still pass.
- Dashboard's Weekly Goal tile renders the `% of this week` math against actual numbers (not always 0%).
- Streak tile renders the true streak count.
- Lesson completion fires exactly once per session (debounce / once-per-mount guard).
- All existing 1027 tests + new tests + lint + typecheck green.

### 8. Risks

- **Double-write on React StrictMode double-invocation.** Mitigate with a debounce flag inside the hook (only fire once per authored-exercise completion).
- **Cross-tab writes.** localStorage writes don't propagate across tabs without a `storage` event listener. Acceptable for v1: if a Learner uses two tabs the writers race. Add a `storage` listener in a follow-up if it becomes a real issue.
- **localStorage quota.** The `Learner` shape is small (~1 kB). Adding a single `lastActive` timestamp doesn't tip past 1.5 kB. No risk.
- **No cross-device sync.** Documented as deferred.

### 9. What PR #3 does NOT do

- No Prisma migration (deferred to "Per-Learner persistence to DB").
- No server-side route for incremental writes (deferred to the DB PR).
- No `LessonMinutesRecorded` event-log table (the idea in the original roadmap was based on an assumption that we'd write to DB; with localStorage there's no need for an event log).
- No new Dashboard tiles (the existing ones just stop being always-0).

### 10. Followup issue candidates

- "Per-Learner persistence to DB" — Prisma migration for `weeklyMinutes` / `streakDays` / `level` / `currentUnitId`. Adds the `LessonMinutesRecorded` event log. Wires a server-side `POST /api/learner/progress` route. Synchronises cross-device.
- "Cross-tab storage event listener" — fires a `storage` event when another tab writes, so a tab not currently authoring lessons still sees the streak update.
- `pnpm perf:budget:update` (separate from #105) — refresh `.lighthouseci/bundle-baseline.json` against current main; bundled alarm is currently firing on `feat/issue-105-pr2-provider-consolidation` for reasons unrelated to #105 (verified via `git stash`).
