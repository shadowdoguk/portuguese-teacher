import { NextResponse } from "next/server";
import { getMiniMaxClients } from "@/lib/minimax";
import type { LlmMessage } from "@/lib/minimax/types";
import {
  buildInput,
  buildMockRerankLlm,
  buildRerankTelemetry,
  chooseVoiceLoopPath,
  generateAndRerankTurn,
  runTurn,
  telemetryLogLine,
  vocabularyFor,
} from "@/lib/voice-loop";
import {
  isBrowserTier,
  isPracticeMode,
  type BrowserTier,
  type PracticeMode,
} from "@/lib/voice-loop/types";
import { LEVELS, PT_PT, type Level } from "@/lib/curriculum/types";

export const runtime = "nodejs";

export type VoiceLoopTurnRequest = {
  learnerText?: string;
  tier?: number;
  practiceMode?: string;
  difficultyTarget?: number;
  utteranceId?: string;
  learnerLevel?: string;
};

export type VoiceLoopTurnResponse = {
  ok: true;
  turn: Awaited<ReturnType<typeof runTurn>>["turn"];
  latencyMs: number;
  mock: boolean;
  path: "rerank" | "runTurn";
};

function parseLearnerLevel(raw: string | undefined): Level {
  if (!raw) return "A0";
  return (LEVELS as ReadonlyArray<string>).includes(raw) ? (raw as Level) : "A0";
}

function isRerankEnabled(mockMode: boolean): boolean {
  const flag = process.env.ENABLE_RERANK_PATH;
  if (flag === "0") return false;
  if (flag === "1") return true;
  return !mockMode;
}

function buildVocabByLevel(): Record<Level, ReadonlySet<string>> {
  return {
    A0: vocabularyFor("A0"),
    A1: vocabularyFor("A1"),
    A2: vocabularyFor("A2"),
    B1: vocabularyFor("B1"),
  };
}

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
  const learnerLevel = parseLearnerLevel(body.learnerLevel);
  const rerankEnabled = isRerankEnabled(clients.mock);

  const path = chooseVoiceLoopPath({
    tier,
    rerankEnabled,
    mockMode: clients.mock,
    hasLiveLlm: !clients.mock,
  });

  const input = buildInput({
    learnerText: body.learnerText,
    tier: tier as BrowserTier,
    practiceMode: practiceMode as PracticeMode,
    difficultyTarget,
    utteranceId: body.utteranceId,
  });

  if (path === "rerank") {
    const llmFn: (messages: LlmMessage[]) => ReturnType<typeof clients.llm.complete> = clients.mock
      ? (async (messages: LlmMessage[]) => buildMockRerankLlm()(messages))
      : (messages: LlmMessage[]) => clients.llm.complete(messages);

    const result = await generateAndRerankTurn(input, {
      llm: llmFn,
      generateId: () => `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      now: () => Date.now(),
      vocabByLevel: buildVocabByLevel(),
      dialect: PT_PT,
      level: learnerLevel,
      mock: clients.mock,
    });

    const telemetry = buildRerankTelemetry(
      tier as BrowserTier,
      result.scoredCandidates,
      result.chosenIndex,
      result.latencyMs,
      result.mock,
    );
    console.info(telemetryLogLine(telemetry));

    const response: VoiceLoopTurnResponse = {
      ok: true,
      turn: result.turn,
      latencyMs: result.latencyMs,
      mock: result.mock,
      path: "rerank",
    };
    return NextResponse.json(response);
  }

  const result = await runTurn(input, {
    llm: (messages) => clients.llm.complete(messages),
    generateId: () => `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    now: () => Date.now(),
    mock: clients.mock,
  });

  const response: VoiceLoopTurnResponse = {
    ok: true,
    turn: result.turn,
    latencyMs: result.latencyMs,
    mock: result.mock,
    path: "runTurn",
  };
  return NextResponse.json(response);
}
