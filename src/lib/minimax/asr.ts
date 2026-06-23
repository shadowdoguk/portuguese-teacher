import {
  MiniMaxError,
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
    const form = new FormData();
    form.append("audio", audio, "utterance.webm");
    form.append("lang", options.lang);
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
    const data = (await response.json()) as {
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
  }
}
