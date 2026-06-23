import {
  MiniMaxError,
  withLatencyMetric,
  type LlmCompleteOptions,
  type LlmCompleteResult,
  type LlmMessage,
} from "./types";

export type MiniMaxLLMConfig = {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  fetch?: typeof fetch;
};

const DEFAULT_MODEL = "minimax-llm-1";

export class MiniMaxLLM {
  private readonly fetchImpl: typeof fetch;
  private readonly defaultModel: string;

  constructor(private readonly config: MiniMaxLLMConfig) {
    this.fetchImpl = config.fetch ?? fetch;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async complete(
    messages: LlmMessage[],
    options: LlmCompleteOptions = {},
  ): Promise<LlmCompleteResult> {
    return withLatencyMetric("llm", async () => {
      const body = {
        model: options.model ?? this.defaultModel,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      };
      const response = await this.fetchImpl(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });
      if (!response.ok) {
        throw new MiniMaxError(
          `LLM request failed: ${response.status} ${response.statusText}`,
          response.status,
          "llm",
        );
      }
      const data = (await response.json().catch(() => {
        throw new MiniMaxError("LLM response was not valid JSON", response.status, "llm");
      })) as {
        choices: Array<{ message: { content: string } }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      const first = data.choices[0];
      if (!first) {
        throw new MiniMaxError("LLM response had no choices", response.status, "llm");
      }
      return {
        text: first.message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    });
  }
}
