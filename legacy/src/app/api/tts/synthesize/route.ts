import { NextResponse } from "next/server";
import { getMiniMaxClients, isMockMode } from "@/lib/minimax";
import { synthesizeFromBody, type TtsSynthesizeResponse } from "@/lib/tts/synthesize";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<TtsSynthesizeResponse>> {
  let body: { text?: string; voiceId?: string; speed?: number };
  try {
    body = (await request.json()) as { text?: string; voiceId?: string; speed?: number };
  } catch {
    return NextResponse.json(
      { ok: false, degraded: true, degradedReason: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const clients = getMiniMaxClients();
  return synthesizeFromBody(body, {
    synthesizer: (text, options) => clients.tts.synthesize(text, options),
    isMock: () => isMockMode() || clients.mock,
  });
}