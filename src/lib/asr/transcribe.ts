import { NextResponse } from "next/server";
import { withAsrFallback, type DegradedAsrResult, type AsrTranscriber } from "@/lib/minimax/fallbacks";
import { LOW_CONFIDENCE_THRESHOLD, isLowConfidence } from "@/lib/asr/biasing";
import { shouldSample } from "@/lib/sc5/sampler";
import type { Sc5Recorder } from "@/lib/sc5/recorder";

export type AsrTranscribeResponse =
  | {
      ok: true;
      text: string;
      confidence: number;
      languageDetected: string;
      words: ReadonlyArray<{ word: string; confidence: number; startMs: number; endMs: number }>;
      mock: boolean;
      /**
       * True when the aggregate confidence is below the
       * {@link LOW_CONFIDENCE_THRESHOLD}. The client should surface a retry
       * prompt (with a `role="alert"` accessible surface) and fall through to
       * text input. Per ADR-0002 §"Low-confidence handling".
       */
      lowConfidence: boolean;
      /** True when a `unitId` was supplied and a non-empty biasing vocab was applied. */
      biasingApplied: boolean;
      /** Number of biasing tokens applied. 0 when `biasingApplied` is false. */
      biasingSize: number;
    }
  | {
      ok: false;
      error: string;
      degraded?: boolean;
      degradedReason?: string;
    };

export type AsrTranscribeDeps = {
  transcriber: AsrTranscriber;
  isMock: () => boolean;
  /**
   * Optional hook to resolve a Unit's biasing vocabulary. When supplied and
   * the request carries a `unitId` form field, the resolved hotwords are
   * passed to the transcriber. When the hook returns `present: false` or
   * `words.length === 0`, no hotwords are sent.
   */
  resolveBiasing?: (
    unitId: string,
  ) => Promise<{ words: ReadonlyArray<string>; present: boolean }>;
  /**
   * Optional SC-5 Sampling Buffer recorder. When supplied, after a successful
   * ASR transcript is produced, the route generates a per-request
   * `utteranceId`, samples it at the SC-5 rate, and on a hit fire-and-forget
   * writes the audio blob to the buffer. See ADR-0003 §4 + issue #16. The
   * recorder is **off the latency-critical path**: the route does not await
   * the write, and a transient write failure is acceptable (the platform
   * ships ~1 % overage on the 1 % sample rate as a margin).
   */
  sc5Recorder?: Sc5Recorder;
  /**
   * Override the per-request utteranceId generator. Defaults to a
   * time-and-randomness-based id (`sc5-<base36 timestamp>-<random>`) which
   * is sufficient for the 1 % sampler (FNV-1a on the id is the sample
   * trigger) and for dedup on the `Sc5Sample.utteranceId` unique constraint.
   */
  generateSc5UtteranceId?: () => string;
};

const ALLOWED_LANGS = new Set(["pt-PT"]);

function isAllowedLang(value: string): value is "pt-PT" {
  return ALLOWED_LANGS.has(value);
}

function badRequest(message: string): NextResponse<AsrTranscribeResponse> {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

const defaultGenerateId = (): string =>
  `sc5-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  // jsdom <25 polyfill fallback — the tests pass a Uint8Array-backed Blob.
  // Stream the Blob via FileReader for environments without arrayBuffer().
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
        return;
      }
      resolve(new Uint8Array(0));
    };
    reader.readAsArrayBuffer(blob);
  });
}

export async function transcribeFromForm(
  form: FormData,
  deps: AsrTranscribeDeps,
): Promise<NextResponse<AsrTranscribeResponse>> {
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return badRequest("Missing 'audio' file part");
  }
  if (audio.size === 0) {
    return badRequest("Empty audio payload");
  }

  const rawLang = form.get("lang");
  const lang = typeof rawLang === "string" && isAllowedLang(rawLang) ? rawLang : "pt-PT";

  let hotwords: ReadonlyArray<string> | undefined;
  let biasingApplied = false;
  let biasingSize = 0;
  if (deps.resolveBiasing) {
    const rawUnitId = form.get("unitId");
    if (typeof rawUnitId === "string" && rawUnitId.trim().length > 0) {
      const resolved = await deps.resolveBiasing(rawUnitId.trim());
      if (resolved.present && resolved.words.length > 0) {
        hotwords = resolved.words;
        biasingApplied = true;
        biasingSize = resolved.words.length;
      }
    }
  }

  const result = await withAsrFallback(deps.transcriber, audio, {
    lang,
    ...(hotwords ? { hotwords } : {}),
  });

  if ("degraded" in result) {
    const degraded: DegradedAsrResult = result;
    return NextResponse.json(
      {
        ok: false,
        error: degraded.degradedReason,
        degraded: true,
        degradedReason: degraded.degradedReason,
      },
      { status: 200 },
    );
  }

  // Fire-and-forget SC-5 sample write. The sample rate is 1 % and the recorder
  // returns immediately; we never await the write here.
  if (deps.sc5Recorder) {
    const generateId = deps.generateSc5UtteranceId ?? defaultGenerateId;
    const utteranceId = generateId();
    if (shouldSample(utteranceId)) {
      const body = await readBlobBytes(audio);
      deps.sc5Recorder.enqueue({
        utteranceId,
        body,
        contentType: audio.type || "audio/webm",
        signedUrlExpiresIn: 24 * 60 * 60,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    confidence: result.confidence,
    languageDetected: result.languageDetected,
    words: result.words.map((w) => ({
      word: w.word,
      confidence: w.confidence,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
    })),
    mock: deps.isMock(),
    lowConfidence: isLowConfidence(result.confidence),
    biasingApplied,
    biasingSize,
  });
}

export { LOW_CONFIDENCE_THRESHOLD };