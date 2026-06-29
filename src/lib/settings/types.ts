import type { RetrievalMode } from "./retrieval";
import { DEFAULT_RETRIEVAL_MODE, isRetrievalMode } from "./retrieval";

export type CFTiming = "immediate" | "end-of-conversation";

export type CaptionsPref = "on" | "off";

export type ReducedMotionPref = "auto" | "reduce" | "no-preference";

export type TtsVoiceId = "minimax-pt-pt-female-1";

export type TtsVoice = {
  id: TtsVoiceId;
  dialect: "pt-PT";
  label: string;
};

export const TTS_VOICE_OPTIONS: ReadonlyArray<TtsVoice> = [
  {
    id: "minimax-pt-pt-female-1",
    dialect: "pt-PT",
    label: "Catarina (pt-PT, female)",
  },
];

export const DEFAULT_TTS_VOICE: TtsVoice = TTS_VOICE_OPTIONS[0]!;

export function isTtsVoiceId(value: unknown): value is TtsVoiceId {
  return typeof value === "string" && TTS_VOICE_OPTIONS.some((v) => v.id === value);
}

export type Settings = {
  voiceSpeed: number;
  cfTiming: CFTiming;
  captions: CaptionsPref;
  reducedMotion: ReducedMotionPref;
  textOnlyMode: boolean;
  retrievalMode: RetrievalMode;
  voiceRecordingOptIn: boolean;
  confidenceCheckinOptIn: boolean;
  weeklyGoalMinutes: number;
  ttsVoice: TtsVoice;
};

export const DEFAULT_SETTINGS: Settings = {
  voiceSpeed: 1.0,
  cfTiming: "immediate",
  captions: "on",
  reducedMotion: "auto",
  textOnlyMode: false,
  retrievalMode: DEFAULT_RETRIEVAL_MODE,
  voiceRecordingOptIn: false,
  confidenceCheckinOptIn: false,
  weeklyGoalMinutes: 105,
  ttsVoice: DEFAULT_TTS_VOICE,
};

export const VOICE_SPEED_RANGE = { min: 0.75, max: 1.25, step: 0.05 } as const;

export const WEEKLY_GOAL_RANGE = { min: 50, max: 300, step: 5 } as const;

export type SettingsPatch = Partial<Omit<Settings, "ttsVoice">> & {
  ttsVoice?: Partial<TtsVoice>;
};

export function clampVoiceSpeed(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.voiceSpeed;
  return Math.min(VOICE_SPEED_RANGE.max, Math.max(VOICE_SPEED_RANGE.min, value));
}

export function clampWeeklyGoal(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.weeklyGoalMinutes;
  return Math.min(WEEKLY_GOAL_RANGE.max, Math.max(WEEKLY_GOAL_RANGE.min, value));
}

export function normalizeTtsVoice(patch: Partial<TtsVoice> | undefined): TtsVoice {
  if (!patch) return DEFAULT_SETTINGS.ttsVoice;
  const id = isTtsVoiceId(patch.id) ? patch.id : DEFAULT_SETTINGS.ttsVoice.id;
  const base = TTS_VOICE_OPTIONS.find((v) => v.id === id) ?? DEFAULT_SETTINGS.ttsVoice;
  return {
    ...base,
    ...patch,
    id: base.id,
    dialect: "pt-PT",
  };
}

export function applySettingsPatch(base: Settings, patch: SettingsPatch): Settings {
  return {
    ...base,
    ...patch,
    voiceSpeed:
      patch.voiceSpeed !== undefined ? clampVoiceSpeed(patch.voiceSpeed) : base.voiceSpeed,
    retrievalMode:
      patch.retrievalMode !== undefined && isRetrievalMode(patch.retrievalMode)
        ? patch.retrievalMode
        : base.retrievalMode,
    weeklyGoalMinutes:
      patch.weeklyGoalMinutes !== undefined
        ? clampWeeklyGoal(patch.weeklyGoalMinutes)
        : base.weeklyGoalMinutes,
    ttsVoice: normalizeTtsVoice(patch.ttsVoice),
  };
}
