import { describe, expect, it } from "vitest";
import {
  MOCK_PT_VOICE,
  MockMiniMaxASR,
  MockMiniMaxLLM,
  MockMiniMaxTTS,
  getMiniMaxClients,
  isMockMode,
} from "@/lib/minimax";

describe("MockMiniMaxLLM", () => {
  it("returns a deterministic text prefixed with mock:", async () => {
    const llm = new MockMiniMaxLLM();
    const result = await llm.complete([{ role: "user", content: "olá" }]);
    expect(result.text).toMatch(/^mock:olá/);
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });
});

describe("MockMiniMaxASR", () => {
  it("echoes the lang and a size hint in the transcript", async () => {
    const asr = new MockMiniMaxASR();
    const result = await asr.transcribe(new Blob(["x".repeat(10)]), { lang: "pt-PT" });
    expect(result.text).toContain("pt-PT");
    expect(result.text).toContain("10");
    expect(result.languageDetected).toBe("pt-PT");
    expect(result.words.length).toBeGreaterThan(0);
  });
});

describe("MockMiniMaxTTS", () => {
  it("returns a non-empty audio blob with an estimated duration", async () => {
    const tts = new MockMiniMaxTTS();
    const result = await tts.synthesize("olá mundo", { voice: MOCK_PT_VOICE });
    expect(result.audio.size).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThan(0);
  });
});

describe("getMiniMaxClients", () => {
  it("returns mocks when NEXT_PUBLIC_MOCK=1", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    const clients = getMiniMaxClients();
    expect(clients.mock).toBe(true);
    expect(clients.llm).toBeInstanceOf(MockMiniMaxLLM);
    expect(clients.asr).toBeInstanceOf(MockMiniMaxASR);
    expect(clients.tts).toBeInstanceOf(MockMiniMaxTTS);
  });

  it("throws a clear error when real-mode env vars are missing", () => {
    process.env.NEXT_PUBLIC_MOCK = "0";
    delete process.env.MINIMAX_LLM_BASE_URL;
    delete process.env.MINIMAX_LLM_API_KEY;
    expect(() => getMiniMaxClients()).toThrow(/MINIMAX_LLM_BASE_URL/);
  });
});

describe("isMockMode", () => {
  it("reflects NEXT_PUBLIC_MOCK=1", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    expect(isMockMode()).toBe(true);
  });
});
