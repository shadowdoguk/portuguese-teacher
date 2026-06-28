import { parseStructuredOutput, payloadToTurn } from "./structured-output";
import { VOICE_LOOP_SYSTEM_PROMPT, scriptedPayloadFor } from "./mock";
import type { BrowserTier, PracticeMode, VoiceLoopTurn, VoiceLoopTurnInput } from "./types";
import type { LlmCompleteResult, LlmMessage, PronunciationPhonemeScore } from "@/lib/minimax/types";

export type LlmCaller = (messages: LlmMessage[]) => Promise<LlmCompleteResult>;

export type PronunciationDetails = {
  score: number;
  perPhoneme?: ReadonlyArray<PronunciationPhonemeScore>;
  source: "endpoint" | "asr-bias" | "default";
};

export type PronunciationResolver = (
  input: VoiceLoopTurnInput,
) => PronunciationDetails | number | Promise<PronunciationDetails | number>;

export type TurnResult = {
  turn: VoiceLoopTurn;
  latencyMs: number;
  mock: boolean;
};

export type TurnDependencies = {
  llm: LlmCaller;
  generateId: () => string;
  now: () => number;
  mock?: boolean;
  pronunciationFromAsr?: PronunciationResolver;
};

export async function runTurn(
  input: VoiceLoopTurnInput,
  deps: TurnDependencies,
): Promise<TurnResult> {
  const startedAt = deps.now();
  const turnId = deps.generateId();
  const pronunciationResult = await resolvePronunciation(deps.pronunciationFromAsr, input);

  if (deps.mock || input.tier === 3) {
    const payload = scriptedPayloadFor(input.learnerText ?? "", input.practiceMode);
    const turn = payloadToTurn(payload, {
      turnId,
      utteranceId: input.learnerUtteranceId,
      generatedAt: deps.now(),
      mock: true,
      pronunciationScore: pronunciationResult.score,
      pronunciationPerPhoneme: pronunciationResult.perPhoneme,
      pronunciationSource: pronunciationResult.source,
    });
    return { turn, latencyMs: deps.now() - startedAt, mock: true };
  }

  const messages: LlmMessage[] = [
    { role: "system", content: VOICE_LOOP_SYSTEM_PROMPT },
    { role: "user", content: input.learnerText ?? "" },
  ];
  const response = await deps.llm(messages);
  const payload = parseStructuredOutput(response.text);
  const turn = payloadToTurn(payload, {
    turnId,
    utteranceId: input.learnerUtteranceId,
    generatedAt: deps.now(),
    mock: false,
    pronunciationScore: pronunciationResult.score,
    pronunciationPerPhoneme: pronunciationResult.perPhoneme,
    pronunciationSource: pronunciationResult.source,
  });
  return { turn, latencyMs: deps.now() - startedAt, mock: false };
}

async function resolvePronunciation(
  resolver: PronunciationResolver | undefined,
  input: VoiceLoopTurnInput,
): Promise<PronunciationDetails> {
  if (!resolver) return { score: 80, source: "default" };
  const result = await resolver(input);
  if (typeof result === "number") {
    return { score: result, source: "default" };
  }
  return result;
}

export function buildInput(args: {
  learnerText: string;
  tier: BrowserTier;
  practiceMode: PracticeMode;
  difficultyTarget: number;
  utteranceId?: string;
  targetPhrase?: string;
  learnerAsrConfidence?: number;
  learnerAsrWords?: ReadonlyArray<{ word: string; confidence: number }>;
}): VoiceLoopTurnInput {
  return {
    learnerText: args.learnerText,
    practiceMode: args.practiceMode,
    tier: args.tier,
    difficultyTarget: args.difficultyTarget,
    learnerUtteranceId:
      args.utteranceId ??
      `utt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ...(typeof args.targetPhrase === "string" ? { targetPhrase: args.targetPhrase } : {}),
    ...(typeof args.learnerAsrConfidence === "number"
      ? { learnerAsrConfidence: args.learnerAsrConfidence }
      : {}),
    ...(args.learnerAsrWords ? { learnerAsrWords: args.learnerAsrWords } : {}),
  };
}
