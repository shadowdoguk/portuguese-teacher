# Spec — Per-Learner persistence (issue #105), PR #1 of 4

**Date:** 2026-07-06
**Status:** Draft — awaiting user approval
**Issue:** #105 (Per-Learner persistence — five hard-coded demo-learner IDs + dashboard numbers that don't update + SC-5 opt-out that's client-trusted)
**Parent scope:** `feat/issue-105-per-learner-persistence` (multi-PR vertical slice)

## Why this is a multi-PR slice

Issue #105 is v1.1 scope (per ADR-0005 §1 + Session 19 deferred-list). The body
lists four sub-problems; collapsing them into one PR would produce a 1.5k-line
diff touching Prisma schema, auth, three Providers, a privacy-critical gate, and
multiple route handlers. We slice into 4 PRs in dependency order so each ships
green and is independently revertable:

1. **PR #1 (this spec):** Five hard-coded `"demo-learner"` constants → real
   `Learner.id` via a new `useLearnerId()` hook.
2. PR #2: Provider consolidation (Auth + Settings + Affective → one).
3. PR #3: `Learner.weeklyMinutes` + `streakDays` writers + dashboard reads.
4. PR #4: Server-side authoritative `sc5OptOut` gate.

PR #1 is the only one whose dependency graph is self-contained: it reads from
the existing `AuthProvider.user.id`, doesn't require a Prisma migration, and
unblocks the dashboard-numbers work in PR #3 (you can't aggregate per-Learner
minutes until the wire actually carries per-Learner IDs).

## What PR #1 changes

### New file — `src/lib/auth/useLearnerId.ts`

```ts
"use client";
import { useAuth } from "./useAuth";

/**
 * Returns the authenticated Learner ID, or null when no Learner is signed in
 * (loading or anonymous state). Use this in place of a hard-coded learnerId
 * constant — issue #105. Sites that perform per-Learner server work skip the
 * work when null; the existing UI surfaces already handle "nothing to do"
 * gracefully.
 */
export function useLearnerId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
```

### Modified files (5)

| File | Change |
| --- | --- |
| `src/components/lesson/LessonPlayer.tsx` | Delete `const SESSION_LEARNER_ID = "demo-learner"` (L26). Import `useLearnerId`. Replace `encodeURIComponent(SESSION_LEARNER_ID)` and `learnerId: SESSION_LEARNER_ID` with the hook value, guarded by `if (!learnerId) return;` on the SRS fetch effect. |
| `src/components/review/ReviewQueue.tsx` | Same shape — delete L25, use hook, guard SRS fetch. |
| `src/components/practice/ScenarioPlayer.tsx` | Delete `const SCENARIO_SRS_LEARNER_ID = "demo-learner"` (L50). File already calls `useAuth()` for `user.level`; extend the destructure to include `user.id`, use it (with guard). |
| `src/components/practice/ScenarioWorkspace.tsx` | Delete L14, use hook, guard. |
| `src/components/practice/PracticeSession.tsx` | Replace inline `learnerId: "demo-learner"` (L197) with the hook value, guarded inside `handleGrade`. |

### Skip-on-null pattern (consistent across all 5 sites)

For fetch effects:

```ts
useEffect(() => {
  if (!learnerId) return; // skip when no Learner
  // ... existing fetch with learnerId
}, [learnerId, ...otherDeps]);
```

