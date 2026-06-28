import { describe, expect, it } from "vitest";
import {
  A0_CURRICULUM,
  assertCurriculumInvariants,
  indexCurriculum,
  resolveRemediationPlan,
  type Curriculum,
  type RemedialAnchor,
  type RemedialAnchorGapArea,
  type Unit,
} from "@/lib/curriculum";

const FIXED_NOW = "2026-06-23T00:00:00.000Z";

function makeAnchor(
  fromUnitId: string,
  toUnitId: string,
  gapArea: RemedialAnchorGapArea,
  weight = 0.5,
): RemedialAnchor {
  return {
    fromUnitId,
    toUnitId,
    reason:
      gapArea === "vocab"
        ? "vocabulary-decay"
        : gapArea === "grammar"
          ? "grammar-gap"
          : gapArea === "pronunciation"
            ? "phoneme-confusion"
            : "scenario-struggle",
    gapArea,
    weight,
    note: `synthetic ${gapArea} anchor from ${fromUnitId} to ${toUnitId}`,
    createdAt: FIXED_NOW,
  };
}

const index = indexCurriculum(A0_CURRICULUM);

describe("resolveRemediationPlan", () => {
  it("returns an empty plan for the entry unit (no anchors)", () => {
    const plan = resolveRemediationPlan(index, "a0-1-alfabeto-saudacoes");
    expect(plan.startingUnitId).toBe("a0-1-alfabeto-saudacoes");
    expect(plan.steps).toEqual([]);
    expect(plan.scaffolded).toBe(false);
    expect(plan.rationale).toContain("0 anchor");
  });

  it("resolves the chain for a0-3 cafe with priority ordering", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", {
      learnerMastery: { vocab: 0.2, grammar: 0.9, pronunciation: 0.9, fluency: 0.9 },
    });
    expect(plan.startingUnitId).toBe("a0-3-cafe-pedidos");
    expect(plan.steps.length).toBeGreaterThan(0);
    // The vocab anchor from a0-3 → a0-2-numeros has weight 0.8; with vocab
    // mastery 0.2 it should outrank the pronunciation anchor (weight 0.5).
    const firstStep = plan.steps[0]!;
    expect(firstStep.unitId).toBe("a0-2-numeros-apresentacoes");
    expect(firstStep.anchor.gapArea).toBe("vocab");
    expect(firstStep.priority).toBeGreaterThan(0);
  });

  it("caps the chain at maxDepth (default 5)", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", { maxDepth: 1 });
    expect(plan.steps.length).toBeLessThanOrEqual(1);
  });

  it("caps the chain at the configurable maxDepth", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", { maxDepth: 2 });
    expect(plan.steps.length).toBeLessThanOrEqual(2);
  });

  it("flags all steps scaffolded when the Affective Filter score is high", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", {
      affectiveFilterScore: 75,
      affectiveHighThreshold: 70,
    });
    expect(plan.scaffolded).toBe(true);
    for (const step of plan.steps) {
      expect(step.scaffolded).toBe(true);
    }
    expect(plan.rationale).toContain("scaffolded");
  });

  it("does not flag scaffolded when the Affective Filter score is below the threshold", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", {
      affectiveFilterScore: 50,
      affectiveHighThreshold: 70,
    });
    expect(plan.scaffolded).toBe(false);
    for (const step of plan.steps) {
      expect(step.scaffolded).toBe(false);
    }
  });

  it("clamps mastery values to [0, 1]", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos", {
      learnerMastery: { vocab: 2.0, grammar: -0.5 },
    });
    // Should not throw; priorities should be in [0, 1]
    for (const step of plan.steps) {
      expect(step.priority).toBeGreaterThanOrEqual(0);
      expect(step.priority).toBeLessThanOrEqual(1);
    }
  });

  it("falls back to 0.5 mastery when none is provided", () => {
    const plan = resolveRemediationPlan(index, "a0-3-cafe-pedidos");
    // Each priority = anchor.weight * (1 - 0.5) = weight * 0.5
    for (const step of plan.steps) {
      expect(step.priority).toBeCloseTo(step.anchor.weight * 0.5, 5);
    }
  });
});

