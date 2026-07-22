import type { Scenario } from "@/lib/scenarios";

export function scenarioAt(
  targetLevel: "A0" | "A1" | "A2" | "B1",
  vocabularyRefs: ReadonlyArray<string> = [],
): Scenario {
  return {
    id: `test-${targetLevel}-${vocabularyRefs.join("-")}`,
    unitId: `unit-${targetLevel}`,
    category: "greetings-introductions",
    targetLevel,
    goal: `Test scenario at ${targetLevel}`,
    setting: "Test setting",
    roles: { learner: "Learner", teacher: "Teacher" },
    preTask: `Pre-task for ${targetLevel}`,
    expectedTurns: 4,
    vocabularyRefs,
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: ["Criterion A", "Criterion B"],
    passingScore: 0.6,
  };
}
