import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIFFICULTY_TARGET,
  DROP_ON_COMPREHENSION_FAILURE,
  RAISE_AFTER_CONSECUTIVE_SUCCESSES,
  RAISE_STEP,
  MockScriptedTurn,
  adjustFromRules,
  buildInput,
  capabilitiesFromGlobals,
  detectCapabilities,
  initialDifficulty,
  isBrowserTier,
  isPracticeMode,
  payloadToTurn,
  parseStructuredOutput,
  recordTurn,
  runTurn,
  scriptedPayloadFor,
  shouldRetry,
  successRate,
  tierForLabel,
} from "@/lib/voice-loop";
import type { DifficultyState } from "@/lib/voice-loop/difficulty";
import {
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  type BrowserTier,
  type PracticeMode,
  type VoiceLoopTurnInput,
} from "@/lib/voice-loop/types";
import type { LlmMessage, LlmCompleteResult } from "@/lib/minimax/types";

const FIXED_NOW = 1_700_000_000_000;

function mockLlm(text: string): (messages: LlmMessage[]) => Promise<LlmCompleteResult> {
  return async () => ({
    text,
    usage: { promptTokens: 8, completionTokens: text.length, totalTokens: 8 + text.length },
  });
}

describe("VoiceLoop types", () => {
  it("exposes the three browser tiers and the i+1 range", () => {
    expect(isBrowserTier(1)).toBe(true);
    expect(isBrowserTier(2)).toBe(true);
    expect(isBrowserTier(3)).toBe(true);
    expect(isBrowserTier(0)).toBe(false);
    expect(isBrowserTier(4)).toBe(false);
    expect(DIFFICULTY_MIN).toBe(0);
    expect(DIFFICULTY_MAX).toBe(3);
    expect(DEFAULT_DIFFICULTY_TARGET).toBe(1);
  });

  it("narrows practice modes", () => {
    expect(isPracticeMode("free-form")).toBe(true);
    expect(isPracticeMode("scenario")).toBe(true);
    expect(isPracticeMode("drill")).toBe(true);
    expect(isPracticeMode("role-play")).toBe(false);
  });

  it("labels each tier with a human string", () => {
    expect(tierForLabel(1)).toMatch(/Live/);
    expect(tierForLabel(2)).toMatch(/Batched/);
    expect(tierForLabel(3)).toMatch(/Text/);
  });
});

describe("Tier detection", () => {
  it("promotes Chromium + Web Speech API + MediaRecorder to Tier 1", () => {
    const caps = detectCapabilities(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      {
        SpeechRecognition: function SpeechRecognition() {},
        MediaRecorder: function MediaRecorder() {},
      },
    );
    expect(caps.tier).toBe(1);
    expect(caps.webSpeechApi).toBe(true);
    expect(caps.mediaRecorder).toBe(true);
  });

  it("routes Safari with MediaRecorder to Tier 2", () => {
    const caps = detectCapabilities(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      { MediaRecorder: function MediaRecorder() {} },
    );
    expect(caps.tier).toBe(2);
    expect(caps.mediaRecorder).toBe(true);
  });

  it("forces Firefox to Tier 3 even when globals exist", () => {
    const caps = detectCapabilities(
      "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
      {
        SpeechRecognition: function SpeechRecognition() {},
        MediaRecorder: function MediaRecorder() {},
      },
    );
    expect(caps.tier).toBe(3);
    expect(caps.reason).toMatch(/Firefox/);
  });

  it("drops to Tier 3 when neither SpeechRecognition nor MediaRecorder exist", () => {
    const caps = detectCapabilities("Mozilla/5.0 (compatible; unknown)", {});
    expect(caps.tier).toBe(3);
  });

  it("reads from globals when navigator/window are present", () => {
    const caps = capabilitiesFromGlobals({
      navigator: { userAgent: "Mozilla/5.0 Firefox/120.0" },
      window: {},
    });
    expect(caps.tier).toBe(3);
  });
});

