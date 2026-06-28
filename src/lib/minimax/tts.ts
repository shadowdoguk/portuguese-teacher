import { MiniMaxError, withLatencyMetric, type TtsSynthesizeOptions, type TtsSynthesizeResult } from "./types";

export type MiniMaxTTSConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class MiniMaxTTS {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: MiniMaxTTSConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  async synthesize(
    text: string,
    options: TtsSynthesizeOptions,
  ): Promise<TtsSynthesizeResult> {
    return withLatencyMetric("tts", async () => {
      const response = await this.fetchImpl(`${this.config.baseUrl}/v1/tts/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          text,
          voice_id: options.voice.id,
          dialect: options.voice.dialect,
          speed: options.speed ?? 1.0,
          response_format: "audio/mpeg",
        }),
        signal: options.signal,
      });
      if (!response.ok) {
        throw new MiniMaxError(
          `TTS request failed: ${response.status} ${response.statusText}`,
          response.status,
          "tts",
        );
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "audio/mpeg";
      const audio = new Blob([buffer], { type: contentType });
      return {
        audio,
        contentType,
        durationMs: 0,
      };
    });
  }
}
