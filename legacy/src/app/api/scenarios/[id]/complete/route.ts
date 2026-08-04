import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  createScenarioRepository,
  type ScenarioCompletion,
  type ScenarioProgress,
  type ScenarioRepository,
} from "@/lib/scenarios";
import { getScenarioById } from "@/lib/scenarios/library";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type ScenarioCompleteRequest = {
  learnerId?: string;
  passed?: boolean;
  stars?: number;
  turnsTaken?: number;
  completedAt?: number;
};

export type ScenarioCompleteResponse = {
  ok: true;
  progress: ScenarioProgress;
  completion: ScenarioCompletion;
  recordedSources: number;
};

export type ScenarioErrorResponse = { ok: false; error: string };

export async function POST(
  request: Request,
  context: { params: { id: string } },
): Promise<NextResponse> {
  const scenarioId = context.params.id?.trim();
  if (!scenarioId) {
    return NextResponse.json(
      { ok: false, error: "Missing scenario id" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  let body: ScenarioCompleteRequest;
  try {
    body = (await request.json()) as ScenarioCompleteRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  const learnerId = body.learnerId?.trim();
  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  if (typeof body.passed !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid passed flag" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  if (!isStars(body.stars)) {
    return NextResponse.json(
      { ok: false, error: "Stars must be 0..3" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  if (typeof body.turnsTaken !== "number" || body.turnsTaken < 0) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid turnsTaken" } satisfies ScenarioErrorResponse,
      { status: 400 },
    );
  }
  const completedAt = typeof body.completedAt === "number" ? body.completedAt : Date.now();
  const completion: ScenarioCompletion = {
    scenarioId,
    passed: body.passed,
    stars: body.stars,
    turnsTaken: body.turnsTaken,
    completedAt,
  };
  const scenario = getScenarioById(scenarioId);
  const vocabularyRefs = scenario?.vocabularyRefs ?? [];
  const repo = createScenarioRepository(prisma());
  const result = await repo.recordCompletion(learnerId, completion, { vocabularyRefs });
  const response: ScenarioCompleteResponse = {
    ok: true,
    progress: result.progress,
    completion,
    recordedSources: result.recordedSources,
  };
  return NextResponse.json(response);
}

function isStars(value: unknown): value is 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3;
}