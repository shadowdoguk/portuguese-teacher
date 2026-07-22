import type { MiniMaxLLM } from "./llm";
import type { MiniMaxASR } from "./asr";
import type { MiniMaxPronunciation } from "./pronunciation";
import type { MiniMaxTTS } from "./tts";
import {
  type AsrTranscribeOptions,
  type AsrTranscribeResult,
  type LlmCompleteOptions,
  type LlmCompleteResult,
  type LlmMessage,
  type PronunciationScoreOptions,
  type PronunciationScoreResult,
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
    const biasSet = new Set(
      (options.hotwords ?? []).map((w) => w.toLowerCase().trim()).filter(Boolean),
    );
    const wordEntries = words.map((word, i) => {
      const isBiased = biasSet.has(word.toLowerCase());
      const confidence = isBiased ? 0.98 : 0.95;
      return { word, start: i * 0.4, end: (i + 1) * 0.4, confidence };
    });
    const aggregate = wordEntries.length === 0
      ? 0.95
      : wordEntries.reduce((acc, w) => acc + w.confidence, 0) / wordEntries.length;
    return {
      text: words.join(" "),
      words: wordEntries,
      confidence: aggregate,
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

export class MockMiniMaxPronunciation {
  async score(options: PronunciationScoreOptions): Promise<PronunciationScoreResult> {
    const score = computeMockPronunciationScore(options.reference, options.observed);
    const refTokens = options.reference.split(/\s+/).filter(Boolean);
    const perPhoneme = refTokens.flatMap((token, i) => derivePhonemes(token, i, score));
    return { score, perPhoneme };
  }
}

function computeMockPronunciationScore(reference: string, observed: string): number {
  if (!reference.trim()) return 0;
  if (!observed.trim()) return 0;
  const refTokens = reference.toLowerCase().split(/\s+/).filter(Boolean);
  const obsTokens = observed.toLowerCase().split(/\s+/).filter(Boolean);
  if (refTokens.length === 0) return 0;
  const obsSet = new Set(obsTokens);
  let inOrderHits = 0;
  let outOfOrderHits = 0;
  let unmatched = 0;
  refTokens.forEach((refToken, i) => {
    const obsToken = obsTokens[i];
    if (obsToken === refToken) {
      inOrderHits += 1;
    } else if (obsToken !== undefined && levenshtein(refToken, obsToken) <= 2) {
      inOrderHits += 0.7;
    } else if (obsSet.has(refToken)) {
      outOfOrderHits += 1;
    } else {
      unmatched += 1;
    }
  });
  const coverage = (inOrderHits + outOfOrderHits * 0.5) / refTokens.length;
  const completeness = (inOrderHits + outOfOrderHits + unmatched > 0
    ? (inOrderHits + outOfOrderHits) / refTokens.length
    : 0);
  const raw = coverage * 60 + completeness * 40;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function derivePhonemes(token: string, index: number, baseScore: number): Array<{
  phoneme: string;
  score: number;
  start: number;
  end: number;
}> {
  const chars = [...token];
  const start = index * 0.4;
  const perChar = 0.4 / Math.max(1, chars.length);
  return chars.map((ch, j) => ({
    phoneme: ch,
    score: clampPhoneme(baseScore, j, chars.length),
    start: start + j * perChar,
    end: start + (j + 1) * perChar,
  }));
}

function clampPhoneme(base: number, index: number, total: number): number {
  const drift = ((index - total / 2) / Math.max(1, total)) * 6;
  return Math.max(0, Math.min(100, Math.round(base + drift)));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

export const MOCK_PT_VOICE = {
  id: DEFAULT_PT_VOICE_ID,
  dialect: "pt-PT" as const,
  gender: "female" as const,
};

export type { MiniMaxLLM, MiniMaxASR, MiniMaxPronunciation, MiniMaxTTS };
