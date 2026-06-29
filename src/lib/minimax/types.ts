import { getObservabilitySink } from "@/lib/observability/sink";
import type { LatencyStage } from "@/lib/observability/sink";

export type LlmRole = "system" | "user" | "assistant";

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type LlmCompleteOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type LlmCompleteResult = {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type AsrWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
};

export type AsrTranscribeOptions = {
  lang: "pt-PT" | "en";
  /**
   * Optional language-model biasing vocabulary (LM hotwords). When supplied,
   * the ASR endpoint biases its decoder toward these tokens so they are
   * transcribed with higher accuracy. Sourced from the Learner's current
   * Unit's VocabularyItem + GrammarPattern sets — see
   * `src/lib/asr/biasing.ts`.
   */
  hotwords?: ReadonlyArray<string>;
  signal?: AbortSignal;
};

export type AsrTranscribeResult = {
  text: string;
  words: AsrWord[];
  confidence: number;
  languageDetected: AsrTranscribeOptions["lang"];
};

export type TtsVoice = {
  id: string;
  dialect: "pt-PT";
  gender: "female" | "male";
};

export type TtsSynthesizeOptions = {
  voice: TtsVoice;
  speed?: number;
  signal?: AbortSignal;
};

export type TtsSynthesizeResult = {
  audio: Blob;
  contentType: string;
  durationMs: number;
};

export class MiniMaxError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: "llm" | "asr" | "tts" | "pronunciation",
  ) {
    super(message);
    this.name = "MiniMaxError";
  }
}

export type PronunciationPhonemeScore = {
  phoneme: string;
  score: number;
  start: number;
  end: number;
};

export type PronunciationScoreOptions = {
  reference: string;
  observed: string;
  lang: "pt-PT";
  signal?: AbortSignal;
};

export type PronunciationScoreResult = {
  score: number;
  perPhoneme: ReadonlyArray<PronunciationPhonemeScore>;
};

export type LatencyLog = {
  type: "minimax_latency";
  endpoint: LatencyStage;
  durationMs: number;
  ok: boolean;
};

export type LatencySink = (entry: LatencyLog) => void;

const defaultLatencySink: LatencySink = (entry) => {
  if (typeof console !== "undefined") {
    console.info(
      `[observability] ${JSON.stringify({
        source: "portuguese-teacher",
        kind: "voice_loop_latency",
        stage: entry.endpoint,
        latencyMs: entry.durationMs,
        ok: entry.ok,
      })}`,
    );
  }
  getObservabilitySink().emit({
    kind: "voice_loop_latency",
    occurredAt: Date.now(),
    stage: entry.endpoint as LatencyStage,
    latencyMs: entry.durationMs,
    ok: entry.ok,
  });
};

export async function withLatencyMetric<T>(
  endpoint: LatencyStage,
  fn: () => Promise<T>,
  sink: LatencySink = defaultLatencySink,
): Promise<T> {
  const start = performance.now();
  let ok = true;
  try {
    return await fn();
  } catch (error) {
    ok = false;
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - start);
    sink({ type: "minimax_latency", endpoint, durationMs, ok });
  }
}