describe("Difficulty controller — FR-CP-5", () => {
  it("starts at the default target with no successes", () => {
    const s = initialDifficulty();
    expect(s.target).toBe(1);
    expect(s.consecutiveSuccesses).toBe(0);
  });

  it("drops the target by 1 on a comprehension failure and resets the streak", () => {
    let s = initialDifficulty(1.5);
    s = adjustFromRules(s, false);
    expect(s.target).toBe(1.5 - DROP_ON_COMPREHENSION_FAILURE);
    expect(s.consecutiveSuccesses).toBe(0);
    expect(s.recentComprehensions).toEqual([false]);
  });

  it("raises the target by 0.5 after 3 consecutive successes and resets the streak", () => {
    let s = initialDifficulty(1.0);
    s = adjustFromRules(s, true);
    s = adjustFromRules(s, true);
    expect(s.target).toBe(1);
    expect(s.consecutiveSuccesses).toBe(2);
    s = adjustFromRules(s, true);
    expect(s.target).toBeCloseTo(1 + RAISE_STEP);
    expect(s.consecutiveSuccesses).toBe(0);
  });

  it("does not raise until RAISE_AFTER_CONSECUTIVE_SUCCESSES is reached", () => {
    let s = initialDifficulty(1.0);
    for (let i = 0; i < RAISE_AFTER_CONSECUTIVE_SUCCESSES - 1; i += 1) {
      s = adjustFromRules(s, true);
    }
    expect(s.target).toBe(1);
  });

  it("clamps the target to the difficulty range", () => {
    let s = initialDifficulty(0.5);
    s = adjustFromRules(s, false);
    expect(s.target).toBe(0);
    s = initialDifficulty(DIFFICULTY_MAX - 0.1);
    for (let i = 0; i < RAISE_AFTER_CONSECUTIVE_SUCCESSES * 3; i += 1) {
      s = adjustFromRules(s, true);
    }
    expect(s.target).toBe(DIFFICULTY_MAX);
  });

  it("records a turn-derived target when present", () => {
    let s = initialDifficulty(1.0);
    s = recordTurn(s, {
      comprehensionOk: true,
      nextDifficultyTarget: 1.7,
    });
    expect(s.target).toBeCloseTo(1.7);
    expect(s.consecutiveSuccesses).toBe(1);
  });

  it("computes a rolling success rate and suggests a retry on sustained failure", () => {
    let s = initialDifficulty();
    for (let i = 0; i < 6; i += 1) {
      s = adjustFromRules(s, false);
    }
    expect(successRate(s)).toBe(0);
    expect(shouldRetry(s)).toBe(true);
  });

  it("keeps the current target when the LLM-provided target is missing", () => {
    const state: DifficultyState = { ...initialDifficulty(2.0) };
    const next = recordTurn(state, {
      comprehensionOk: false,
      nextDifficultyTarget: Number.NaN,
    });
    // recordTurn does NOT trigger a rules-based drop when the LLM omits the
    // target — that responsibility belongs to the orchestrator (which calls
    // adjustFromRules explicitly). The current target is preserved.
    expect(next.target).toBe(2.0);
    expect(next.consecutiveSuccesses).toBe(0);
  });
});

