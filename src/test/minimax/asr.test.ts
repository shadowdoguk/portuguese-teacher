import { describe, expect, it } from "vitest";
import { MiniMaxASR } from "@/lib/minimax/asr";
import { MiniMaxError } from "@/lib/minimax/types";

describe("MiniMaxASR", () => {
  it("posts FormData with audio + lang", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          text: "olá",
          words: [{ word: "olá", start: 0, end: 0.4, confidence: 0.95 }],
          confidence: 0.95,
          language_detected: "pt-PT",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const asr = new MiniMaxASR({
      baseUrl: "https://asr.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    const result = await asr.transcribe(new Blob(["fake-audio"]), { lang: "pt-PT" });
    expect(result.text).toBe("olá");
    expect(result.languageDetected).toBe("pt-PT");
    expect(result.words[0]?.confidence).toBe(0.95);
    expect(calls[0]?.url).toBe("https://asr.example/v1/asr/transcriptions");
    const body = calls[0]?.init.body as FormData;
    expect(body.get("lang")).toBe("pt-PT");
    expect(body.get("hotwords")).toBeNull();
  });

  it("serialises hotwords as a JSON-encoded array when supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          text: "café",
          words: [{ word: "café", start: 0, end: 0.4, confidence: 0.98 }],
          confidence: 0.98,
          language_detected: "pt-PT",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const asr = new MiniMaxASR({
      baseUrl: "https://asr.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    await asr.transcribe(new Blob(["fake-audio"]), {
      lang: "pt-PT",
      hotwords: ["café", "leite"],
    });
    const body = calls[0]?.init.body as FormData;
    expect(body.get("hotwords")).toBe(JSON.stringify(["café", "leite"]));
  });

  it("omits the hotwords form field when the array is empty", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          text: "ok",
          words: [{ word: "ok", start: 0, end: 0.4, confidence: 0.95 }],
          confidence: 0.95,
          language_detected: "pt-PT",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const asr = new MiniMaxASR({
      baseUrl: "https://asr.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    await asr.transcribe(new Blob(["fake-audio"]), { lang: "pt-PT", hotwords: [] });
    const body = calls[0]?.init.body as FormData;
    expect(body.get("hotwords")).toBeNull();
  });

  it("throws MiniMaxError on non-2xx", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("nope", { status: 401, statusText: "Unauthorized" });
    const asr = new MiniMaxASR({
      baseUrl: "https://asr.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await expect(asr.transcribe(new Blob(), { lang: "pt-PT" })).rejects.toBeInstanceOf(
      MiniMaxError,
    );
  });
});
