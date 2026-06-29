import { describe, expect, it } from "vitest";
import {
  LOW_CONFIDENCE_THRESHOLD,
  isLowConfidence,
  unitBiasingVocabulary,
  type UnitBiasingVocabularyDeps,
} from "@/lib/asr/biasing";
import type { PrismaClient } from "@prisma/client";

type PrismaStub = Pick<
  PrismaClient,
  "unit" | "vocabularyItem" | "grammarPattern"
>;

function makePrisma(
  overrides: Partial<{
    unit: { id: string } | null;
    vocabulary: ReadonlyArray<{ pt: string; examplePt: string | null }>;
    grammar: ReadonlyArray<{ examplesJson: string }>;
  }>,
): PrismaStub {
  const unit = overrides.unit ?? null;
  const vocabulary = overrides.vocabulary ?? [];
  const grammar = overrides.grammar ?? [];
  return {
    unit: {
      findUnique: async (args: { where: { id: string } }) =>
        unit && unit.id === args.where.id ? { id: unit.id } : null,
    },
    vocabularyItem: {
      findMany: async () => vocabulary,
    },
    grammarPattern: {
      findMany: async () => grammar,
    },
  } as unknown as PrismaStub;
}

function makeDeps(stub: PrismaStub): UnitBiasingVocabularyDeps {
  return { prisma: stub as unknown as PrismaClient };
}

describe("unitBiasingVocabulary", () => {
  it("returns present:false when the unit does not exist", async () => {
    const stub = makePrisma({ unit: null });
    const result = await unitBiasingVocabulary("unit-x", makeDeps(stub));
    expect(result).toEqual({ unitId: "unit-x", words: [], present: false });
  });

  it("returns an empty vocab (present:false) when the unit has no vocabulary or grammar", async () => {
    const stub = makePrisma({ unit: { id: "unit-empty" } });
    const result = await unitBiasingVocabulary("unit-empty", makeDeps(stub));
    expect(result).toEqual({ unitId: "unit-empty", words: [], present: false });
  });

  it("tokenises, lower-cases, and dedupes vocabulary pt + examplePt tokens", async () => {
    const stub = makePrisma({
      unit: { id: "unit-cafe" },
      vocabulary: [
        { pt: "café", examplePt: "Eu quero um café, por favor." },
        { pt: "CAFÉ", examplePt: null },
        { pt: "leite", examplePt: "Com leite, por favor." },
      ],
      grammar: [],
    });
    const result = await unitBiasingVocabulary("unit-cafe", makeDeps(stub));
    expect(result.present).toBe(true);
    expect(result.words).toEqual([
      "café",
      "eu",
      "quero",
      "um",
      "por",
      "favor",
      "leite",
      "com",
    ]);
  });

  it("includes grammar example pt tokens", async () => {
    const stub = makePrisma({
      unit: { id: "unit-grammar" },
      vocabulary: [],
      grammar: [
        { examplesJson: JSON.stringify([{ pt: "Bom dia" }, { pt: "Boa tarde" }]) },
        { examplesJson: JSON.stringify([{ pt: "Olá, tudo bem?" }]) },
      ],
    });
    const result = await unitBiasingVocabulary("unit-grammar", makeDeps(stub));
    expect(result.present).toBe(true);
    expect(result.words).toEqual([
      "bom",
      "dia",
      "boa",
      "tarde",
      "olá",
      "tudo",
      "bem",
    ]);
  });

  it("handles malformed grammar examplesJson gracefully (returns empty, does not throw)", async () => {
    const stub = makePrisma({
      unit: { id: "unit-bad-json" },
      vocabulary: [{ pt: "olá", examplePt: null }],
      grammar: [{ examplesJson: "not-json" }, { examplesJson: "[]" }],
    });
    const result = await unitBiasingVocabulary("unit-bad-json", makeDeps(stub));
    expect(result.present).toBe(true);
    expect(result.words).toEqual(["olá"]);
  });

  it("ignores empty tokens produced by punctuation-only splits", async () => {
    const stub = makePrisma({
      unit: { id: "unit-punct" },
      vocabulary: [{ pt: "— — —", examplePt: "?!." }],
      grammar: [],
    });
    const result = await unitBiasingVocabulary("unit-punct", makeDeps(stub));
    expect(result.present).toBe(false);
    expect(result.words).toEqual([]);
  });
});

describe("isLowConfidence", () => {
  it("exports the 0.6 threshold constant", () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.6);
  });

  it("returns true strictly below the threshold", () => {
    expect(isLowConfidence(0.59)).toBe(true);
    expect(isLowConfidence(0)).toBe(true);
    expect(isLowConfidence(0.5999)).toBe(true);
  });

  it("returns false at or above the threshold", () => {
    expect(isLowConfidence(0.6)).toBe(false);
    expect(isLowConfidence(0.85)).toBe(false);
    expect(isLowConfidence(1)).toBe(false);
  });
});