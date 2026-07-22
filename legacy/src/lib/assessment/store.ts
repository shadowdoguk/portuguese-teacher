import type { LevelBoundary } from "@/lib/curriculum";
import type {
  ProficiencyAssessmentAttempt,
  TutorReferral,
} from "./types";

export class AssessmentStore {
  private readonly attempts = new Map<string, ProficiencyAssessmentAttempt>();
  private readonly attemptsByLearner = new Map<string, string[]>();
  private readonly referrals = new Map<string, TutorReferral>();
  private readonly referralsByLearner = new Map<string, string[]>();

  recordAttempt(attempt: ProficiencyAssessmentAttempt): ProficiencyAssessmentAttempt {
    this.attempts.set(attempt.id, attempt);
    const list = this.attemptsByLearner.get(attempt.learnerId) ?? [];
    list.push(attempt.id);
    this.attemptsByLearner.set(attempt.learnerId, list);
    return attempt;
  }

  recordReferral(referral: TutorReferral): TutorReferral {
    this.referrals.set(referral.id, referral);
    const list = this.referralsByLearner.get(referral.learnerId) ?? [];
    list.push(referral.id);
    this.referralsByLearner.set(referral.learnerId, list);
    return referral;
  }

  getAttempt(attemptId: string): ProficiencyAssessmentAttempt | undefined {
    return this.attempts.get(attemptId);
  }

  getReferral(referralId: string): TutorReferral | undefined {
    return this.referrals.get(referralId);
  }

  attemptsForLearner(learnerId: string): ReadonlyArray<ProficiencyAssessmentAttempt> {
    const ids = this.attemptsByLearner.get(learnerId) ?? [];
    return ids
      .map((id) => this.attempts.get(id))
      .filter((a): a is ProficiencyAssessmentAttempt => a !== undefined)
      .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  }

  attemptsForBoundary(
    learnerId: string,
    boundary: LevelBoundary,
  ): ReadonlyArray<ProficiencyAssessmentAttempt> {
    return this.attemptsForLearner(learnerId).filter((a) => a.boundary === boundary);
  }

  referralsForLearner(learnerId: string): ReadonlyArray<TutorReferral> {
    const ids = this.referralsByLearner.get(learnerId) ?? [];
    return ids
      .map((id) => this.referrals.get(id))
      .filter((r): r is TutorReferral => r !== undefined)
      .sort((a, b) => a.triggeredAt.localeCompare(b.triggeredAt));
  }

  hasReferralFor(learnerId: string, boundary: LevelBoundary): boolean {
    return this.referralsForLearner(learnerId).some((r) => r.boundary === boundary);
  }

  attemptCount(): number {
    return this.attempts.size;
  }

  referralCount(): number {
    return this.referrals.size;
  }

  clear(): void {
    this.attempts.clear();
    this.attemptsByLearner.clear();
    this.referrals.clear();
    this.referralsByLearner.clear();
  }
}

let sharedStore: AssessmentStore | undefined;

export function getAssessmentStore(): AssessmentStore {
  if (!sharedStore) {
    sharedStore = new AssessmentStore();
  }
  return sharedStore;
}

export function resetAssessmentStore(): void {
  sharedStore = new AssessmentStore();
}

export function newAssessmentAttemptId(): string {
  return `assess-attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newReferralId(): string {
  return `referral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
