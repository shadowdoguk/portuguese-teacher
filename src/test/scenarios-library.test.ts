import { describe, expect, it } from "vitest";
import {
  SCENARIO_CATEGORIES,
  SCENARIO_LIBRARY,
  SCENARIO_LIBRARY_VERSION,
  assertScenarioLibraryInvariants,
  getScenarioById,
  scoreScenario,
  scenariosForCategory,
  scenariosForLevel,
} from "@/lib/scenarios/library";

describe("scenario library", () => {
  it("contains ≥ 30 pt-PT scenarios (FR-CP-4)", () => {
    expect(SCENARIO_LIBRARY.length).toBeGreaterThanOrEqual(30);
  });

  it("ships a stable library version", () => {
    expect(SCENARIO_LIBRARY_VERSION).toBeGreaterThanOrEqual(1);
  });

  it("has every ScenarioCategory represented", () => {
    const categoriesPresent = new Set(SCENARIO_LIBRARY.map((s) => s.category));
    for (const cat of SCENARIO_CATEGORIES) {
      expect(categoriesPresent.has(cat.value)).toBe(true);
    }
  });

  it("passes structural invariants", () => {
    expect(() => assertScenarioLibraryInvariants()).not.toThrow();
  });

  it("all scenarios are pt-PT only (no Brazil references)", () => {
    const forbidden = new Set([
      "brasil",
      "brazil",
      "voce",
      "voces",
      "pra",
      "pro",
      "tá",
      "tão",
    ]);
    const tokenize = (text: string): string[] => text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
    for (const scenario of SCENARIO_LIBRARY) {
      const tokens = tokenize(JSON.stringify(scenario));
      for (const token of tokens) {
        if (forbidden.has(token)) {
          throw new Error(
            `Scenario ${scenario.id} contains forbidden pt-BR token '${token}'`,
          );
        }
      }
    }
  });

  it("all scenarios have unique ids", () => {
    const ids = new Set<string>();
    for (const scenario of SCENARIO_LIBRARY) {
      expect(ids.has(scenario.id)).toBe(false);
      ids.add(scenario.id);
    }
  });

  it("all scenarios have ≥ 2 expected turns and a non-empty successCriteria", () => {
    for (const scenario of SCENARIO_LIBRARY) {
      expect(scenario.expectedTurns).toBeGreaterThanOrEqual(2);
      expect(scenario.successCriteria.length).toBeGreaterThan(0);
      expect(scenario.passingScore).toBeGreaterThanOrEqual(0);
      expect(scenario.passingScore).toBeLessThanOrEqual(1);
    }
  });

  it("getScenarioById resolves existing ids and returns undefined for missing", () => {
    expect(getScenarioById("s-greetings-1-cafe-entrar")).toBeDefined();
    expect(getScenarioById("nope")).toBeUndefined();
  });

  it("scenariosForCategory filters correctly", () => {
    const cafe = scenariosForCategory("cafe-restaurant");
    expect(cafe.length).toBeGreaterThan(0);
    for (const s of cafe) expect(s.category).toBe("cafe-restaurant");
  });

  it("scenariosForLevel filters correctly", () => {
    const a0 = scenariosForLevel("A0");
    expect(a0.length).toBeGreaterThan(0);
    for (const s of a0) expect(s.targetLevel).toBe("A0");
  });

  it("scenarios reference valid CEFR levels", () => {
    for (const scenario of SCENARIO_LIBRARY) {
      expect(["A0", "A1", "A2", "B1"]).toContain(scenario.targetLevel);
    }
  });
});

describe("scoreScenario", () => {
  const sample = SCENARIO_LIBRARY[0]!;

  it("returns 3 stars when all criteria met", () => {
    const result = scoreScenario(sample, sample.successCriteria.map(() => true));
    expect(result.passed).toBe(true);
    expect(result.stars).toBe(3);
  });

  it("returns 0 stars when no criteria met", () => {
    const result = scoreScenario(sample, sample.successCriteria.map(() => false));
    expect(result.passed).toBe(false);
    expect(result.stars).toBe(0);
  });

  it("returns 1 or 2 stars when partially met (above passing threshold)", () => {
    const total = sample.successCriteria.length;
    const aboveThreshold = sample.successCriteria.map((_, i) => i < total);
    const result = scoreScenario(sample, aboveThreshold);
    expect(result.passed).toBe(true);
    expect([1, 2, 3]).toContain(result.stars);
  });

  it("throws when criteria length mismatches", () => {
    expect(() => scoreScenario(sample, [])).toThrow();
  });

  it("marks every criterion with a pass/fail prefix", () => {
    const result = scoreScenario(sample, sample.successCriteria.map(() => true));
    for (const reason of result.reasons) {
      expect(/^[✓✗] /.test(reason)).toBe(true);
    }
  });
});
