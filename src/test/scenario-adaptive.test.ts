import { describe, expect, it } from "vitest";
import {
  adaptPreTask,
  levelDistance,
  levelMismatch,
  partitionScenarioVocab,
} from "@/lib/scenarios/adaptive";
import { SCENARIO_LIBRARY } from "@/lib/scenarios/library";

function scenarioAt(level: "A0" | "A1" | "A2" | "B1", vocabularyIds: string[] = []) {
  const base = SCENARIO_LIBRARY.find((s) => s.targetLevel === level);
  if (!base) throw new Error(`No scenario seeded at level ${level}`);
  return { ...base, vocabularyRefs: vocabularyIds };
}

describe("levelDistance", () => {
  it("returns 0 when learner and scenario match", () => {
    expect(levelDistance("A0", scenarioAt("A0"))).toBe(0);
    expect(levelDistance("A1", scenarioAt("A1"))).toBe(0);
    expect(levelDistance("B1", scenarioAt("B1"))).toBe(0);
  });

  it("returns positive when scenario is harder than learner", () => {
    expect(levelDistance("A0", scenarioAt("A1"))).toBe(1);
    expect(levelDistance("A0", scenarioAt("A2"))).toBe(2);
    expect(levelDistance("A0", scenarioAt("B1"))).toBe(3);
    expect(levelDistance("A1", scenarioAt("B1"))).toBe(2);
  });

  it("returns negative when scenario is easier than learner", () => {
    expect(levelDistance("A2", scenarioAt("A0"))).toBe(-2);
    expect(levelDistance("B1", scenarioAt("A0"))).toBe(-3);
    expect(levelDistance("B1", scenarioAt("A1"))).toBe(-2);
  });
});

describe("levelMismatch", () => {
  it("labels exact matches as core with distance 0", () => {
    const m = levelMismatch("A1", scenarioAt("A1"));
    expect(m.match).toBe("core");
    expect(m.distance).toBe(0);
    expect(m.label).toBe("Core practice");
  });

  it("labels any harder scenario as stretch with positive distance", () => {
    const m = levelMismatch("A0", scenarioAt("A2"));
    expect(m.match).toBe("stretch");
    expect(m.distance).toBe(2);
    expect(m.label).toBe("Stretch");
    expect(m.guidance).toMatch(/higher CEFR level/i);
  });

  it("labels A0-B1 (+3) as stretch", () => {
    const m = levelMismatch("A0", scenarioAt("B1"));
    expect(m.match).toBe("stretch");
    expect(m.distance).toBe(3);
  });

  it("labels scenarios ≥ 2 levels below as review", () => {
    const m = levelMismatch("B1", scenarioAt("A0"));
    expect(m.match).toBe("review");
    expect(m.distance).toBe(-3);
    expect(m.label).toBe("Review");
    expect(m.guidance).toMatch(/below your current CEFR level/i);
  });

  it("does not flag a single-level easier scenario as review (still core)", () => {
    const m = levelMismatch("A1", scenarioAt("A0"));
    expect(m.match).toBe("core");
    expect(m.distance).toBe(-1);
  });

  it("flags A1→A2 as stretch (boundary lift)", () => {
    const m = levelMismatch("A1", scenarioAt("A2"));
    expect(m.match).toBe("stretch");
    expect(m.distance).toBe(1);
  });
});

describe("partitionScenarioVocab + adaptPreTask", () => {
  it("partitions vocabulary into known + unknown", () => {
    const scenario = scenarioAt("A1", ["a0-1-v-bom-dia", "a1-1-v-bilhete", "a1-1-v-passaporte"]);
    const known = new Set(["a0-1-v-bom-dia"]);
    const hints = partitionScenarioVocab(scenario, known);
    expect(hints).toEqual([
      { itemId: "a0-1-v-bom-dia", known: true },
      { itemId: "a1-1-v-bilhete", known: false },
      { itemId: "a1-1-v-passaporte", known: false },
    ]);
  });

  it("adaptPreTask returns known + unknown buckets with hasUnknown flag", () => {
    const scenario = scenarioAt("A1", ["a0-1-v-bom-dia", "a1-1-v-bilhete"]);
    const known = new Set(["a0-1-v-bom-dia"]);
    const adapted = adaptPreTask(scenario, known);
    expect(adapted.knownVocab).toEqual(["a0-1-v-bom-dia"]);
    expect(adapted.unknownVocab).toEqual(["a1-1-v-bilhete"]);
    expect(adapted.hasUnknown).toBe(true);
  });

  it("adaptPreTask with an empty known set reports everything unknown", () => {
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete", "a1-1-v-passaporte"]);
    const adapted = adaptPreTask(scenario, new Set());
    expect(adapted.knownVocab).toEqual([]);
    expect(adapted.unknownVocab).toEqual(["a1-1-v-bilhete", "a1-1-v-passaporte"]);
    expect(adapted.hasUnknown).toBe(true);
  });

  it("adaptPreTask reports hasUnknown=false when every item is known", () => {
    const scenario = scenarioAt("A1", ["a1-1-v-bilhete"]);
    const known = new Set(["a1-1-v-bilhete"]);
    const adapted = adaptPreTask(scenario, known);
    expect(adapted.hasUnknown).toBe(false);
  });

  it("adaptPreTask is deterministic for the same inputs", () => {
    const scenario = scenarioAt("A1", ["a", "b", "c"]);
    const known = new Set(["a"]);
    expect(adaptPreTask(scenario, known)).toEqual(adaptPreTask(scenario, known));
  });
});

describe("A/B harness — level-mismatch scenario set", () => {
  it("the seeded library covers every (Learner, Scenario) match across {A0,A1,A2,B1}", () => {
    const levels: ReadonlyArray<"A0" | "A1" | "A2" | "B1"> = ["A0", "A1", "A2", "B1"];
    for (const learnerLevel of levels) {
      for (const scenarioLevel of levels) {
        const sample = SCENARIO_LIBRARY.find((s) => s.targetLevel === scenarioLevel);
        if (!sample) continue;
        const mismatch = levelMismatch(learnerLevel, sample);
        if (learnerLevel === scenarioLevel) {
          expect(mismatch.match).toBe("core");
        } else if (
          levels.indexOf(scenarioLevel) - levels.indexOf(learnerLevel) >= 1
        ) {
          expect(mismatch.match).toBe("stretch");
        } else if (
          levels.indexOf(scenarioLevel) - levels.indexOf(learnerLevel) <= -2
        ) {
          expect(mismatch.match).toBe("review");
        } else {
          expect(mismatch.match).toBe("core");
        }
      }
    }
  });
});