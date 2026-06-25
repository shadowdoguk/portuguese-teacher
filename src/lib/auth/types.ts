import type { Level } from "@/lib/curriculum";

export type Dialect = "pt-PT";

export type Learner = {
  id: string;
  name: string;
  email: string;
  dialect: Dialect;
  level: Level;
  selfAssessedLevel?: Exclude<Level, "A0">;
  currentUnitId?: string;
  streakDays: number;
  weeklyMinutes: number;
  createdAt: string;
};