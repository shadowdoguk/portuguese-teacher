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

  // Resolve the Learner's SC-5 opt-out flag (issue #35). The browser
  // supplies `sc5OptOut="1"` when the Learner has toggled the SC-5 opt-out
  // in Settings (default off). The route honors the client-supplied flag
  // and passes it to `transcribeFromForm` which short-circuits the SC-5
  // recorder with an `outcome: "opt-out"` event so the SLI dashboard
  // reflects the suppressed sample. The opt-out is intentionally a
  // client-supplied flag in v1 (Settings are localStorage-only); the
  // server-side settings store is a v1.1 follow-up (captured in
  // `docs/agents/sc5-gdpr-review.md`).
  const rawSc5OptOut = form.get("sc5OptOut");
  const sc5OptOut = typeof rawSc5OptOut === "string" && rawSc5OptOut === "1";

  const clients = getMiniMaxClients();
  return transcribeFromForm(form, {
    transcriber: (blob, options) => clients.asr.transcribe(blob, options),
    isMock: () => isMockMode() || clients.mock,
    resolveBiasing: (unitId) => unitBiasingVocabulary(unitId, { prisma: prisma() }),
    sc5Recorder,
    sc5OptOut,
  });
}