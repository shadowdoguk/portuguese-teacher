import { emptyState, type SrsState } from "./scheduler";
import type { SrsRecallEvent } from "./types";

const STORAGE_KEY = "pt.srs.v1";

export type PersistedSrs = {
  version: 1;
  state: SrsState;
  recallLog: SrsRecallEvent[];
};

export function defaultPersisted(): PersistedSrs {
  return { version: 1, state: emptyState(), recallLog: [] };
}

export function loadPersisted(): PersistedSrs {
  if (typeof window === "undefined") return defaultPersisted();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw) as PersistedSrs;
    if (parsed.version !== 1 || !parsed.state || !parsed.state.items) {
      return defaultPersisted();
    }
    return parsed;
  } catch {
    return defaultPersisted();
  }
}

export function savePersisted(persisted: PersistedSrs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* quota or disabled storage; fail quietly */
  }
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type RecallSink = (event: SrsRecallEvent) => void;

export const consoleRecallSink: RecallSink = (event) => {
  if (typeof console === "undefined") return;
  console.info("[srs_recall]", event);
};