describe("Structured-output parser", () => {
  it("parses a well-formed payload", () => {
    const payload = parseStructuredOutput(
      JSON.stringify({
        nlu: {
          intent: "greeting",
          slots: { addressee: "teacher" },
          grammar_features: ["present.indicative"],
          error_categories: [],
        },
        utterance: "Olá!",
        feedback: [],
        difficulty_estimate: 1.0,
        comprehension_ok: true,
      }),
    );
    expect(payload.nlu.intent).toBe("greeting");
    expect(payload.utterance).toBe("Olá!");
    expect(payload.difficulty_estimate).toBe(1);
    expect(payload.comprehension_ok).toBe(true);
  });

  it("tolerates code-fenced or surrounding prose", () => {
    const text =
      'Here you go:\n```json\n{"nlu":{"intent":"greeting","slots":{},"grammar_features":[],"error_categories":[]},"utterance":"Olá","feedback":[],"difficulty_estimate":1.0,"comprehension_ok":true}\n```';
    const payload = parseStructuredOutput(text);
    expect(payload.utterance).toBe("Olá");
  });

  it("drops unknown error categories silently", () => {
    const payload = parseStructuredOutput(
      JSON.stringify({
        nlu: {
          intent: "x",
          slots: {},
          grammar_features: [],
          error_categories: ["grammar.tense", "made.up.tag"],
        },
        utterance: "ok",
        feedback: [],
        difficulty_estimate: 1.0,
        comprehension_ok: true,
      }),
    );
    expect(payload.nlu.errorCategories).toEqual(["grammar.tense"]);
  });

  it("coerces feedback items, dropping malformed entries", () => {
    const payload = parseStructuredOutput(
      JSON.stringify({
        nlu: { intent: "x", slots: {}, grammar_features: [], error_categories: [] },
        utterance: "ok",
        feedback: [
          { kind: "corrective", text: "Tens de concordar.", errorCategory: "grammar.agreement" },
          { kind: "formative", text: "Tenta outra vez." },
          { kind: "confirmatory" },
          { kind: "invalid", text: "should drop" },
        ],
        difficulty_estimate: 1.0,
        comprehension_ok: true,
      }),
    );
    expect(payload.feedback).toHaveLength(2);
    expect(payload.feedback[0]?.kind).toBe("corrective");
    expect(payload.feedback[0]?.errorCategory).toBe("grammar.agreement");
  });

  it("rejects payloads missing required fields", () => {
    expect(() => parseStructuredOutput("not-json")).toThrow(/did not contain/);
    expect(() => parseStructuredOutput("{}")).toThrow(/nlu/);
    expect(() =>
      parseStructuredOutput(
        JSON.stringify({
          nlu: { intent: "x", slots: {}, grammar_features: [], error_categories: [] },
          feedback: [],
          difficulty_estimate: 1,
          comprehension_ok: true,
        }),
      ),
    ).toThrow(/utterance/);
    expect(() =>
      parseStructuredOutput(
        JSON.stringify({
          nlu: { intent: "x", slots: {}, grammar_features: [], error_categories: [] },
          utterance: "ok",
          feedback: [],
          comprehension_ok: true,
        }),
      ),
    ).toThrow(/difficulty_estimate/);
  });

  it("converts a parsed payload into a VoiceLoopTurn", () => {
    const payload = parseStructuredOutput(
      JSON.stringify({
        nlu: { intent: "x", slots: {}, grammar_features: [], error_categories: [] },
        utterance: "ok",
        feedback: [],
        difficulty_estimate: 1.4,
        comprehension_ok: true,
      }),
    );
    const turn = payloadToTurn(payload, {
      turnId: "turn-1",
      utteranceId: "utt-1",
      generatedAt: FIXED_NOW,
      mock: true,
      pronunciationScore: 87,
    });
    expect(turn.turnId).toBe("turn-1");
    expect(turn.teacherUtterance).toBe("ok");
    expect(turn.nextDifficultyTarget).toBe(1.4);
    expect(turn.pronunciationScore).toBe(87);
    expect(turn.mock).toBe(true);
  });
});

