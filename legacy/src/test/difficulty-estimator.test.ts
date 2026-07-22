import { describe, expect, it } from "vitest";
import {
  detectDialectDefects,
  tokenMissRate,
  lexicalCoverage,
  scoreUtterance,
  tokenize,
} from "@/lib/voice-loop/difficulty-estimator";
import { vocabularyFor } from "@/lib/voice-loop/level-vocabulary";
import type { Level } from "@/lib/curriculum/types";

describe("difficulty-estimator: tokenize", () => {
  it("lowercases and strips punctuation, splitting on whitespace", () => {
    expect(tokenize("Olá, tudo bem?")).toEqual(["olá", "tudo", "bem"]);
  });

  it("collapses repeated whitespace and trims edges", () => {
    expect(tokenize("  Olá   mundo  ")).toEqual(["olá", "mundo"]);
  });

  it("tokenizes phrase input into individual words; phrase matching is the coverage function's job", () => {
    expect(tokenize("bom dia, como estás")).toEqual(["bom", "dia", "como", "estás"]);
  });

  it("returns an empty array for an empty or punctuation-only string", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("???")).toEqual([]);
  });

  it("keeps accented characters intact", () => {
    expect(tokenize("Não sei.")).toEqual(["não", "sei"]);
  });
});

describe("difficulty-estimator: lexicalCoverage", () => {
  it("returns 1 when every token is in the vocabulary", () => {
    const a0 = vocabularyFor("A0");
    expect(lexicalCoverage("olá bom dia", a0)).toBe(1);
  });

  it("returns 0 when no token is in the vocabulary", () => {
    const a0 = vocabularyFor("A0");
    expect(lexicalCoverage("xenophobic quasar zymurgy", a0)).toBe(0);
  });

  it("returns the fraction of matched tokens for partial coverage", () => {
    const a0 = vocabularyFor("A0");
    // "olá" is in A0, "xenophobic" is not → 1/2
    expect(lexicalCoverage("olá xenophobic", a0)).toBeCloseTo(0.5, 5);
  });

  it("matches multi-word phrases greedily when present in the vocabulary", () => {
    const a1 = vocabularyFor("A1");
    // "bom dia" + "como estás" both in A1 → 4/4 tokens covered
    expect(lexicalCoverage("bom dia, como estás?", a1)).toBe(1);
  });

  it("does not credit partial phrase overlap that is not in the vocabulary", () => {
    const a0 = vocabularyFor("A0");
    // "bom" and "dia" are both in A0 individually, so coverage is still 1 here
    expect(lexicalCoverage("bom dia", a0)).toBe(1);
  });

  it("returns 1 (vacuously) for an empty or punctuation-only string", () => {
    const a1 = vocabularyFor("A1");
    expect(lexicalCoverage("", a1)).toBe(1);
    expect(lexicalCoverage("???", a1)).toBe(1);
  });

  it("scales correctly when higher-level words are encountered at lower levels", () => {
    const a0 = vocabularyFor("A0");
    const a1 = vocabularyFor("A1");
    const utterance = "ontem fui ao café com o meu amigo";
    // "ontem", "fui", "café" are A1+ words
    const covA0 = lexicalCoverage(utterance, a0);
    const covA1 = lexicalCoverage(utterance, a1);
    expect(covA0).toBeLessThan(covA1);
  });
});

describe("difficulty-estimator: tokenMissRate", () => {
  it("equals 1 minus coverage, ranging from 0 (all known) to 1 (none known)", () => {
    const a0 = vocabularyFor("A0");
    expect(tokenMissRate("olá bom dia", a0)).toBe(0);
    expect(tokenMissRate("xenophobic quasar", a0)).toBe(1);
    expect(tokenMissRate("olá xenophobic", a0)).toBeCloseTo(0.5, 5);
  });

  it("is 0 for an empty string (vacuously)", () => {
    const a0 = vocabularyFor("A0");
    expect(tokenMissRate("", a0)).toBe(0);
  });
});

describe("difficulty-estimator: scoreUtterance", () => {
  const VOCAB_BY_LEVEL: Readonly<Record<Level, ReadonlySet<string>>> = {
    A0: vocabularyFor("A0"),
    A1: vocabularyFor("A1"),
    A2: vocabularyFor("A2"),
    B1: vocabularyFor("B1"),
  };

  it("returns a number in [0, 3] aligned with the LLM's difficulty_estimate range", () => {
    const score = scoreUtterance("xenophobic quasar zymurgy xylo", "A0", VOCAB_BY_LEVEL);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(3);
  });

  it("scores an A0-perfect utterance near 0 and an unknown-token utterance near 3", () => {
    const trivial = scoreUtterance("olá bom dia, sim não", "A0", VOCAB_BY_LEVEL);
    const opaque = scoreUtterance("xyzzy plugh quux", "A0", VOCAB_BY_LEVEL);
    expect(trivial).toBeLessThan(0.5);
    expect(opaque).toBeGreaterThan(2.5);
  });

  it("scores an A0-target utterance higher at A1 (over-shooting the target)", () => {
    // "ontem fui ao café" — at A0, 4 tokens; "ontem"/"fui"/"café" are A1+.
    // At A0 the missing coverage is high; at A1 it drops.
    const atA0 = scoreUtterance("ontem fui ao café", "A0", VOCAB_BY_LEVEL);
    const atA1 = scoreUtterance("ontem fui ao café", "A1", VOCAB_BY_LEVEL);
    expect(atA1).toBeLessThan(atA0);
  });

  it("is monotonically non-increasing as the level rises (more words known)", () => {
    const utterance = "ontem fui ao café com a minha família";
    let prev = Number.POSITIVE_INFINITY;
    for (const level of ["A0", "A1", "A2", "B1"] as const) {
      const s = scoreUtterance(utterance, level, VOCAB_BY_LEVEL);
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
  });
});

describe("difficulty-estimator: detectDialectDefects", () => {
  it("returns no defects for clean pt-PT", () => {
    expect(detectDialectDefects("Olá, tudo bem? Como te chamas?").defects).toEqual([]);
  });

  it("flags pt-BR-only pronouns as defects when the dialect is pt-PT", () => {
    const out = detectDialectDefects("Você é muito gentil, vocês são amáveis.");
    expect(out.defects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: "você" }),
        expect.objectContaining({ token: "vocês" }),
      ]),
    );
  });

  it("flags pt-BR-only contractions and reduced forms", () => {
    expect(detectDialectDefects("Tá bom, vou pra casa.").defects.length).toBeGreaterThan(0);
  });

  it("returns a non-empty tokens list with positions for downstream UI rendering", () => {
    const out = detectDialectDefects("Olá, você. Tudo bem?");
    expect(out.tokens.length).toBeGreaterThan(0);
    const defect = out.defects.find((d) => d.token === "você");
    expect(defect).toBeDefined();
    expect(typeof defect?.start).toBe("number");
    expect(typeof defect?.end).toBe("number");
  });
});