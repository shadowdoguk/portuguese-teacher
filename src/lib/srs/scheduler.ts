import {
  AGAIN_RESET_HALF_LIFE_MS,
  INITIAL_HALF_LIFE_MS,
  MAX_HALF_LIFE_MS,
  MIN_HALF_LIFE_MS,
  SRS_DEFAULT_SESSION_LIMIT,
  SRS_HALF_LIFE_MULTIPLIERS,
  type RecallGrade,
  type SrsItemRef,
  type SrsRecallEvent,
  type SrsReviewRecord,
  type SrsState,
} from "./types";

export type { SrsState } from "./types";

export class SrsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SrsError";
  }
}

function clampHalfLife(value: number): number {
  if (value < MIN_HALF_LIFE_MS) return MIN_HALF_LIFE_MS;
  if (value > MAX_HALF_LIFE_MS) return MAX_HALF_LIFE_MS;
  return value;
}

export function emptyState(): SrsState {
  return { items: {} };
}

export function isEmptyState(state: SrsState): boolean {
  return Object.keys(state.items).length === 0;
}

export function getRecord(state: SrsState, itemId: string): SrsReviewRecord | undefined {
  return state.items[itemId];
}

export function enrollItem(state: SrsState, ref: SrsItemRef, now: number): SrsState {
  if (state.items[ref.itemId]) return state;
  const record: SrsReviewRecord = {
    itemId: ref.itemId,
    halfLifeMs: INITIAL_HALF_LIFE_MS,
    lastReviewedAt: null,
    dueAt: now + INITIAL_HALF_LIFE_MS,
    reviewCount: 0,
    lapses: 0,
  };
  return {
    items: { ...state.items, [ref.itemId]: record },
  };
}

export function enrollMany(state: SrsState, refs: readonly SrsItemRef[], now: number): SrsState {
  return refs.reduce<SrsState>((acc, ref) => enrollItem(acc, ref, now), state);
}

export type ApplyRecallResult = {
  state: SrsState;
  record: SrsReviewRecord;
  event: SrsRecallEvent;
  learnerId: string;
};

export function applyRecall(
  state: SrsState,
  learnerId: string,
  itemId: string,
  grade: RecallGrade,
  now: number,
): ApplyRecallResult {
  const record = state.items[itemId];
  if (!record) {
    throw new SrsError(`Cannot grade unknown SRS item: ${itemId}`);
  }

  const halfLifeBefore = record.halfLifeMs;
  const nextHalfLife =
    grade === "again"
      ? AGAIN_RESET_HALF_LIFE_MS
      : clampHalfLife(record.halfLifeMs * SRS_HALF_LIFE_MULTIPLIERS[grade]);
  const nextLapses = grade === "again" ? record.lapses + 1 : record.lapses;

  const updated: SrsReviewRecord = {
    ...record,
    halfLifeMs: nextHalfLife,
    lastReviewedAt: now,
    dueAt: now + nextHalfLife,
    reviewCount: record.reviewCount + 1,
    lapses: nextLapses,
  };

  const event: SrsRecallEvent = {
    event: "srs_recall",
    learnerId,
    itemId,
    grade,
    halfLifeBeforeMs: halfLifeBefore,
    halfLifeAfterMs: nextHalfLife,
    dueAt: updated.dueAt,
    timestamp: now,
  };

  return {
    state: { items: { ...state.items, [itemId]: updated } },
    record: updated,
    event,
    learnerId,
  };
}

export type DueQueueOptions = {
  limit?: number;
  refs: readonly SrsItemRef[];
  now: number;
};

export type DueItem = {
  ref: SrsItemRef;
  record: SrsReviewRecord;
};

export function dueQueue(state: SrsState, options: DueQueueOptions): DueItem[] {
  const limit = options.limit ?? SRS_DEFAULT_SESSION_LIMIT;
  const due: DueItem[] = [];
  for (const ref of options.refs) {
    const record = state.items[ref.itemId];
    if (!record) continue;
    if (record.dueAt <= options.now) {
      due.push({ ref, record });
    }
  }
  due.sort((a, b) => a.record.dueAt - b.record.dueAt);
  return due.slice(0, limit);
}

export function countDue(state: SrsState, refs: readonly SrsItemRef[], now: number): number {
  let count = 0;
  for (const ref of refs) {
    const record = state.items[ref.itemId];
    if (!record) continue;
    if (record.dueAt <= now) count += 1;
  }
  return count;
}

export function dueBucketCounts(
  state: SrsState,
  refs: readonly SrsItemRef[],
  now: number,
  bucketMs: number,
  bucketCount: number,
): number[] {
  const buckets = new Array<number>(bucketCount).fill(0);
  for (const ref of refs) {
    const record = state.items[ref.itemId];
    if (!record) continue;
    const offset = record.dueAt - now;
    if (offset < 0) {
      const idx = bucketCount - 1;
      buckets[idx] = (buckets[idx] ?? 0) + 1;
      continue;
    }
    const idx = Math.min(bucketCount - 1, Math.floor(offset / bucketMs));
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets;
}

export function computeNextDue(state: SrsState, itemId: string): number | null {
  return state.items[itemId]?.dueAt ?? null;
}
