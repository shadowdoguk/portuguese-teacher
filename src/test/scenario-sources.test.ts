import { describe, expect, it } from "vitest";
import {
  applyScenarioSources,
  allReviewableRefs,
  vocabularyRefsFromCurriculum,
  type ScenarioSourceMap,
} from "@/lib/srs/enroll-from-curriculum";
import type { SrsItemRef } from "@/lib/srs/types";

describe("applyScenarioSources", () => {
  const baseRef: SrsItemRef = {
    kind: "vocabulary",
    itemId: "a0-3-v-cafe",
    pt: "café",
    gloss: "coffee",
    unitId: "a0-3-cafe-pedidos",
  };

  it("returns the refs untouched when the source map is empty", () => {
    const refs = [baseRef];
    const empty: ScenarioSourceMap = new Map();
    expect(applyScenarioSources(refs, empty)).toEqual(refs);
  });

  it("does not mutate the input refs", () => {
    const refs = [baseRef];
    const tagged = applyScenarioSources(refs, new Map([["a0-3-v-cafe", "s-cafe-1"]]));
    expect(refs[0]?.sourceScenarioId).toBeUndefined();
    expect(tagged[0]?.sourceScenarioId).toBe("s-cafe-1");
  });

  it("tags matching items with their source scenario id", () => {
    const refs = [
      { ...baseRef, itemId: "a0-3-v-pastel-nata" },
      { ...baseRef, itemId: "a0-3-v-agua" },
      { ...baseRef, itemId: "a0-3-v-cafe" },
    ];
    const sources: ScenarioSourceMap = new Map([
      ["a0-3-v-pastel-nata", "s-cafe-1-pedir-basico"],
      ["a0-3-v-cafe", "s-cafe-1-pedir-basico"],
    ]);
    const tagged = applyScenarioSources(refs, sources);
    expect(tagged[0]?.sourceScenarioId).toBe("s-cafe-1-pedir-basico");
    expect(tagged[1]?.sourceScenarioId).toBeUndefined();
    expect(tagged[2]?.sourceScenarioId).toBe("s-cafe-1-pedir-basico");
  });

  it("keeps non-matching refs unchanged", () => {
    const refs = [baseRef];
    const tagged = applyScenarioSources(refs, new Map([["some-other-id", "s-x"]]));
    expect(tagged[0]?.sourceScenarioId).toBeUndefined();
  });
});

describe("vocabularyRefsFromCurriculum + allReviewableRefs", () => {
  it("vocabularyRefsFromCurriculum returns a non-empty list", () => {
    expect(vocabularyRefsFromCurriculum().length).toBeGreaterThan(0);
  });

  it("allReviewableRefs includes both vocabulary and grammar refs", () => {
    const refs = allReviewableRefs();
    const kinds = new Set(refs.map((r) => r.kind));
    expect(kinds.has("vocabulary")).toBe(true);
    expect(kinds.has("grammar")).toBe(true);
  });
});