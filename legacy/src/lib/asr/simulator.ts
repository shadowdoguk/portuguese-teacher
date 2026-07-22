import type { AsrTranscribeResult } from "@/lib/minimax/types";
import { tokenise } from "@/lib/asr/wer";

/**
 * Deterministic pt-PT ASR simulator for the regression suite (issue #13).
 * Returns a transcript whose WER against the reference approximates a
 * realistic model:
 *
 *   clean  → ~2% WER (98% per-word verbatim rate)
 *   noisy  → ~6% WER (94% per-word verbatim rate)
 *
 * Hotword-biased words are transcribed verbatim (boost from base rate to
 * ~99.5%). Without a real audio corpus + MiniMax creds, this is the
 * minimum viable slice — the regression suite verifies (a) the corpus
 * structure, (b) the WER math, (c) the biasing seam, and (d) the
 * regression alarm logic.
 *
 * All randomness is seeded by `(utteranceId, bucket)` so the simulation
 * is deterministic across runs.
 */

// Mulberry32 PRNG — deterministic, ~32-bit period, sufficient for fixture seeding.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(input: string): number {
  // FNV-1a 32-bit. Avoids pulling crypto for a fixture seed.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const CONFIDENCE_CLEAN = 0.95;
const CONFIDENCE_NOISY = 0.88;
const CONFIDENCE_BIASED = 0.98;

// Small pool of common pt-PT word-level error substitutions. The simulation
// uses these for any non-verbatim, non-biased word.
const SUBSTITUTION_POOL = [
  "a",
  "o",
  "de",
  "que",
  "e",
  "do",
  "da",
  "em",
  "um",
  "para",
  "é",
  "no",
  "sim",
  "não",
  "muito",
];

export type SimulateAsrOptions = {
  bucket: "clean" | "noisy";
  /** When true, returns audio + word timing in addition to text. */
  withWords?: boolean;
};

export type SimulateAsrInput = {
  id: string;
  reference: string;
  hotwords: ReadonlyArray<string>;
};

/**
 * Deterministic pt-PT ASR simulator. Given an utterance + hotwords, returns
 * a transcript with per-word timing + per-word confidence, matching the
 * shape of `AsrTranscribeResult`.
 */
export function simulateAsr(
  input: SimulateAsrInput,
  options: SimulateAsrOptions,
): AsrTranscribeResult {
  const refTokens = tokenise(input.reference);
  const hotwordSet = new Set(input.hotwords.map((w) => tokenise(w).join(" ")));
  const seed = hash32(`${options.bucket}:${input.id}`);
  const rng = mulberry32(seed);
  const verbatimRate = options.bucket === "clean" ? 0.98 : 0.94;
  const biasedRate = 0.995;

  const outputTokens: string[] = [];
  const wordEntries: AsrTranscribeResult["words"] = [];
  let totalConfidence = 0;

  refTokens.forEach((token, idx) => {
    const isBiased = hotwordSet.has(token);
    const threshold = isBiased ? biasedRate : verbatimRate;
    let outToken: string;
    let confidence: number;
    if (rng() < threshold) {
      // Verbatim.
      outToken = token;
      confidence = isBiased ? CONFIDENCE_BIASED : (options.bucket === "clean" ? CONFIDENCE_CLEAN : CONFIDENCE_NOISY);
    } else if (rng() < 0.7) {
      // Substitution — pick from the pool deterministically.
      const idx2 = Math.floor(rng() * SUBSTITUTION_POOL.length);
      outToken = SUBSTITUTION_POOL[idx2] ?? "a";
      confidence = CONFIDENCE_NOISY - 0.05;
    } else if (rng() < 0.5) {
      // Deletion — drop the token entirely.
      return;
    } else {
      // Insertion — append a noise token after this slot.
      outToken = token;
      confidence = CONFIDENCE_NOISY - 0.05;
      const noiseIdx = Math.floor(rng() * SUBSTITUTION_POOL.length);
      const noise = SUBSTITUTION_POOL[noiseIdx] ?? "a";
      const noiseConfidence = CONFIDENCE_NOISY - 0.1;
      outputTokens.push(outToken);
      wordEntries.push({
        word: outToken,
        start: idx * 0.4,
        end: (idx + 1) * 0.4,
        confidence,
      });
      outputTokens.push(noise);
      wordEntries.push({
        word: noise,
        start: idx * 0.4 + 0.05,
        end: idx * 0.4 + 0.35,
        confidence: noiseConfidence,
      });
      totalConfidence += confidence + noiseConfidence;
      return;
    }

    outputTokens.push(outToken);
    wordEntries.push({
      word: outToken,
      start: idx * 0.4,
      end: (idx + 1) * 0.4,
      confidence,
    });
    totalConfidence += confidence;
  });

  return {
    text: outputTokens.join(" "),
    words: wordEntries,
    confidence: wordEntries.length === 0 ? CONFIDENCE_NOISY : totalConfidence / wordEntries.length,
    languageDetected: "pt-PT",
  };
}