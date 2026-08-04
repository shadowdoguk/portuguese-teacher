// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { MOCK_PT_VOICE } from "@/lib/minimax";
import { MiniMaxError, withLatencyMetric, type LatencyLog } from "@/lib/minimax/types";

type RecordedRequest = {
  method: string;
  url: string;
  contentType: string | undefined;
  authorization: string | undefined;
  rawBody: string;
  parsedForm?: { audioBytes: number; lang: string };
  parsedJson?: unknown;
};

const SILENT_MP3_BYTES = new Uint8Array([
  0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let server: Server;
let port = 0;
const recorded: RecordedRequest[] = [];

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function send(res: ServerResponse, status: number, body: string | Buffer, contentType: string) {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(body);
}

function record(req: IncomingMessage, body: string): RecordedRequest {
  const entry: RecordedRequest = {
    method: req.method ?? "?",
    url: req.url ?? "?",
    contentType: req.headers["content-type"],
    authorization: req.headers.authorization,
    rawBody: body,
  };
  if (entry.contentType?.startsWith("multipart/form-data")) {
    const audioMatch = body.match(/filename="utterance\.webm"[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/);
    const langMatch = body.match(/name="lang"\r\n\r\n(\S+)\r\n/);
    entry.parsedForm = {
      audioBytes: audioMatch?.[1] ? Buffer.byteLength(audioMatch[1], "binary") : 0,
      lang: langMatch?.[1] ?? "",
    };
  } else {
    try {
      entry.parsedJson = JSON.parse(body);
    } catch {
      entry.parsedJson = undefined;
    }
  }
  recorded.push(entry);
  return entry;
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const body = await readBody(req);
    const url = req.url ?? "";

    if (url === "/v1/chat/completions") {
      record(req, body);
      send(
        res,
        200,
        JSON.stringify({
          choices: [{ message: { content: "olá" } }],
          usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
        }),
        "application/json",
      );
      return;
    }
    if (url === "/v1/asr/transcriptions") {
      record(req, body);
      send(
        res,
        200,
        JSON.stringify({
          text: "olá",
          words: [{ word: "olá", start: 0, end: 0.4, confidence: 0.95 }],
          confidence: 0.95,
          language_detected: "pt-PT",
        }),
        "application/json",
      );
      return;
    }
    if (url === "/v1/tts/synthesize") {
      record(req, body);
      send(res, 200, Buffer.from(SILENT_MP3_BYTES), "audio/mpeg");
      return;
    }
    if (url === "/v1/_fail-401") {
      record(req, body);
      send(res, 401, "unauthorized", "text/plain");
      return;
    }
    if (url === "/v1/_fail-500") {
      record(req, body);
      send(res, 500, "boom", "text/plain");
      return;
    }
    if (url === "/v1/_malformed") {
      record(req, body);
      send(res, 200, "{not-json", "application/json");
      return;
    }
    send(res, 404, "not found", "text/plain");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  port = (server.address() as { port: number }).port;

  process.env.NEXT_PUBLIC_MOCK = "0";
  process.env.MINIMAX_LLM_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.MINIMAX_LLM_API_KEY = "contract-llm";
  process.env.MINIMAX_ASR_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.MINIMAX_ASR_API_KEY = "contract-asr";
  process.env.MINIMAX_TTS_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.MINIMAX_TTS_API_KEY = "contract-tts";
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeAll(() => {
  recorded.length = 0;
});

describe("contract smoke — real wrappers against a local server", () => {
  it("LLM: posts the expected shape, returns text + usage, emits latency log", async () => {
    const latency: LatencyLog[] = [];
    const { MiniMaxLLM } = await import("@/lib/minimax/llm");
    const llm = new MiniMaxLLM({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: "contract-llm",
    });
    const result = await withLatencyMetric(
      "llm",
      () => llm.complete([{ role: "user", content: "olá" }]),
      (e) => latency.push(e),
    );
    expect(result.text).toBe("olá");
    expect(result.usage.totalTokens).toBe(7);
    const entry = recorded.find((r) => r.url === "/v1/chat/completions");
    expect(entry).toBeDefined();
    expect(entry?.method).toBe("POST");
    expect(entry?.contentType).toBe("application/json");
    expect(entry?.authorization).toBe("Bearer contract-llm");
    const json = entry?.parsedJson as { model: string; messages: unknown[] };
    expect(json.model).toBeTruthy();
    expect(Array.isArray(json.messages)).toBe(true);
    expect(latency).toHaveLength(1);
    expect(latency[0]).toMatchObject({ endpoint: "llm", ok: true });
    expect(typeof latency[0]?.durationMs).toBe("number");
  });

  it("ASR: sends multipart with audio + lang, returns transcript with words, emits latency log", async () => {
    const latency: LatencyLog[] = [];
    const { MiniMaxASR } = await import("@/lib/minimax/asr");
    const asr = new MiniMaxASR({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: "contract-asr",
    });
    const result = await withLatencyMetric(
      "asr",
      () => asr.transcribe(new Blob(["x".repeat(20)]), { lang: "pt-PT" }),
      (e) => latency.push(e),
    );
    expect(result.text).toBe("olá");
    expect(result.languageDetected).toBe("pt-PT");
    expect(result.words[0]?.confidence).toBe(0.95);
    const entry = recorded.find((r) => r.url === "/v1/asr/transcriptions");
    expect(entry).toBeDefined();
    expect(entry?.authorization).toBe("Bearer contract-asr");
    expect(entry?.parsedForm?.lang).toBe("pt-PT");
    expect(entry?.parsedForm?.audioBytes).toBeGreaterThan(0);
    expect(latency[0]).toMatchObject({ endpoint: "asr", ok: true });
  });

  it("TTS: posts text + voice, returns a Blob, emits latency log", async () => {
    const latency: LatencyLog[] = [];
    const { MiniMaxTTS } = await import("@/lib/minimax/tts");
    const tts = new MiniMaxTTS({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: "contract-tts",
    });
    const result = await withLatencyMetric(
      "tts",
      () => tts.synthesize("olá mundo", { voice: MOCK_PT_VOICE }),
      (e) => latency.push(e),
    );
    expect(result.audio).toBeInstanceOf(Blob);
    expect(result.audio.size).toBe(SILENT_MP3_BYTES.length);
    expect(result.contentType).toBe("audio/mpeg");
    const entry = recorded.find((r) => r.url === "/v1/tts/synthesize");
    expect(entry).toBeDefined();
    expect(entry?.contentType).toBe("application/json");
    expect(entry?.authorization).toBe("Bearer contract-tts");
    const json = entry?.parsedJson as { text: string; voice_id: string; dialect: string; speed: number };
    expect(json.text).toBe("olá mundo");
    expect(json.voice_id).toBe(MOCK_PT_VOICE.id);
    expect(json.dialect).toBe("pt-PT");
    expect(json.speed).toBe(1.0);
    expect(latency[0]).toMatchObject({ endpoint: "tts", ok: true });
  });

  it("surfaces a 4xx as MiniMaxError with the right status + endpoint, and logs ok:false", async () => {
    const latency: LatencyLog[] = [];
    const customFetch: typeof fetch = async () =>
      new Response("nope", { status: 401, statusText: "Unauthorized" });
    const { MiniMaxASR } = await import("@/lib/minimax/asr");
    const asr = new MiniMaxASR({
      baseUrl: `http://127.0.0.1:${port}/v1`,
      apiKey: "k",
      fetch: customFetch,
    });
    await expect(
      withLatencyMetric("asr", () => asr.transcribe(new Blob(), { lang: "pt-PT" }), (e) =>
        latency.push(e),
      ),
    ).rejects.toBeInstanceOf(MiniMaxError);
    expect(latency[0]).toMatchObject({ endpoint: "asr", ok: false });
  });

  it("surfaces malformed JSON as MiniMaxError", async () => {
    const customFetch: typeof fetch = async () =>
      new Response("{not-json", { status: 200, headers: { "content-type": "application/json" } });
    const { MiniMaxLLM } = await import("@/lib/minimax/llm");
    const llm = new MiniMaxLLM({
      baseUrl: `http://127.0.0.1:${port}/v1/_malformed`,
      apiKey: "k",
      fetch: customFetch,
    });
    await expect(llm.complete([{ role: "user", content: "x" }])).rejects.toBeInstanceOf(
      MiniMaxError,
    );
  });
});
