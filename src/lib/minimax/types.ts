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
    readonly endpoint: "llm" | "asr" | "tts",
  ) {
    super(message);
    this.name = "MiniMaxError";
  }
}

export type LatencyLog = {
  type: "minimax_latency";
  endpoint: "llm" | "asr" | "tts";
  durationMs: number;
  ok: boolean;
};

export type LatencySink = (entry: LatencyLog) => void;

const defaultLatencySink: LatencySink = (entry) => {
  console.log(JSON.stringify(entry));
};

export async function withLatencyMetric<T>(
  endpoint: "llm" | "asr" | "tts",
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
