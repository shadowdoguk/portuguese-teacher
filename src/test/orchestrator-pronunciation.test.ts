import { describe, expect, it } from "vitest";
import { runTurn, type TurnDependencies } from "@/lib/voice-loop/orchestrator";
import type { VoiceLoopTurnInput } from "@/lib/voice-loop/types";

function buildInput(overrides: Partial<VoiceLoopTurnInput> = {}): VoiceLoopTurnInput {
  return {
    learnerText: "olá mundo",
    practiceMode: "drill",
    targetPhrase: "olá mundo",
    tier: 3,
    difficultyTarget: 1.0,
    learnerUtteranceId: "u-test",
    ...overrides,
  };
}

describe("runTurn pronunciation integration", () => {
  it("uses the async pronunciationFromAsr resolver", async () => {
    const deps: TurnDependencies = {
      llm: async () => ({
        text: '{"nlu":{"intent":"greet","slots":{},"grammar_features":[],"error_categories":[]},"utterance":"olá","feedback":[],"difficulty_estimate":1.0,"comprehension_ok":true}',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
      generateId: () => "turn-1",
      now: () => 100,
      mock: false,
      pronunciationFromAsr: async (input) => ({
        score: 91,
        perPhoneme: [
          { phoneme: "o", score: 90, start: 0, end: 0.2 },
        ],
        source: "endpoint",
      }),
    };
    const result = await runTurn(buildInput(), deps);
    expect(result.turn.pronunciationScore).toBe(91);
    expect(result.turn.pronunciationPerPhoneme).toHaveLength(1);
    expect(result.turn.pronunciationSource).toBe("endpoint");
  });

  it("accepts a number-shaped resolver for backwards compatibility", async () => {
    const deps: TurnDependencies = {
      llm: async () => ({
        text: '{"nlu":{"intent":"greet","slots":{},"grammar_features":[],"error_categories":[]},"utterance":"olá","feedback":[],"difficulty_estimate":1.0,"comprehension_ok":true}',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
      generateId: () => "turn-1",
      now: () => 100,
      mock: false,
      pronunciationFromAsr: () => 75,
    };
    const result = await runTurn(buildInput(), deps);
    expect(result.turn.pronunciationScore).toBe(75);
    expect(result.turn.pronunciationSource).toBe("default");
  });

  it("falls back to the default score of 80 when no resolver is provided", async () => {
    const deps: TurnDependencies = {
      llm: async () => ({
        text: '{"nlu":{"intent":"greet","slots":{},"grammar_features":[],"error_categories":[]},"utterance":"olá","feedback":[],"difficulty_estimate":1.0,"comprehension_ok":true}',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
      generateId: () => "turn-1",
      now: () => 100,
      mock: false,
    };
    const result = await runTurn(buildInput(), deps);
    expect(result.turn.pronunciationScore).toBe(80);
    expect(result.turn.pronunciationSource).toBe("default");
  });
});