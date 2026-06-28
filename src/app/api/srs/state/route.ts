import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createSrsRepository, type SrsRepository } from "@/lib/srs";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SrsStateResponse = {
  ok: true;
  state: Awaited<ReturnType<SrsRepository["loadState"]>>;
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
  const state = await repo.loadState(learnerId);
  const body: SrsStateResponse = { ok: true, state };
  return NextResponse.json(body);
}