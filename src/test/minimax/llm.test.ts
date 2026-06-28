import { describe, expect, it } from "vitest";
import { MiniMaxLLM } from "@/lib/minimax/llm";
import { MiniMaxError } from "@/lib/minimax/types";

describe("MiniMaxLLM", () => {
  it("posts to /v1/chat/completions and returns text + usage", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "olá" } }],
          usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const llm = new MiniMaxLLM({
      baseUrl: "https://llm.example",
      apiKey: "test-key",
      fetch: fakeFetch,
    });
    const result = await llm.complete([
      { role: "system", content: "you are a teacher" },
      { role: "user", content: "olá" },
    ]);
    expect(result.text).toBe("olá");
    expect(result.usage.totalTokens).toBe(7);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://llm.example/v1/chat/completions");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
  });

  it("throws MiniMaxError on non-2xx", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("oops", { status: 500, statusText: "Server Error" });
    const llm = new MiniMaxLLM({
      baseUrl: "https://llm.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await expect(llm.complete([{ role: "user", content: "x" }])).rejects.toBeInstanceOf(
      MiniMaxError,
    );
  });

  it("throws when response has no choices", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }), {
        status: 200,
      });
    const llm = new MiniMaxLLM({
      baseUrl: "https://llm.example",
      apiKey: "k",
      fetch: fakeFetch,
    });
    await expect(llm.complete([{ role: "user", content: "x" }])).rejects.toThrow(/no choices/);
  });
});
