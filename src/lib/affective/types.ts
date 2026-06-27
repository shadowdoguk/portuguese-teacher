export type SignalSource = "client" | "server" | "self-report";

export type SignalKind =
  | "response-latency"
  | "silence-gap"
  | "mic-cancel"
  | "tab-blur"
  | "review-skip"
  | "rolling-accuracy"
  | "srs-half-life-decay"
  | "milestone-attempt"
  | "unit-drop-off"
  | "confidence-checkin";

export type AffectiveFilterSignal = {
  id: string;
  learnerId: string;
  source: SignalSource;
  kind: SignalKind;
  occurredAt: string;
  value?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
  context?: Record<string, unknown>;
};

export type Trend = "rising" | "flat" | "falling";

export type AffectiveFilterScore = {
  score: number;
  trend: Trend;
  windowDays: number;
  computedAt: string;
  signalsConsidered: number;
};

export const AFFECTIVE_LOW_THRESHOLD = 30;
export const AFFECTIVE_HIGH_THRESHOLD = 70;

export const DEFAULT_WINDOW_DAYS = 7;

export const SIGNAL_KIND_VALUES: readonly SignalKind[] = [
  "response-latency",
  "silence-gap",
  "mic-cancel",
  "tab-blur",
  "review-skip",
  "rolling-accuracy",
  "srs-half-life-decay",
  "milestone-attempt",
  "unit-drop-off",
  "confidence-checkin",
] as const;

export const SELF_REPORT_KIND: SignalKind = "confidence-checkin";

export function isAffectiveFilterSignal(input: unknown): input is AffectiveFilterSignal {
  if (typeof input !== "object" || input === null) return false;
  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.learnerId === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.occurredAt === "string" &&
    (SIGNAL_KIND_VALUES as readonly string[]).includes(candidate.kind as string)
  );
}
