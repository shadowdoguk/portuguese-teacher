import { NextResponse } from "next/server";
import { withAsrFallback, type DegradedAsrResult, type AsrTranscriber } from "@/lib/minimax/fallbacks";

export type AsrTranscribeResponse =
  | {
      ok: true;
      text: string;
      confidence: number;
      languageDetected: string;
      words: ReadonlyArray<{ word: string; confidence: number; startMs: number; endMs: number }>;
      mock: boolean;
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

  const result = await withAsrFallback(deps.transcriber, audio, { lang });

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
  });
}