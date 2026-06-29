import { describe, expect, it } from "vitest";
import {
  MOCK_PT_VOICE,
  MockMiniMaxASR,
  MockMiniMaxLLM,
  MockMiniMaxPronunciation,
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

describe("MockMiniMaxPronunciation", () => {
  it("returns 100 for identical reference and observed", async () => {
    const client = new MockMiniMaxPronunciation();
    const result = await client.score({ reference: "olá", observed: "olá", lang: "pt-PT" });
    expect(result.score).toBe(100);
    expect(result.perPhoneme.length).toBeGreaterThan(0);
  });

  it("returns 0 when observed is empty", async () => {
    const client = new MockMiniMaxPronunciation();
    const result = await client.score({ reference: "olá", observed: "", lang: "pt-PT" });
    expect(result.score).toBe(0);
  });

  it("returns a partial score when tokens are reordered", async () => {
    const client = new MockMiniMaxPronunciation();
    const result = await client.score({
      reference: "olá mundo",
      observed: "mundo olá",
      lang: "pt-PT",
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("emits per-phoneme entries with timestamps", async () => {
    const client = new MockMiniMaxPronunciation();
    const result = await client.score({
      reference: "olá",
      observed: "olá",
      lang: "pt-PT",
    });
    expect(result.perPhoneme.length).toBe(3);
    expect(result.perPhoneme[0]?.start).toBe(0);
    expect(result.perPhoneme[2]?.end).toBeGreaterThan(result.perPhoneme[2]?.start ?? 0);
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
    expect(clients.pronunciation).toBeInstanceOf(MockMiniMaxPronunciation);
  });

  it("throws a clear error when real-mode env vars are missing", () => {
    process.env.NEXT_PUBLIC_MOCK = "0";
    delete process.env.MINIMAX_LLM_BASE_URL;
    delete process.env.MINIMAX_LLM_API_KEY;
    expect(() => getMiniMaxClients()).toThrow(/MINIMAX_LLM_BASE_URL/);
  });

  it("throws when pronunciation env vars are missing in real mode", () => {
    process.env.NEXT_PUBLIC_MOCK = "0";
    process.env.MINIMAX_LLM_BASE_URL = "https://llm.example";
    process.env.MINIMAX_LLM_API_KEY = "k";
    process.env.MINIMAX_ASR_BASE_URL = "https://asr.example";
    process.env.MINIMAX_ASR_API_KEY = "k";
    process.env.MINIMAX_TTS_BASE_URL = "https://tts.example";
    process.env.MINIMAX_TTS_API_KEY = "k";
    delete process.env.MINIMAX_PRONUNCIATION_BASE_URL;
    delete process.env.MINIMAX_PRONUNCIATION_API_KEY;
    expect(() => getMiniMaxClients()).toThrow(/MINIMAX_PRONUNCIATION_BASE_URL/);
    delete process.env.MINIMAX_LLM_BASE_URL;
    delete process.env.MINIMAX_LLM_API_KEY;
  });
});

describe("isMockMode", () => {
  it("reflects NEXT_PUBLIC_MOCK=1", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    expect(isMockMode()).toBe(true);
  });
});
