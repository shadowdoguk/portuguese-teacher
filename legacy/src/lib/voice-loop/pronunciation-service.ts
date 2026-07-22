import {
  type AsrWordConfidence,
  scoreFromAsrConfidence,
  weightedAggregateScore,
} from "./pronunciation-scoring";
import {
  getPronunciationRuntime,
  type PronunciationRuntime,
} from "./pronunciation-runtime";
import type {
  MiniMaxPronunciation,
  MockMiniMaxPronunciation,
} from "@/lib/minimax";
import type { PronunciationPhonemeScore } from "@/lib/minimax/types";
import type { VoiceLoopTurnInput } from "./types";

export type PronunciationService = {
  resolve(input: VoiceLoopTurnInput): Promise<PronunciationResolution>;
};

export type PronunciationResolution = {
  score: number;
  perPhoneme?: ReadonlyArray<PronunciationPhonemeScore>;
  source: "endpoint" | "asr-bias" | "default";
};

export type PronunciationServiceDeps = {
  client: MiniMaxPronunciation | MockMiniMaxPronunciation;
  vocabBias?: ReadonlySet<string>;
  logger?: (line: string) => void;
  runtime?: PronunciationRuntime;
  signalTimeoutMs?: number;
};

const DRILL_SIGNAL_TIMEOUT_MS = 1500;

export function createPronunciationService(
  deps: PronunciationServiceDeps,
): PronunciationService {
  const runtime =
    deps.runtime ??
    getPronunciationRuntime({
      client: deps.client,
      logger: deps.logger,
    });

  return {
    async resolve(input) {
      await runtime.ensureCalibrated();
      const offset = runtime.getOffset();

      if (input.practiceMode === "drill" && input.targetPhrase) {
        return resolveDrill(input, deps.client, offset, deps.signalTimeoutMs);
      }
      return resolveFreeForm(input, deps.vocabBias);
    },
  };
}

async function resolveDrill(
  input: VoiceLoopTurnInput,
  client: MiniMaxPronunciation | MockMiniMaxPronunciation,
  offset: number,
  signalTimeoutMs: number | undefined,
): Promise<PronunciationResolution> {
  const targetPhrase = input.targetPhrase ?? "";
  const observed = input.learnerText ?? "";
  if (!targetPhrase || !observed) {
    return { score: 0, source: "default" };
  }
  const timeoutMs = signalTimeoutMs ?? DRILL_SIGNAL_TIMEOUT_MS;
  try {
    const result = await withTimeout(
      client.score({
        reference: targetPhrase,
        observed,
        lang: "pt-PT",
      }),
      timeoutMs,
    );
    const score = weightedAggregateScore(result.score, offset);
    return {
      score,
      perPhoneme: result.perPhoneme,
      source: "endpoint",
    };
  } catch (error) {
    if (isAbortError(error) || isTimeoutError(error)) {
      return resolveFreeForm(input, undefined);
    }
    return resolveFreeForm(input, undefined);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Pronunciation endpoint exceeded ${timeoutMs}ms budget`);
      error.name = "PronunciationTimeoutError";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "PronunciationTimeoutError";
}

function resolveFreeForm(
  input: VoiceLoopTurnInput,
  vocabBias: ReadonlySet<string> | undefined,
): PronunciationResolution {
  const words = input.learnerAsrWords ?? inferAsrWords(input);
  const score = scoreFromAsrConfidence({
    words,
    ...(vocabBias ? { vocabBias } : {}),
  });
  return { score, source: "asr-bias" };
}

function inferAsrWords(input: VoiceLoopTurnInput): ReadonlyArray<AsrWordConfidence> {
  const text = input.learnerText ?? "";
  if (!text.trim()) return [];
  const fallbackConfidence =
    typeof input.learnerAsrConfidence === "number" ? input.learnerAsrConfidence : 0.7;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, confidence: fallbackConfidence }));
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || /aborted/i.test(error.message);
}