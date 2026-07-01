import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SrsServiceError, createSrsService, parseRecordRecallRequest } from "@/lib/srs/service";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SrsRecallResponse = {
  ok: true;
  record: {
    itemId: string;
    halfLifeMs: number;
    dueAt: number;
    reviewCount: number;
    lapses: number;
    lastReviewedAt: number | null;
  };
  event: { event: "srs_recall"; itemId: string; grade: string; timestamp: number };
  queue: ReadonlyArray<{ itemId: string; dueAt: number }>;
  enrolled: boolean;
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body", "MISSING_FIELDS");
  }
  const parsed = parseRecordRecallRequest(body);
  if (!parsed.ok) return badRequest(parsed.error, parsed.code);
  try {
    const result = await createSrsService(prisma()).recordRecall(parsed.value);
    return NextResponse.json({ ok: true, ...result } satisfies SrsRecallResponse);
  } catch (err) {
    if (err instanceof SrsServiceError && err.code === "UNKNOWN_ITEM") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function badRequest(error: string, _code: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
