import { NextResponse } from "next/server";
import { getMiniMaxClients, isMockMode } from "@/lib/minimax";
import { transcribeFromForm, type AsrTranscribeResponse } from "@/lib/asr/transcribe";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<AsrTranscribeResponse>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data with an 'audio' file part" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed multipart body" }, { status: 400 });
  }

  const clients = getMiniMaxClients();
  return transcribeFromForm(form, {
    transcriber: (blob, options) => clients.asr.transcribe(blob, options),
    isMock: () => isMockMode() || clients.mock,
  });
}