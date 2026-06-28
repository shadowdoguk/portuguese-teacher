export type Dialect = "pt-PT";

export type Level = "A0" | "A1" | "A2" | "B1";

export const LEVELS: readonly Level[] = ["A0", "A1", "A2", "B1"] as const;

export type LearnerGoal = "travel" | "heritage" | "work" | "romance";

export const LEARNER_GOALS: readonly { value: LearnerGoal; label: string; blurb: string }[] = [
  { value: "travel", label: "Travel", blurb: "Ordering food, asking for directions, small talk." },
  { value: "heritage", label: "Heritage", blurb: "Family stories, regional vocabulary, listening." },
  { value: "work", label: "Work", blurb: "Meetings, email, professional register." },
  { value: "romance", label: "Romance", blurb: "Conversational warmth, idioms, playfulness." },
];

export const NATIVE_LANGUAGES: readonly string[] = [
  "English",
  "Spanish",
  "French",
  "Italian",
  "German",
  "Mandarin",
  "Japanese",
  "Korean",
  "Arabic",
  "Portuguese (BR)",
  "Other",
];

export type Learner = {
  id: string;
  name: string;
  email: string;
  dialect: Dialect;
  level: Level;
  streakDays: number;
  weeklyMinutes: number;
  createdAt: string;
  nativeLanguage?: string;
  selfAssessmentLevel?: Level;
  goals?: LearnerGoal[];
  currentUnitId?: string;
};

export const DEFAULT_NATIVE_LANGUAGE = "English";
export const DEFAULT_SELF_ASSESSMENT: Level = "A0";
