import { describe, expect, it } from "vitest";
import { buildVoiceLoopSystemPrompt } from "@/lib/voice-loop/system-prompt";

describe("buildVoiceLoopSystemPrompt", () => {
  it("encodes the four pedagogical methodologies (CLT, TBLT, Affective Filter, CEFR)", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1" });
    expect(prompt).toMatch(/Communicative/i);
    expect(prompt).toMatch(/Task-Based|TBLT/i);
    expect(prompt).toMatch(/Affective Filter/i);
    expect(prompt).toMatch(/CEFR/);
  });

  it("encodes the feedback rubric: error type → correction → rule → example → encouragement", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1" });
    expect(prompt).toMatch(/error type/i);
    expect(prompt).toMatch(/correction/i);
    expect(prompt).toMatch(/rule/i);
    expect(prompt).toMatch(/example/i);
    expect(prompt).toMatch(/encouragement/i);
  });

  it("asks for the requested number of candidates inside a JSON envelope", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1", candidateCount: 4 });
    expect(prompt).toMatch(/4/);
    expect(prompt).toMatch(/candidates/i);
    expect(prompt).toMatch(/\{[\s\S]*"candidates"/);
  });

  it("varies the requested count when the caller changes it", () => {
    const p2 = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1", candidateCount: 2 });
    const p8 = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1", candidateCount: 8 });
    expect(p2).toMatch(/exactly 2/i);
    expect(p8).toMatch(/exactly 8/i);
  });

  it("includes CEFR can-do descriptors for the requested level", () => {
    const a0 = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A0" });
    const b1 = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "B1" });
    expect(a0).toMatch(/A0|pre-A1/);
    expect(b1).toMatch(/B1/);
    expect(a0).not.toEqual(b1);
  });

  it("locks the dialect to pt-PT and forbids pt-BR markers", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1" });
    expect(prompt).toMatch(/pt-PT|European Portuguese/);
    expect(prompt).toMatch(/você|vocês|tá|pra/);
  });

  it("includes the per-payload shape the orchestrator parses", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A1" });
    expect(prompt).toMatch(/"nlu"/);
    expect(prompt).toMatch(/"utterance"/);
    expect(prompt).toMatch(/"feedback"/);
    expect(prompt).toMatch(/"difficulty_estimate"/);
    expect(prompt).toMatch(/"comprehension_ok"/);
  });

  it("instructs the LLM to prefer pt-PT vocabulary appropriate for the i+1 target", () => {
    const prompt = buildVoiceLoopSystemPrompt({ dialect: "pt-PT", level: "A0" });
    expect(prompt).toMatch(/i\+1|Comprehensible Input/);
  });
});