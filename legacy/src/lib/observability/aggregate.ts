import type { SrsRecallEvent } from "@/lib/srs/types";

export type RecallStats = {
  total: number;
  todayCount: number;
  easyPercent: number;
  lastRecallAt: number | null;
};

const ZERO_STATS: RecallStats = {
  total: 0,
  todayCount: 0,
  easyPercent: 0,
  lastRecallAt: null,
};

function startOfUtcDay(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function aggregateRecallStats(
  events: ReadonlyArray<SrsRecallEvent>,
  now: number,
): RecallStats {
  if (events.length === 0) return { ...ZERO_STATS };
  const dayStart = startOfUtcDay(now);
  let today = 0;
  let easy = 0;
  let last = 0;
  for (const event of events) {
    if (event.timestamp >= dayStart) today += 1;
    if (event.grade === "easy") easy += 1;
    if (event.timestamp > last) last = event.timestamp;
  }
  const easyPercent = Math.round((easy / events.length) * 100);
  return {
    total: events.length,
    todayCount: today,
    easyPercent,
    lastRecallAt: last > 0 ? last : null,
  };
}

export function formatRecallStats(stats: RecallStats): string {
  if (stats.total === 0) {
    return "No recalls yet — your first review will start the clock.";
  }
  return `${stats.todayCount} recall${stats.todayCount === 1 ? "" : "s"} today · ${stats.easyPercent}% graded Easy`;
}