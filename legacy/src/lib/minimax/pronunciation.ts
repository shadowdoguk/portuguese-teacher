import {
  MiniMaxError,
  withLatencyMetric,
  type PronunciationScoreOptions,
  type PronunciationScoreResult,
} from "./types";

export type MiniMaxPronunciationConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class MiniMaxPronunciation {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: MiniMaxPronunciationConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  async score(options: PronunciationScoreOptions): Promise<PronunciationScoreResult> {
    return withLatencyMetric("pronunciation", async () => {
      const response = await this.fetchImpl(`${this.config.baseUrl}/v1/pronunciation/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          reference: options.reference,
          observed: options.observed,
          lang: options.lang,
        }),
        signal: options.signal,
      });
      if (!response.ok) {
        throw new MiniMaxError(
          `Pronunciation request failed: ${response.status} ${response.statusText}`,
          response.status,
          "pronunciation",
        );
      }
      const data = (await response.json().catch(() => {
        throw new MiniMaxError(
          "Pronunciation response was not valid JSON",
          response.status,
          "pronunciation",
        );
      })) as {
        score: number;
        per_phoneme: Array<{ phoneme: string; score: number; start: number; end: number }>;
      };
      const score = clamp(data.score, 0, 100);
      const perPhoneme = (data.per_phoneme ?? []).map((p) => ({
        phoneme: p.phoneme,
        score: clamp(p.score, 0, 100),
        start: p.start,
        end: p.end,
      }));
      return { score, perPhoneme };
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}