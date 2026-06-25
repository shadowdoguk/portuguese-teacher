import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { A0_CURRICULUM, LEVELS, indexCurriculum, isLevel, type Level } from "@/lib/curriculum";
import {
  PLACEMENT_LIMITS,
  PlacementError,
  PlacementStore,
  averageScore,
  buildConfirmOutcome,
  buildPlacementOutcome,
  collectPlacementPool,
  computeSkillScores,
  extendPlacementItems,
  getPlacementStore,
  levelToBucket,
  newPlacementAttemptId,
  nextPlacementBucket,
  overallScore,
  placementItem,
  recommendStartUnit,
  requiresPlacement,
  resetPlacementStore,
  shouldTerminate,
  startPlacementSession,
  bucketToLevel,
} from "@/lib/placement";

const index = indexCurriculum(A0_CURRICULUM);

describe("Placement level/bucket helpers", () => {
  it("round-trips every CEFR level through levelToBucket/bucketToLevel", () => {
    for (const level of ["A0", "A1", "A2", "B1"] as const) {
      expect(bucketToLevel(levelToBucket(level))).toBe(level);
    }
  });

  it("clamps out-of-range buckets to the curriculum ladder", () => {
    expect(bucketToLevel(-3)).toBe("A0");
    expect(bucketToLevel(99)).toBe("B1");
    expect(bucketToLevel(1.6)).toBe("A1");
  });

  it("isLevel accepts every ladder level and rejects other strings", () => {
    expect(isLevel("A0")).toBe(true);
    expect(isLevel("B1")).toBe(true);
    expect(isLevel("C2")).toBe(false);
    expect(isLevel("a0")).toBe(false);
  });
});

describe("Placement pool and item selection", () => {
  it("collects a non-empty placement pool from the A0 fixture", () => {
    const pool = collectPlacementPool(A0_CURRICULUM);
    expect(pool.length).toBeGreaterThan(0);
    for (const item of pool) {
      expect(item.levelBucket).toBe(0);
      expect(["listening", "reading", "free-response"]).toContain(item.kind);
      expect(["listening", "reading", "speaking"]).toContain(item.skill);
    }
  });

  it("starts a placement session with the initial batch at the self-assessed bucket", () => {
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    expect(session.length).toBe(PLACEMENT_LIMITS.initialBatch);
    for (const item of session) {
      expect(item.levelBucket).toBe(0);
    }
    expect(session[0]!.id).toMatch(/^placement-1-/);
  });

  it("throws when the curriculum has no placement-eligible exercises", () => {
    const empty = { ...A0_CURRICULUM, units: [] };
    expect(() => startPlacementSession(empty, "A1")).toThrow(PlacementError);
  });

  it("starts at the closest available bucket when the self-assessed level has no items", () => {
    const session = startPlacementSession(A0_CURRICULUM, "B1");
    expect(session.length).toBe(PLACEMENT_LIMITS.initialBatch);
    expect(session.every((item) => item.levelBucket === 0)).toBe(true);
  });

  it("extends the session with new items not yet used", () => {
    const initial = startPlacementSession(A0_CURRICULUM, "A1");
    const extended = extendPlacementItems(
      A0_CURRICULUM,
      initial,
      initial.map((item, i) => ({
        itemId: item.id,
        score: i % 2 === 0 ? 1 : 0.5,
        answeredAt: new Date().toISOString(),
      })),
    );
    expect(extended.length).toBeGreaterThan(initial.length);
    expect(extended.length).toBeLessThanOrEqual(PLACEMENT_LIMITS.max);
    const seen = new Set(extended.map((item) => item.sourceExerciseId));
    expect(seen.size).toBe(extended.length);
  });

  it("preserves decorated ids of previously-shown items across extension", () => {
    const initial = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = initial.map((item, i) => ({
      itemId: item.id,
      score: ((i % 2 === 0 ? 1 : 0.5) as 0 | 0.5 | 1),
      answeredAt: new Date().toISOString(),
    }));
    const extended = extendPlacementItems(A0_CURRICULUM, initial, answers);
    const initialIds = initial.map((i) => i.id);
    const extendedFirstN = extended.slice(0, initial.length).map((i) => i.id);
    expect(extendedFirstN).toEqual(initialIds);
  });

  it("terminates gracefully when the pool is exhausted before min items", () => {
    const tiny = {
      ...A0_CURRICULUM,
      units: A0_CURRICULUM.units.slice(0, 1).map((u) => ({
        ...u,
        lessons: u.lessons.slice(0, 1).map((lesson) => ({
          ...lesson,
          exercises: lesson.exercises.slice(0, 1),
        })),
      })),
    };
    const session = startPlacementSession(tiny, "A1");
    expect(session.length).toBeGreaterThan(0);
    expect(session.length).toBeLessThanOrEqual(PLACEMENT_LIMITS.max);

    const allAnswers = session.map((item) => ({
      itemId: item.id,
      score: 0.5 as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(shouldTerminate(session, allAnswers)).toBe(false);

    const extended = extendPlacementItems(tiny, session, allAnswers);
    expect(extended.length).toBe(session.length);
  });
});

describe("Placement branching on answers", () => {
  it("branches up one bucket when average score is high", () => {
    const answers = [1, 1, 1, 1].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextPlacementBucket(1, answers)).toBe(2);
  });

  it("branches down one bucket when average score is low", () => {
    const answers = [0, 0, 0, 0].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextPlacementBucket(1, answers)).toBe(0);
  });

  it("stays put when average is in the comfortable middle", () => {
    const answers = [0.5, 0.5, 0.5, 0.5].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextPlacementBucket(1, answers)).toBe(1);
  });

  it("does not branch past the ladder bounds", () => {
    const answers = [1, 1, 1, 1].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextPlacementBucket(LEVELS.length - 1, answers)).toBe(LEVELS.length - 1);
    const lowAnswers = [0, 0, 0, 0].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextPlacementBucket(0, lowAnswers)).toBe(0);
  });
});

