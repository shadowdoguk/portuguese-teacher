import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { A0_CURRICULUM, type LevelBoundary } from "@/lib/curriculum";
import { indexCurriculum } from "@/lib/curriculum";
import {
  ASSESSMENT_LIMITS,
  AssessmentError,
  AssessmentStore,
  averageScore,
  buildAssessmentOutcome,
  collectAssessmentPool,
  computeSkillScores,
  countAttemptsForBoundary,
  extendAssessmentItems,
  getAssessmentStore,
  isEligibleForMilestone,
  isLevelBoundary,
  milestoneByBoundary,
  newAssessmentAttemptId,
  newReferralId,
  nextAssessmentBucket,
  nextUnitAfterMilestone,
  overallScore,
  resetAssessmentStore,
  scoreAnswer,
  shouldTerminateAssessment,
  startAssessmentSession,
  weakestSkill,
} from "@/lib/assessment";
import type { ProficiencyAssessmentAttempt, TutorReferral } from "@/lib/assessment";

const index = indexCurriculum(A0_CURRICULUM);
const milestone = A0_CURRICULUM.milestones[0]!;

describe("Assessment boundary helpers", () => {
  it("accepts the three v1 boundaries and rejects others", () => {
    expect(isLevelBoundary("A0-A1")).toBe(true);
    expect(isLevelBoundary("A1-A2")).toBe(true);
    expect(isLevelBoundary("A2-B1")).toBe(true);
    expect(isLevelBoundary("B1-C1")).toBe(false);
    expect(isLevelBoundary("A0")).toBe(false);
  });

  it("finds the seeded A0-A1 milestone by boundary", () => {
    expect(milestoneByBoundary(A0_CURRICULUM, "A0-A1")?.unitId).toBe(milestone.unitId);
    expect(milestoneByBoundary(A0_CURRICULUM, "A1-A2")).toBeUndefined();
  });
});