For inline handlers (PracticeSession's `handleGrade`):

```ts
const handleGrade = useCallback(async (grade) => {
  if (!learnerId) return;
  // ... fetch with learnerId
}, [learnerId, history]);
```

No UI changes. The existing "nothing to do" / "no reviews yet" / "no scenarios
yet" empty states already cover the null case.

## Test strategy

### New file — `src/test/use-learner-id.test.tsx`

Three assertions pinning the hook's public contract:

1. Returns `user.id` when `useAuth()` reports `{ status: "authenticated", user }`.
2. Returns `null` when `useAuth()` reports `{ status: "anonymous" }`.
3. Returns `null` when `useAuth()` reports `{ status: "loading" }`.

Uses the same `<AuthProvider>` + `seedUser()` pattern as `scenario-adaptive.test.tsx`
(L44–58).

### Updated — `src/test/lesson-player.test.tsx`

The test renders `<LessonPlayer />` directly today, with no `AuthProvider`
wrapper. After the change `LessonPlayer` calls `useAuth()` (via
`useLearnerId()`), which throws outside a Provider. Wrap every test in
`<AuthProvider>` + `seedUser({ id: "test-learner", ... })` so the SRS fetch
hits the network with the fixture ID. This mirrors the existing pattern in
`scenario-adaptive.test.tsx`.

The mock-fetch response fixture at L136 (`learnerId: "demo-learner"` in the
returned event) is the **route's** response shape, not the component's outgoing
body — it stays unchanged. The component-side assertion at L169 only checks
`body.itemId`, so it keeps passing.

### Unchanged

- `src/test/scenario-adaptive.test.tsx` already wraps in `<AuthProvider>` and
  seeds `id: "demo-learner"`. After the change `ScenarioPlayer` reads
  `useAuth().user.id` and gets `"demo-learner"` — same value, same behaviour.
  Tests at L258 (`expect(body.learnerId).toBe("demo-learner")`) keep passing
  unchanged.
- `src/test/auth-cookie.test.tsx` — unrelated concern (cookie write/read
  contract from #133).
- All route-handler tests — routes still accept any string `learnerId`; the
  hard-coded constant was only on the client side.

## Acceptance criteria (PR #1)

- `grep -r '"demo-learner"' src/` returns zero matches in `src/components/`
  and `src/lib/auth/`. (The two `src/test/` matches are fixture strings, not
  production code paths.)
- `src/lib/auth/useLearnerId.ts` exists, exports `useLearnerId`, returns
  `string | null`.
- `src/test/use-learner-id.test.tsx` exists, all 3 assertions pass.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm perf:budget`
  all green.
- Existing test counts for the 4 test files I touch either stay flat or grow
  (no regressions).
- All 5 modified components still render correctly when authenticated, and
  the existing "empty state" UI surfaces render when no Learner is signed in.

## Out of scope (deferred to PRs #2–#4)

- Prisma schema migration adding `Learner.streakDays` / `weeklyMinutes` /
  `currentUnitId` (note: `Learner` already has them in the TypeScript type —
  these are the server-side columns).
- Provider consolidation (Auth + Settings + Affective → one).
- `LessonMinutesRecorded` event-log table + writers.
- Server-side `sc5OptOut` enforcement keyed on the authenticated Learner row.
- `src/middleware.ts` edge-gate using the `portuguese-teacher:auth` cookie
  (already shipped in #133; the gate itself remains post-#133 deferred work).

## Risks

1. **Tests that depend on a specific learner ID.** The only one I found is
   `scenario-adaptive.test.tsx:258`, which expects `"demo-learner"` and still
   gets it because the fixture seeds that ID. No other tests assert on the
   outbound `learnerId`.
2. **A previously-anonymous Learner who hits a per-Learner route.** Today they
   silently share `"demo-learner"` state. After the change they see the
   empty-state UI. This is the *intended* product behaviour per the issue
   body, but a brief user-facing note should land in the PR description.
3. **Server-side routes still accept any string.** A motivated user can still
   send `learnerId=anything` to `/api/srs/state`. PR #4 closes this with a
   server-side authoritative gate keyed on the auth cookie; PR #1 only fixes
   the client side.

## References

- Issue body: https://github.com/shadowdoguk/portuguese-teacher/issues/105
- Audit source: `/tmp/architecture-review-2026-07-01.html` (out-of-repo per
  skill convention)
- ADR-0005 §1: `docs/adr/0005-v1-release-scope-and-readiness.md`
- AuthProvider + cookie: `src/lib/auth/AuthProvider.tsx` L68, L76–86
- Existing pattern: `src/test/scenario-adaptive.test.tsx` L44–58 (`seedUser`)
