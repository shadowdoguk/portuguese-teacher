import type { MiniMaxLLM } from "./llm";
import type { MiniMaxASR } from "./asr";
import type { MiniMaxTTS } from "./tts";
import {
  type AsrTranscribeOptions,
  type AsrTranscribeResult,
  type LlmCompleteOptions,
  type LlmCompleteResult,
  type LlmMessage,
  type TtsSynthesizeOptions,
  type TtsSynthesizeResult,
} from "./types";

const SILENT_MP3_BYTES = Uint8Array.from([
  0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const DEFAULT_PT_VOICE_ID = "minimax-pt-pt-female-1";

export class MockMiniMaxLLM {
  async complete(
    messages: LlmMessage[],
    _options: LlmCompleteOptions = {},
  ): Promise<LlmCompleteResult> {
    const last = messages[messages.length - 1];
    const text = last ? `mock:${last.content.slice(0, 80)}` : "mock:hello";
    return {
      text,
      usage: { promptTokens: 12, completionTokens: text.length, totalTokens: 12 + text.length },
    };
  }
}

export class MockMiniMaxASR {
  async transcribe(
    audio: Blob,
    options: AsrTranscribeOptions,
  ): Promise<AsrTranscribeResult> {
    const size = audio.size;
    const words = ["mock", "transcript", options.lang, String(size)];
    return {
      text: words.join(" "),
      words: words.map((word, i) => ({
        word,
        start: i * 0.4,
        end: (i + 1) * 0.4,
        confidence: 0.95,
      })),
      confidence: 0.95,
      languageDetected: options.lang,
    };
  }
}

export class MockMiniMaxTTS {
  async synthesize(
    text: string,
    options: TtsSynthesizeOptions,
  ): Promise<TtsSynthesizeResult> {
    const charCount = text.length;
    const durationMs = Math.round((charCount / 14) * 1000);
    return {
      audio: new Blob([SILENT_MP3_BYTES], { type: "audio/mpeg" }),
      contentType: "audio/mpeg",
      durationMs,
    };
  }
}

export const MOCK_PT_VOICE = {
  id: DEFAULT_PT_VOICE_ID,
  dialect: "pt-PT" as const,
  gender: "female" as const,
};

export type { MiniMaxLLM, MiniMaxASR, MiniMaxTTS };
