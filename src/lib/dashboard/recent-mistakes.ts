import type { SrsRecallEvent } from "@/lib/srs/types";

export type RecentMistakeItem = {
  itemId: string;
  kind: "vocabulary" | "grammar";
  pt: string;
  gloss: string;
  lapses: number;
  lastLapseAt: number;
};

export type RecentMistakesResult = {
  items: ReadonlyArray<RecentMistakeItem>;
  totalLapses: number;
  windowMs: number;
  uniqueItems: number;
};

export type ItemLookup = {
  kind: "vocabulary" | "grammar";
  pt: string;
  gloss: string;
};

export const DEFAULT_RECENT_MISTAKES_WINDOW_DAYS = 7;
export const DEFAULT_RECENT_MISTAKES_LIMIT = 5;
export const MAX_RECENT_MISTAKES_LIMIT = 25;
export const MAX_RECENT_MISTAKES_WINDOW_DAYS = 90;

export function aggregateRecentMistakes(args: {
  events: ReadonlyArray<SrsRecallEvent>;
  lookupItem: (itemId: string) => ItemLookup | null;
  now: number;
  windowDays?: number;
  limit?: number;
}): RecentMistakesResult {
  const windowDays = clampDays(args.windowDays ?? DEFAULT_RECENT_MISTAKES_WINDOW_DAYS);
  const limit = clampLimit(args.limit ?? DEFAULT_RECENT_MISTAKES_LIMIT);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = args.now - windowMs;

  type Bucket = {
    itemId: string;
    lapses: number;
    lastLapseAt: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const event of args.events) {
    if (event.grade !== "again") continue;
    if (event.timestamp < cutoff) continue;
    const existing = buckets.get(event.itemId);
    if (existing) {
      existing.lapses += 1;
      if (event.timestamp > existing.lastLapseAt) {
        existing.lastLapseAt = event.timestamp;
      }
    } else {
      buckets.set(event.itemId, {
        itemId: event.itemId,
        lapses: 1,
        lastLapseAt: event.timestamp,
      });
    }
  }

  let totalLapses = 0;
  for (const bucket of buckets.values()) {
    totalLapses += bucket.lapses;
  }

  const ranked = Array.from(buckets.values())
    .sort((a, b) => {
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      return b.lastLapseAt - a.lastLapseAt;
    })
    .slice(0, limit);

  const items: RecentMistakeItem[] = [];
  for (const bucket of ranked) {
    const lookup = args.lookupItem(bucket.itemId);
    items.push({
      itemId: bucket.itemId,
      kind: lookup?.kind ?? defaultKindForId(bucket.itemId),
      pt: lookup?.pt ?? bucket.itemId,
      gloss: lookup?.gloss ?? "Item not found in current curriculum",
      lapses: bucket.lapses,
      lastLapseAt: bucket.lastLapseAt,
    });
  }

  return {
    items,
    totalLapses,
    windowMs,
    uniqueItems: buckets.size,
  };
}

function clampDays(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_RECENT_MISTAKES_WINDOW_DAYS;
  return Math.min(MAX_RECENT_MISTAKES_WINDOW_DAYS, Math.floor(value));
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_RECENT_MISTAKES_LIMIT;
  return Math.min(MAX_RECENT_MISTAKES_LIMIT, Math.floor(value));
}

function defaultKindForId(itemId: string): "vocabulary" | "grammar" {
  return itemId.startsWith("grammar-") ? "grammar" : "vocabulary";
}