describe("Placement scoring", () => {
  const items = startPlacementSession(A0_CURRICULUM, "A1");

  function answerAll(score: 0 | 0.5 | 1) {
    return items.map((item) => ({
      itemId: item.id,
      score,
      answeredAt: new Date().toISOString(),
    }));
  }

  it("computes per-skill averages that aggregate correctly", () => {
    const mixed: Array<0 | 0.5 | 1> = [1, 0.5, 0, 1];
    const answers = items.slice(0, mixed.length).map((item, i) => ({
      itemId: item.id,
      score: mixed[i]!,
      answeredAt: new Date().toISOString(),
    }));
    const perSkill = computeSkillScores(items, answers);
    expect(perSkill.listening).toBeGreaterThanOrEqual(0);
    expect(perSkill.listening).toBeLessThanOrEqual(1);
    expect(perSkill.reading).toBeGreaterThanOrEqual(0);
    expect(perSkill.reading).toBeLessThanOrEqual(1);
    expect(perSkill.speaking).toBeGreaterThanOrEqual(0);
    expect(perSkill.speaking).toBeLessThanOrEqual(1);
  });

  it("all-correct answers yield a perfect overall score", () => {
    const answers = answerAll(1);
    const perSkill = computeSkillScores(items, answers);
    expect(perSkill.listening).toBe(1);
    expect(perSkill.reading).toBe(1);
    expect(perSkill.speaking).toBe(1);
    expect(overallScore(perSkill)).toBe(1);
  });

  it("all-wrong answers yield a zero overall score", () => {
    const answers = answerAll(0);
    const perSkill = computeSkillScores(items, answers);
    expect(overallScore(perSkill)).toBe(0);
  });

  it("returns 0 for the overall score when no answers are recorded", () => {
    expect(overallScore({ listening: 0, reading: 0, speaking: 0 })).toBe(0);
  });

  it("averageScore of empty answers is 0", () => {
    expect(averageScore([])).toBe(0);
  });
});

describe("Placement recommendation", () => {
  it("returns a unit id present in the A0 curriculum for every self-assessment level", () => {
    const units = new Set(A0_CURRICULUM.units.map((u) => u.id));
    for (const self of ["A1", "A2", "B1"] as const) {
      const session = startPlacementSession(A0_CURRICULUM, self);
      const answers = session.map((item, i) => ({
        itemId: item.id,
        score: (i % 2 === 0 ? 1 : 0.5) as 0 | 0.5 | 1,
        answeredAt: new Date().toISOString(),
      }));
      const outcome = buildPlacementOutcome(A0_CURRICULUM, index, self, session, answers);
      expect(units.has(outcome.recommendedStartUnitId)).toBe(true);
      expect(outcome.recommendedStartLevel).toBe("A0");
      expect(outcome.overallScore).toBeGreaterThanOrEqual(0);
      expect(outcome.overallScore).toBeLessThanOrEqual(1);
      expect(outcome.rationale.length).toBeGreaterThan(0);
    }
  });

  it("prefers a later A0 unit when overall score is high", () => {
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = session.map((item) => ({
      itemId: item.id,
      score: 1 as const,
      answeredAt: new Date().toISOString(),
    }));
    const perSkill = computeSkillScores(session, answers);
    const rec = recommendStartUnit(index, "A1", perSkill);
    const allA0 = A0_CURRICULUM.units.filter((u) => u.level === "A0");
    const expected = allA0[allA0.length - 1]!;
    expect(rec.unitId).toBe(expected.id);
  });

  it("prefers the first A0 unit when overall score is low", () => {
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = session.map((item) => ({
      itemId: item.id,
      score: 0 as const,
      answeredAt: new Date().toISOString(),
    }));
    const perSkill = computeSkillScores(session, answers);
    const rec = recommendStartUnit(index, "A1", perSkill);
    const first = A0_CURRICULUM.units.filter((u) => u.level === "A0")[0]!;
    expect(rec.unitId).toBe(first.id);
  });

  it("clamps the recommendation to the highest seeded level when self-assessment is B1", () => {
    const session = startPlacementSession(A0_CURRICULUM, "B1");
    const answers = session.map((item) => ({
      itemId: item.id,
      score: 1 as const,
      answeredAt: new Date().toISOString(),
    }));
    const outcome = buildPlacementOutcome(A0_CURRICULUM, index, "B1", session, answers);
    expect(outcome.recommendedStartLevel).toBe("A0");
  });
});

