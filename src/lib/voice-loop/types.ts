import type { PronunciationPhonemeScore } from "@/lib/minimax/types";

export type BrowserTier = 1 | 2 | 3;

export const BROWSER_TIERS: readonly BrowserTier[] = [1, 2, 3] as const;

export type PracticeMode = "free-form" | "scenario" | "drill";

export const PRACTICE_MODES: readonly PracticeMode[] = ["free-form", "scenario", "drill"] as const;

export type ErrorCategory =
  | "grammar.tense"
  | "grammar.gender"
  | "grammar.agreement"
  | "phoneme.confusion"
  | "lexical.choice"
  | "register"
  | "fluency.hesitation";

export type FeedbackKind = "corrective" | "confirmatory" | "formative";

export type FeedbackItem = {
  kind: FeedbackKind;
  text: string;
  span?: { start: number; end: number };
  errorCategory?: ErrorCategory;
};

export type NluPayload = {
  intent: string;
  slots: Readonly<Record<string, string>>;
  grammarFeatures: ReadonlyArray<string>;
  errorCategories: ReadonlyArray<ErrorCategory>;
};

export type DifficultyRange = {
  min: number;
  max: number;
};

export type VoiceLoopTurnInput = {
  learnerText?: string;
  learnerAsrConfidence?: number;
  learnerAsrWords?: ReadonlyArray<{ word: string; confidence: number }>;
  pronunciationScore?: number;
  targetPhrase?: string;
  practiceMode: PracticeMode;
  tier: BrowserTier;
  difficultyTarget: number;
  learnerUtteranceId: string;
};

export type VoiceLoopTurn = {
  turnId: string;
  utteranceId: string;
  teacherUtterance: string;
  feedback: ReadonlyArray<FeedbackItem>;
  pronunciationScore: number;
  pronunciationPerPhoneme?: ReadonlyArray<PronunciationPhonemeScore>;
  pronunciationSource?: "endpoint" | "asr-bias" | "default";
  nextDifficultyTarget: number;
  comprehensionOk: boolean;
  fluencyMsPerWord?: number;
  generatedAt: number;
  mock: boolean;
};

export type VoiceLoopLLMPayload = {
  nlu: NluPayload;
  utterance: string;
  feedback: ReadonlyArray<FeedbackItem>;
  difficulty_estimate: number;
  comprehension_ok: boolean;
};

export type VoiceLoopTierCapabilities = {
  tier: BrowserTier;
  webSpeechApi: boolean;
  mediaRecorder: boolean;
  reason: string;
};

export const DEFAULT_DIFFICULTY_TARGET = 1.0;
export const DIFFICULTY_MIN = 0.0;
export const DIFFICULTY_MAX = 3.0;

export function isBrowserTier(value: number): value is BrowserTier {
  return value === 1 || value === 2 || value === 3;
}

export function isPracticeMode(value: string): value is PracticeMode {
  return (PRACTICE_MODES as readonly string[]).includes(value);
}
