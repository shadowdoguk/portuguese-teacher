import type { LevelBoundary } from "@/lib/curriculum";

export type AssessmentSkill = "listening" | "reading" | "writing" | "speaking";

export const ASSESSMENT_SKILLS: ReadonlyArray<AssessmentSkill> = [
  "listening",
  "reading",
  "writing",
  "speaking",
];

export type AssessmentItemKind = "listening" | "reading" | "writing" | "speaking";

export type AssessmentItem = {
  id: string;
  sourceExerciseId: string;
  sourceUnitId: string;
  sourceLessonId: string;
  kind: AssessmentItemKind;
  skill: AssessmentSkill;
  prompt: string;
  expectedAnswer?: string;
  difficulty: "easy" | "core" | "stretch";
  levelBucket: number;
};

export type AssessmentItemScore = 0 | 0.5 | 1;

export type AssessmentAnswer = {
  itemId: string;
  score: AssessmentItemScore;
  answeredAt: string;
};

export type AssessmentSkillScores = Readonly<Record<AssessmentSkill, number>>;

export type AssessmentOutcome = {
  perSkillScores: AssessmentSkillScores;
  overallScore: number;
  passed: boolean;
  recommendedAnchorUnitIds: ReadonlyArray<string>;
  rationale: string;
};

export type ProficiencyAssessmentAttempt = {
  id: string;
  learnerId: string;
  boundary: LevelBoundary;
  attemptedAt: string;
  score: number;
  passed: boolean;
  recommendedAnchorUnitIds: ReadonlyArray<string>;
  perSkillScores: AssessmentSkillScores;
  notes?: string;
};

export type TutorReferral = {
  id: string;
  learnerId: string;
  boundary: LevelBoundary;
  triggeredAt: string;
  attemptCount: number;
  reason:
    | "max-attempts-after-anchor-exhaustion"
    | "low-overall-score"
    | "anchor-cycle-detected";
  notes?: string;
};

export const ASSESSMENT_MIN_ITEMS = 15;
export const ASSESSMENT_MAX_ITEMS = 25;
export const ASSESSMENT_INITIAL_BATCH = 5;
export const ASSESSMENT_ADVANCE_THRESHOLD = 0.7;
export const ASSESSMENT_REGRESS_THRESHOLD = 0.3;

export class AssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentError";
  }
}
