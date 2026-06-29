import type { RetrievalMode } from "./retrieval";
import { DEFAULT_RETRIEVAL_MODE, isRetrievalMode } from "./retrieval";

export type CFTiming = "immediate" | "end-of-conversation";

export type CaptionsPref = "on" | "off";

export type ReducedMotionPref = "auto" | "reduce" | "no-preference";

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
};

export const VOICE_SPEED_RANGE = { min: 0.75, max: 1.25, step: 0.05 } as const;

export const WEEKLY_GOAL_RANGE = { min: 50, max: 300, step: 5 } as const;

export type SettingsPatch = Partial<Settings>;

export function clampVoiceSpeed(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.voiceSpeed;
  return Math.min(VOICE_SPEED_RANGE.max, Math.max(VOICE_SPEED_RANGE.min, value));
}

export function clampWeeklyGoal(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.weeklyGoalMinutes;
  return Math.min(WEEKLY_GOAL_RANGE.max, Math.max(WEEKLY_GOAL_RANGE.min, value));
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
  };
}
