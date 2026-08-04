import { describe, expect, it } from "vitest";
import { MiniMaxTTS } from "@/lib/minimax/tts";
import { MiniMaxError } from "@/lib/minimax/types";

const VOICE = { id: "v1", dialect: "pt-PT" as const, gender: "female" as const };

describe("MiniMaxTTS", () => {
  it("posts to /v1/tts/synthesize and returns audio Blob", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(new Blob(["fake-mp3"]), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      });
    };
    const tts = new MiniMaxTTS({
      baseUrl: "https://tts.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    const result = await tts.synthesize("olá", { voice: VOICE });
    expect(result.audio).toBeInstanceOf(Blob);
    expect(result.audio.size).toBeGreaterThan(0);
    expect(result.contentType).toBe("audio/mpeg");
    expect(calls[0]?.url).toBe("https://tts.example/v1/tts/synthesize");
  });

  it("throws MiniMaxError on non-2xx", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("nope", { status: 503, statusText: "Service Unavailable" });
    const tts = new MiniMaxTTS({
      baseUrl: "https://tts.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await expect(tts.synthesize("x", { voice: VOICE })).rejects.toBeInstanceOf(MiniMaxError);
  });
});
