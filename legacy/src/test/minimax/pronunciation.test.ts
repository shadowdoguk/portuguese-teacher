import { describe, expect, it } from "vitest";
import { MiniMaxPronunciation } from "@/lib/minimax/pronunciation";
import { MiniMaxError } from "@/lib/minimax/types";

describe("MiniMaxPronunciation", () => {
  it("posts reference + observed + lang to /v1/pronunciation/score", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          score: 82,
          per_phoneme: [
            { phoneme: "o", score: 80, start: 0, end: 0.2 },
            { phoneme: "l", score: 84, start: 0.2, end: 0.4 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const client = new MiniMaxPronunciation({
      baseUrl: "https://pron.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    const result = await client.score({
      reference: "olá",
      observed: "olá",
      lang: "pt-PT",
    });
    expect(result.score).toBe(82);
    expect(result.perPhoneme).toHaveLength(2);
    expect(result.perPhoneme[0]?.phoneme).toBe("o");
    expect(calls[0]?.url).toBe("https://pron.example/v1/pronunciation/score");
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body).toEqual({ reference: "olá", observed: "olá", lang: "pt-PT" });
    expect(calls[0]?.init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    });
  });

  it("clamps score + per-phoneme scores to [0, 100]", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          score: 137,
          per_phoneme: [{ phoneme: "a", score: -5, start: 0, end: 0.2 }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const client = new MiniMaxPronunciation({
      baseUrl: "https://pron.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    const result = await client.score({ reference: "a", observed: "a", lang: "pt-PT" });
    expect(result.score).toBe(100);
    expect(result.perPhoneme[0]?.score).toBe(0);
  });

  it("throws MiniMaxError on non-2xx", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("nope", { status: 401, statusText: "Unauthorized" });
    const client = new MiniMaxPronunciation({
      baseUrl: "https://pron.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await expect(
      client.score({ reference: "a", observed: "a", lang: "pt-PT" }),
    ).rejects.toBeInstanceOf(MiniMaxError);
  });

  it("propagates AbortSignal to fetch", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | null | undefined;
    const fakeFetch: typeof fetch = async (_input, init) => {
      receivedSignal = init?.signal ?? null;
      controller.abort();
      return new Response(JSON.stringify({ score: 0, per_phoneme: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new MiniMaxPronunciation({
      baseUrl: "https://pron.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await client.score({
      reference: "olá",
      observed: "olá",
      lang: "pt-PT",
      signal: controller.signal,
    });
    expect(receivedSignal).toBe(controller.signal);
  });
});