import { describe, expect, it } from "vitest";
import {
  SCENARIO_LIBRARY,
  type VoiceLoopTurn,
} from "@/lib/scenarios";
import {
  advance,
  complete,
  initialState,
  inferCriteriaFromHistory,
  detectRemedialTriggers,
} from "@/lib/scenarios/runner";

function turn(overrides: Partial<VoiceLoopTurn>): VoiceLoopTurn {
  return {
    turnId: "t-1",
    utteranceId: "u-1",
    teacherUtterance: "Olá!",
    feedback: [],
    pronunciationScore: 85,
    nextDifficultyTarget: 1.0,
    comprehensionOk: true,
    fluencyMsPerWord: 250,
    generatedAt: Date.now(),
    mock: true,
    ...overrides,
  };
}

describe("scenario runner", () => {
  it("starts in pre-task stage", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const state = initialState(scenario);
    expect(state.stage).toBe("pre-task");
    expect(state.scenarioId).toBe(scenario.id);
    expect(state.startedAt).toBeGreaterThan(0);
  });

  it("advances pre-task → during-task without completing", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const state = initialState(scenario);
    const result = advance(state, scenario, []);
    expect(result.kind).toBe("advance");
    if (result.kind === "advance") {
      expect(result.state.stage).toBe("during-task");
    }
  });

  it("stays in during-task until expectedTurns is reached", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const state = { ...initialState(scenario), stage: "during-task" as const };
    const partial: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns - 1 }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}` }),
    );
    const result = advance(state, scenario, partial);
    expect(result.kind).toBe("advance");
    if (result.kind === "advance") {
      expect(result.state.stage).toBe("during-task");
      expect(result.state.turnIndex).toBe(scenario.expectedTurns - 1);
    }
  });

  it("moves to post-task when expectedTurns is reached", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const state = { ...initialState(scenario), stage: "during-task" as const };
    const full: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}` }),
    );
    const result = advance(state, scenario, full);
    expect(result.kind).toBe("advance");
    if (result.kind === "advance") {
      expect(result.state.stage).toBe("post-task");
    }
  });

  it("complete() returns stars and reasons", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const state = { ...initialState(scenario), stage: "post-task" as const };
    const history: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}` }),
    );
    const result = complete(state, scenario, history, Date.now(), scenario.successCriteria.map(() => true));
    expect(result.kind).toBe("completed");
    if (result.kind === "completed") {
      expect(result.stars).toBe(3);
      expect(result.passed).toBe(true);
      expect(result.reasons.length).toBe(scenario.successCriteria.length);
    }
  });
});

describe("inferCriteriaFromHistory", () => {
  it("returns array of booleans matching successCriteria length", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const history: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}` }),
    );
    const result = inferCriteriaFromHistory(scenario, history);
    expect(result.length).toBe(scenario.successCriteria.length);
    for (const v of result) expect(typeof v).toBe("boolean");
  });

  it("with no history returns array of false", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const result = inferCriteriaFromHistory(scenario, []);
    for (const v of result) expect(v).toBe(false);
  });
});

describe("detectRemedialTriggers", () => {
  it("returns empty for short history", () => {
    const scenario = SCENARIO_LIBRARY[0]!;
    const result = detectRemedialTriggers(scenario, [turn({ turnId: "t-0", utteranceId: "u-0" })]);
    expect(result).toEqual([]);
  });

  it("returns scenario-struggle trigger when most turns fail comprehension", () => {
    const scenario = SCENARIO_LIBRARY.find((s) => s.expectedTurns >= 4) ?? SCENARIO_LIBRARY[0]!;
    const history: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}`, comprehensionOk: false }),
    );
    const triggers = detectRemedialTriggers(scenario, history);
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers.some((t) => t.reason === "scenario-struggle")).toBe(true);
  });

  it("returns phoneme-confusion trigger when pronunciation is consistently low", () => {
    const scenario = SCENARIO_LIBRARY.find((s) => s.expectedTurns >= 4) ?? SCENARIO_LIBRARY[0]!;
    const history: VoiceLoopTurn[] = Array.from({ length: scenario.expectedTurns }, (_, i) =>
      turn({ turnId: `t-${i}`, utteranceId: `u-${i}`, pronunciationScore: 40 }),
    );
    const triggers = detectRemedialTriggers(scenario, history);
    expect(triggers.some((t) => t.reason === "phoneme-confusion")).toBe(true);
  });
});
