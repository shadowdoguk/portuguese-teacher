import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  aggregateRecentMistakes,
  DEFAULT_RECENT_MISTAKES_LIMIT,
  DEFAULT_RECENT_MISTAKES_WINDOW_DAYS,
  MAX_RECENT_MISTAKES_LIMIT,
  MAX_RECENT_MISTAKES_WINDOW_DAYS,
  type ItemLookup,
  type RecentMistakesResult,
} from "@/lib/dashboard/recent-mistakes";
import { createSrsService } from "@/lib/srs/service";
import type { SrsItemKind } from "@/lib/srs/types";

export const runtime = "nodejs";
// `Date.now()` is in the response — the route must opt out of prerender.
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

  const service = createSrsService(prisma());
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  const now = Date.now();

  // DB-level filter: grade='again' AND occurredAt >= cutoff. Keeps the row
  // cap meaningful for heavy users (no JS-side filter cost).
  const recent = await service.loadRecentMistakes(
    learnerId,
    cutoff,
    MAX_RECENT_MISTAKES_LIMIT * 200,
  );

  const [vocabRows, grammarRows] = await Promise.all([
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

  // For items the curriculum lookup misses, fall back to the persisted
  // `kind` from SrsReviewRecord. Avoids the `grammar-` prefix convention
  // leak that #104 killed in the repository layer.
  const orphanItemIds = new Set<string>();
  for (const event of recent) {
    if (!vocabMap.has(event.itemId) && !grammarMap.has(event.itemId)) {
      orphanItemIds.add(event.itemId);
    }
  }
  const persistedKinds = new Map<string, SrsItemKind>();
  await Promise.all(
    Array.from(orphanItemIds).map(async (itemId) => {
      const kind = await service.loadItemKind(learnerId, itemId);
      if (kind) persistedKinds.set(itemId, kind);
    }),
  );

  const result = aggregateRecentMistakes({
    events: recent,
    lookupItem: (itemId) => vocabMap.get(itemId) ?? grammarMap.get(itemId) ?? null,
    kindForItem: (itemId) => persistedKinds.get(itemId) ?? null,
    now,
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