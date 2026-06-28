import type { RecallGrade } from "@/lib/srs/types";

export type ObservabilityEventKind =
  | "srs_recall"
  | "voice_loop_latency"
  | "voice_loop_error"
  | "degradation";

export type SrsRecallObservabilityEvent = {
  kind: "srs_recall";
  occurredAt: number;
  learnerId: string;
  itemId: string;
  grade: RecallGrade;
  halfLifeBeforeMs: number;
  halfLifeAfterMs: number;
  dueAt: number;
};

export type VoiceLoopStage = "asr" | "llm" | "tts" | "rerank";

export type VoiceLoopLatencyEvent = {
  kind: "voice_loop_latency";
  occurredAt: number;
  stage: VoiceLoopStage;
  latencyMs: number;
  learnerId?: string;
};

export type VoiceLoopErrorEvent = {
  kind: "voice_loop_error";
  occurredAt: number;
  stage: VoiceLoopStage | "client";
  message: string;
  learnerId?: string;
};

export type DegradationStatus = "degraded" | "down" | "recovered";

export type DegradationEvent = {
  kind: "degradation";
  occurredAt: number;
  service: "asr" | "llm" | "tts";
  status: DegradationStatus;
  detail?: string;
  learnerId?: string;
};

export type ObservabilityEvent =
  | SrsRecallObservabilityEvent
  | VoiceLoopLatencyEvent
  | VoiceLoopErrorEvent
  | DegradationEvent;

export interface ObservabilitySink {
  readonly name: string;
  emit(event: ObservabilityEvent): void;
  flush(): Promise<void>;
}

function jsonLine(event: ObservabilityEvent): string {
  return JSON.stringify({ source: "portuguese-teacher", ...event });
}

export const consoleObservabilitySink: ObservabilitySink = {
  name: "console",
  emit(event) {
    if (typeof console === "undefined") return;
    const line = jsonLine(event);
    if (event.kind === "voice_loop_error") {
      console.warn(`[observability] ${line}`);
      return;
    }
    console.info(`[observability] ${line}`);
  },
  async flush() {
    /* no-op for console */
  },
};

export type ApiObservabilitySinkOptions = {
  endpoint?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  fetchImpl?: typeof fetch;
};

export function createApiObservabilitySink(
  options: ApiObservabilitySinkOptions = {},
): ObservabilitySink {
  const endpoint = options.endpoint ?? "/api/observability/events";
  const batchSize = options.batchSize ?? 50;
  const flushIntervalMs = options.flushIntervalMs ?? 2_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  let buffer: ObservabilityEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
  }

  async function flush(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (buffer.length === 0) return;
    const drained = buffer;
    buffer = [];
    try {
      await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: drained }),
      });
    } catch {
      /* keep telemetry best-effort; never throw into callers */
    }
  }

  return {
    name: "api",
    emit(event) {
      buffer.push(event);
      if (buffer.length >= batchSize) {
        void flush();
      } else {
        scheduleFlush();
      }
    },
    flush,
  };
}

let activeSink: ObservabilitySink = consoleObservabilitySink;

export function getObservabilitySink(): ObservabilitySink {
  return activeSink;
}

export function setObservabilitySink(sink: ObservabilitySink): void {
  activeSink = sink;
}

export function resetObservabilitySink(): void {
  activeSink = consoleObservabilitySink;
}