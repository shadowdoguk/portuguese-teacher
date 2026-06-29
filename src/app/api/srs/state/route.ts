import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createSrsRepository, type SrsRepository } from "@/lib/srs";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SrsScenarioSource = {
  itemId: string;
  sourceScenarioId: string;
};

export type SrsStateResponse = {
  ok: true;
  state: Awaited<ReturnType<SrsRepository["loadState"]>>;
  sources: ReadonlyArray<SrsScenarioSource>;
};

export type SrsErrorResponse = { ok: false; error: string };

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId" } satisfies SrsErrorResponse,
      { status: 400 },
    );
  }
  const repo = createSrsRepository(prisma());
  const [state, rawSources] = await Promise.all([
    repo.loadState(learnerId),
    repo.loadScenarioSources(learnerId),
  ]);
  const sources: SrsScenarioSource[] = rawSources.map((source) => ({
    itemId: source.itemId,
    sourceScenarioId: source.sourceScenarioId,
  }));
  const body: SrsStateResponse = { ok: true, state, sources };
  return NextResponse.json(body);
}