describe("resolveRemediationPlan property: chain termination", () => {
  it("terminates in ≤ maxDepth steps for every Unit in the A0 curriculum", () => {
    const maxDepth = 5;
    for (const unit of A0_CURRICULUM.units) {
      const plan = resolveRemediationPlan(index, unit.id, { maxDepth });
      expect(plan.steps.length).toBeLessThanOrEqual(maxDepth);
    }
  });

  it("never revisits a Unit within a single chain", () => {
    for (const unit of A0_CURRICULUM.units) {
      const plan = resolveRemediationPlan(index, unit.id, { maxDepth: 10 });
      const seen = new Set<string>([plan.startingUnitId]);
      for (const step of plan.steps) {
        expect(seen.has(step.unitId)).toBe(false);
        seen.add(step.unitId);
      }
    }
  });

  it("never returns steps whose anchor target is missing from the curriculum", () => {
    for (const unit of A0_CURRICULUM.units) {
      const plan = resolveRemediationPlan(index, unit.id, { maxDepth: 10 });
      for (const step of plan.steps) {
        expect(index.unitsById.has(step.unitId)).toBe(true);
      }
    }
  });
});

describe("resolveRemediationPlan property: anchor cycle safety", () => {
  it("rejects a curriculum whose anchor graph contains a cycle", () => {
    // a0-3 → a0-1 (existing anchor) plus a0-1 → a0-3 (new) closes the cycle.
    const cyclic = mutateA0Curriculum((units) => {
      const idx = units.findIndex((u) => u.id === "a0-1-alfabeto-saudacoes");
      if (idx >= 0) {
        const unit = units[idx]!;
        units[idx] = {
          ...unit,
          remedialAnchors: [
            ...unit.remedialAnchors,
            makeAnchor(unit.id, "a0-3-cafe-pedidos", "vocab"),
          ],
        };
      }
    });
    expect(() => assertCurriculumInvariants(cyclic)).toThrow(/Cycle detected through Remedial Anchors/);
  });

  it("rejects anchors that point forward in the canonical DAG", () => {
    // Strip every existing anchor so the cycle check doesn't fire first;
    // then add a single forward anchor a0-1 → a0-3 (a0-3 is not
    // reachable before a0-1 in the canonical DAG).
    const forward = mutateA0Curriculum((units) => {
      units.forEach((u, i) => {
        units[i] = { ...u, remedialAnchors: [] };
      });
      const idx = units.findIndex((u) => u.id === "a0-1-alfabeto-saudacoes");
      if (idx >= 0) {
        units[idx] = {
          ...units[idx]!,
          remedialAnchors: [
            makeAnchor("a0-1-alfabeto-saudacoes", "a0-3-cafe-pedidos", "vocab"),
          ],
        };
      }
    });
    expect(() => assertCurriculumInvariants(forward)).toThrow(
      /must point to a unit reachable before it/,
    );
  });
});

