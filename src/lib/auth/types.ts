export type Dialect = "pt-PT";

export type Learner = {
  id: string;
  name: string;
  email: string;
  dialect: Dialect;
  level: "A0" | "A1" | "A2" | "B1";
  streakDays: number;
  weeklyMinutes: number;
  createdAt: string;
};