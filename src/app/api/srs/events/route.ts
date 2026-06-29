import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { aggregateRecallStats, type RecallStats } from "@/lib/observability/aggregate";
import { createSrsRepository, type SrsRepository } from "@/lib/srs";
import type { SrsRecallEvent } from "@/lib/srs/types";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

const MAX_LIMIT = 5_000;
const DEFAULT_LIMIT = 500;

export type SrsEventsResponse = {
  ok: true;
  learnerId: string;
  events: ReadonlyArray<SrsRecallEvent>;
  stats: RecallStats;
};

export type SrsEventsErrorResponse = { ok: false; error: string };

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId" } satisfies SrsEventsErrorResponse,
      { status: 400 },
    );
  }

  const limitParam = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid limit" } satisfies SrsEventsErrorResponse,
        { status: 400 },
      );
    }
    limit = Math.min(MAX_LIMIT, parsed);
  }

  const repo: SrsRepository = createSrsRepository(prisma());
  const events = await repo.loadRecentEvents(learnerId, limit);
  const stats = aggregateRecallStats(events, Date.now());
  const body: SrsEventsResponse = {
    ok: true,
    learnerId,
    events,
    stats,
  };
  return NextResponse.json(body);
}