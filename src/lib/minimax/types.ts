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
