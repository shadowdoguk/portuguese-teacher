import { describe, expect, it } from "vitest";
import {
  SUB_LEVELS,
  assertMonotonicVocabulary,
  isSubLevel,
  subLevelParent,
  vocabularyFor,
  vocabularyForSubLevel,
  vocabularyStats,
} from "@/lib/voice-loop/level-vocabulary";
import { LEVELS } from "@/lib/curriculum/types";
import { ALL_AB_CORPORA, A1_TO_A2_CORPUS, A2_TO_B1_CORPUS } from "@/lib/voice-loop/ab-corpus";

describe("vocabulary fixture", () => {
  it("ships monotonic level vocabularies", () => {
    expect(() => assertMonotonicVocabulary()).not.toThrow();
  });

  it("has all 4 main levels", () => {
    for (const level of LEVELS) {
      expect(vocabularyFor(level).size).toBeGreaterThan(0);
    }
  });

  it("expands per level: A0 < A1 < A2 < B1", () => {
    const stats = vocabularyStats();
    expect(stats.byLevel.A0).toBeLessThan(stats.byLevel.A1);
    expect(stats.byLevel.A1).toBeLessThan(stats.byLevel.A2);
    expect(stats.byLevel.A2).toBeLessThan(stats.byLevel.B1);
  });

  it("recognises valid sub-level values", () => {
    expect(isSubLevel("A2.1")).toBe(true);
    expect(isSubLevel("A2.2")).toBe(true);
    expect(isSubLevel("B1.1")).toBe(true);
    expect(isSubLevel("B1.2")).toBe(true);
    expect(isSubLevel("A3")).toBe(false);
    expect(isSubLevel("")).toBe(false);
  });

  it("maps sub-levels to their parents", () => {
    expect(subLevelParent("A2.1")).toBe("A2");
    expect(subLevelParent("A2.2")).toBe("A2");
    expect(subLevelParent("B1.1")).toBe("B1");
    expect(subLevelParent("B1.2")).toBe("B1");
  });

  it("derives sub-level vocabularies from parent + additions", () => {
    for (const sub of SUB_LEVELS) {
      const parent = subLevelParent(sub);
      const parentWords = vocabularyFor(parent);
      const subWords = vocabularyForSubLevel(sub);
      expect(subWords.size).toBeGreaterThanOrEqual(parentWords.size);
      for (const word of parentWords) {
        expect(subWords.has(word)).toBe(true);
      }
    }
  });

  it("ships sub-level additions beyond the parent vocabulary", () => {
    for (const subLevel of SUB_LEVELS) {
      const parent = vocabularyFor(subLevelParent(subLevel));
      const subWords = vocabularyForSubLevel(subLevel);
      let additions = 0;
      for (const word of subWords) {
        if (!parent.has(word)) additions += 1;
      }
      expect(additions).toBeGreaterThan(0);
    }
  });

  it("is pt-PT only (no Brazil references)", () => {
    const forbidden = new Set(["brasil", "brazil", "voce", "voces", "pra", "pro", "tá", "tão"]);
    const tokens = new Set<string>();
    for (const level of LEVELS) {
      for (const word of vocabularyFor(level)) {
        tokens.add(word.toLowerCase());
      }
    }
    for (const sub of SUB_LEVELS) {
      for (const word of vocabularyForSubLevel(sub)) {
        tokens.add(word.toLowerCase());
      }
    }
    for (const token of tokens) {
      const lower = token.toLowerCase();
      expect(forbidden.has(lower)).toBe(false);
    }
  });
});

describe("A/B corpora", () => {
  it("ships three corpora (A0→A1, A1→A2, A2→B1)", () => {
    expect(ALL_AB_CORPORA).toHaveLength(3);
    expect(ALL_AB_CORPORA[0]?.targetLevel).toBe("A0");
    expect(ALL_AB_CORPORA[1]?.targetLevel).toBe("A1");
    expect(ALL_AB_CORPORA[2]?.targetLevel).toBe("A2");
  });

  it("A1→A2 corpus has 100 entries across 10 categories", () => {
    expect(A1_TO_A2_CORPUS.entries.length).toBe(100);
    const categories = new Set(A1_TO_A2_CORPUS.entries.map((e) => e.notes));
    expect(categories.size).toBe(10);
  });

  it("A2→B1 corpus has 100 entries across 10 categories", () => {
    expect(A2_TO_B1_CORPUS.entries.length).toBe(100);
    const categories = new Set(A2_TO_B1_CORPUS.entries.map((e) => e.notes));
    expect(categories.size).toBe(10);
  });

  it("target sits above the previous level's target (i+1 progression)", () => {
    expect(A1_TO_A2_CORPUS.target).toBeGreaterThan(ALL_AB_CORPORA[0]!.target);
    expect(A2_TO_B1_CORPUS.target).toBeGreaterThan(A1_TO_A2_CORPUS.target);
  });

  it("all entries have unique ids within a corpus", () => {
    for (const corpus of ALL_AB_CORPORA) {
      const ids = new Set<string>();
      for (const entry of corpus.entries) {
        expect(ids.has(entry.id)).toBe(false);
        ids.add(entry.id);
      }
    }
  });
});