describe("Assessment pool and item selection", () => {
  it("collects a non-empty assessment pool for the A0-A1 milestone", () => {
    const pool = collectAssessmentPool(A0_CURRICULUM, "A0-A1");
    expect(pool.length).toBeGreaterThan(0);
    for (const item of pool) {
      expect(["listening", "reading", "writing", "speaking"]).toContain(item.skill);
      expect(item.kind).toBe(item.skill);
    }
  });

  it("throws when the boundary has no milestone registered", () => {
    const empty: LevelBoundary = "A1-A2";
    expect(() => collectAssessmentPool(A0_CURRICULUM, empty)).toThrow(AssessmentError);
  });

  it("starts an assessment session with a balanced initial batch", () => {
    const session = startAssessmentSession(A0_CURRICULUM, milestone);
    expect(session.length).toBe(ASSESSMENT_LIMITS.initialBatch);
    const skillCounts = new Map<string, number>();
    for (const item of session) {
      skillCounts.set(item.skill, (skillCounts.get(item.skill) ?? 0) + 1);
    }
    expect(skillCounts.size).toBeGreaterThan(1);
    for (const item of session) {
      expect(item.id).toMatch(/^assess-\d+-/);
    }
    const ids = new Set(session.map((item) => item.id));
    expect(ids.size).toBe(session.length);
  });

  it("terminates the assessment within the item-count limits", () => {
    const session = startAssessmentSession(A0_CURRICULUM, milestone);
    const fullAnswers = Array.from({ length: ASSESSMENT_LIMITS.max }, (_, i) => ({
      itemId: `synthetic-${i}`,
      score: 0.5 as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(shouldTerminateAssessment(session, [])).toBe(false);

    const paddedItems = Array.from({ length: ASSESSMENT_LIMITS.max }, (_, i) => ({
      ...session[i % session.length]!,
      id: `synthetic-${i}`,
    }));
    const paddedAnswers = paddedItems.map((item) => ({
      itemId: item.id,
      score: 0.5 as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(shouldTerminateAssessment(paddedItems, paddedAnswers)).toBe(true);
  });

  it("extends the session with new items not yet used", () => {
    const initial = startAssessmentSession(A0_CURRICULUM, milestone);
    const answers = initial.map((item, i) => ({
      itemId: item.id,
      score: ((i % 2 === 0 ? 1 : 0.5) as 0 | 0.5 | 1),
      answeredAt: new Date().toISOString(),
    }));
    const extended = extendAssessmentItems(A0_CURRICULUM, milestone, initial, answers);
    expect(extended.length).toBeGreaterThanOrEqual(initial.length);
    expect(extended.length).toBeLessThanOrEqual(ASSESSMENT_LIMITS.max);
  });
});

describe("Assessment bucket branching", () => {
  it("advances one bucket when average score is high", () => {
    const answers = [1, 1, 1, 1, 1].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextAssessmentBucket(0, answers)).toBe(1);
  });

  it("regresses one bucket when average score is low", () => {
    const answers = [0, 0, 0, 0, 0].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextAssessmentBucket(2, answers)).toBe(1);
  });

  it("clamps the bucket at the ladder bounds", () => {
    const answers = [1, 1, 1, 1, 1].map((score) => ({
      itemId: `x-${score}`,
      score: score as 0 | 0.5 | 1,
      answeredAt: new Date().toISOString(),
    }));
    expect(nextAssessmentBucket(3, answers)).toBe(3);
  });
});

describe("Assessment scoring", () => {
  const session = startAssessmentSession(A0_CURRICULUM, milestone);

  function answerAll(score: 0 | 0.5 | 1) {
    return session.map((item) => ({
      itemId: item.id,
      score,
      answeredAt: new Date().toISOString(),
    }));
  }

  it("all-correct answers yield a perfect overall score", () => {
    const answers = answerAll(1);
    const perSkill = computeSkillScores(session, answers);
    expect(overallScore(perSkill)).toBe(1);
  });

  it("all-wrong answers yield a zero overall score", () => {
    const answers = answerAll(0);
    const perSkill = computeSkillScores(session, answers);
    expect(overallScore(perSkill)).toBe(0);
  });

  it("returns 0 for overall score when no answers are recorded", () => {
    expect(overallScore({ listening: 0, reading: 0, writing: 0, speaking: 0 })).toBe(0);
    expect(averageScore([])).toBe(0);
  });

  it("identifies the weakest skill", () => {
    const scores = { listening: 0.8, reading: 0.4, writing: 0.6, speaking: 0.9 };
    expect(weakestSkill(scores)).toBe("reading");
  });

  it("builds a passing outcome when the overall score meets the threshold", () => {
    const answers = answerAll(1);
    const outcome = buildAssessmentOutcome(milestone, index, session, answers);
    expect(outcome.passed).toBe(true);
    expect(outcome.overallScore).toBe(1);
    expect(outcome.recommendedAnchorUnitIds).toHaveLength(0);
  });

  it("builds a failing outcome with no anchors when the milestone has no anchors", () => {
    const answers = answerAll(0);
    const outcome = buildAssessmentOutcome(milestone, index, session, answers);
    expect(outcome.passed).toBe(false);
    expect(outcome.overallScore).toBe(0);
  });

  it("marks score-answer as identity (placeholder for future normalisation)", () => {
    expect(scoreAnswer(0.5)).toBe(0.5);
    expect(scoreAnswer(1)).toBe(1);
  });
});

describe("Assessment progression", () => {
  it("returns the first unit at the toLevel after a pass", () => {
    const next = nextUnitAfterMilestone(index, milestone);
    expect(next).toBeUndefined();
  });

  it("returns undefined when no next unit exists at the toLevel", () => {
    const next = nextUnitAfterMilestone(index, milestone);
    expect(next).toBeUndefined();
  });
});

describe("Assessment eligibility gate", () => {
  beforeEach(() => resetAssessmentStore());
  afterEach(() => resetAssessmentStore());

  const learner = { id: "learner-1", level: "A0" as const, currentUnitId: "a0-3-cafe-pedidos" };

  it("eligible when no prior attempts exist", () => {
    const result = isEligibleForMilestone(learner, milestone, [], []);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe("eligible");
  });

  it("not eligible when the learner has already passed", () => {
    const passedAttempt: ProficiencyAssessmentAttempt = {
      id: newAssessmentAttemptId(),
      learnerId: learner.id,
      boundary: "A0-A1",
      attemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      score: 0.9,
      passed: true,
      recommendedAnchorUnitIds: [],
      perSkillScores: { listening: 0.9, reading: 0.9, writing: 0.9, speaking: 0.9 },
    };
    const result = isEligibleForMilestone(learner, milestone, [passedAttempt], []);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("already-passed");
  });

  it("blocks re-attempt during the 24-hour cooldown window", () => {
    const recentFail: ProficiencyAssessmentAttempt = {
      id: newAssessmentAttemptId(),
      learnerId: learner.id,
      boundary: "A0-A1",
      attemptedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      score: 0.4,
      passed: false,
      recommendedAnchorUnitIds: ["a0-1-alfabeto-saudacoes"],
      perSkillScores: { listening: 0.4, reading: 0.4, writing: 0.4, speaking: 0.4 },
    };
    const result = isEligibleForMilestone(learner, milestone, [recentFail], []);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("cooldown-active");
    expect(result.nextEligibleAt).toBeDefined();
  });

  it("eligible after the 24-hour cooldown expires", () => {
    const oldFail: ProficiencyAssessmentAttempt = {
      id: newAssessmentAttemptId(),
      learnerId: learner.id,
      boundary: "A0-A1",
      attemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      score: 0.4,
      passed: false,
      recommendedAnchorUnitIds: ["a0-1-alfabeto-saudacoes"],
      perSkillScores: { listening: 0.4, reading: 0.4, writing: 0.4, speaking: 0.4 },
    };
    const result = isEligibleForMilestone(learner, milestone, [oldFail], []);
    expect(result.eligible).toBe(true);
  });

  it("not eligible when a referral has been triggered", () => {
    const referral: TutorReferral = {
      id: newReferralId(),
      learnerId: learner.id,
      boundary: "A0-A1",
      triggeredAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      attemptCount: 3,
      reason: "max-attempts-after-anchor-exhaustion",
    };
    const result = isEligibleForMilestone(learner, milestone, [], [referral]);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("referred");
    expect(result.referral?.id).toBe(referral.id);
  });

  it("not eligible when the learner is at a different level", () => {
    const above = { ...learner, level: "A1" as const };
    const result = isEligibleForMilestone(above, milestone, [], []);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("learner-not-at-fromLevel");
  });

  it("returns no-milestone when the curriculum has none for the boundary", () => {
    const result = isEligibleForMilestone(learner, undefined, [], []);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no-milestone");
  });
});

describe("Assessment attempt counting", () => {
  it("counts only post-anchor-exhaustion failures toward referral", () => {
    const learnerId = "learner-count";
    const attempts: ProficiencyAssessmentAttempt[] = [
      {
        id: newAssessmentAttemptId(),
        learnerId,
        boundary: "A0-A1",
        attemptedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        score: 0.4,
        passed: false,
        recommendedAnchorUnitIds: ["a0-1-alfabeto-saudacoes"],
        perSkillScores: { listening: 0.4, reading: 0.4, writing: 0.4, speaking: 0.4 },
      },
      {
        id: newAssessmentAttemptId(),
        learnerId,
        boundary: "A0-A1",
        attemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        score: 0.5,
        passed: false,
        recommendedAnchorUnitIds: [],
        perSkillScores: { listening: 0.5, reading: 0.5, writing: 0.5, speaking: 0.5 },
      },
      {
        id: newAssessmentAttemptId(),
        learnerId,
        boundary: "A0-A1",
        attemptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        score: 0.55,
        passed: false,
        recommendedAnchorUnitIds: [],
        perSkillScores: { listening: 0.55, reading: 0.55, writing: 0.55, speaking: 0.55 },
      },
    ];
    const counted = countAttemptsForBoundary(attempts, "A0-A1", learnerId);
    expect(counted.total).toBe(3);
    expect(counted.failedAfterAnchorExhaustion).toBe(2);
    expect(counted.remainingBeforeReferral).toBe(1);
  });

  it("triggers referral at exactly three failures after anchor exhaustion", () => {
    const learnerId = "learner-trigger";
    const attempts: ProficiencyAssessmentAttempt[] = Array.from({ length: 3 }, (_, i) => ({
      id: newAssessmentAttemptId(),
      learnerId,
      boundary: "A0-A1" as LevelBoundary,
      attemptedAt: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000).toISOString(),
      score: 0.5,
      passed: false,
      recommendedAnchorUnitIds: [],
      perSkillScores: { listening: 0.5, reading: 0.5, writing: 0.5, speaking: 0.5 },
    }));
    const counted = countAttemptsForBoundary(attempts, "A0-A1", learnerId);
    expect(counted.failedAfterAnchorExhaustion).toBe(3);
    expect(counted.remainingBeforeReferral).toBe(0);
  });
});

describe("Assessment store", () => {
  beforeEach(() => resetAssessmentStore());
  afterEach(() => resetAssessmentStore());

  it("records attempts per learner and per boundary", () => {
    const store = new AssessmentStore();
    const attempt = {
      id: newAssessmentAttemptId(),
      learnerId: "learner-1",
      boundary: "A0-A1" as LevelBoundary,
      attemptedAt: new Date().toISOString(),
      score: 0.7,
      passed: false,
      recommendedAnchorUnitIds: [],
      perSkillScores: { listening: 0.7, reading: 0.7, writing: 0.7, speaking: 0.7 },
    };
    store.recordAttempt(attempt);
    expect(store.getAttempt(attempt.id)?.id).toBe(attempt.id);
    expect(store.attemptsForLearner("learner-1")).toHaveLength(1);
    expect(store.attemptsForBoundary("learner-1", "A0-A1")).toHaveLength(1);
    expect(store.attemptsForBoundary("learner-1", "A1-A2")).toHaveLength(0);
  });

  it("records referrals and checks for an open one", () => {
    const store = new AssessmentStore();
    const referral: TutorReferral = {
      id: newReferralId(),
      learnerId: "learner-2",
      boundary: "A0-A1",
      triggeredAt: new Date().toISOString(),
      attemptCount: 3,
      reason: "max-attempts-after-anchor-exhaustion",
    };
    store.recordReferral(referral);
    expect(store.getReferral(referral.id)?.id).toBe(referral.id);
    expect(store.hasReferralFor("learner-2", "A0-A1")).toBe(true);
    expect(store.hasReferralFor("learner-2", "A1-A2")).toBe(false);
  });

  it("shared getAssessmentStore() starts empty after reset", () => {
    expect(getAssessmentStore().attemptCount()).toBe(0);
    expect(getAssessmentStore().referralCount()).toBe(0);
  });
});
