import { describe, expect, it } from "vitest";
import {
  buildAffectiveDirective,
  pickAnchorVariant,
  shouldInjectDirective,
  type AnchorCandidate,
} from "@/lib/affective";
import {
  AFFECTIVE_HIGH_THRESHOLD,
  AFFECTIVE_LOW_THRESHOLD,
  type AffectiveFilterScore,
} from "@/lib/affective";

const fixedScore = (score: number, trend: AffectiveFilterScore["trend"] = "flat"): AffectiveFilterScore => ({
  score,
  trend,
  windowDays: 7,
  computedAt: "2026-06-27T12:00:00.000Z",
  signalsConsidered: 1,
});

describe("buildAffectiveDirective", () => {
  it("emits warmer tone + 0.5 difficulty drop when score <= low threshold", () => {
    const directive = buildAffectiveDirective(fixedScore(AFFECTIVE_LOW_THRESHOLD));
    expect(directive.tone).toBe("warmer");
    expect(directive.difficultyDrop).toBe(0.5);
    expect(directive.scaffoldingLevel).toBe("high");
    expect(directive.literal).toMatch(/Affective Filter: low-engagement Learner/);
  });

  it("emits terse tone when score >= high threshold", () => {
    const directive = buildAffectiveDirective(fixedScore(AFFECTIVE_HIGH_THRESHOLD));
    expect(directive.tone).toBe("terse");
    expect(directive.difficultyDrop).toBe(0);
    expect(directive.scaffoldingLevel).toBe("low");
    expect(directive.literal).toMatch(/Affective Filter: high-engagement Learner/);
  });

  it("emits neutral between thresholds", () => {
    const directive = buildAffectiveDirective(fixedScore(50));
    expect(directive.tone).toBe("neutral");
    expect(directive.scaffoldingLevel).toBe("normal");
  });

  it("includes trend guidance in literal", () => {
    const rising = buildAffectiveDirective(fixedScore(20, "rising"));
    const falling = buildAffectiveDirective(fixedScore(20, "falling"));
    expect(rising.literal).toMatch(/recovering/);
    expect(falling.literal).toMatch(/declining/);
  });

  it("summary is a stable short label", () => {
    expect(buildAffectiveDirective(fixedScore(20)).summary).toBe("low-engagement Learner");
    expect(buildAffectiveDirective(fixedScore(50)).summary).toBe("neutral engagement");
    expect(buildAffectiveDirective(fixedScore(80)).summary).toBe("high-engagement Learner");
  });
});

describe("shouldInjectDirective", () => {
  it("injects at low and high thresholds", () => {
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_LOW_THRESHOLD))).toBe(true);
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_LOW_THRESHOLD - 1))).toBe(true);
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_HIGH_THRESHOLD))).toBe(true);
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_HIGH_THRESHOLD + 1))).toBe(true);
  });

  it("does not inject in the neutral band", () => {
    expect(shouldInjectDirective(fixedScore(50))).toBe(false);
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_LOW_THRESHOLD + 1))).toBe(false);
    expect(shouldInjectDirective(fixedScore(AFFECTIVE_HIGH_THRESHOLD - 1))).toBe(false);
  });
});

describe("pickAnchorVariant", () => {
  const candidates: AnchorCandidate[] = [
    { id: "a", variant: "warmer" },
    { id: "b", variant: "canonical" },
  ];

  it("picks warmer when score is low", () => {
    expect(pickAnchorVariant(fixedScore(15), candidates)?.id).toBe("a");
  });

  it("picks canonical when score is neutral", () => {
    expect(pickAnchorVariant(fixedScore(50), candidates)?.id).toBe("b");
  });

  it("picks canonical when score is high", () => {
    expect(pickAnchorVariant(fixedScore(85), candidates)?.id).toBe("b");
  });

  it("falls back to canonical when no warmer exists", () => {
    const only: AnchorCandidate[] = [{ id: "b", variant: "canonical" }];
    expect(pickAnchorVariant(fixedScore(15), only)?.id).toBe("b");
  });

  it("returns null for empty candidate list", () => {
    expect(pickAnchorVariant(fixedScore(50), [])).toBeNull();
  });
});
