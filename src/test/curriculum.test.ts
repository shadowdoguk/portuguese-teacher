import { describe, expect, it } from "vitest";
import {
  A0_CURRICULUM,
  CurriculumError,
  LEVELS,
  assertAllMilestonesPresent,
  assertCurriculumInvariants,
  getDependents,
  getMilestoneForBoundary,
  getPrerequisites,
  indexCurriculum,
  isReachable,
  lessonCount,
  reachableUnits,
  resolveAnchors,
  unitsAtLevel,
} from "@/lib/curriculum";

describe("A0 seed fixture", () => {
  it("declares pt-PT dialect and the five-stage ladder type", () => {
    expect(A0_CURRICULUM.dialect).toBe("pt-PT");
    expect(LEVELS).toEqual(["A0", "A1", "A2", "B1"]);
  });

  it("passes the schema-level invariants", () => {
    expect(() => assertCurriculumInvariants(A0_CURRICULUM)).not.toThrow();
  });

  it("seeds at least 3 A0 Units (the minimum slice) with the documented entry unit", () => {
    const index = indexCurriculum(A0_CURRICULUM);
    const a0Units = unitsAtLevel(index, "A0");
    expect(a0Units.length).toBeGreaterThanOrEqual(3);
    expect(a0Units[0]?.id).toBe(A0_CURRICULUM.entryUnitId);
  });

  it("seeds ≥ 4 A0 Units with ≥ 3 Lessons each (issue #24 full acceptance)", () => {
    const index = indexCurriculum(A0_CURRICULUM);
    const a0Units = unitsAtLevel(index, "A0");
    expect(a0Units.length).toBeGreaterThanOrEqual(4);
    expect(lessonCount(index)).toBeGreaterThanOrEqual(12);
    for (const unit of a0Units) {
      expect(unit.lessons.length).toBeGreaterThanOrEqual(3);
      expect(unit.scenarios.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("orders units at the same level monotonically", () => {
    const index = indexCurriculum(A0_CURRICULUM);
    for (const level of LEVELS) {
      const units = unitsAtLevel(index, level);
      const sorted = [...units].sort((a, b) => a.order - b.order);
      expect(units.map((u) => u.id)).toEqual(sorted.map((u) => u.id));
    }
  });

  it("declares every lesson, vocabulary item, and scenario against an existing unit", () => {
    const unitIds = new Set(A0_CURRICULUM.units.map((u) => u.id));
    for (const unit of A0_CURRICULUM.units) {
      for (const lesson of unit.lessons) {
        expect(lesson.unitId).toBe(unit.id);
        for (const exercise of lesson.exercises) {
          expect(exercise.lessonId).toBe(lesson.id);
        }
      }
      for (const vocab of unit.vocabulary) {
        expect(vocab.unitId).toBe(unit.id);
        expect(unitIds.has(vocab.unitId)).toBe(true);
      }
      for (const scenario of unit.scenarios) {
        expect(scenario.unitId).toBe(unit.id);
      }
      for (const grammar of unit.grammar) {
        expect(grammar.unitId).toBe(unit.id);
      }
    }
  });
});

describe("canonical DAG invariants", () => {
  const index = indexCurriculum(A0_CURRICULUM);

  it("rejects curricula with duplicate unit ids", () => {
    expect(() =>
      assertCurriculumInvariants({
        ...A0_CURRICULUM,
        units: [...A0_CURRICULUM.units, A0_CURRICULUM.units[0]!],
      }),
    ).toThrow(CurriculumError);
  });

  it("rejects curricula where the entry unit is missing", () => {
    expect(() =>
      assertCurriculumInvariants({
        ...A0_CURRICULUM,
        entryUnitId: "does-not-exist",
      }),
    ).toThrow(/Entry unit/);
  });

  it("rejects units that reference missing prerequisites", () => {
    expect(() =>
      assertCurriculumInvariants({
        ...A0_CURRICULUM,
        units: A0_CURRICULUM.units.map((u) =>
          u.id === "a0-2-numeros-apresentacoes"
            ? {
                ...u,
                prerequisiteUnitIds: ["ghost-unit"],
              }
            : u,
        ),
      }),
    ).toThrow(/missing prerequisite/);
  });

  it("rejects curricula with canonical-DAG cycles", () => {
    const cyclic = {
      ...A0_CURRICULUM,
      units: A0_CURRICULUM.units.map((u) =>
        u.id === "a0-1-alfabeto-saudacoes"
          ? { ...u, prerequisiteUnitIds: ["a0-3-cafe-pedidos"] }
          : u,
      ),
    };
    expect(() => assertCurriculumInvariants(cyclic)).toThrow(/Cycle detected in canonical DAG/);
  });
});

describe("reachability", () => {
  const index = indexCurriculum(A0_CURRICULUM);

  it("makes every Lesson reachable from the entry unit within the A0 path", () => {
    const reachable = new Set(
      reachableUnits(index, index.entryUnitId, Number.POSITIVE_INFINITY).map((u) => u.id),
    );
    for (const unit of A0_CURRICULUM.units) {
      expect(reachable.has(unit.id)).toBe(true);
    }
  });

  it("walks the canonical chain linearly within 2 steps at A0", () => {
    const reachable = reachableUnits(index, index.entryUnitId, 2);
    const ids = reachable.map((u) => u.id);
    expect(ids).toContain("a0-1-alfabeto-saudacoes");
    expect(ids).toContain("a0-2-numeros-apresentacoes");
    expect(ids).toContain("a0-3-cafe-pedidos");
  });

  it("exposes isReachable as a predicate", () => {
    expect(isReachable(index, "a0-1-alfabeto-saudacoes", "a0-3-cafe-pedidos")).toBe(true);
    expect(isReachable(index, "a0-3-cafe-pedidos", "a0-1-alfabeto-saudacoes")).toBe(false);
  });

  it("computes prerequisite and dependent unit lookups", () => {
    const prereqs = getPrerequisites(index, "a0-2-numeros-apresentacoes").map((u) => u.id);
    expect(prereqs).toEqual(["a0-1-alfabeto-saudacoes"]);

    const dependents = getDependents(index, "a0-2-numeros-apresentacoes").map((u) => u.id);
    expect(dependents).toEqual(["a0-3-cafe-pedidos"]);
  });
});

describe("Remedial Anchor runtime", () => {
  const index = indexCurriculum(A0_CURRICULUM);

  it("returns the starting unit only when no anchors exist", () => {
    const result = resolveAnchors(index, "a0-1-alfabeto-saudacoes");
    expect(result.startingUnitId).toBe("a0-1-alfabeto-saudacoes");
    expect(result.units.map((u) => u.id)).toEqual(["a0-1-alfabeto-saudacoes"]);
    expect(result.paths).toEqual([]);
  });

  it("resolves anchors to prior units and records the path", () => {
    const result = resolveAnchors(index, "a0-2-numeros-apresentacoes");
    expect(result.units.map((u) => u.id)).toEqual([
      "a0-1-alfabeto-saudacoes",
      "a0-2-numeros-apresentacoes",
    ]);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]).toMatchObject({
      fromUnitId: "a0-2-numeros-apresentacoes",
      total: 1,
    });
    expect(result.paths[0]?.visited[0]).toMatchObject({
      unitId: "a0-2-numeros-apresentacoes",
      anchor: {
        fromUnitId: "a0-2-numeros-apresentacoes",
        toUnitId: "a0-1-alfabeto-saudacoes",
      },
    });
  });

  it("resolves the multi-anchor fan-in at the café Unit", () => {
    const result = resolveAnchors(index, "a0-3-cafe-pedidos");
    expect(result.units.map((u) => u.id)).toEqual([
      "a0-1-alfabeto-saudacoes",
      "a0-2-numeros-apresentacoes",
      "a0-3-cafe-pedidos",
    ]);
    expect(result.paths.map((p) => p.total)).toEqual([1, 1]);
  });

  it("rejects curricula whose anchor graph contains a cycle", () => {
    const cyclicAnchors = {
      ...A0_CURRICULUM,
      units: A0_CURRICULUM.units.map((u) =>
        u.id === "a0-1-alfabeto-saudacoes"
          ? {
              ...u,
              remedialAnchors: [
                {
                  fromUnitId: "a0-1-alfabeto-saudacoes",
                  toUnitId: "a0-3-cafe-pedidos",
                  reason: "phoneme-confusion" as const,
                  note: "introduces a cycle for the test",
                },
              ],
            }
          : u,
      ),
    };
    expect(() => assertCurriculumInvariants(cyclicAnchors)).toThrow(
      /Cycle detected through Remedial Anchors/,
    );
  });

  it("rejects anchors that point forward in the canonical DAG", () => {
    const forwardAnchors = {
      ...A0_CURRICULUM,
      units: A0_CURRICULUM.units.map((u) =>
        u.id === "a0-1-alfabeto-saudacoes"
          ? {
              ...u,
              remedialAnchors: [
                {
                  fromUnitId: "a0-1-alfabeto-saudacoes",
                  toUnitId: "a0-3-cafe-pedidos",
                  reason: "phoneme-confusion" as const,
                  note: "forward-pointing anchor",
                },
              ],
            }
          : u.id === "a0-3-cafe-pedidos"
            ? { ...u, remedialAnchors: [] }
            : u,
      ),
    };
    expect(() => assertCurriculumInvariants(forwardAnchors)).toThrow(
      /must point to a unit reachable before it/,
    );
  });
});

describe("milestones", () => {
  const index = indexCurriculum(A0_CURRICULUM);

  it("registers the A0→A1 milestone on the final A0 unit", () => {
    const milestone = getMilestoneForBoundary(index, "A0-A1");
    expect(milestone.unitId).toBe("a0-4-rotina-e-horas");
    expect(milestone.passingScore).toBe(0.75);
    expect(milestone.cooldownHours).toBe(24);
    expect(milestone.maxAttemptsBeforeReferral).toBe(3);
  });

  it("flags missing milestones as an explicit check (not implicit)", () => {
    expect(() => assertAllMilestonesPresent(index)).toThrow(/Missing milestone for boundary A1-A2/);
  });

  it("rejects milestones whose unit lives at the wrong level", () => {
    const broken = {
      ...A0_CURRICULUM,
      milestones: [
        {
          ...A0_CURRICULUM.milestones[0]!,
          fromLevel: "A1" as const,
        },
      ],
    };
    expect(() => assertCurriculumInvariants(broken)).toThrow(/expected A1/);
  });
});

describe("lesson count and budget", () => {
  const index = indexCurriculum(A0_CURRICULUM);

  it("keeps the A0 slice inside the 3-Lesson-per-Unit minimum", () => {
    for (const unit of A0_CURRICULUM.units) {
      expect(unit.lessons.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("aggregates lesson counts across the curriculum", () => {
    const total = A0_CURRICULUM.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
    expect(lessonCount(index)).toBe(total);
  });
});
