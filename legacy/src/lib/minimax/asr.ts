import {
  MiniMaxError,
  withLatencyMetric,
  type AsrTranscribeOptions,
  type AsrTranscribeResult,
  type AsrWord,
} from "./types";

export type MiniMaxASRConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class MiniMaxASR {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: MiniMaxASRConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  async transcribe(
    audio: Blob,
    options: AsrTranscribeOptions,
  ): Promise<AsrTranscribeResult> {
    return withLatencyMetric("asr", async () => {
      const form = new FormData();
      form.append("audio", audio, "utterance.webm");
      form.append("lang", options.lang);
      if (options.hotwords && options.hotwords.length > 0) {
        // The MiniMax ASR API expects a JSON-encoded array string on the
        // `hotwords` field. Encoding server-side keeps the wire shape
        // consistent regardless of how the caller assembles the list.
        form.append("hotwords", JSON.stringify(options.hotwords));
      }
      const response = await this.fetchImpl(`${this.config.baseUrl}/v1/asr/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: form,
        signal: options.signal,
      });
      if (!response.ok) {
        throw new MiniMaxError(
          `ASR request failed: ${response.status} ${response.statusText}`,
          response.status,
          "asr",
        );
      }
      const data = (await response.json().catch(() => {
        throw new MiniMaxError("ASR response was not valid JSON", response.status, "asr");
      })) as {
        text: string;
        words: AsrWord[];
        confidence: number;
        language_detected: AsrTranscribeOptions["lang"];
      };
      return {
        text: data.text,
        words: data.words,
        confidence: data.confidence,
        languageDetected: data.language_detected,
      };
    });
  }
}
