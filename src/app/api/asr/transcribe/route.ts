import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMiniMaxClients, isMockMode } from "@/lib/minimax";
import { transcribeFromForm, type AsrTranscribeResponse } from "@/lib/asr/transcribe";
import { unitBiasingVocabulary } from "@/lib/asr/biasing";
import { sc5Recorder } from "@/lib/sc5";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function POST(request: Request): Promise<NextResponse<AsrTranscribeResponse>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data with an 'audio' file part" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed multipart body" }, { status: 400 });
  }

  const clients = getMiniMaxClients();
  return transcribeFromForm(form, {
    transcriber: (blob, options) => clients.asr.transcribe(blob, options),
    isMock: () => isMockMode() || clients.mock,
    resolveBiasing: (unitId) => unitBiasingVocabulary(unitId, { prisma: prisma() }),
    sc5Recorder,
  });
}