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

  it("boosts per-word + aggregate confidence when a transcribed word matches a hotword", async () => {
    const asr = new MockMiniMaxASR();
    const baseline = await asr.transcribe(new Blob(["x".repeat(10)]), { lang: "pt-PT" });
    const biased = await asr.transcribe(new Blob(["x".repeat(10)]), {
      lang: "pt-PT",
      hotwords: ["mock"],
    });
    expect(biased.confidence).toBeGreaterThan(baseline.confidence);
    const biasedMock = biased.words.find((w) => w.word === "mock");
    expect(biasedMock?.confidence).toBeGreaterThan(0.95);
  });
});

function mp3FrameSize(header: Uint8Array): number | null {
  if (header.length < 4) return null;
  if (header[0] !== 0xff || (header[1]! & 0xe0) !== 0xe0) return null;
  const versionId = (header[1]! >> 3) & 0x3;
  const layerDesc = (header[1]! >> 1) & 0x3;
  const bitrateIndex = (header[2]! >> 4) & 0xf;
  const sampleRateIndex = (header[2]! >> 2) & 0x3;
  const padding = (header[2]! >> 1) & 0x1;
  if (layerDesc !== 1) return null;
  if (versionId === 1) return null;
  if (bitrateIndex === 0 || bitrateIndex === 0xf) return null;
  if (sampleRateIndex === 0x3) return null;
  const layer3Bitrate: Record<number, [number[], number[]]> = {
    3: [
      [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
      [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    ],
    2: [
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
      [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    ],
    0: [
      [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
      [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    ],
  };
  const tables = layer3Bitrate[versionId];
  if (!tables) return null;
  const bitrateKbps = tables[0][bitrateIndex];
  if (!bitrateKbps) return null;
  const sampleRateTable = versionId === 3 ? [44100, 48000, 32000] : [22050, 24000, 16000];
  const sampleRate = sampleRateTable[sampleRateIndex];
  if (!sampleRate) return null;
  const samplesPerFrame = versionId === 3 ? 144 : 72;
  return Math.floor((samplesPerFrame * bitrateKbps * 1000) / sampleRate) + padding;
}

async function audioBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.onload = () => {
      const result = reader.result;
      resolve(result instanceof ArrayBuffer ? new Uint8Array(result) : new Uint8Array(0));
    };
    reader.readAsArrayBuffer(blob);
  });
}

describe("MockMiniMaxTTS", () => {
  it("returns a non-empty audio blob with an estimated duration", async () => {
    const tts = new MockMiniMaxTTS();
    const result = await tts.synthesize("olá mundo", { voice: MOCK_PT_VOICE });
    expect(result.audio.size).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("returns an audio blob that contains at least one decodable MPEG frame", async () => {
    const tts = new MockMiniMaxTTS();
    const result = await tts.synthesize("olá mundo", { voice: MOCK_PT_VOICE });
    const bytes = await audioBlobBytes(result.audio);
    const frameSize = mp3FrameSize(bytes.subarray(0, 4));
    expect(frameSize).not.toBeNull();
    expect(bytes.length).toBeGreaterThanOrEqual(frameSize!);
    const sideInfoPlusMain = bytes.subarray(4, frameSize!);
    expect(sideInfoPlusMain.length).toBeGreaterThan(0);
    const allZero = sideInfoPlusMain.every((b) => b === 0);
    expect(allZero).toBe(false);
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
