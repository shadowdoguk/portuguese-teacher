import { describe, expect, it } from "vitest";
import { vocabularyFor } from "@/lib/voice-loop/level-vocabulary";

describe("level-vocabulary", () => {
  it("returns a non-empty A0 set containing core greetings", () => {
    const a0 = vocabularyFor("A0");
    expect(a0.size).toBeGreaterThan(10);
    expect(a0.has("olá")).toBe(true);
    expect(a0.has("bom")).toBe(true);
    expect(a0.has("sim")).toBe(true);
    expect(a0.has("não")).toBe(true);
  });

  it("is strictly monotonic: higher levels add vocabulary, never remove", () => {
    const a0 = vocabularyFor("A0");
    const a1 = vocabularyFor("A1");
    const a2 = vocabularyFor("A2");
    const b1 = vocabularyFor("B1");

    for (const word of a0) {
      expect(a1.has(word)).toBe(true);
      expect(a2.has(word)).toBe(true);
      expect(b1.has(word)).toBe(true);
    }
    expect(a1.size).toBeGreaterThan(a0.size);
    expect(a2.size).toBeGreaterThan(a1.size);
    expect(b1.size).toBeGreaterThan(a2.size);
  });

  it("contains pt-PT-friendly core A1 vocabulary", () => {
    const a1 = vocabularyFor("A1");
    expect(a1.has("café")).toBe(true);
    expect(a1.has("queres")).toBe(true);
    expect(a1.has("obrigado")).toBe(true);
  });

  it("exposes A2 vocabulary including past-tense helpers", () => {
    const a2 = vocabularyFor("A2");
    expect(a2.has("ontem")).toBe(true);
    expect(a2.has("fui")).toBe(true);
  });

  it("exposes B1 vocabulary including opinion markers", () => {
    const b1 = vocabularyFor("B1");
    expect(b1.has("acho")).toBe(true);
    expect(b1.has("porque")).toBe(true);
  });
});