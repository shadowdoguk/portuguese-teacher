import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createScenarioRepository, type ScenarioRepository } from "@/lib/scenarios";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type ScenarioListResponse = {
  ok: true;
  snapshot: Awaited<ReturnType<ScenarioRepository["loadSnapshot"]>>;
};

export type ScenarioErrorResponse = { ok: false; error: string };

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  const repo = createScenarioRepository(prisma());
  const snapshot = await repo.loadSnapshot(learnerId);
  const body: ScenarioListResponse = { ok: true, snapshot };
  return NextResponse.json(body);
}