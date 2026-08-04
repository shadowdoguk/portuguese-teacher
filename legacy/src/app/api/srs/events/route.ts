import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { aggregateRecallStats, type RecallStats } from "@/lib/observability/aggregate";
import { createSrsService } from "@/lib/srs/service";
import type { SrsRecallEvent } from "@/lib/srs/types";

export const runtime = "nodejs";

const MAX_LIMIT = 5_000;
const DEFAULT_LIMIT = 500;

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json({ ok: false, error: "Missing learnerId" }, { status: 400 });
  }
  const limitParam = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid limit" }, { status: 400 });
    }
    limit = Math.min(MAX_LIMIT, parsed);
  }
  const events = await createSrsService(prisma()).loadRecentEvents(learnerId, limit);
  const stats: RecallStats = aggregateRecallStats(events, Date.now());
  return NextResponse.json({ ok: true, learnerId, events, stats });
}

export type SrsEventsResponse = {
  ok: true;
  learnerId: string;
  events: ReadonlyArray<SrsRecallEvent>;
  stats: RecallStats;
};
