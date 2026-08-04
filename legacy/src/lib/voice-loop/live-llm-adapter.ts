import { MiniMaxLLM, isMockMode } from "@/lib/minimax";
import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

export type LiveHarnessConfig = {
  baseUrl: string;
  apiKey: string;
  model?: string;
};

export type LiveHarnessHandle = {
  rerankLlm: (messages: LlmMessage[]) => Promise<LlmCompleteResult>;
  promptOnlyLlm: (messages: LlmMessage[]) => Promise<LlmCompleteResult>;
  mode: "live";
};

export class LiveHarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveHarnessError";
  }
}

export function buildLiveHarnessFromEnv(): LiveHarnessHandle {
  if (isMockMode()) {
    throw new LiveHarnessError(
      "NEXT_PUBLIC_MOCK=1 prevents live harness. Unset NEXT_PUBLIC_MOCK and provide MINIMAX_LLM_BASE_URL + MINIMAX_LLM_API_KEY.",
    );
  }
  const baseUrl = process.env.MINIMAX_LLM_BASE_URL;
  const apiKey = process.env.MINIMAX_LLM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new LiveHarnessError(
      "Missing MINIMAX_LLM_BASE_URL or MINIMAX_LLM_API_KEY env vars. Set both to run the live harness.",
    );
  }
  return buildLiveHarness({ baseUrl, apiKey, model: process.env.MINIMAX_LLM_MODEL });
}

export function buildLiveHarness(config: LiveHarnessConfig): LiveHarnessHandle {
  const client = new MiniMaxLLM(config);
  const call = (messages: LlmMessage[]) => client.complete(messages);
  return {
    rerankLlm: call,
    promptOnlyLlm: call,
    mode: "live",
  };
}
