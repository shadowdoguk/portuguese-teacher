import type { LevelBoundary, Milestone } from "@/lib/curriculum";
import { LEVEL_BOUNDARIES } from "@/lib/curriculum";
import type {
  ProficiencyAssessmentAttempt,
  TutorReferral,
} from "./types";

export type EligibilityReason =
  | "eligible"
  | "no-milestone"
  | "learner-not-at-fromLevel"
  | "cooldown-active"
  | "already-passed"
  | "referred";

export type EligibilityResult = {
  eligible: boolean;
  reason: EligibilityReason;
  nextEligibleAt?: string;
  referral?: TutorReferral;
};

export function isEligibleForMilestone(
  learner: {
    id: string;
    level: "A0" | "A1" | "A2" | "B1";
    currentUnitId?: string;
  },
  milestone: Milestone | undefined,
  attempts: ReadonlyArray<ProficiencyAssessmentAttempt>,
  referrals: ReadonlyArray<TutorReferral>,
  now: () => string = () => new Date().toISOString(),
): EligibilityResult {
  if (!milestone) {
    return { eligible: false, reason: "no-milestone" };
  }
  if (learner.level !== milestone.fromLevel) {
    return { eligible: false, reason: "learner-not-at-fromLevel" };
  }

  const passed = attempts.find(
    (a) => a.boundary === milestone.boundary && a.passed,
  );
  if (passed) {
    return { eligible: false, reason: "already-passed" };
  }

  const openReferral = referrals.find(
    (r) => r.boundary === milestone.boundary && r.learnerId === learner.id,
  );
  if (openReferral) {
    return { eligible: false, reason: "referred", referral: openReferral };
  }

  const boundaryAttempts = attempts
    .filter((a) => a.boundary === milestone.boundary && a.learnerId === learner.id)
    .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));

  const last = boundaryAttempts[boundaryAttempts.length - 1];
  if (last) {
    const lastAttemptedAt = new Date(last.attemptedAt).getTime();
    const cooldownMs = milestone.cooldownHours * 60 * 60 * 1000;
    const nextEligibleAtMs = lastAttemptedAt + cooldownMs;
    const nowMs = new Date(now()).getTime();
    if (nowMs < nextEligibleAtMs) {
      return {
        eligible: false,
        reason: "cooldown-active",
        nextEligibleAt: new Date(nextEligibleAtMs).toISOString(),
      };
    }
  }

  return { eligible: true, reason: "eligible" };
}

export type CountedAttempts = {
  total: number;
  failedAfterAnchorExhaustion: number;
  remainingBeforeReferral: number;
};

export function countAttemptsForBoundary(
  attempts: ReadonlyArray<ProficiencyAssessmentAttempt>,
  boundary: LevelBoundary,
  learnerId: string,
): CountedAttempts {
  const boundaryAttempts = attempts.filter(
    (a) => a.boundary === boundary && a.learnerId === learnerId,
  );
  const failedAfterAnchorExhaustion = boundaryAttempts.filter(
    (a) => !a.passed && a.recommendedAnchorUnitIds.length === 0,
  );
  const total = boundaryAttempts.length;
  const remaining = Math.max(0, 3 - failedAfterAnchorExhaustion.length);
  return {
    total,
    failedAfterAnchorExhaustion: failedAfterAnchorExhaustion.length,
    remainingBeforeReferral: remaining,
  };
}

export function isLevelBoundaryInScope(value: string): value is LevelBoundary {
  return LEVEL_BOUNDARIES.includes(value as LevelBoundary);
}
