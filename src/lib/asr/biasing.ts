import type { PrismaClient } from "@prisma/client";

/**
 * The minimum per-utterance confidence required for the Voice Loop to act on
 * the transcript. Below this threshold the Learner is prompted to retry
 * (per ADR-0002 §"Low-confidence handling" — issue #38).
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export type UnitBiasingVocabularyDeps = {
  prisma: PrismaClient;
};

export type UnitBiasingVocabulary = {
  unitId: string;
  /**
   * Lower-cased, deduped, tokenised biasing vocabulary. Includes the `pt` form
   * of every `VocabularyItem` for the Unit plus the `pt` form of every example
   * sentence on `VocabularyItem` and `GrammarPattern`.
   */
  words: ReadonlyArray<string>;
  /** True when the Unit exists in the database and produced a non-empty vocab. */
  present: boolean;
};

const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(TOKEN_SPLIT)
    .filter((token) => token.length > 0);
}

function dedupePreserveOrder(tokens: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

function safeParseExamples(json: string): Array<{ pt: string }> {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is { pt: string } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { pt?: unknown }).pt === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Build the ASR language-model biasing vocabulary for a Unit. Pulls the
 * `pt` form of every `VocabularyItem` plus the example sentences from
 * `VocabularyItem` and `GrammarPattern` for the Unit. Returns an empty
 * result with `present: false` when the Unit does not exist.
 */
export async function unitBiasingVocabulary(
  unitId: string,
  deps: UnitBiasingVocabularyDeps,
): Promise<UnitBiasingVocabulary> {
  const unit = await deps.prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true },
  });
  if (!unit) {
    return { unitId, words: [], present: false };
  }

  const [vocab, grammar] = await Promise.all([
    deps.prisma.vocabularyItem.findMany({
      where: { unitId },
      select: { pt: true, examplePt: true },
    }),
    deps.prisma.grammarPattern.findMany({
      where: { unitId },
      select: { examplesJson: true },
    }),
  ]);

  const tokens = new Set<string>();
  for (const v of vocab) {
    for (const token of tokenize(v.pt)) tokens.add(token);
    if (v.examplePt) {
      for (const token of tokenize(v.examplePt)) tokens.add(token);
    }
  }
  for (const g of grammar) {
    for (const ex of safeParseExamples(g.examplesJson)) {
      for (const token of tokenize(ex.pt)) tokens.add(token);
    }
  }
  const words = dedupePreserveOrder(tokens);
  return { unitId, words, present: words.length > 0 };
}

/**
 * Returns `true` when the ASR transcript's aggregate confidence falls below
 * the {@link LOW_CONFIDENCE_THRESHOLD} and the Learner should be prompted to
 * retry. Per ADR-0002: "Low-confidence utterances surface a retry prompt
 * instead of being scored."
 */
export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}