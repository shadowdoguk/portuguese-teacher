export {
  AffectiveProvider,
  AffectiveContext,
  useAffective,
  useClientSignal,
  useDocumentVisibilityTracker,
  useScoreSnapshot,
} from "./AffectiveProvider";
export type { AffectiveContextValue } from "./AffectiveProvider";
export {
  AFFECTIVE_LOW_THRESHOLD,
  AFFECTIVE_HIGH_THRESHOLD,
  DEFAULT_WINDOW_DAYS,
  SIGNAL_KIND_VALUES,
  SELF_REPORT_KIND,
  isAffectiveFilterSignal,
} from "./types";
export type {
  AffectiveFilterSignal,
  AffectiveFilterScore,
  SignalKind,
  SignalSource,
  Trend,
} from "./types";
export {
  STORAGE_PREFIX,
  affectiveStorageKey,
  loadSignals,
  saveSignals,
  appendSignal,
  clearSignals,
  recordSignal,
  recordSignals,
  makeSignalId,
} from "./store";
export type { RecordSignalInput } from "./store";
export {
  NEUTRAL_SCORE,
  SATURATION_PER_KIND,
  TREND_DELTA_THRESHOLD,
  SIGNAL_WEIGHTS,
  aggregateScore,
  computeTrend,
  computeBucketValue,
  affectiveFilterScore,
  describeScore,
  clampScore,
} from "./scoring";
export type { SignalWeight, ScoreOptions } from "./scoring";
export {
  buildAffectiveDirective,
  pickAnchorVariant,
  shouldInjectDirective,
} from "./directive";
export type { AffectiveDirective, LlmTone, AnchorCandidate, AnchorVariant } from "./directive";
