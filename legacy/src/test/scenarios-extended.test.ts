import { describe, expect, it } from "vitest";
import {
  EXTENDED_SCENARIOS,
  SCENARIOS_BY_UNIT_ID,
  SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS,
  scenariosForUnit,
} from "@/lib/curriculum/scenarios-extended";
import { A1_CURRICULUM } from "@/lib/curriculum/seed-a1";
import { A2_CURRICULUM } from "@/lib/curriculum/seed-a2";
import { B1_CURRICULUM } from "@/lib/curriculum/seed-b1";

describe("scenarios-extended", () => {
  it("exports a non-empty list of extended scenarios", () => {
    expect(EXTENDED_SCENARIOS.length).toBeGreaterThanOrEqual(70);
  });

  it("scopes every extended scenario to a seeded A1/A2/B1 Unit ID", () => {
    const seededSet = new Set<string>(SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS);
    for (const scenario of EXTENDED_SCENARIOS) {
      expect(seededSet.has(scenario.unitId)).toBe(true);
    }
  });

  it("groups scenarios by Unit ID with no duplicates", () => {
    const seen = new Set<string>();
    for (const [unitId, scenarios] of Object.entries(SCENARIOS_BY_UNIT_ID)) {
      expect(unitId).toBeTruthy();
      expect(scenarios.length).toBeGreaterThan(0);
      for (const scenario of scenarios) {
        expect(seen.has(scenario.id)).toBe(false);
        seen.add(scenario.id);
        expect(scenario.unitId).toBe(unitId);
      }
    }
    expect(seen.size).toBe(EXTENDED_SCENARIOS.length);
  });

  it("returns an empty array for a Unit ID that has no scenarios", () => {
    expect(scenariosForUnit("does-not-exist")).toEqual([]);
  });

  it("wires the expected Unit IDs", () => {
    expect(Object.keys(SCENARIOS_BY_UNIT_ID).sort()).toEqual(
      [...SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS].sort(),
    );
  });

  it("A1_CURRICULUM wires library scenarios into every A1 Unit", () => {
    for (const unit of A1_CURRICULUM.units) {
      const expected = SCENARIOS_BY_UNIT_ID[unit.id] ?? [];
      expect(unit.scenarios.length).toBe(expected.length);
      expect(unit.scenarios.map((s) => s.id).sort()).toEqual(
        expected.map((s) => s.id).sort(),
      );
    }
  });

  it("A2_CURRICULUM wires library scenarios into every seeded A2 Unit", () => {
    for (const unit of A2_CURRICULUM.units) {
      const expected = SCENARIOS_BY_UNIT_ID[unit.id] ?? [];
      expect(unit.scenarios.length).toBe(expected.length);
      expect(unit.scenarios.map((s) => s.id).sort()).toEqual(
        expected.map((s) => s.id).sort(),
      );
    }
  });

  it("B1_CURRICULUM wires library scenarios into every seeded B1 Unit", () => {
    for (const unit of B1_CURRICULUM.units) {
      const expected = SCENARIOS_BY_UNIT_ID[unit.id] ?? [];
      expect(unit.scenarios.length).toBe(expected.length);
      expect(unit.scenarios.map((s) => s.id).sort()).toEqual(
        expected.map((s) => s.id).sort(),
      );
    }
  });

  it("SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS covers every A1/A2/B1 Unit declared in the seeds", () => {
    // Pin the invariant: the wiring list stays in sync with the
    // declared Unit IDs. If a future seed adds a new A1/A2/B1 Unit
    // without updating this list, this test catches it.
    const seededIds = new Set([
      ...A1_CURRICULUM.units,
      ...A2_CURRICULUM.units,
      ...B1_CURRICULUM.units,
    ].map((u) => u.id));
    expect(new Set(SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS)).toEqual(seededIds);
  });

  it("every extended scenario preserves the required Scenario fields", () => {
    for (const scenario of EXTENDED_SCENARIOS) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.unitId).toBeTruthy();
      expect(scenario.category).toBeTruthy();
      expect(scenario.targetLevel).toBeTruthy();
      expect(scenario.goal).toBeTruthy();
      expect(scenario.setting).toBeTruthy();
      expect(scenario.roles.learner).toBeTruthy();
      expect(scenario.roles.teacher).toBeTruthy();
      expect(scenario.preTask).toBeTruthy();
      expect(scenario.expectedTurns).toBeGreaterThan(0);
      expect(scenario.passingScore).toBeGreaterThan(0);
      expect(scenario.passingScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(scenario.successCriteria)).toBe(true);
      expect(scenario.successCriteria.length).toBeGreaterThan(0);
    }
  });
});