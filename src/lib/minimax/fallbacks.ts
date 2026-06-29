import { getObservabilitySink } from "@/lib/observability/sink";
import { recordServiceStatus } from "@/lib/observability/health";
import { MiniMaxError } from "./types";
import type {
  AsrTranscribeOptions,
  AsrTranscribeResult,
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMessage,
  TtsSynthesizeOptions,
  TtsSynthesizeResult,
} from "./types";

export type DegradedAsrResult = AsrTranscribeResult & {
  degraded: true;
  degradedReason: string;
};

export type DegradedTtsResult = {
  audio: null;
  degraded: true;
  degradedReason: string;
};

export type RuleBasedLlmResult = LlmCompleteResult & {
  degraded: true;
  canned: true;
};

export type AsrTranscriber = (
  audio: Blob,
  options: AsrTranscribeOptions,
) => Promise<AsrTranscribeResult>;

export type LlmCompleter = (
  messages: LlmMessage[],
  options?: LlmCompleteOptions,
) => Promise<LlmCompleteResult>;

export type TtsSynthesizer = (
  text: string,
  options: TtsSynthesizeOptions,
) => Promise<TtsSynthesizeResult>;

function emitDegradation(
  service: "asr" | "llm" | "tts",
  status: "degraded" | "down" | "recovered",
  detail: string,
): void {
  getObservabilitySink().emit({
    kind: "degradation",
    occurredAt: Date.now(),
    service,
    status,
    detail,
  });
  recordServiceStatus(service, status === "recovered" ? "ok" : status, detail);
}

function emitError(stage: "asr" | "llm" | "tts" | "client", message: string): void {
  getObservabilitySink().emit({
    kind: "voice_loop_error",
    occurredAt: Date.now(),
    stage,
    message,
  });
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof MiniMaxError)) return false;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

export async function withAsrFallback(
  primary: AsrTranscriber,
  audio: Blob,
  options: AsrTranscribeOptions,
): Promise<AsrTranscribeResult | DegradedAsrResult> {
  try {
    const result = await primary(audio, options);
    recordServiceStatus("asr", "ok");
    return result;
  } catch (error) {
    if (!isTransientError(error)) throw error;
    emitError("asr", errorMessage(error));
    emitDegradation("asr", "degraded", errorMessage(error));
    return {
      text: "",
      words: [],
      confidence: 0,
      languageDetected: options.lang,
      degraded: true,
      degradedReason: errorMessage(error),
    };
  }
}

const CANNED_RESPONSES: Array<{ test: (text: string) => boolean; reply: string }> = [
  {
    test: (t) => /^(ol[áa]|oi)/i.test(t),
    reply: "Ol\u00e1! Como est\u00e1s? Vamos continuar a praticar.",
  },
  {
    test: (t) => /^(adeus|at\u00e9|at\u00e9 logo)/i.test(t),
    reply: "At\u00e9 logo! Bom estudo.",
  },
  {
    test: (t) => /^(sim|s)/i.test(t),
    reply: "Muito bem. Continuamos.",
  },
  {
    test: (t) => /^(n\u00e3o|n)/i.test(t),
    reply: "Ok, vamos tentar de outra forma.",
  },
  {
    test: (t) => /^\?/.test(t),
    reply: "Boa pergunta. Quando o professor voltar, eu ajudo-te a explorar isso.",
  },
];

const FALLBACK_REPLY =
  "Estou com dificuldades em responder agora. Tenta outra vez, ou avan\u00e7a para o pr\u00f3ximo exerc\u00edcio.";

function cannedReplyFor(text: string): string {
  const trimmed = text.trim();
  for (const candidate of CANNED_RESPONSES) {
    if (candidate.test(trimmed)) return candidate.reply;
  }
  return FALLBACK_REPLY;
}

export async function withLlmFallback(
  primary: LlmCompleter,
  messages: LlmMessage[],
  options?: LlmCompleteOptions,
): Promise<LlmCompleteResult | RuleBasedLlmResult> {
  try {
    const result = await primary(messages, options);
    recordServiceStatus("llm", "ok");
    return result;
  } catch (error) {
    if (!isTransientError(error)) throw error;
    emitError("llm", errorMessage(error));
    emitDegradation("llm", "degraded", errorMessage(error));
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const reply = cannedReplyFor(lastUser?.content ?? "");
    return {
      text: reply,
      usage: { promptTokens: 0, completionTokens: reply.length, totalTokens: reply.length },
      degraded: true,
      canned: true,
    };
  }
}

export async function withTtsFallback(
  primary: TtsSynthesizer,
  text: string,
  options: TtsSynthesizeOptions,
): Promise<TtsSynthesizeResult | DegradedTtsResult> {
  try {
    const result = await primary(text, options);
    recordServiceStatus("tts", "ok");
    return result;
  } catch (error) {
    if (!isTransientError(error)) throw error;
    emitError("tts", errorMessage(error));
    emitDegradation("tts", "degraded", errorMessage(error));
    return {
      audio: null,
      degraded: true,
      degradedReason: errorMessage(error),
    };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}