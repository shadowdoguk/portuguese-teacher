/**
 * Word Error Rate (WER) — pure functional implementation.
 *
 *   WER = (S + D + I) / N
 *     S = substitutions, D = deletions, I = insertions
 *     N = number of words in the reference
 *
 * Uses dynamic-programming edit distance between the two tokenised sequences.
 * Diacritics are preserved (pt-PT carries accent marks on common words).
 *
 * The reference and hypothesis should already be lower-cased + tokenised by
 * the caller; this function only computes the edit-distance step.
 */
export type WerResult = {
  /** Total edit distance: S + D + I */
  edits: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  /** Reference word count N */
  referenceWords: number;
  /** Hypothesis word count */
  hypothesisWords: number;
  /** WER ∈ [0, ∞). Caller caps at 1.0 for sentence-level reporting. */
  wer: number;
};

/**
 * Compute Word Error Rate between a reference and a hypothesis.
 *
 * - Both arguments are tokenised + lower-cased by the caller.
 * - Empty reference → returns `referenceWords: 0, wer: 0`. Callers should
 *   guard against division-by-zero semantics separately (an empty
 *   reference + non-empty hypothesis counts as 100 % WER at the bucket
 *   level — see `bucketWer`).
 * - An exact match → `wer: 0`.
 */
export function computeWer(reference: ReadonlyArray<string>, hypothesis: ReadonlyArray<string>): WerResult {
  const n = reference.length;
  const m = hypothesis.length;
  if (n === 0 && m === 0) {
    return { edits: 0, substitutions: 0, deletions: 0, insertions: 0, referenceWords: 0, hypothesisWords: 0, wer: 0 };
  }
  // dp[i][j] = edit distance between reference[0..i) and hypothesis[0..j).
  // ops[i][j] = the operation that produced the min cost. Ties break in the
  // standard order: match > substitution > deletion > insertion. This keeps
  // the S/D/I counts stable across runs.
  type Op = "M" | "S" | "D" | "I";
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const ops: Op[][] = Array.from({ length: n + 1 }, () => new Array<Op>(m + 1).fill("M"));
  for (let i = 0; i <= n; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= m; j += 1) dp[0]![j] = j;
  for (let j = 1; j <= m; j += 1) ops[0]![j] = "I";
  for (let i = 1; i <= n; i += 1) {
    ops[i]![0] = "D";
    for (let j = 1; j <= m; j += 1) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      const sub = dp[i - 1]![j - 1]! + cost;
      const del = dp[i - 1]![j]! + 1;
      const ins = dp[i]![j - 1]! + 1;
      let op: Op;
      if (sub <= del && sub <= ins) {
        dp[i]![j] = sub;
        op = cost === 0 ? "M" : "S";
      } else if (del <= ins) {
        dp[i]![j] = del;
        op = "D";
      } else {
        dp[i]![j] = ins;
        op = "I";
      }
      ops[i]![j] = op;
    }
  }
  // Walk back to count substitution vs deletion vs insertion.
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const op = ops[i]![j]!;
    if (op === "M") {
      i -= 1;
      j -= 1;
    } else if (op === "S") {
      substitutions += 1;
      i -= 1;
      j -= 1;
    } else if (op === "D") {
      deletions += 1;
      i -= 1;
    } else {
      insertions += 1;
      j -= 1;
    }
  }
  while (i > 0) {
    deletions += 1;
    i -= 1;
  }
  while (j > 0) {
    insertions += 1;
    j -= 1;
  }
  const edits = substitutions + deletions + insertions;
  const wer = n === 0 ? 0 : edits / n;
  return {
    edits,
    substitutions,
    deletions,
    insertions,
    referenceWords: n,
    hypothesisWords: m,
    wer,
  };
}

/**
 * Tokenise a transcript for WER comparison. Lower-cases, strips leading /
 * trailing whitespace, splits on any non-letter / non-digit sequence
 * (Unicode-aware so accented characters stay with their tokens). Filters
 * empty tokens.
 */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
}

export type BucketSummary = {
  bucket: "clean" | "noisy";
  utterances: number;
  totalReferenceWords: number;
  totalEdits: number;
  wer: number;
  perUtterance: ReadonlyArray<{
    id: string;
    wer: number;
    edits: number;
    referenceWords: number;
  }>;
};

/**
 * Aggregate per-utterance WER results into a bucket summary. Micro-averaged
 * over all reference words in the bucket (NFR-1 measures production WER on
 * a sample, so the bucket-level number should reflect the volume-weighted
 * WER, not the unweighted mean of per-sentence WERs).
 */
export function summariseBucket(
  bucket: "clean" | "noisy",
  perUtterance: ReadonlyArray<{ id: string; result: WerResult }>,
): BucketSummary {
  let totalReferenceWords = 0;
  let totalEdits = 0;
  const entries: Array<{ id: string; wer: number; edits: number; referenceWords: number }> = [];
  for (const { id, result } of perUtterance) {
    totalReferenceWords += result.referenceWords;
    totalEdits += result.edits;
    entries.push({
      id,
      wer: result.wer,
      edits: result.edits,
      referenceWords: result.referenceWords,
    });
  }
  const wer = totalReferenceWords === 0 ? 0 : totalEdits / totalReferenceWords;
  return {
    bucket,
    utterances: perUtterance.length,
    totalReferenceWords,
    totalEdits,
    wer,
    perUtterance: entries,
  };
}