import type { PrismaClient } from "@prisma/client";
import { getObservabilitySink } from "@/lib/observability/sink";
import { SC5_SAMPLE_RATE, shouldSample } from "./sampler";

export type Sc5AudioObjectStore = {
  write(blob: { utteranceId: string; body: Uint8Array }): Promise<string>;
};

export type Sc5AudioBlob = {
  utteranceId: string;
  body: Uint8Array;
  contentType: string;
  signedUrlExpiresIn: number;
  /**
   * Per-call opt-out override (issue #35). When true, the recorder emits an
   * `outcome: "opt-out"` event without reading the body or writing. The
   * recorder-level `optOut` option is a static fallback for tests that bind
   * a recorder dedicated to opt-out requests.
   */
  optOut?: boolean;
};

export type Sc5Recorder = {
  enqueue(blob: Sc5AudioBlob): void;
};

export type Sc5FireAndForgetOptions = {
  store?: Sc5AudioObjectStore;
  sampleRate?: number;
  /**
   * Optional Prisma client used to persist the `Sc5Sample` row alongside the
   * audio blob write. When omitted, only the object store is written and no
   * DB row is created (useful for tests + the dry-run path).
   */
  prisma?: PrismaClient;
  dialect?: string;
  onError?: (err: unknown) => void;
  /**
   * Static opt-out flag. When true, every call short-circuits with an
   * `outcome: "opt-out"` event. Tests use this to bind a dedicated
   * opt-out recorder; the production route reads the per-call flag from the
   * Learner's Settings and passes it via the `enqueue` argument.
   */
  optOut?: boolean;
};

export type Sc5FireAndForgetInput = {
  utteranceId: string;
  audio: Uint8Array;
  contentType?: string;
  optOut?: boolean;
};

function emitSc5Event(
  outcome: "sampled" | "skipped" | "opt-out" | "failed",
  utteranceId: string,
  extras: { latencyMs?: number; detail?: string } = {},
): void {
  try {
    getObservabilitySink().emit({
      kind: "sc5_sample",
      occurredAt: Date.now(),
      outcome,
      utteranceId,
      ...(extras.latencyMs !== undefined ? { latencyMs: extras.latencyMs } : {}),
      ...(extras.detail !== undefined ? { detail: extras.detail } : {}),
    });
  } catch {
    /* telemetry is best-effort; never throw into the call site */
  }
}

async function persistSample(
  prisma: PrismaClient,
  args: {
    utteranceId: string;
    audioBlobUrl: string;
    dialect: string;
  },
): Promise<void> {
  await prisma.sc5Sample.upsert({
    where: { utteranceId: args.utteranceId },
    update: { audioBlobUrl: args.audioBlobUrl },
    create: {
      utteranceId: args.utteranceId,
      audioBlobUrl: args.audioBlobUrl,
      dialect: args.dialect,
    },
  });
}

export function createFireAndForgetRecorder(
  options: Sc5FireAndForgetOptions = {},
): Sc5Recorder {
  const store = options.store;
  const sampleRate = options.sampleRate ?? SC5_SAMPLE_RATE;
  const dialect = options.dialect ?? "pt-PT";

  return {
    enqueue(blob): void {
      if (blob.optOut ?? options.optOut) {
        emitSc5Event("opt-out", blob.utteranceId);
        return;
      }
      if (!shouldSample(blob.utteranceId, sampleRate)) {
        emitSc5Event("skipped", blob.utteranceId);
        return;
      }
      // Fire-and-forget: latency is off the Voice Loop critical path.
      // Errors are reported via `onError` (the default sink logs them).
      const write = async (): Promise<void> => {
        const start = Date.now();
        if (!store) {
          throw new Error("SC-5 recorder invoked without an object store");
        }
        const audioBlobUrl = await store.write({
          utteranceId: blob.utteranceId,
          body: blob.body,
        });
        if (options.prisma) {
          await persistSample(options.prisma, {
            utteranceId: blob.utteranceId,
            audioBlobUrl,
            dialect,
          });
        }
        emitSc5Event("sampled", blob.utteranceId, {
          latencyMs: Date.now() - start,
        });
      };
      write().catch((err: unknown) => {
        emitSc5Event("failed", blob.utteranceId, {
          detail: err instanceof Error ? err.message : "unknown error",
        });
        if (options.onError) {
          options.onError(err);
          return;
        }
        console.warn(
          `[sc5] failed to persist sample for ${blob.utteranceId}:`,
          err,
        );
      });
    },
  };
}

// Default recorder used by the ASR transcribe route. Tests + the load-test
// script bind their own recorder via `createFireAndForgetRecorder`; they
// don't need this default. The default is bound to a no-op recorder until
// `bindDefaultRecorder` is called by the server runtime
// (`src/instrumentation.ts`).
let defaultRecorder: Sc5Recorder = createFireAndForgetRecorder();

export function bindDefaultRecorder(recorder: Sc5Recorder): Sc5Recorder {
  defaultRecorder = recorder;
  return defaultRecorder;
}

export function getDefaultRecorder(): Sc5Recorder {
  return defaultRecorder;
}

export const sc5Recorder: Sc5Recorder = {
  enqueue(blob): void {
    defaultRecorder.enqueue(blob);
  },
};