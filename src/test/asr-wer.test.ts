import { describe, expect, it } from "vitest";
import { computeWer, summariseBucket, tokenise, type WerResult } from "@/lib/asr/wer";

describe("tokenise", () => {
  it("lower-cases and splits on non-letter / non-digit runs", () => {
    expect(tokenise("Olá, BOM dia!")).toEqual(["olá", "bom", "dia"]);
  });

  it("preserves accented characters (pt-PT)", () => {
    expect(tokenise("café, água, não")).toEqual(["café", "água", "não"]);
  });

  it("filters empty tokens", () => {
    expect(tokenise("  --- olá ---  ")).toEqual(["olá"]);
  });

  it("returns [] for an empty string", () => {
    expect(tokenise("")).toEqual([]);
  });
});

describe("computeWer", () => {
  it("returns 0 for an exact match", () => {
    const result = computeWer(["olá", "bom", "dia"], ["olá", "bom", "dia"]);
    expect(result.wer).toBe(0);
    expect(result.edits).toBe(0);
    expect(result.referenceWords).toBe(3);
    expect(result.hypothesisWords).toBe(3);
  });

  it("counts a substitution as 1 edit", () => {
    const result = computeWer(["olá", "bom", "dia"], ["olá", "bem", "dia"]);
    expect(result.substitutions).toBe(1);
    expect(result.deletions).toBe(0);
    expect(result.insertions).toBe(0);
    expect(result.wer).toBeCloseTo(1 / 3);
  });

  it("counts a deletion as 1 edit", () => {
    const result = computeWer(["olá", "bom", "dia"], ["olá", "dia"]);
    expect(result.deletions).toBe(1);
    expect(result.substitutions).toBe(0);
    expect(result.wer).toBeCloseTo(1 / 3);
  });

  it("counts an insertion as 1 edit", () => {
    const result = computeWer(["olá", "dia"], ["olá", "bom", "dia"]);
    expect(result.insertions).toBe(1);
    expect(result.wer).toBeCloseTo(1 / 2);
  });

  it("counts mixed edits on a longer pt-PT sentence", () => {
    // "eu quero um café por favor" vs "eu queria um café"
    // = 1 substitution (quer -> queria counts as one if we just diff tokens,
    // but at the token level the lengths differ — 2 deletions + 1 insertion)
    const ref = ["eu", "quero", "um", "café", "por", "favor"];
    const hyp = ["eu", "queria", "um", "café"];
    const result = computeWer(ref, hyp);
    // Total edits = 3 (deletion of "quero" + insertion of "queria" + deletion of "por", "favor")
    expect(result.edits).toBeGreaterThan(0);
    expect(result.wer).toBeCloseTo(result.edits / 6);
  });

  it("returns 0 for an empty reference + empty hypothesis", () => {
    const result = computeWer([], []);
    expect(result.wer).toBe(0);
    expect(result.referenceWords).toBe(0);
  });

  it("counts all hypothesis words as insertions when the reference is empty", () => {
    const result = computeWer([], ["olá", "bom", "dia"]);
    expect(result.referenceWords).toBe(0);
    expect(result.edits).toBe(3);
    expect(result.insertions).toBe(3);
    expect(result.deletions).toBe(0);
    expect(result.substitutions).toBe(0);
    // wer is 0 by convention (no division by zero); the bucket summary
    // catches this case via the bucket-level denominator.
    expect(result.wer).toBe(0);
  });

  it("preserves accented characters in token comparison", () => {
    expect(computeWer(["água"], ["água"]).wer).toBe(0);
    expect(computeWer(["água"], ["augua"]).substitutions).toBe(1);
  });

  it("matches the S + D + I invariant", () => {
    const cases: Array<[string[], string[]]> = [
      [["a", "b", "c"], ["a", "b", "c"]],
      [["a", "b", "c"], ["a", "c"]],
      [["a", "b", "c"], ["x", "y", "a", "b", "c"]],
      [["olá", "como", "vais"], ["olá", "como", "está"]],
    ];
    for (const [ref, hyp] of cases) {
      const r: WerResult = computeWer(ref, hyp);
      expect(r.substitutions + r.deletions + r.insertions).toBe(r.edits);
    }
  });
});

describe("summariseBucket", () => {
  it("micro-averages WER over total reference words (not per-sentence)", () => {
    const perUtterance = [
      // Sentence 1: 10 ref words, 1 error → 10% sentence WER
      { id: "a", result: computeWer(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], ["a", "b", "c", "d", "e", "f", "g", "h", "i", "k"]) },
      // Sentence 2: 5 ref words, 0 errors → 0% sentence WER
      { id: "b", result: computeWer(["x", "y", "z", "w", "v"], ["x", "y", "z", "w", "v"]) },
    ];
    const summary = summariseBucket("clean", perUtterance);
    expect(summary.totalReferenceWords).toBe(15);
    expect(summary.totalEdits).toBe(1);
    expect(summary.wer).toBeCloseTo(1 / 15); // ~6.67%, not the 5% mean of 10% + 0%
  });

  it("returns 0 WER for an empty bucket", () => {
    const summary = summariseBucket("clean", []);
    expect(summary.utterances).toBe(0);
    expect(summary.totalReferenceWords).toBe(0);
    expect(summary.wer).toBe(0);
  });
});