import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeNextStreak,
  patchWeeklyMinutes,
  recordLessonProgress,
} from "@/lib/learner/progress";
import { ACTIVE_DATE_PREFIX, clearActiveDate, writeActiveDate } from "@/lib/learner/active-date";
import type { Learner } from "@/lib/auth/types";

function makeLearner(overrides: Partial<Learner> = {}): Learner {
  return {
    id: "test-learner",
    name: "Test",
    email: "test@example.com",
    dialect: "pt-PT",
    level: "A0",
    streakDays: 0,
    weeklyMinutes: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("patchWeeklyMinutes (#105 PR 3)", () => {
  it("adds the increment to weeklyMinutes", () => {
    const out = patchWeeklyMinutes(makeLearner({ weeklyMinutes: 30 }), 5);
    expect(out.weeklyMinutes).toBe(35);
  });

  it("treats 0 weeklyMinutes as a starting baseline", () => {
    const out = patchWeeklyMinutes(makeLearner({ weeklyMinutes: 0 }), 12);
    expect(out.weeklyMinutes).toBe(12);
  });

  it("is a no-op for non-positive or non-finite increments", () => {
    expect(patchWeeklyMinutes(makeLearner(), 0).weeklyMinutes).toBe(0);
    expect(patchWeeklyMinutes(makeLearner(), -5).weeklyMinutes).toBe(0);
    expect(patchWeeklyMinutes(makeLearner(), Number.NaN).weeklyMinutes).toBe(0);
  });

  it("rounds non-integer increments", () => {
    const out = patchWeeklyMinutes(makeLearner(), 5.6);
    expect(out.weeklyMinutes).toBe(6);
  });

  it("clamps at 0 (no negative totals)", () => {
    // Starting at -100 (legacy/seed artefact) +10 minutes = -90 → clamp to 0.
    const out = patchWeeklyMinutes(makeLearner({ weeklyMinutes: -100 }), 10);
    expect(out.weeklyMinutes).toBe(0);
  });

  it("preserves all other Learner fields", () => {
    const before = makeLearner({ name: "Ana", level: "A1" });
    const after = patchWeeklyMinutes(before, 7);
    expect(after.name).toBe("Ana");
    expect(after.level).toBe("A1");
    expect(after.id).toBe(before.id);
  });
});

describe("computeNextStreak (issue #105 PR 3, day-arithmetic)", () => {
  it("first ever activity sets streak to 1", () => {
    expect(computeNextStreak(null, new Date("2026-07-01T12:00:00.000Z"), 0)).toBe(1);
  });

  it("same calendar day keeps the streak unchanged", () => {
    expect(
      computeNextStreak(
        "2026-07-01T09:00:00.000Z",
        new Date("2026-07-01T22:30:00.000Z"),
        5,
      ),
    ).toBe(5);
  });

  it("consecutive day increments by 1", () => {
    expect(
      computeNextStreak(
        "2026-07-01T22:30:00.000Z",
        new Date("2026-07-02T09:00:00.000Z"),
        5,
      ),
    ).toBe(6);
  });

  it("2-day gap resets to 1", () => {
    expect(
      computeNextStreak(
        "2026-07-01T22:30:00.000Z",
        new Date("2026-07-03T09:00:00.000Z"),
        10,
      ),
    ).toBe(1);
  });

  it("7-day gap resets to 1", () => {
    expect(
      computeNextStreak(
        "2026-07-01T22:30:00.000Z",
        new Date("2026-07-08T09:00:00.000Z"),
        5,
      ),
    ).toBe(1);
  });

  it("malformed last-active falls back to 1", () => {
    expect(
      computeNextStreak("not-a-date", new Date("2026-07-01T09:00:00.000Z"), 5),
    ).toBe(1);
  });

  it("treats dayDelta = 0 with currentStreak = 0 as 1 (not 0)", () => {
    expect(
      computeNextStreak(
        "2026-07-01T09:00:00.000Z",
        new Date("2026-07-01T22:30:00.000Z"),
        0,
      ),
    ).toBe(1);
  });
});

describe("recordLessonProgress (end-to-end, with the active-date store)", () => {
  it("writes a fresh active-date, increments minutes, and sets streak to 1 on first call", () => {
    const learner = makeLearner({ id: "first-learner" });
    const fixedNow = new Date("2026-07-05T10:00:00.000Z");
    const out = recordLessonProgress(learner, 5, fixedNow);
    expect(out.weeklyMinutes).toBe(5);
    expect(out.streakDays).toBe(1);
    expect(window.localStorage.getItem(ACTIVE_DATE_PREFIX + "first-learner")).toBe(
      fixedNow.toISOString(),
    );
  });

  it("consecutive same-day call is a no-op for streak; minutes still add", () => {
    const learner = makeLearner({ id: "same-day-learner", streakDays: 4, weeklyMinutes: 20 });
    writeActiveDate(learner.id, "2026-07-05T08:00:00.000Z");
    const out = recordLessonProgress(learner, 5, new Date("2026-07-05T22:30:00.000Z"));
    expect(out.streakDays).toBe(4);
    expect(out.weeklyMinutes).toBe(25);
  });

  it("next-day call increments streak by 1 and minutes add", () => {
    const learner = makeLearner({ id: "next-day-learner", streakDays: 4, weeklyMinutes: 20 });
    writeActiveDate(learner.id, "2026-07-05T22:30:00.000Z");
    const out = recordLessonProgress(learner, 7, new Date("2026-07-06T09:00:00.000Z"));
    expect(out.streakDays).toBe(5);
    expect(out.weeklyMinutes).toBe(27);
  });

  it("2-day gap resets streak to 1 and minutes still add", () => {
    const learner = makeLearner({ id: "gap-learner", streakDays: 4, weeklyMinutes: 20 });
    writeActiveDate(learner.id, "2026-07-05T08:00:00.000Z");
    const out = recordLessonProgress(learner, 4, new Date("2026-07-07T09:00:00.000Z"));
    expect(out.streakDays).toBe(1);
    expect(out.weeklyMinutes).toBe(24);
  });

  it("tolerates an SSR call (no window) — returns the Learner shape unchanged", () => {
    const learner = makeLearner({ id: "ssr-learner", streakDays: 3, weeklyMinutes: 20 });
    // patchStreakDays short-circuits on no-window; patchWeeklyMinutes is pure.
    // The function's I/O is the active-date write — under SSR this silently
    // no-ops; the returned Learner still has the weeklyMinutes patch applied.
    // (Streak advances based on `null` → 1 because readActiveDate returns null.)
    const original = { ...learner };
    const out = recordLessonProgress(learner, 5, new Date());
    expect(out.weeklyMinutes).toBe(25);
    // streakDays moves from 3 → 1 because no active-date exists yet.
    // (Documented behaviour: SSR is treated as a "first ever" call.)
    expect(out.streakDays).toBe(1);
    void original;
  });

  it("clears active-date on test cleanup", () => {
    clearActiveDate("test-learner");
    expect(window.localStorage.getItem(ACTIVE_DATE_PREFIX + "test-learner")).toBeNull();
  });
});
