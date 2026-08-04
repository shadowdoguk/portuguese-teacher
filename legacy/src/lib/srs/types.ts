export type RecallGrade = "again" | "hard" | "good" | "easy";

export const RECALL_GRADES: readonly RecallGrade[] = ["again", "hard", "good", "easy"] as const;

export type SrsItemKind = "vocabulary" | "grammar";

export type SrsItemRef = {
  kind: SrsItemKind;
  itemId: string;
  pt: string;
  gloss: string;
  unitId: string;
  audioAssetId?: string;
  imageAssetId?: string;
  sourceScenarioId?: string;
};

export type SrsReviewRecord = {
  itemId: string;
  halfLifeMs: number;
  lastReviewedAt: number | null;
  dueAt: number;
  reviewCount: number;
  lapses: number;
};

export type SrsState = {
  items: Record<string, SrsReviewRecord>;
};

export type SrsRecallEvent = {
  event: "srs_recall";
  learnerId: string;
  itemId: string;
  grade: RecallGrade;
  halfLifeBeforeMs: number;
  halfLifeAfterMs: number;
  dueAt: number;
  timestamp: number;
};

export const SRS_HALF_LIFE_MULTIPLIERS: Readonly<Record<RecallGrade, number>> = {
  again: 0.25,
  hard: 0.5,
  good: 2.5,
  easy: 4,
};

export const INITIAL_HALF_LIFE_MS = 5 * 60 * 1000;
export const AGAIN_RESET_HALF_LIFE_MS = 5 * 60 * 1000;
export const MIN_HALF_LIFE_MS = 60 * 1000;
export const MAX_HALF_LIFE_MS = 180 * 24 * 60 * 60 * 1000;

export const SRS_QUEUE_BOUNDS = { min: 5, max: 20 } as const;
export const SRS_DEFAULT_SESSION_LIMIT = 20;

export function isRecallGrade(value: string): value is RecallGrade {
  return (RECALL_GRADES as readonly string[]).includes(value);
}
