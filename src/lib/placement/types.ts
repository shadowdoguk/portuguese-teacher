import type { ExerciseDifficulty, Level } from "@/lib/curriculum";

export type PlacementSkill = "listening" | "reading" | "speaking";

export type PlacementItemKind = "listening" | "reading" | "free-response";

export type PlacementItem = {
  id: string;
  sourceExerciseId: string;
  sourceUnitId: string;
  sourceLessonId: string;
  kind: PlacementItemKind;
  skill: PlacementSkill;
  difficulty: ExerciseDifficulty;
  prompt: string;
  expectedAnswer?: string;
  levelBucket: number;
};

export type PlacementItemScore = 0 | 0.5 | 1;

export type PlacementAnswer = {
  itemId: string;
  score: PlacementItemScore;
  answeredAt: string;
};

export type PlacementSkillScores = Readonly<Record<PlacementSkill, number>>;

export type PlacementOutcome = {
  perSkillScores: PlacementSkillScores;
  overallScore: number;
  recommendedStartUnitId: string;
  recommendedStartLevel: Level;
  rationale: string;
};

export type PlacementConfirmOutcome = PlacementOutcome & {
  confirmedStartUnitId: string;
  learnerAccepted: boolean;
  confirmedAt: string;
};

export type PlacementSession = {
  learnerId: string;
  selfAssessedLevel: Exclude<Level, "A0">;
  items: ReadonlyArray<PlacementItem>;
  answers: ReadonlyArray<PlacementAnswer>;
  startedAt: string;
};

export const PLACEMENT_MIN_ITEMS = 8;
export const PLACEMENT_MAX_ITEMS = 12;
export const PLACEMENT_INITIAL_BATCH = 4;
export const PLACEMENT_ADVANCE_THRESHOLD = 0.7;
export const PLACEMENT_REGRESS_THRESHOLD = 0.3;

export class PlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacementError";
  }
}
