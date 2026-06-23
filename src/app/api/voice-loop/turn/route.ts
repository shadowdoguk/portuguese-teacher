import { NextResponse } from "next/server";
import { getMiniMaxClients } from "@/lib/minimax";
import { buildInput, runTurn } from "@/lib/voice-loop";
import {
  type BrowserTier,
  type PracticeMode,
  isBrowserTier,
  isPracticeMode,
} from "@/lib/voice-loop/types";

export const runtime = "nodejs";

export type VoiceLoopTurnRequest = {
  learnerText?: string;
  tier?: number;
  practiceMode?: string;
  difficultyTarget?: number;
  utteranceId?: string;
};

export type VoiceLoopTurnResponse = {
  ok: true;
  turn: Awaited<ReturnType<typeof runTurn>>["turn"];
  latencyMs: number;
  mock: boolean;
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: VoiceLoopTurnRequest;
  try {
    body = (await request.json()) as VoiceLoopTurnRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const tier = typeof body.tier === "number" && isBrowserTier(body.tier) ? body.tier : 3;
  const practiceMode =
    typeof body.practiceMode === "string" && isPracticeMode(body.practiceMode)
      ? body.practiceMode
      : "free-form";
  const difficultyTarget =
    typeof body.difficultyTarget === "number" && Number.isFinite(body.difficultyTarget)
      ? body.difficultyTarget
      : 1.0;

  if (!body.learnerText || body.learnerText.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Missing learnerText" }, { status: 400 });
  }

  const clients = getMiniMaxClients();
  const result = await runTurn(
    buildInput({
      learnerText: body.learnerText,
      tier: tier as BrowserTier,
      practiceMode: practiceMode as PracticeMode,
      difficultyTarget,
      utteranceId: body.utteranceId,
    }),
    {
      llm: (messages) => clients.llm.complete(messages),
      generateId: () => `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      now: () => Date.now(),
      mock: clients.mock,
    },
  );

  const response: VoiceLoopTurnResponse = {
    ok: true,
    turn: result.turn,
    latencyMs: result.latencyMs,
    mock: result.mock,
  };
  return NextResponse.json(response);
}
