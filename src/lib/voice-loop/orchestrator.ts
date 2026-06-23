import { parseStructuredOutput, payloadToTurn } from "./structured-output";
import { VOICE_LOOP_SYSTEM_PROMPT, scriptedPayloadFor } from "./mock";
import type { BrowserTier, PracticeMode, VoiceLoopTurn, VoiceLoopTurnInput } from "./types";
import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

export type LlmCaller = (messages: LlmMessage[]) => Promise<LlmCompleteResult>;

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
  pronunciationFromAsr?: (input: VoiceLoopTurnInput) => number;
};

export async function runTurn(
  input: VoiceLoopTurnInput,
  deps: TurnDependencies,
): Promise<TurnResult> {
  const startedAt = deps.now();
  const turnId = deps.generateId();
  const pronunciation = deps.pronunciationFromAsr?.(input) ?? 80;

  if (deps.mock || input.tier === 3) {
    const payload = scriptedPayloadFor(input.learnerText ?? "", input.practiceMode);
    const turn = payloadToTurn(payload, {
      turnId,
      utteranceId: input.learnerUtteranceId,
      generatedAt: deps.now(),
      mock: true,
      pronunciationScore: pronunciation,
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
    pronunciationScore: pronunciation,
  });
  return { turn, latencyMs: deps.now() - startedAt, mock: false };
}

export function buildInput(args: {
  learnerText: string;
  tier: BrowserTier;
  practiceMode: PracticeMode;
  difficultyTarget: number;
  utteranceId?: string;
}): VoiceLoopTurnInput {
  return {
    learnerText: args.learnerText,
    practiceMode: args.practiceMode,
    tier: args.tier,
    difficultyTarget: args.difficultyTarget,
    learnerUtteranceId:
      args.utteranceId ??
      `utt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
}