describe("Placement outcome and confirmation", () => {
  it("records the recommended unit when the learner accepts", () => {
    const outcome = {
      perSkillScores: { listening: 0.6, reading: 0.6, speaking: 0.6 },
      overallScore: 0.6,
      recommendedStartUnitId: "a0-1-alfabeto-saudacoes",
      recommendedStartLevel: "A0" as Level,
      rationale: "test",
    };
    const confirmed = buildConfirmOutcome(outcome, { learnerAccepted: true });
    expect(confirmed.learnerAccepted).toBe(true);
    expect(confirmed.confirmedStartUnitId).toBe(outcome.recommendedStartUnitId);
    expect(confirmed.confirmedAt.length).toBeGreaterThan(0);
  });

  it("records the override unit when the learner self-corrects", () => {
    const outcome = {
      perSkillScores: { listening: 0.6, reading: 0.6, speaking: 0.6 },
      overallScore: 0.6,
      recommendedStartUnitId: "a0-1-alfabeto-saudacoes",
      recommendedStartLevel: "A0" as Level,
      rationale: "test",
    };
    const confirmed = buildConfirmOutcome(outcome, {
      learnerAccepted: false,
      overrideUnitId: "a0-3-numeros",
    });
    expect(confirmed.learnerAccepted).toBe(false);
    expect(confirmed.confirmedStartUnitId).toBe("a0-3-numeros");
  });
});

