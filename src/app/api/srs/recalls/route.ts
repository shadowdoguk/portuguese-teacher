import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  applyRecall,
  createSrsRepository,
  dueQueue,
  emptyState,
  enrollItem,
  type RecallGrade,
  type SrsItemRef,
  type SrsRepository,
} from "@/lib/srs";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SrsRecallRequest = {
  learnerId?: string;
  itemId?: string;
  kind?: "vocabulary" | "grammar";
  grade?: string;
  refs?: ReadonlyArray<SrsItemRef>;
  timestamp?: number;
  pt?: string;
  gloss?: string;
  unitId?: string;
};

export type SrsRecallResponse = {
  ok: true;
  record: Awaited<ReturnType<SrsRepository["applyRecall"]>>["record"];
  event: Awaited<ReturnType<SrsRepository["applyRecall"]>>["event"];
  queue: ReadonlyArray<{ itemId: string; dueAt: number }>;
};

export type SrsErrorResponse = { ok: false; error: string };

export async function POST(request: Request): Promise<NextResponse> {
  let body: SrsRecallRequest;
  try {
    body = (await request.json()) as SrsRecallRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const learnerId = body.learnerId?.trim();
  const itemId = body.itemId?.trim();
  const kind = body.kind;
  const gradeRaw = body.grade?.trim();
  if (!learnerId || !itemId || !kind || !gradeRaw) {
    return NextResponse.json(
      { ok: false, error: "Missing learnerId / itemId / kind / grade" },
      { status: 400 },
    );
  }
  if (kind !== "vocabulary" && kind !== "grammar") {
    return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
  }
  const grade = gradeRaw as RecallGrade;
  if (!isRecallGrade(grade)) {
    return NextResponse.json({ ok: false, error: "Invalid grade" }, { status: 400 });
  }

  const repo = createSrsRepository(prisma());
  let currentState = await repo.loadState(learnerId);
  if (!currentState.items[itemId]) {
    if (!body.pt || !body.gloss || !body.unitId) {
      return NextResponse.json(
        { ok: false, error: `Unknown SRS item: ${itemId}` },
        { status: 404 },
      );
    }
    const now0 = typeof body.timestamp === "number" ? body.timestamp : Date.now();
    currentState = enrollItem(currentState, { kind, itemId, pt: body.pt, gloss: body.gloss, unitId: body.unitId }, now0);
  }

  const now = typeof body.timestamp === "number" ? body.timestamp : Date.now();
  const schedulerResult = applyRecall(currentState, learnerId, itemId, grade, now);
  const persisted = await repo.applyRecall({
    learnerId,
    itemId,
    kind,
    grade,
    record: schedulerResult.record,
    event: schedulerResult.event,
  });

  const refs = body.refs ?? [];
  const nextState = schedulerResult.state;
  const queue =
    refs.length > 0
      ? dueQueue(nextState, {
          refs,
          now,
          limit: 20,
        }).map((entry) => ({
          itemId: entry.ref.itemId,
          dueAt: entry.record.dueAt,
        }))
      : [];

  const response: SrsRecallResponse = {
    ok: true,
    record: persisted.record,
    event: persisted.event,
    queue,
  };
  return NextResponse.json(response);
}

function isRecallGrade(value: string): value is RecallGrade {
  return value === "again" || value === "hard" || value === "good" || value === "easy";
}