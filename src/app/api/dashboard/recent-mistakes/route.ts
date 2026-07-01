import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createSrsRepository, type SrsRepository } from "@/lib/srs";
import {
  aggregateRecentMistakes,
  DEFAULT_RECENT_MISTAKES_LIMIT,
  DEFAULT_RECENT_MISTAKES_WINDOW_DAYS,
  MAX_RECENT_MISTAKES_LIMIT,
  MAX_RECENT_MISTAKES_WINDOW_DAYS,
  type ItemLookup,
  type RecentMistakesResult,
} from "@/lib/dashboard/recent-mistakes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type RecentMistakesItem = RecentMistakesResult["items"][number];

export type RecentMistakesResponse = {
  ok: true;
  learnerId: string;
  windowDays: number;
  limit: number;
  result: RecentMistakesResult;
};

export type RecentMistakesErrorResponse = { ok: false; error: string };

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId" } satisfies RecentMistakesErrorResponse,
      { status: 400 },
    );
  }

  const windowDays = parsePositiveInt(
    url.searchParams.get("windowDays"),
    DEFAULT_RECENT_MISTAKES_WINDOW_DAYS,
    MAX_RECENT_MISTAKES_WINDOW_DAYS,
  );
  const limit = parsePositiveInt(
    url.searchParams.get("limit"),
    DEFAULT_RECENT_MISTAKES_LIMIT,
    MAX_RECENT_MISTAKES_LIMIT,
  );

  const repo: SrsRepository = createSrsRepository(prisma());
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  const [recent, vocabRows, grammarRows] = await Promise.all([
    repo.loadRecentEvents(learnerId, MAX_RECENT_MISTAKES_LIMIT * 200),
    prisma().vocabularyItem.findMany({ select: { id: true, pt: true, gloss: true } }),
    prisma().grammarPattern.findMany({ select: { id: true, name: true, description: true } }),
  ]);

  const vocabMap = new Map<string, ItemLookup>(
    vocabRows.map((row) => [row.id, { kind: "vocabulary", pt: row.pt, gloss: row.gloss }]),
  );
  const grammarMap = new Map<string, ItemLookup>(
    grammarRows.map((row) => [
      row.id,
      { kind: "grammar", pt: row.name, gloss: row.description },
    ]),
  );

  const windowedEvents = recent.filter((e) => e.timestamp >= cutoff);

  const result = aggregateRecentMistakes({
    events: windowedEvents,
    lookupItem: (itemId) => vocabMap.get(itemId) ?? grammarMap.get(itemId) ?? null,
    now: Date.now(),
    windowDays,
    limit,
  });

  const body: RecentMistakesResponse = {
    ok: true,
    learnerId,
    windowDays,
    limit,
    result,
  };
  return NextResponse.json(body);
}

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  cap: number,
): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(cap, parsed);
}