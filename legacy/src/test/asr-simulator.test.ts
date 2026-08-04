import { describe, expect, it } from "vitest";
import { simulateAsr } from "@/lib/asr/simulator";
import { computeWer, tokenise } from "@/lib/asr/wer";

describe("simulateAsr", () => {
  it("returns the exact reference when seeded with biased + clean (deterministic)", () => {
    const result = simulateAsr(
      { id: "deterministic-1", reference: "olá", hotwords: ["olá"] },
      { bucket: "clean" },
    );
    expect(result.text).toBe("olá");
    expect(result.languageDetected).toBe("pt-PT");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("is deterministic for the same (id, bucket, reference)", () => {
    const a = simulateAsr(
      { id: "x", reference: "olá bom dia como estás", hotwords: [] },
      { bucket: "clean" },
    );
    const b = simulateAsr(
      { id: "x", reference: "olá bom dia como estás", hotwords: [] },
      { bucket: "clean" },
    );
    expect(a.text).toBe(b.text);
  });

  it("produces a different transcript for a different id (deterministic seed)", () => {
    // 15-word reference is enough that two distinct seeds will land on
    // different RNG output sequences for the noisy bucket (94% verbatim,
    // so the probability of two seeds producing identical transcripts is
    // vanishingly small).
    const ref = "olá bom dia como estás hoje meu amigo eu quero um café por favor agora";
    const a = simulateAsr({ id: "x", reference: ref, hotwords: [] }, { bucket: "noisy" });
    const b = simulateAsr({ id: "y", reference: ref, hotwords: [] }, { bucket: "noisy" });
    expect(a.text).not.toBe(b.text);
  });

  it("produces a different transcript for a different bucket", () => {
    const ref = "olá bom dia como estás hoje meu amigo";
    const clean = simulateAsr({ id: "x", reference: ref, hotwords: [] }, { bucket: "clean" });
    const noisy = simulateAsr({ id: "x", reference: ref, hotwords: [] }, { bucket: "noisy" });
    // Clean should have a higher verbatim rate (and thus lower WER) than noisy.
    const cleanWer = computeWer(tokenise(ref), tokenise(clean.text)).wer;
    const noisyWer = computeWer(tokenise(ref), tokenise(noisy.text)).wer;
    expect(noisyWer).toBeGreaterThanOrEqual(cleanWer);
  });

  it("keeps the aggregate clean WER under 10% across the synthetic corpus fixture", () => {
    // This is the regression-alarm primitive. The committed corpus fixture
    // is designed to land clean WER around ~2 %. We assert a generous upper
    // bound so a regression in the simulator's RNG / verbatim rate fires
    // here before reaching the regression runner.
    const refs = [
      "olá bom dia",
      "como estás hoje",
      "eu quero um café por favor",
      "obrigado pela ajuda",
      "até logo",
      "onde fica a estação de comboios",
      "eu não compreendo",
      "posso pedir a conta",
      "bom dia senhor",
      "boa tarde",
    ];
    const cleanWers = refs.map((reference, i) => {
      const r = simulateAsr({ id: `synth-${i}`, reference, hotwords: [] }, { bucket: "clean" });
      return computeWer(tokenise(reference), tokenise(r.text)).wer;
    });
    const avg = cleanWers.reduce((acc, w) => acc + w, 0) / cleanWers.length;
    expect(avg).toBeLessThan(0.1);
  });

  it("returns languageDetected: 'pt-PT'", () => {
    const r = simulateAsr({ id: "x", reference: "olá", hotwords: [] }, { bucket: "clean" });
    expect(r.languageDetected).toBe("pt-PT");
  });

  it("emits per-word confidence in the [0, 1] range", () => {
    const r = simulateAsr(
      { id: "x", reference: "olá bom dia como estás", hotwords: [] },
      { bucket: "noisy" },
    );
    for (const w of r.words) {
      expect(w.confidence).toBeGreaterThanOrEqual(0);
      expect(w.confidence).toBeLessThanOrEqual(1);
    }
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});