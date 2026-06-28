export type Dialect = "pt-PT";

export const PT_PT: Dialect = "pt-PT";

export const LEVELS = ["A0", "A1", "A2", "B1"] as const;
export type Level = (typeof LEVELS)[number];

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export type LevelBoundary = `${Extract<Level, "A0" | "A1" | "A2">}-${Extract<
  Level,
  "A1" | "A2" | "B1"
>}`;

export const LEVEL_BOUNDARIES: readonly LevelBoundary[] = ["A0-A1", "A1-A2", "A2-B1"] as const;

export type LessonKind =
  | "alphabet"
  | "vocabulary"
  | "grammar"
  | "listening"
  | "reading"
  | "pronunciation"
  | "fill-in"
  | "free-production"
  | "scenario"
  | "conversational";

export type PracticeExerciseKind =
  | "flashcard"
  | "fill-in"
  | "listen-and-repeat"
  | "role-play"
  | "free-response"
  | "pronunciation-drill"
  | "scenario-turn";

export type ExerciseDifficulty = "easy" | "core" | "stretch";

export type TextBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "example"; pt: string; gloss?: string }
  | { kind: "rule"; text: string }
  | { kind: "audio"; assetId: string; caption?: string }
  | { kind: "image"; assetId: string; alt: string };

export type LessonBody = {
  introduction: string;
  blocks: readonly TextBlock[];
};

export type VocabularyItem = {
  id: string;
  unitId: string;
  pt: string;
  gloss: string;
  partOfSpeech?: "noun" | "verb" | "adjective" | "adverb" | "pronoun" | "phrase";
  audioAssetId?: string;
  imageAssetId?: string;
  examplePt?: string;
  exampleGloss?: string;
};

export type GrammarPattern = {
  id: string;
  unitId: string;
  name: string;
  description: string;
  examples: ReadonlyArray<{ pt: string; gloss: string }>;
};

export type Scenario = {
  id: string;
  unitId: string;
  goal: string;
  setting: string;
  roles: { learner: string; teacher: string };
  successCriteria: ReadonlyArray<string>;
};

export type PracticeExercise = {
  id: string;
  lessonId: string;
  kind: PracticeExerciseKind;
  prompt: string;
  expectedAnswer?: string;
  difficulty: ExerciseDifficulty;
  vocabularyRefs: ReadonlyArray<string>;
  grammarRefs: ReadonlyArray<string>;
};

export type Lesson = {
  id: string;
  unitId: string;
  order: number;
  kind: LessonKind;
  title: string;
  estimatedMinutes: number;
  body: LessonBody;
  exercises: ReadonlyArray<PracticeExercise>;
};

export type RemedialAnchorReason =
  | "phoneme-confusion"
  | "grammar-gap"
  | "vocabulary-decay"
  | "scenario-struggle";

export type RemedialAnchor = {
  fromUnitId: string;
  toUnitId: string;
  reason: RemedialAnchorReason;
  note: string;
};

export type Unit = {
  id: string;
  level: Level;
  order: number;
  title: string;
  description: string;
  prerequisiteUnitIds: ReadonlyArray<string>;
  lessons: ReadonlyArray<Lesson>;
  vocabulary: ReadonlyArray<VocabularyItem>;
  grammar: ReadonlyArray<GrammarPattern>;
  scenarios: ReadonlyArray<Scenario>;
  remedialAnchors: ReadonlyArray<RemedialAnchor>;
};

export type Milestone = {
  boundary: LevelBoundary;
  fromLevel: Extract<Level, "A0" | "A1" | "A2">;
  toLevel: Extract<Level, "A1" | "A2" | "B1">;
  unitId: string;
  passingScore: number;
  itemCount: { min: number; max: number };
  cooldownHours: number;
  maxAttemptsBeforeReferral: number;
};

export type PlacementLessonAttempt = {
  learnerId: string;
  attemptedAt: string;
  selfAssessedLevel: Exclude<Level, "A0">;
  score: number;
  suggestedStartUnitId: string;
  notes?: string;
};

export type Curriculum = {
  dialect: Dialect;
  units: ReadonlyArray<Unit>;
  milestones: ReadonlyArray<Milestone>;
  entryUnitId: string;
};
