import {
  SELF_REPORT_KIND,
  isAffectiveFilterSignal,
  type AffectiveFilterSignal,
  type SignalKind,
  type SignalSource,
} from "./types";

export const STORAGE_PREFIX = "portuguese-teacher:affective:";

export function affectiveStorageKey(learnerId: string): string {
  return `${STORAGE_PREFIX}${learnerId}`;
}

export function loadSignals(learnerId: string): AffectiveFilterSignal[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(affectiveStorageKey(learnerId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAffectiveFilterSignal);
  } catch {
    return [];
  }
}

export function saveSignals(learnerId: string, signals: AffectiveFilterSignal[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(affectiveStorageKey(learnerId), JSON.stringify(signals));
}

export function appendSignal(signal: AffectiveFilterSignal): AffectiveFilterSignal[] {
  const current = loadSignals(signal.learnerId);
  const next = [...current, signal];
  saveSignals(signal.learnerId, next);
  return next;
}

export function clearSignals(learnerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(affectiveStorageKey(learnerId));
}

export function makeSignalId(learnerId: string, occurredAt: string, kind: SignalKind): string {
  const stamp = occurredAt.replace(/[^0-9]/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `${learnerId}:${kind}:${stamp}:${random}`;
}

export type RecordSignalInput = {
  learnerId: string;
  source: SignalSource;
  kind: SignalKind;
  value?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
  context?: Record<string, unknown>;
  now?: Date;
  confidenceCheckinEnabled?: boolean;
};

export function recordSignal(input: RecordSignalInput): AffectiveFilterSignal | null {
  if (input.kind === SELF_REPORT_KIND && input.confidenceCheckinEnabled === false) {
    return null;
  }
  const occurredAt = (input.now ?? new Date()).toISOString();
  const signal: AffectiveFilterSignal = {
    id: makeSignalId(input.learnerId, occurredAt, input.kind),
    learnerId: input.learnerId,
    source: input.source,
    kind: input.kind,
    occurredAt,
    value: input.value,
    rating: input.rating,
    context: input.context,
  };
  appendSignal(signal);
  return signal;
}

export function recordSignals(inputs: RecordSignalInput[]): AffectiveFilterSignal[] {
  const out: AffectiveFilterSignal[] = [];
  for (const input of inputs) {
    const signal = recordSignal(input);
    if (signal) out.push(signal);
  }
  return out;
}
