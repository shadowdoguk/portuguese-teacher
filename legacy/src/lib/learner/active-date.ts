/**
 * Per-Learner "last active" timestamp store. Used by the streak math in
 * `src/lib/learner/progress.ts` to decide whether to increment, hold, or
 * reset the streak.
 *
 * Storage strategy mirrors the other per-Learner localStorage keys:
 * `portuguese-teacher:active:<learnerId>` carries an ISO-8601 string.
 */
export const ACTIVE_DATE_PREFIX = "portuguese-teacher:active:";

export function activeDateKey(learnerId: string): string {
  return `${ACTIVE_DATE_PREFIX}${learnerId}`;
}

export function readActiveDate(learnerId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeDateKey(learnerId));
}

export function writeActiveDate(learnerId: string, when: Date | string): void {
  if (typeof window === "undefined") return;
  const iso = when instanceof Date ? when.toISOString() : when;
  window.localStorage.setItem(activeDateKey(learnerId), iso);
}

export function recordActiveDate(learnerId: string, when: Date): void {
  writeActiveDate(learnerId, when);
}

export function clearActiveDate(learnerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activeDateKey(learnerId));
}
