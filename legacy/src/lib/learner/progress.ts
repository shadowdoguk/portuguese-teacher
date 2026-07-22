import { readActiveDate, recordActiveDate } from "./active-date";
import type { Learner } from "@/lib/auth/types";

/**
 * Pure functions for the per-Learner progress counter math (issue #105
 * sub-slice 1.2). No side effects on the Learner shape; the only I/O is
 * to the per-Learner "last active" timestamp key in localStorage, which
 * keeps the streak math correct without coupling to AuthProvider state.
 *
 * Storage strategy for v1: the `Learner` `weeklyMinutes` + `streakDays`
 * fields live in the `portuguese-teacher:user` localStorage entry (the
 * AuthProvider's hydration source). Future "Per-Learner persistence to
 * DB" PR migrates these to the Prisma `Learner` row + cross-device sync.
 */

/**
 * Add `incrementMinutes` to the Learner's weekly-minute tally.
 * Negative or non-finite increments are no-ops.
 */
export function patchWeeklyMinutes(
  current: Learner,
  incrementMinutes: number,
): Learner {
  const safe =
    Number.isFinite(incrementMinutes) && incrementMinutes > 0
      ? Math.round(incrementMinutes)
      : 0;
  if (safe === 0) return current;
  return {
    ...current,
    weeklyMinutes: Math.max(0, (current.weeklyMinutes ?? 0) + safe),
  };
}

/**
 * Update the Learner's streak based on the calendar-day comparison
 * between `now` and the last-active timestamp stored in
 * `portuguese-teacher:active:<learnerId>`.
 *
 * Rules:
 *  - First ever activity (`lastActiveAt == null`)           → streakDays = 1
 *  - Same calendar day as last activity                      → unchanged
 *  - Exactly one calendar day later (consecutive day)        → +1
 *  - More than one calendar day later (gap)                  → reset to 1
 *
 * Always writes `now` as the new last-active timestamp.
 */
export function patchStreakDays(current: Learner, now: Date): Learner {
  const lastActiveStr = readActiveDate(current.id);
  const nextStreak = computeNextStreak(lastActiveStr, now, current.streakDays);
  recordActiveDate(current.id, now);
  return {
    ...current,
    streakDays: nextStreak,
  };
}

/**
 * Pure variant of the streak math (no I/O). Exposed so the writer can be
 * unit-tested without touching localStorage.
 *
 * @param lastActiveIso ISO string from previous run, or null.
 * @param now          The current time.
 * @param currentStreak The Learner's existing streak count.
 */
export function computeNextStreak(
  lastActiveIso: string | null,
  now: Date,
  currentStreak: number,
): number {
  const safeNow = now instanceof Date ? now : new Date(now);
  if (!lastActiveIso) return 1;

  const last = new Date(lastActiveIso);
  if (Number.isNaN(last.getTime())) return 1;

  const lastDay = startOfUtcDay(last);
  const nowDay = startOfUtcDay(safeNow);
  const dayDelta = Math.round(
    (nowDay.getTime() - lastDay.getTime()) / 86_400_000,
  );

  if (dayDelta === 0) {
    return Math.max(1, currentStreak ?? 0);
  }
  if (dayDelta === 1) {
    return Math.max(1, (currentStreak ?? 0) + 1);
  }
  return 1;
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/**
 * @returns The new weekly-tally if any increment fires this turn, plus the
 *          new streak. The caller is responsible for persisting back to the
 *          `portuguese-teacher:user` localStorage entry (via AuthProvider).
 */
export function recordLessonProgress(
  current: Learner,
  incrementMinutes: number,
  now: Date = new Date(),
): Learner {
  const withMinutes = patchWeeklyMinutes(current, incrementMinutes);
  return patchStreakDays(withMinutes, now);
}

