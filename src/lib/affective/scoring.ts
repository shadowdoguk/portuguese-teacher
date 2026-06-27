import {
  AFFECTIVE_HIGH_THRESHOLD,
  AFFECTIVE_LOW_THRESHOLD,
  DEFAULT_WINDOW_DAYS,
  type AffectiveFilterScore,
  type AffectiveFilterSignal,
  type SignalKind,
  type Trend,
} from "./types";
import { loadSignals } from "./store";

export const NEUTRAL_SCORE = 50;
export const SATURATION_PER_KIND = 12;
export const TREND_DELTA_THRESHOLD = 5;

export type SignalWeight = {
  weight: number;
  invert: boolean;
};

export const SIGNAL_WEIGHTS: Record<SignalKind, SignalWeight> = {
  "response-latency": { weight: 0.005, invert: false },
  "silence-gap": { weight: 0.008, invert: false },
  "mic-cancel": { weight: 8, invert: false },
  "tab-blur": { weight: 6, invert: false },
  "review-skip": { weight: 4, invert: false },
  "rolling-accuracy": { weight: 30, invert: true },
  "srs-half-life-decay": { weight: 0.02, invert: false },
  "milestone-attempt": { weight: 5, invert: false },
  "unit-drop-off": { weight: 12, invert: false },
  "confidence-checkin": { weight: 8, invert: true },
};

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return NEUTRAL_SCORE;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function computeBucketValue(
  signals: AffectiveFilterSignal[],
  kind: SignalKind,
): number {
  const matching = signals.filter((s) => s.kind === kind);
  if (matching.length === 0) return 0;
  switch (kind) {
    case "response-latency":
      return average(matching.map((s) => s.value ?? 0)) / 1000;
    case "silence-gap":
      return Math.max(...matching.map((s) => s.value ?? 0)) / 1000;
    case "mic-cancel":
      return matching.length;
    case "tab-blur":
      return Math.min(matching.length, 4);
    case "review-skip":
      return Math.min(matching.length, 4);
    case "rolling-accuracy":
      return average(matching.map((s) => s.value ?? 0));
    case "srs-half-life-decay":
      return average(matching.map((s) => s.value ?? 0));
    case "milestone-attempt":
      return Math.min(matching.length, 3);
    case "unit-drop-off":
      return Math.min(matching.length, 2);
    case "confidence-checkin":
      return average(matching.map((s) => Number(s.rating ?? 3)));
  }
}

export function aggregateScore(signals: AffectiveFilterSignal[]): number {
  let score = NEUTRAL_SCORE;
  for (const [kind, config] of Object.entries(SIGNAL_WEIGHTS) as [
    SignalKind,
    SignalWeight,
  ][]) {
    const bucket = computeBucketValue(signals, kind);
    let contribution = bucket * config.weight;
    if (config.invert) {
      contribution = -contribution;
    }
    contribution = Math.max(-SATURATION_PER_KIND, Math.min(SATURATION_PER_KIND, contribution));
    score += contribution;
  }
  return clampScore(score);
}

export function computeTrend(
  firstHalf: AffectiveFilterSignal[],
  secondHalf: AffectiveFilterSignal[],
): Trend {
  const a = aggregateScore(firstHalf);
  const b = aggregateScore(secondHalf);
  const delta = b - a;
  if (delta > TREND_DELTA_THRESHOLD) return "rising";
  if (delta < -TREND_DELTA_THRESHOLD) return "falling";
  return "flat";
}

export type ScoreOptions = {
  signals?: AffectiveFilterSignal[];
  now?: Date;
};

export function affectiveFilterScore(
  learnerId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  options: ScoreOptions = {},
): AffectiveFilterScore {
  const now = options.now ?? new Date();
  const allSignals = options.signals ?? loadSignals(learnerId);
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const recent = allSignals.filter(
    (s) => new Date(s.occurredAt).getTime() >= cutoff,
  );
  const halfMs = (windowDays * 24 * 60 * 60 * 1000) / 2;
  const midCutoff = now.getTime() - halfMs;
  const firstHalf = recent.filter(
    (s) => new Date(s.occurredAt).getTime() < midCutoff,
  );
  const secondHalf = recent.filter(
    (s) => new Date(s.occurredAt).getTime() >= midCutoff,
  );
  return {
    score: aggregateScore(recent),
    trend: computeTrend(firstHalf, secondHalf),
    windowDays,
    computedAt: now.toISOString(),
    signalsConsidered: recent.length,
  };
}

export function describeScore(score: AffectiveFilterScore): "low" | "neutral" | "high" {
  if (score.score <= AFFECTIVE_LOW_THRESHOLD) return "low";
  if (score.score >= AFFECTIVE_HIGH_THRESHOLD) return "high";
  return "neutral";
}

void AFFECTIVE_LOW_THRESHOLD;
void AFFECTIVE_HIGH_THRESHOLD;
