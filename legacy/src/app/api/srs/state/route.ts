import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createSrsService } from "@/lib/srs/service";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function GET(request: Request): Promise<NextResponse> {
  const learnerId = new URL(request.url).searchParams.get("learnerId")?.trim();
  if (!learnerId) {
    return NextResponse.json({ ok: false, error: "Missing learnerId" }, { status: 400 });
  }
  const { state, sources } = await createSrsService(prisma()).loadState(learnerId);
  return NextResponse.json({
    ok: true,
    state,
    sources: sources.map(({ itemId, sourceScenarioId }) => ({ itemId, sourceScenarioId })),
  });
}
