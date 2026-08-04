import type { Level } from "@/lib/curriculum/types";
import { DIFFICULTY_MAX } from "./types";

const PUNCTUATION = /[.,!?;:"'`´()\[\]{}<>\\/]/g;
const WHITESPACE = /\s+/g;

const MAX_PHRASE_TOKENS = 5;

export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .normalize("NFC")
    .replace(PUNCTUATION, " ")
    .replace(WHITESPACE, " ")
    .trim();
  if (cleaned.length === 0) return [];
  return cleaned.split(" ");
}

export function lexicalCoverage(text: string, vocabulary: ReadonlySet<string>): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 1;

  let coveredTokens = 0;
  let i = 0;
  while (i < tokens.length) {
    const remaining = tokens.length - i;
    const maxLen = Math.min(MAX_PHRASE_TOKENS, remaining);
    let matched = false;
    for (let n = maxLen; n >= 1; n -= 1) {
      const candidate = tokens.slice(i, i + n).join(" ");
      if (vocabulary.has(candidate)) {
        coveredTokens += n;
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      i += 1;
    }
  }
  return coveredTokens / tokens.length;
}

export function tokenMissRate(text: string, vocabulary: ReadonlySet<string>): number {
  return 1 - lexicalCoverage(text, vocabulary);
}

export type VocabularyByLevel = Readonly<Record<Level, ReadonlySet<string>>>;

export function scoreUtterance(
  text: string,
  level: Level,
  vocabByLevel: VocabularyByLevel,
): number {
  const tmr = tokenMissRate(text, vocabByLevel[level]);
  const raw = DIFFICULTY_MAX * tmr;
  if (raw < 0) return 0;
  if (raw > DIFFICULTY_MAX) return DIFFICULTY_MAX;
  return raw;
}

export type DialectDefect = {
  token: string;
  start: number;
  end: number;
  reason: string;
};

export type DialectReport = {
  tokens: ReadonlyArray<{ token: string; start: number; end: number }>;
  defects: ReadonlyArray<DialectDefect>;
};

const PT_BR_MARKERS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /(?<=^|\s)você(?=\s|$|[,.!?])/idg, reason: "pt-BR pronoun; pt-PT prefers 'tu'" },
  { pattern: /(?<=^|\s)vocês(?=\s|$|[,.!?])/idg, reason: "pt-BR plural pronoun; pt-PT prefers 'vós'" },
  { pattern: /(?<=^|\s)tá(?=\s|$|[,.!?])/idg, reason: "pt-BR contraction 'tá'; pt-PT prefers 'está'" },
  { pattern: /(?<=^|\s)tão(?=\s|$|[,.!?])/idg, reason: "pt-BR plural contraction; pt-PT prefers 'estão'" },
  { pattern: /(?<=^|\s)pra(?=\s|$|[,.!?])/idg, reason: "pt-BR contraction 'pra'; pt-PT prefers 'para'" },
  { pattern: /(?<=^|\s)pro(?=\s|$|[,.!?])/idg, reason: "pt-BR contraction 'pro'; pt-PT prefers 'para o'" },
];

export function detectDialectDefects(text: string): DialectReport {
  const tokens: Array<{ token: string; start: number; end: number }> = [];
  for (const m of text.toLowerCase().matchAll(/\S+/gd)) {
    const idx = m.indices?.[0];
    if (!idx) continue;
    tokens.push({ token: m[0], start: idx[0], end: idx[1] });
  }

  const defects: DialectDefect[] = [];
  for (const { pattern, reason } of PT_BR_MARKERS) {
    for (const m of text.matchAll(pattern)) {
      const idx = m.indices?.[0];
      if (!idx) continue;
      defects.push({ token: m[0].toLowerCase(), start: idx[0], end: idx[1], reason });
    }
  }

  return { tokens, defects };
}