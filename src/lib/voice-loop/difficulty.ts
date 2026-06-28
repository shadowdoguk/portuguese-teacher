import { DIFFICULTY_MAX, DIFFICULTY_MIN, type DifficultyRange, type VoiceLoopTurn } from "./types";

export class VoiceLoopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceLoopError";
  }
}

export const DEFAULT_RANGE: DifficultyRange = {
  min: DIFFICULTY_MIN,
  max: DIFFICULTY_MAX,
};

export const DROP_ON_COMPREHENSION_FAILURE = 1.0;
export const RAISE_AFTER_CONSECUTIVE_SUCCESSES = 3;
export const RAISE_STEP = 0.5;

export type DifficultyState = {
  target: number;
  consecutiveSuccesses: number;
  recentComprehensions: ReadonlyArray<boolean>;
  range: DifficultyRange;
};

export function initialDifficulty(
  startingTarget = 1.0,
  range: DifficultyRange = DEFAULT_RANGE,
): DifficultyState {
  return clampDifficulty({
    target: startingTarget,
    consecutiveSuccesses: 0,
    recentComprehensions: [],
    range,
  });
}

export function recordTurn(
  state: DifficultyState,
  turn: Pick<VoiceLoopTurn, "comprehensionOk" | "nextDifficultyTarget">,
): DifficultyState {
  const proposed =
    typeof turn.nextDifficultyTarget === "number" && Number.isFinite(turn.nextDifficultyTarget)
      ? turn.nextDifficultyTarget
      : state.target;

  const successes = turn.comprehensionOk ? state.consecutiveSuccesses + 1 : 0;
  const recent = [...state.recentComprehensions, turn.comprehensionOk].slice(-8);

  return clampDifficulty({
    target: proposed,
    consecutiveSuccesses: successes,
    recentComprehensions: recent,
    range: state.range,
  });
}

export function adjustFromRules(state: DifficultyState, comprehensionOk: boolean): DifficultyState {
  if (!comprehensionOk) {
    return clampDifficulty({
      ...state,
      target: state.target - DROP_ON_COMPREHENSION_FAILURE,
      consecutiveSuccesses: 0,
      recentComprehensions: [...state.recentComprehensions, false].slice(-8),
    });
  }

  const nextSuccesses = state.consecutiveSuccesses + 1;
  const raised =
    nextSuccesses >= RAISE_AFTER_CONSECUTIVE_SUCCESSES ? state.target + RAISE_STEP : state.target;
  const resetSuccesses = nextSuccesses >= RAISE_AFTER_CONSECUTIVE_SUCCESSES ? 0 : nextSuccesses;

  return clampDifficulty({
    ...state,
    target: raised,
    consecutiveSuccesses: resetSuccesses,
    recentComprehensions: [...state.recentComprehensions, true].slice(-8),
  });
}

export function successRate(state: DifficultyState): number {
  if (state.recentComprehensions.length === 0) return 0;
  const wins = state.recentComprehensions.filter(Boolean).length;
  return wins / state.recentComprehensions.length;
}

export function shouldRetry(state: DifficultyState): boolean {
  return state.recentComprehensions.length >= 4 && successRate(state) < 0.4;
}

function clampDifficulty(state: DifficultyState): DifficultyState {
  const min = Math.min(state.range.min, state.range.max);
  const max = Math.max(state.range.min, state.range.max);
  const clamped = Math.min(max, Math.max(min, state.target));
  return { ...state, target: clamped };
}
