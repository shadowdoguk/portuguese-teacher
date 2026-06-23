import { MiniMaxASR } from "./asr";
import { MiniMaxLLM } from "./llm";
import {
  MOCK_PT_VOICE,
  MockMiniMaxASR,
  MockMiniMaxLLM,
  MockMiniMaxTTS,
} from "./mock";
import { MiniMaxTTS } from "./tts";

export const isMockMode = (): boolean => process.env.NEXT_PUBLIC_MOCK === "1";

export type MiniMaxClients = {
  llm: MiniMaxLLM | MockMiniMaxLLM;
  asr: MiniMaxASR | MockMiniMaxASR;
  tts: MiniMaxTTS | MockMiniMaxTTS;
  mock: boolean;
};

export function getMiniMaxClients(): MiniMaxClients {
  if (isMockMode()) {
    return {
      llm: new MockMiniMaxLLM(),
      asr: new MockMiniMaxASR(),
      tts: new MockMiniMaxTTS(),
      mock: true,
    };
  }
  const llmBaseUrl = required("MINIMAX_LLM_BASE_URL");
  const llmApiKey = required("MINIMAX_LLM_API_KEY");
  const asrBaseUrl = required("MINIMAX_ASR_BASE_URL");
  const asrApiKey = required("MINIMAX_ASR_API_KEY");
  const ttsBaseUrl = required("MINIMAX_TTS_BASE_URL");
  const ttsApiKey = required("MINIMAX_TTS_API_KEY");
  return {
    llm: new MiniMaxLLM({ baseUrl: llmBaseUrl, apiKey: llmApiKey }),
    asr: new MiniMaxASR({ baseUrl: asrBaseUrl, apiKey: asrApiKey }),
    tts: new MiniMaxTTS({ baseUrl: ttsBaseUrl, apiKey: ttsApiKey }),
    mock: false,
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set NEXT_PUBLIC_MOCK=1 for mock mode, ` +
        `or provide real credentials.`,
    );
  }
  return value;
}

export { MiniMaxLLM, MiniMaxASR, MiniMaxTTS, MOCK_PT_VOICE };
export {
  MockMiniMaxLLM,
  MockMiniMaxASR,
  MockMiniMaxTTS,
} from "./mock";
export * from "./types";