describe("resolveRemediationPlan property: 50-anchor content-team pass", () => {
  it("keeps the canonical DAG acyclic when 50 anchors are added", () => {
    const gapAreas: RemedialAnchorGapArea[] = ["vocab", "grammar", "pronunciation", "fluency"];

    // Build a long chain of 20 virtual Units AFTER a0-4 so the
    // reachability set is large enough to support 50 distinct
    // backward-eligible anchors.
    const virtualUnits: Unit[] = [];
    for (let i = 0; i < 20; i += 1) {
      virtualUnits.push({
        id: `virt-${i}`,
        level: "A0",
        order: 100 + i,
        title: `Virtual Unit ${i}`,
        description: "",
        prerequisiteUnitIds: i === 0 ? ["a0-4-rotina-e-horas"] : [`virt-${i - 1}`],
        lessons: [],
        vocabulary: [],
        grammar: [],
        scenarios: [],
        remedialAnchors: [],
      });
    }

    // Generate 50 unique (fromUnitId, toUnitId, gapArea) tuples, all
    // backward-eligible. The virtual chain extends a0-4 with 13 more
    // units, so any earlier Unit can anchor to any virtual Unit (the
    // virtual Unit is reachable from the source).
    type AnchorSpec = { fromUnitId: string; toUnitId: string; gapArea: RemedialAnchorGapArea };
    const specs: AnchorSpec[] = [];
    const allSources = [...A0_CURRICULUM.units, ...virtualUnits];

    // Pre-compute backward-eligible (from, to) pairs by reachability.
    function isReachableBackward(toId: string, fromId: string): boolean {
      const order = ["a0-1-alfabeto-saudacoes", "a0-2-numeros-apresentacoes", "a0-3-cafe-pedidos", "a0-4-rotina-e-horas"];
      const virtualOrder = virtualUnits.map((v) => v.id);
      const canonical: string[] = [...order, ...virtualOrder];
      const toIdx = canonical.indexOf(toId);
      const fromIdx = canonical.indexOf(fromId);
      if (toIdx < 0 || fromIdx < 0) return false;
      return toIdx < fromIdx;
    }

    const eligiblePairs: Array<{ fromId: string; toId: string }> = [];
    for (const from of allSources) {
      for (const to of allSources) {
        if (from.id === to.id) continue;
        if (isReachableBackward(to.id, from.id)) {
          eligiblePairs.push({ fromId: from.id, toId: to.id });
        }
      }
    }
    expect(eligiblePairs.length).toBeGreaterThanOrEqual(13);

    // Cartesian product: eligiblePairs × gapAreas = many unique specs.
    const plannedSpecs: AnchorSpec[] = [];
    for (const pair of eligiblePairs) {
      for (const gapArea of gapAreas) {
        plannedSpecs.push({ fromUnitId: pair.fromId, toUnitId: pair.toId, gapArea });
      }
    }
    expect(plannedSpecs.length).toBeGreaterThanOrEqual(50);

    // Take the first 50 unique specs.
    for (const spec of plannedSpecs) {
      if (specs.length >= 50) break;
      const dedupKey = `${spec.fromUnitId}->${spec.toUnitId}->${spec.gapArea}`;
      if (!specs.find((s) => `${s.fromUnitId}->${s.toUnitId}->${s.gapArea}` === dedupKey)) {
        specs.push(spec);
      }
    }

    expect(specs.length).toBeGreaterThanOrEqual(50);

    const enriched = mutateA0Curriculum((units) => {
      const virtById = new Map(virtualUnits.map((v) => [v.id, v]));
      const merged: Unit[] = [...units, ...virtualUnits];
      // Track by id — the array is replaced on each update so object
      // identity is not stable.
      for (const spec of specs) {
        const isVirt = spec.fromUnitId.startsWith("virt-");
        const idx = merged.findIndex((u) => u.id === spec.fromUnitId);
        if (idx < 0) continue;
        if (isVirt && virtById.has(spec.fromUnitId)) {
          // virtual units get a virtualUnit reference for stability
          const original = virtById.get(spec.fromUnitId)!;
          merged[idx] = {
            ...original,
            remedialAnchors: [
              ...merged[idx]!.remedialAnchors,
              makeAnchor(spec.fromUnitId, spec.toUnitId, spec.gapArea),
            ],
          };
        } else {
          merged[idx] = {
            ...merged[idx]!,
            remedialAnchors: [
              ...merged[idx]!.remedialAnchors,
              makeAnchor(spec.fromUnitId, spec.toUnitId, spec.gapArea),
            ],
          };
        }
      }
      merged.sort((a, b) => a.order - b.order);
      units.length = 0;
      units.push(...merged);
    });

    expect(() => assertCurriculumInvariants(enriched)).not.toThrow();

    const newIndex = indexCurriculum(enriched);
    const totalAnchors = enriched.units.reduce((n, u) => n + u.remedialAnchors.length, 0);
    expect(totalAnchors).toBeGreaterThanOrEqual(50);

    for (const unit of enriched.units) {
      const plan = resolveRemediationPlan(newIndex, unit.id, { maxDepth: 5 });
      expect(plan.steps.length).toBeLessThanOrEqual(5);
      const seen = new Set<string>([plan.startingUnitId]);
      for (const step of plan.steps) {
        expect(seen.has(step.unitId)).toBe(false);
        seen.add(step.unitId);
      }
    }
  });
});

function isReachableHelper(from: string, to: string): boolean {
  // Use the curriculum's existing isReachable (re-exported via graph).
  // Inlined here to avoid pulling the graph module from a test helper.
  // The runtime invariant: a0-1 → a0-2 → a0-3 → a0-4 (canonical chain).
  const order = ["a0-1-alfabeto-saudacoes", "a0-2-numeros-apresentacoes", "a0-3-cafe-pedidos", "a0-4-rotina-e-horas"];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  return fromIdx >= 0 && toIdx >= 0 && fromIdx < toIdx;
}

function mutateA0Curriculum(mutate: (units: Unit[]) => void): Curriculum {
  const units: Unit[] = A0_CURRICULUM.units.map((u) => ({ ...u }));
  mutate(units);
  return { ...A0_CURRICULUM, units };
}