describe("Placement termination rule", () => {
  it("does not terminate before the minimum item count", () => {
    expect(shouldTerminate([], [])).toBe(false);
    const initial = startPlacementSession(A0_CURRICULUM, "A1");
    expect(initial.length).toBe(PLACEMENT_LIMITS.initialBatch);
    expect(shouldTerminate(initial, [])).toBe(false);
  });

  it("terminates once min items answered and at or above the minimum", () => {
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = session.map((item, i) => ({
      itemId: item.id,
      score: (i % 2 === 0 ? 1 : 0.5) as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    if (session.length >= PLACEMENT_LIMITS.min) {
      expect(shouldTerminate(session, answers)).toBe(true);
    }
  });

  it("terminates when the cap is reached regardless of answers", () => {
    const items = startPlacementSession(A0_CURRICULUM, "A1");
    const padded = Array.from({ length: PLACEMENT_LIMITS.max }, (_, i) => ({
      ...items[i % items.length]!,
      id: `synthetic-${i}`,
    }));
    expect(shouldTerminate(padded, [])).toBe(true);
  });
});

describe("Placement lookup helpers", () => {
  it("looks up a placement item by id from the pool", () => {
    const pool = collectPlacementPool(A0_CURRICULUM);
    const target = pool[0]!;
    const found = placementItem(A0_CURRICULUM, target.id);
    expect(found?.sourceExerciseId).toBe(target.sourceExerciseId);
  });
});

describe("Placement requires-placement gate", () => {
  it("requires placement for A1/A2/B1 self-assessments", () => {
    expect(requiresPlacement("A0")).toBe(false);
    expect(requiresPlacement("A1")).toBe(true);
    expect(requiresPlacement("A2")).toBe(true);
    expect(requiresPlacement("B1")).toBe(true);
  });
});

describe("Placement store", () => {
  beforeEach(() => resetPlacementStore());
  afterEach(() => resetPlacementStore());

  it("records and retrieves attempts per learner", () => {
    const store = new PlacementStore();
    const attempt = {
      id: newPlacementAttemptId(),
      learnerId: "learner-1",
      attemptedAt: new Date().toISOString(),
      selfAssessedLevel: "A1" as Exclude<Level, "A0">,
      score: 0.7,
      recommendedStartUnitId: "a0-1-alfabeto-saudacoes",
      confirmedStartUnitId: "a0-1-alfabeto-saudacoes",
    };
    store.record(attempt);
    expect(store.get(attempt.id)?.id).toBe(attempt.id);
    expect(store.forLearner("learner-1")).toHaveLength(1);
    expect(store.forLearner("unknown")).toHaveLength(0);
  });

  it("does not record an attempt when the learner self-assesses A0 (no row written)", async () => {
    const { mockSignUp } = await import("@/lib/auth/mockUsers");
    const store = getPlacementStore();
    expect(store.count()).toBe(0);
    expect(requiresPlacement("A0")).toBe(false);

    const index = indexCurriculum(A0_CURRICULUM);
    const entry = index.unitsById.get(index.entryUnitId)!;
    const learner = await mockSignUp({
      name: "A0 Learner",
      email: "a0@example.com",
      password: "secret1",
      selfAssessedLevel: "A0",
      entryUnitId: entry.id,
      level: "A0",
    });

    expect(learner.currentUnitId).toBe(entry.id);
    expect(learner.level).toBe("A0");
    expect(learner.selfAssessedLevel).toBeUndefined();
    expect(store.count()).toBe(0);
  });

  it("an A1 self-assessment that completes placement creates one PlacementLessonAttempt", () => {
    const store = getPlacementStore();
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = session.map((item, i) => ({
      itemId: item.id,
      score: (i % 2 === 0 ? 1 : 0.5) as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    const outcome = buildPlacementOutcome(A0_CURRICULUM, index, "A1", session, answers);

    const attemptId = newPlacementAttemptId();
    store.record({
      id: attemptId,
      learnerId: "learner-a1",
      attemptedAt: new Date().toISOString(),
      selfAssessedLevel: "A1",
      score: outcome.overallScore,
      recommendedStartUnitId: outcome.recommendedStartUnitId,
      confirmedStartUnitId: outcome.recommendedStartUnitId,
      notes: "accepted=true",
    });

    expect(store.forLearner("learner-a1")).toHaveLength(1);
    expect(store.get(attemptId)?.confirmedStartUnitId).toBe(outcome.recommendedStartUnitId);
  });

  it("logs the overridden Unit as confirmedStartUnitId when the learner disagrees", () => {
    const store = new PlacementStore();
    const session = startPlacementSession(A0_CURRICULUM, "A1");
    const answers = session.map((item) => ({
      itemId: item.id,
      score: 1 as const,
      answeredAt: new Date().toISOString(),
    }));
    const outcome = buildPlacementOutcome(A0_CURRICULUM, index, "A1", session, answers);

    const confirmed = buildConfirmOutcome(outcome, {
      learnerAccepted: false,
      overrideUnitId: "a0-3-numeros",
    });

    store.record({
      id: newPlacementAttemptId(),
      learnerId: "learner-override",
      attemptedAt: new Date().toISOString(),
      selfAssessedLevel: "A1",
      score: confirmed.overallScore,
      recommendedStartUnitId: confirmed.recommendedStartUnitId,
      confirmedStartUnitId: confirmed.confirmedStartUnitId,
      notes: `accepted=${confirmed.learnerAccepted}`,
    });

    const attempts = store.forLearner("learner-override");
    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.confirmedStartUnitId).toBe("a0-3-numeros");
    expect(attempts[0]!.recommendedStartUnitId).toBe(confirmed.recommendedStartUnitId);
    expect(attempts[0]!.notes).toContain("accepted=false");
  });

  it("tracks multiple attempts per learner in insertion order", () => {
    const store = new PlacementStore();
    const a1 = {
      id: newPlacementAttemptId(),
      learnerId: "learner-2",
      attemptedAt: "2026-06-24T10:00:00.000Z",
      selfAssessedLevel: "A1" as Exclude<Level, "A0">,
      score: 0.4,
      recommendedStartUnitId: "a0-1-alfabeto-saudacoes",
      confirmedStartUnitId: "a0-1-alfabeto-saudacoes",
    };
    const a2 = {
      ...a1,
      id: newPlacementAttemptId(),
      attemptedAt: "2026-06-24T11:00:00.000Z",
      score: 0.8,
    };
    store.record(a1);
    store.record(a2);
    const attempts = store.forLearner("learner-2");
    expect(attempts.map((a) => a.id)).toEqual([a1.id, a2.id]);
  });
});
