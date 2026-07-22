import { NextResponse } from "next/server";
import {
  withTtsFallback,
  type DegradedTtsResult,
  type TtsSynthesizer,
} from "@/lib/minimax/fallbacks";
import type { TtsSynthesizeOptions } from "@/lib/minimax/types";
import { DEFAULT_TTS_VOICE, TTS_VOICE_OPTIONS, isTtsVoiceId } from "@/lib/settings";

export type TtsSynthesizeResponse =
  | {
      ok: true;
      audioUrl: string;
      contentType: string;
      durationMs: number;
      mock: boolean;
      voiceId: string;
      dialect: "pt-PT";
    }
  | {
      ok: false;
      degraded: true;
      degradedReason: string;
    };

export type TtsSynthesizeBody = {
  text?: string;
  voiceId?: string;
  speed?: number;
};

export type TtsSynthesizeDeps = {
  synthesizer: TtsSynthesizer;
  isMock: () => boolean;
  encode?: BlobToDataUrl;
};

export type BlobToDataUrl = (blob: Blob) => Promise<string>;

const MAX_TEXT_LENGTH = 1000;
const MIN_TEXT_LENGTH = 1;

const VALID_DIALECTS = new Set(["pt-PT"]);

function badRequest(message: string): NextResponse<TtsSynthesizeResponse> {
  return NextResponse.json({ ok: false, degraded: true, degradedReason: message }, { status: 400 });
}

export const defaultBlobToDataUrl: BlobToDataUrl = (blob) => {
  const contentType = blob.type || "audio/mpeg";
  if (typeof Buffer !== "undefined" && typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(new Uint8Array(buffer)).toString("base64");
      return `data:${contentType};base64,${base64}`;
    });
  }
  return blobToDataUrlFallback(blob, contentType);
};

function blobToDataUrlFallback(blob: Blob, contentType: string): Promise<string> {
  const buffer = (blob as unknown as { _buffer?: ArrayBuffer | Uint8Array })._buffer;
  if (!buffer) {
    return Promise.reject(
      new Error(
        "Cannot encode Blob to data URL in this runtime — neither Buffer nor Blob.arrayBuffer is available",
      ),
    );
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : arrayBufferToBase64(bytes);
  return Promise.resolve(`data:${contentType};base64,${base64}`);
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  throw new Error("No base64 encoder available in this runtime");
}

export async function synthesizeFromBody(
  body: TtsSynthesizeBody,
  deps: TtsSynthesizeDeps,
): Promise<NextResponse<TtsSynthesizeResponse>> {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < MIN_TEXT_LENGTH) {
    return badRequest("Missing 'text'");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return badRequest(`'text' exceeds the ${MAX_TEXT_LENGTH}-character limit`);
  }

  const voiceId = typeof body.voiceId === "string" && isTtsVoiceId(body.voiceId)
    ? body.voiceId
    : DEFAULT_TTS_VOICE.id;
  const voice = TTS_VOICE_OPTIONS.find((v) => v.id === voiceId) ?? DEFAULT_TTS_VOICE;

  if (!VALID_DIALECTS.has(voice.dialect)) {
    return badRequest(`Unsupported dialect '${voice.dialect}'`);
  }

  const speed = typeof body.speed === "number" && Number.isFinite(body.speed)
    ? Math.min(1.25, Math.max(0.5, body.speed))
    : 1.0;

  const options: TtsSynthesizeOptions = {
    voice: { id: voice.id, dialect: voice.dialect, gender: "female" },
    speed,
  };

  const result = await withTtsFallback(deps.synthesizer, text, options);

  if ("degraded" in result) {
    const degraded: DegradedTtsResult = result;
    return NextResponse.json(
      {
        ok: false,
        degraded: true,
        degradedReason: degraded.degradedReason,
      },
      { status: 200 },
    );
  }

  const audioUrl = await (deps.encode ?? defaultBlobToDataUrl)(result.audio);

  return NextResponse.json({
    ok: true,
    audioUrl,
    contentType: result.contentType,
    durationMs: result.durationMs,
    mock: deps.isMock(),
    voiceId: voice.id,
    dialect: voice.dialect,
  });
}