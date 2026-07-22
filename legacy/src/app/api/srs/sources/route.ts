import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SrsServiceError, createSrsService } from "@/lib/srs/service";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SrsSourcesResponse = {
  ok: true;
  recordedSources: number;
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Missing JSON body" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const learnerId = typeof raw.learnerId === "string" ? raw.learnerId.trim() : "";
  const scenarioId = typeof raw.scenarioId === "string" ? raw.scenarioId.trim() : "";
  if (!learnerId || !scenarioId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId / scenarioId" },
      { status: 400 },
    );
  }
  const itemIds = Array.isArray(raw.itemIds) ? (raw.itemIds as ReadonlyArray<unknown>) : [];
  try {
    const recordedSources = await createSrsService(prisma()).recordScenarioSources(
      learnerId,
      scenarioId,
      itemIds.filter((value): value is string => typeof value === "string"),
    );
    return NextResponse.json({ ok: true, recordedSources } satisfies SrsSourcesResponse);
  } catch (err) {
    if (err instanceof SrsServiceError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