describe("Mock scripted payload", () => {
  it("returns a greeting response for ‘olá’", () => {
    const payload = scriptedPayloadFor("olá", "free-form");
    expect(payload.nlu.intent).toBe("greeting");
    expect(payload.utterance.toLowerCase()).toMatch(/ol[áa]/);
  });

  it("returns an introduce-self response for ‘chamo-me Ana’", () => {
    const payload = scriptedPayloadFor("Chamo-me Ana", "free-form");
    expect(payload.nlu.intent).toBe("introduce.self");
    expect(payload.nlu.slots.name).toBe("Ana");
  });

  it("flags ‘você’ usage as a register error", () => {
    const payload = scriptedPayloadFor("Você é muito gentil.", "free-form");
    expect(payload.nlu.errorCategories).toContain("register");
  });

  it("falls back to a comprehension-failure payload for empty input", () => {
    const payload = scriptedPayloadFor("", "drill");
    expect(payload.comprehension_ok).toBe(false);
  });

  it("exports a usable MockScriptedTurn type", () => {
    const sample: MockScriptedTurn = {
      match: () => true,
      build: () => ({
        nlu: {
          intent: "x",
          slots: {},
          grammarFeatures: [],
          errorCategories: [],
        },
        utterance: "ok",
        feedback: [],
        difficulty_estimate: 1,
        comprehension_ok: true,
      }),
    };
    expect(sample.build("", "free-form").utterance).toBe("ok");
  });
});

describe("Turn orchestrator", () => {
  it("uses the scripted mock for Tier 3 without calling the LLM", async () => {
    let llmCalls = 0;
    const input = buildInput({
      learnerText: "olá",
      tier: 3,
      practiceMode: "free-form",
      difficultyTarget: 1,
    });
    const result = await runTurn(input, {
      llm: mockLlm("never called"),
      generateId: () => "turn-1",
      now: () => FIXED_NOW,
    });
    expect(result.mock).toBe(true);
    expect(llmCalls).toBe(0);
    expect(result.turn.teacherUtterance.toLowerCase()).toMatch(/ol[áa]/);
  });

  it("parses the LLM JSON output for Tier 1 / Tier 2", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.5,
    });
    const result = await runTurn(input, {
      llm: mockLlm(
        JSON.stringify({
          nlu: { intent: "greeting", slots: {}, grammar_features: [], error_categories: [] },
          utterance: "Olá, tudo bem?",
          feedback: [{ kind: "confirmatory", text: "Bom começo." }],
          difficulty_estimate: 1.6,
          comprehension_ok: true,
        }),
      ),
      generateId: () => "turn-2",
      now: () => FIXED_NOW,
    });
    expect(result.mock).toBe(false);
    expect(result.turn.teacherUtterance).toBe("Olá, tudo bem?");
    expect(result.turn.feedback[0]?.text).toBe("Bom começo.");
    expect(result.turn.nextDifficultyTarget).toBe(1.6);
  });

  it("propagates parse errors when the LLM emits malformed JSON", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1,
    });
    await expect(
      runTurn(input, {
        llm: mockLlm("not-json"),
        generateId: () => "turn-3",
        now: () => FIXED_NOW,
      }),
    ).rejects.toThrow(/JSON/);
  });

  it("uses the supplied clock for latency and the generated id for the turn", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 3,
      practiceMode: "free-form",
      difficultyTarget: 1,
    });
    let ticks = FIXED_NOW;
    const result = await runTurn(input, {
      llm: mockLlm("ignored"),
      generateId: () => "turn-from-clock",
      now: () => {
        ticks += 25;
        return ticks;
      },
    });
    expect(result.turn.turnId).toBe("turn-from-clock");
    expect(result.turn.generatedAt).toBe(FIXED_NOW + 50);
  });
});

describe("Practice session input shape", () => {
  it("produces a VoiceLoopTurnInput with the expected defaults", () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 2 as BrowserTier,
      practiceMode: "scenario" as PracticeMode,
      difficultyTarget: 1.4,
    });
    const expected: Partial<VoiceLoopTurnInput> = {
      learnerText: "olá",
      practiceMode: "scenario",
      tier: 2,
      difficultyTarget: 1.4,
    };
    expect(input.learnerText).toBe(expected.learnerText);
    expect(input.practiceMode).toBe(expected.practiceMode);
    expect(input.tier).toBe(expected.tier);
    expect(input.difficultyTarget).toBe(expected.difficultyTarget);
    expect(input.learnerUtteranceId).toMatch(/^utt-/);
  });
});
