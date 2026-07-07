import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getMiniMaxClients, isMockMode } from "@/lib/minimax";
import { transcribeFromForm, type AsrTranscribeResponse } from "@/lib/asr/transcribe";
import { unitBiasingVocabulary } from "@/lib/asr/biasing";
import { sc5Recorder } from "@/lib/sc5";
import { readAuthLearnerId } from "@/lib/auth/cookies";

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

  // Server-side SC-5 opt-out gate (issue #105 PR 4). The route no longer
  // reads the client-supplied `sc5OptOut` form field — that was a
  // client-trusted gate any motivated Learner could bypass by editing
  // `portuguese-teacher:settings:<id>` (see issue #105 §1.3 and
  // `docs/agents/sc5-gdpr-review.md`).
  //
  // Server-side resolution for v1:
  //   - Authenticated Learner (cookie present) → opt-in by default
  //     (legitimate-interest framing per ADR-0003 §4 + GDPR Art. 6/9
  //     review). Recording proceeds; SLI dashboard samples.
  //   - Anonymous request → opt-out (safer default for unattributed
  //     audio). 1 % SC-5 sampling still runs against the authed pool
  //     in practice; this is just hardening for the no-cookie edge case.
  //
  // The "per-Learner sc5OptOut column on the Prisma Learner row" lookup
  // is a separate v1.1 PR (Per-Learner persistence to DB).
  const learnerId = readAuthLearnerId(request);
  const sc5OptOut = learnerId === null;

  const clients = getMiniMaxClients();
  return transcribeFromForm(form, {
    transcriber: (blob, options) => clients.asr.transcribe(blob, options),
    isMock: () => isMockMode() || clients.mock,
    resolveBiasing: (unitId) => unitBiasingVocabulary(unitId, { prisma: prisma() }),
    sc5Recorder,
    sc5OptOut,
  });
}
