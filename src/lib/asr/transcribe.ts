import { NextResponse } from "next/server";
import { withAsrFallback, type DegradedAsrResult, type AsrTranscriber } from "@/lib/minimax/fallbacks";
import { LOW_CONFIDENCE_THRESHOLD, isLowConfidence } from "@/lib/asr/biasing";

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
};

const ALLOWED_LANGS = new Set(["pt-PT"]);

function isAllowedLang(value: string): value is "pt-PT" {
  return ALLOWED_LANGS.has(value);
}

function badRequest(message: string): NextResponse<AsrTranscribeResponse> {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
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