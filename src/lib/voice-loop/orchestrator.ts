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

/**
 * Build a canned degraded teacher turn (issue #106-5 + ADR-0002
 * §"Graceful degradation"). Used by the route-level fallback when the
 * LLM call throws a transient MiniMaxError so the Learner still receives
 * a teacher turn instead of an HTTP 500.
 *
 * The returned turn is structurally identical to a normal turn but
 * carries `mock: false` + `degraded: true` so the client can distinguish.
 */
export function buildDegradedTurn(input: VoiceLoopTurnInput, generatedAt: number): VoiceLoopTurn {
  const lastUser = (input.learnerText ?? "").trim();
  const utterance = cannedReplyFor(lastUser);
  return {
    turnId: `turn-degraded-${generatedAt}`,
    utteranceId: input.learnerUtteranceId,
    teacherUtterance: utterance,
    feedback: [
      {
        kind: "formative",
        text: "(O professor está temporariamente indisponível; resposta predefinida.)",
      },
    ],
    pronunciationScore: 0,
    pronunciationSource: "default",
    nextDifficultyTarget: input.difficultyTarget,
    comprehensionOk: false,
    generatedAt,
    mock: false,
    degraded: true,
  };
}

// Locally inlined to avoid the orchestrator pulling in MiniMax fallbacks
// (which would create a circular import: fallbacks.ts → observability →
// voice-loop). Keep this in sync with `cannedReplyFor` in
// `src/lib/minimax/fallbacks.ts`.
const CANNED_REPLIES_FALLBACK: Array<{ test: (text: string) => boolean; reply: string }> = [
  { test: (t) => /^(ol[áa]|oi)/i.test(t), reply: "Ol\u00e1! Como est\u00e1s? Vamos continuar a praticar." },
  { test: (t) => /^(adeus|at\u00e9|at\u00e9 logo)/i.test(t), reply: "At\u00e9 logo! Bom estudo." },
  { test: (t) => /^(sim|s)/i.test(t), reply: "Muito bem. Continuamos." },
  { test: (t) => /^(n\u00e3o|n)/i.test(t), reply: "Ok, vamos tentar de outra forma." },
  { test: (t) => /^\?/.test(t), reply: "Boa pergunta. Quando o professor voltar, eu ajudo-te a explorar isso." },
];
const GENERIC_FALLBACK_REPLY =
  "Estou com dificuldades em responder agora. Tenta outra vez, ou avan\u00e7a para o pr\u00f3ximo exerc\u00edcio.";

function cannedReplyFor(text: string): string {
  const trimmed = text.trim();
  for (const candidate of CANNED_REPLIES_FALLBACK) {
    if (candidate.test(trimmed)) return candidate.reply;
  }
  return GENERIC_FALLBACK_REPLY;
}

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
